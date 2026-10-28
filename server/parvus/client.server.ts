import { z } from 'zod'

import type { CreationOptions, CredentialJSON, RequestOptions } from '../../app/auth/protocol'
import { send } from './transport.server'

export type ErrorCode = z.infer<typeof errorCode>
export type Refusal = Exclude<ErrorCode, 'invalid_request' | 'unauthorized' | 'internal'>

export class ParvusError extends Error {
  constructor(path: string, status: number, detail: string) {
    super(`parvus ${path}: ${status} ${detail}`)
    this.name = 'ParvusError'
  }
}

const errorCode = z.enum([
  'invalid_request',
  'unauthorized',
  'authentication_failed',
  'not_found',
  'already_exists',
  'last_credential',
  'credential_limit',
  'internal',
])
const errorReply = z.object({ error: errorCode })
const creationOptions = z.custom<CreationOptions>(hasPublicKey)
const requestOptions = z.custom<RequestOptions>(hasPublicKey)
const session = z.object({ user_id: z.string(), token: z.string(), expires_at: z.iso.datetime() })
const noContent = z.undefined()

export function registrationBegin(body: {
  slot: string
  user_id: string
  name?: string
  enroll_token?: string
  ttl_seconds: number
}) {
  return call('POST', '/v1/registration/begin', body, creationOptions, [
    'already_exists',
    'authentication_failed',
  ])
}

export function registrationFinish(body: { slot: string; credential: CredentialJSON }) {
  return call(
    'POST',
    '/v1/registration/finish',
    body,
    z.object({ user_id: z.string(), recovery_code: z.string() }),
    ['authentication_failed', 'already_exists'],
  )
}

export function loginBegin(body: { slot: string; user_id?: string; ttl_seconds: number }) {
  return request('POST', '/v1/login/begin', body, requestOptions)
}

export function loginFinish(body: {
  slot: string
  credential: CredentialJSON
  ttl_seconds: number
}) {
  return call('POST', '/v1/login/finish', body, session, ['authentication_failed'])
}

export function recoverAccount(body: { user_id: string; code: string; ttl_seconds: number }) {
  return call(
    'POST',
    '/v1/recover',
    body,
    session.extend({ recovery_code: z.string(), credential_count: z.number().int() }),
    ['authentication_failed'],
  )
}

export function introspect(body: { token: string; extend_by_seconds?: number }) {
  return call(
    'POST',
    '/v1/introspect',
    body,
    z.object({ user_id: z.string(), expires_at: z.iso.datetime() }),
    ['authentication_failed'],
  )
}

export function logout(body: { token: string }) {
  return request('POST', '/v1/logout', body, noContent)
}

export function logoutAll(userId: string) {
  return request('POST', `${user(userId)}/logout`, undefined, noContent)
}

export function credentialBegin(userId: string, body: { ttl_seconds: number }) {
  return call('POST', `${user(userId)}/credentials/begin`, body, creationOptions, ['not_found'])
}

export function credentialFinish(userId: string, body: { credential: CredentialJSON }) {
  return call('POST', `${user(userId)}/credentials/finish`, body, noContent, [
    'authentication_failed',
    'credential_limit',
    'already_exists',
    'not_found',
  ])
}

export function credentialList(userId: string) {
  return call(
    'GET',
    `${user(userId)}/credentials`,
    undefined,
    z.object({ credentials: z.array(z.object({ id: z.string() })) }),
    ['not_found'],
  )
}

export function credentialDelete(userId: string, credentialId: string) {
  return call(
    'DELETE',
    `${user(userId)}/credentials/${encodeURIComponent(credentialId)}`,
    undefined,
    noContent,
    ['not_found', 'last_credential'],
  )
}

export function rotateCode(userId: string) {
  return call('POST', `${user(userId)}/codes`, undefined, z.object({ recovery_code: z.string() }), [
    'not_found',
  ])
}

export function reset(userId: string, body: { ttl_seconds: number }) {
  return call(
    'POST',
    `${user(userId)}/reset`,
    body,
    z.object({ enroll_token: z.string(), expires_at: z.iso.datetime() }),
    ['not_found'],
  )
}

export function deleteUser(userId: string) {
  return call('DELETE', user(userId), undefined, noContent, ['not_found'])
}

function hasPublicKey(value: unknown) {
  return typeof value === 'object' && value !== null && 'publicKey' in value
}

function user(id: string) {
  return `/v1/users/${encodeURIComponent(id)}`
}

type Method = 'GET' | 'POST' | 'DELETE'
type Answer<T> = { value: T } | { code: ErrorCode; status: number }

async function request<T>(
  method: Method,
  path: string,
  body: object | undefined,
  reply: z.ZodType<T>,
): Promise<T> {
  const answer = await exchange(method, path, body, reply)
  if ('code' in answer) throw new ParvusError(path, answer.status, answer.code)
  return answer.value
}

async function call<T, E extends Refusal>(
  method: Method,
  path: string,
  body: object | undefined,
  reply: z.ZodType<T>,
  refusals: readonly E[],
): Promise<{ ok: true; value: T } | { ok: false; error: E }> {
  const answer = await exchange(method, path, body, reply)
  if ('value' in answer) return { ok: true, value: answer.value }
  if (isRefusal(refusals, answer.code)) return { ok: false, error: answer.code }
  throw new ParvusError(path, answer.status, answer.code)
}

async function exchange<T>(
  method: Method,
  path: string,
  body: object | undefined,
  reply: z.ZodType<T>,
): Promise<Answer<T>> {
  const response = await send(path, {
    method,
    ...(body && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const payload = await readPayload(path, response)
  if (response.ok) return { value: parse(path, response.status, reply, payload) }
  return { code: parse(path, response.status, errorReply, payload).error, status: response.status }
}

async function readPayload(path: string, response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw new ParvusError(path, response.status, `not JSON: ${text}`)
  }
}

function parse<T>(path: string, status: number, schema: z.ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) throw new ParvusError(path, status, z.prettifyError(parsed.error))
  return parsed.data
}

function isRefusal<E extends Refusal>(refusals: readonly E[], code: ErrorCode): code is E {
  const known: readonly ErrorCode[] = refusals
  return known.includes(code)
}
