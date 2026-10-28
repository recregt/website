import { data } from 'react-router'
import { z } from 'zod'

import {
  type CredentialJSON,
  handlePattern,
  type Reply,
  type Step,
  type Steps,
} from '../app/auth/protocol'
import * as parvus from './parvus/client.server'
import type { Account } from './schema.server'
import { clearCookie, readCookie, sessionCookie, slotCookie } from './session.server'
import { verifyHuman } from './turnstile.server'
import {
  activate,
  findAccount,
  findAccountByHandle,
  findOldestPending,
  release,
  reserve,
} from './users.server'

const ceremonySeconds = 5 * 60
const sessionSeconds = 30 * 24 * 60 * 60

type Outcome<S extends Step> = { reply: Reply<S>; cookies: string[] }
type Handler<S extends Step> = (body: Steps[S]['body'], request: Request) => Promise<Outcome<S>>

const credential = z.custom<CredentialJSON>((value) => typeof value === 'object' && value !== null)

const bodies: { [S in Step]: z.ZodType<Steps[S]['body']> } = {
  'registration-begin': z.object({ handle: z.string(), turnstile: z.string() }),
  'registration-finish': z.object({ credential }),
  'login-begin': z.record(z.string(), z.never()),
  'login-finish': z.object({ credential }),
}

const handlers: { [S in Step]: Handler<S> } = {
  'registration-begin': async (body, request) => {
    const handle = normalize(body.handle)
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

export function runStep(name: string | undefined, request: Request): Promise<Response> {
  if (!isStep(name)) throw data(null, { status: 404 })
  return run(name, request)
}

async function run<S extends Step>(step: S, request: Request): Promise<Response> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw data(null, { status: 415 })
  }
  const body = bodies[step].safeParse(await request.json().catch(() => undefined))
  if (!body.success) throw data(null, { status: 400 })

  const { reply, cookies } = await handlers[step](body.data, request)
  const headers = new Headers()
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return Response.json(reply, { headers })
}

function refuse<E extends string>(error: E) {
  return { reply: { ok: false, error } as const, cookies: [] }
}

function normalize(handle: string): string | null {
  const normalized = handle.trim().toLowerCase()
  return handlePattern.test(normalized) ? normalized : null
}

function isStep(name: string | undefined): name is Step {
  return name !== undefined && Object.hasOwn(handlers, name)
}
