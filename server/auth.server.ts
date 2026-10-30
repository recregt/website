import { data } from 'react-router'
import { z } from 'zod'

import {
  type CredentialJSON,
  normalizeHandle,
  passkeyNameLength,
  type Reply,
  type Step,
  type Steps,
} from '../app/auth/protocol'
import { deviceLabel } from './analytics.server'
import * as parvus from './parvus/client.server'
import { forgetPasskey, recordPasskey, renamePasskey } from './passkeys.server'
import type { Account, User } from './schema.server'
import {
  clearCookie,
  confirmCookie,
  isConfirmed,
  readCookie,
  sessionCookie,
  slotCookie,
} from './session.server'
import { verifyHuman } from './turnstile.server'
import {
  activate,
  deleteAccount,
  findAccount,
  findAccountByHandle,
  findOldestPending,
  release,
  reserve,
} from './users.server'

const ceremonySeconds = 5 * 60
const sessionSeconds = 30 * 24 * 60 * 60

type Outcome<S extends Step> = { reply: Reply<S>; cookies: string[] }
type Handler<S extends Step> = (
  body: Steps[S]['body'],
  request: Request,
  user: User | null,
) => Promise<Outcome<S>>

const credential = z.custom<CredentialJSON>((value) => typeof value === 'object' && value !== null)
const empty = z.record(z.string(), z.never())

const bodies: { [S in Step]: z.ZodType<Steps[S]['body']> } = {
  'registration-begin': z.object({ handle: z.string(), turnstile: z.string() }),
  'registration-finish': z.object({ credential }),
  'login-begin': empty,
  'login-finish': z.object({ credential }),
  recover: z.object({ handle: z.string(), code: z.string(), turnstile: z.string() }),
  'confirm-begin': empty,
  'confirm-finish': z.object({ credential }),
  'passkey-begin': empty,
  'passkey-finish': z.object({ credential }),
  'passkey-rename': z.object({ id: z.string().min(1), name: z.string() }),
  'passkey-remove': z.object({ id: z.string().min(1) }),
  'recovery-rotate': empty,
  'account-delete': z.object({ handle: z.string() }),
}

const handlers: { [S in Step]: Handler<S> } = {
  'registration-begin': async (body, request) => {
    const handle = normalizeHandle(body.handle)
    if (!handle) return refuse('invalid_handle')
    if (!(await verifyHuman(body.turnstile, request))) return refuse('not_human')

    await settleOldestPending()
    const id = await claim(handle)
    if (!id) return refuse('handle_taken')

    const slot = crypto.randomUUID()
    const options = await parvus.registrationBegin({
      slot,
      user_id: id,
      name: handle,
      ttl_seconds: ceremonySeconds,
    })
    if (!options.ok) throw new Error(`parvus refused a new user: ${options.error}`)
    return { reply: options, cookies: [await slotCookie.serialize(slot)] }
  },

  'registration-finish': async (body, request) => {
    const slot = await readCookie(slotCookie, request)
    if (!slot) return refuse('ceremony_failed')

    const registered = await parvus.registrationFinish({ slot, credential: body.credential })
    if (!registered.ok) return refuse('ceremony_failed')

    const { user_id, recovery_code } = registered.value
    if (!(await activate(user_id))) {
      await parvus.deleteUser(user_id)
      return refuse('ceremony_failed')
    }
    await recordPasskey(user_id, body.credential.id, deviceOf(request))
    return {
      reply: { ok: true, value: { recoveryCode: recovery_code } },
      cookies: [await clearCookie(slotCookie)],
    }
  },

  'login-begin': async () => {
    const slot = crypto.randomUUID()
    const options = await parvus.loginBegin({ slot, ttl_seconds: ceremonySeconds })
    return { reply: { ok: true, value: options }, cookies: [await slotCookie.serialize(slot)] }
  },

  'login-finish': async (body, request) => {
    const slot = await readCookie(slotCookie, request)
    if (!slot) return refuse('ceremony_failed')

    const session = await parvus.loginFinish({
      slot,
      credential: body.credential,
      ttl_seconds: sessionSeconds,
    })
    if (!session.ok) return refuse('ceremony_failed')

    const { user_id, token, expires_at } = session.value
    const account = await findAccount(user_id)
    if (!account) {
      await parvus.deleteUser(user_id)
      return refuse('ceremony_failed')
    }
    return {
      reply: {
        ok: true,
        value: { handle: account.handle, recoveryCode: await completeSignup(account) },
      },
      cookies: [
        await sessionCookie.serialize(token, { expires: new Date(expires_at) }),
        await clearCookie(slotCookie),
      ],
    }
  },

  recover: async (body, request) => {
    if (!(await verifyHuman(body.turnstile, request))) return refuse('not_human')
    const handle = normalizeHandle(body.handle)
    const account = handle ? await findAccountByHandle(handle) : null
    const recovered = await parvus.recoverAccount({
      user_id: account?.status === 'active' ? account.id : crypto.randomUUID(),
      code: body.code,
      ttl_seconds: sessionSeconds,
    })
    if (!recovered.ok) return refuse('invalid_code')

    const { token, expires_at, recovery_code, credential_count } = recovered.value
    return {
      reply: { ok: true, value: { recoveryCode: recovery_code, passkeys: credential_count } },
      cookies: [
        await sessionCookie.serialize(token, { expires: new Date(expires_at) }),
        await confirmCookie.serialize(token, {
          expires: new Date(Date.now() + ceremonySeconds * 1000),
        }),
      ],
    }
  },

  'confirm-begin': async (_body, _request, user) => {
    if (!user) return refuse('signed_out')
    const slot = crypto.randomUUID()
    const options = await parvus.loginBegin({
      slot,
      user_id: user.id,
      ttl_seconds: ceremonySeconds,
    })
    return { reply: { ok: true, value: options }, cookies: [await slotCookie.serialize(slot)] }
  },

  'confirm-finish': async (body, request, user) => {
    if (!user) return refuse('signed_out')
    const slot = await readCookie(slotCookie, request)
    if (!slot) return refuse('ceremony_failed')

    const session = await parvus.loginFinish({
      slot,
      credential: body.credential,
      ttl_seconds: ceremonySeconds,
    })
    if (!session.ok) return refuse('ceremony_failed')
    if (session.value.user_id !== user.id) {
      await parvus.logout({ token: session.value.token })
      return refuse('ceremony_failed')
    }
    return {
      reply: { ok: true, value: {} },
      cookies: [
        await confirmCookie.serialize(session.value.token, {
          expires: new Date(session.value.expires_at),
        }),
        await clearCookie(slotCookie),
      ],
    }
  },

  'passkey-begin': async (_body, request, user) => {
    if (!user) return refuse('signed_out')
    if (!(await isConfirmed(request, user))) return refuse('not_confirmed')
    const options = await parvus.credentialBegin(user.id, { ttl_seconds: ceremonySeconds })
    if (!options.ok) return refuse('signed_out')
    return { reply: { ok: true, value: options.value }, cookies: [] }
  },

  'passkey-finish': async (body, request, user) => {
    if (!user) return refuse('signed_out')
    const added = await parvus.credentialFinish(user.id, { credential: body.credential })
    if (!added.ok) {
      if (added.error === 'credential_limit' || added.error === 'already_exists') {
        return refuse(added.error)
      }
      return refuse('ceremony_failed')
    }
    await recordPasskey(user.id, body.credential.id, deviceOf(request))
    return { reply: { ok: true, value: {} }, cookies: [] }
  },

  'passkey-rename': async (body, _request, user) => {
    if (!user) return refuse('signed_out')
    const name = body.name.trim()
    if (!name || name.length > passkeyNameLength) return refuse('invalid_name')
    if (!(await renamePasskey(user.id, body.id, name))) return refuse('not_found')
    return { reply: { ok: true, value: {} }, cookies: [] }
  },

  'passkey-remove': async (body, request, user) => {
    if (!user) return refuse('signed_out')
    if (!(await isConfirmed(request, user))) return refuse('not_confirmed')
    const removed = await parvus.credentialDelete(user.id, body.id)
    if (!removed.ok) return refuse(removed.error)
    await forgetPasskey(user.id, body.id)
    return { reply: { ok: true, value: {} }, cookies: [] }
  },

  'recovery-rotate': async (_body, request, user) => {
    if (!user) return refuse('signed_out')
    if (!(await isConfirmed(request, user))) return refuse('not_confirmed')
    const code = await parvus.rotateCode(user.id)
    if (!code.ok) return refuse('signed_out')
    return { reply: { ok: true, value: { recoveryCode: code.value.recovery_code } }, cookies: [] }
  },

  'account-delete': async (body, request, user) => {
    if (!user) return refuse('signed_out')
    if (!(await isConfirmed(request, user))) return refuse('not_confirmed')
    if (normalizeHandle(body.handle) !== user.handle) return refuse('wrong_handle')
    await deleteAccount(user.id)
    await parvus.deleteUser(user.id)
    return {
      reply: { ok: true, value: {} },
      cookies: [await clearCookie(sessionCookie), await clearCookie(confirmCookie)],
    }
  },
}

function deviceOf(request: Request): string {
  return deviceLabel(request.headers.get('user-agent') ?? '')
}

async function claim(handle: string): Promise<string | null> {
  const id = crypto.randomUUID()
  if (await reserve(id, handle)) return id

  const holder = await findAccountByHandle(handle)
  if (!holder || holder.status === 'active' || holder.createdAt >= ceremonyCutoff()) return null
  if ((await settle(holder)) === 'active') return null
  return (await reserve(id, handle)) ? id : null
}

async function settleOldestPending(): Promise<void> {
  const oldest = await findOldestPending(ceremonyCutoff())
  if (oldest) await settle(oldest)
}

async function settle(pending: Account): Promise<'active' | 'released'> {
  const credentials = await parvus.credentialList(pending.id)
  if (credentials.ok) {
    await activate(pending.id)
    return 'active'
  }
  await release(pending.id)
  return 'released'
}

async function completeSignup(account: Account): Promise<string | null> {
  if (account.status === 'active') return null
  await activate(account.id)
  const code = await parvus.rotateCode(account.id)
  if (!code.ok) throw new Error(`parvus lost a signed-in user: ${code.error}`)
  return code.value.recovery_code
}

function ceremonyCutoff(): Date {
  return new Date(Date.now() - ceremonySeconds * 1000)
}

export function runStep(
  name: string | undefined,
  request: Request,
  user: User | null,
): Promise<Response> {
  if (!isStep(name)) throw data(null, { status: 404 })
  return run(name, request, user)
}

async function run<S extends Step>(
  step: S,
  request: Request,
  user: User | null,
): Promise<Response> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw data(null, { status: 415 })
  }
  const body = bodies[step].safeParse(await request.json().catch(() => undefined))
  if (!body.success) throw data(null, { status: 400 })

  const { reply, cookies } = await handlers[step](body.data, request, user)
  const headers = new Headers()
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return Response.json(reply, { headers })
}

function refuse<E extends string>(error: E) {
  return { reply: { ok: false, error } as const, cookies: [] }
}

function isStep(name: string | undefined): name is Step {
  return name !== undefined && Object.hasOwn(handlers, name)
}
