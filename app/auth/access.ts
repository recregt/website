import type { User } from '../../server/schema.server'

const capabilities = ['admin'] as const

export type Capability = (typeof capabilities)[number]

const grants: Record<User['role'], readonly Capability[]> = {
  admin: ['admin'],
  member: [],
}

export function can(user: User | null, capability: Capability): boolean {
  return user !== null && grants[user.role].includes(capability)
}

export function deniedCapability(data: unknown): Capability | null {
  if (typeof data !== 'object' || data === null || !('capability' in data)) return null
  return capabilities.find((capability) => capability === data.capability) ?? null
}
