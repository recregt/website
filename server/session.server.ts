import { type Cookie, createContext, createCookie, type MiddlewareFunction } from 'react-router'

import * as parvus from './parvus/client.server'
import type { User } from './schema.server'
import { findAccount } from './users.server'

const attributes = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' } as const

export const sessionCookie = createCookie('session', attributes)
export const slotCookie = createCookie('slot', attributes)

export const userContext = createContext<User | null>(null)

export const sessionMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const token = await readCookie(sessionCookie, request)
  if (!token) return next()

  const session = await parvus.introspect({ token })
  const account = session.ok ? await findAccount(session.value.user_id) : null
  const user =
    account?.status === 'active'
      ? { id: account.id, handle: account.handle, role: account.role }
      : null
  context.set(userContext, user)

  const response = await next()
  if (!user) response.headers.append('set-cookie', await clearCookie(sessionCookie))
  return response
}

export async function endSession(request: Request): Promise<string> {
  const token = await readCookie(sessionCookie, request)
  if (token) await parvus.logout({ token })
  return clearCookie(sessionCookie)
}

export async function readCookie(cookie: Cookie, request: Request): Promise<string | null> {
  const value: unknown = await cookie.parse(request.headers.get('cookie'))
  return typeof value === 'string' && value ? value : null
}

export function clearCookie(cookie: Cookie): Promise<string> {
  return cookie.serialize('', { maxAge: 0 })
}
