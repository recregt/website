import { data, type RouterContextProvider } from 'react-router'

import { type Capability, can } from '../app/auth/access'
import type { User } from './schema.server'
import { userContext } from './session.server'

export function requireAccess(
  context: Readonly<RouterContextProvider>,
  capability: Capability,
): User {
  const user = context.get(userContext)
  if (!user) throw data({ capability }, { status: 401 })
  if (!can(user, capability)) throw data({ capability }, { status: 403 })
  return user
}
