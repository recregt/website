import { env } from 'cloudflare:workers'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'

import * as parvus from './parvus/client.server'
import { passkeys } from './schema.server'

const db = drizzle(env.DB)

export const passkeyLimit = Number(env.PARVUS_MAX_CREDENTIALS)

export type Passkey = { id: string; name: string; addedAt: Date | null }

export async function listPasskeys(userId: string): Promise<Passkey[]> {
  const [credentials, named] = await Promise.all([
    parvus.credentialList(userId),
    db.select().from(passkeys).where(eq(passkeys.userId, userId)),
  ])
  if (!credentials.ok) return []
  const names = new Map(named.map((row) => [row.id, row]))
  return credentials.value.credentials.map(({ id }) => ({
    id,
    name: names.get(id)?.name ?? 'Passkey',
    addedAt: names.get(id)?.createdAt ?? null,
  }))
}

export async function recordPasskey(userId: string, id: string, name: string): Promise<void> {
  await db
    .insert(passkeys)
    .values({ id, userId, name, createdAt: new Date() })
    .onConflictDoUpdate({ target: passkeys.id, set: { name } })
}

export async function renamePasskey(userId: string, id: string, name: string): Promise<boolean> {
  const credentials = await parvus.credentialList(userId)
  if (!credentials.ok || !credentials.value.credentials.some((owned) => owned.id === id)) {
    return false
  }
  await db
    .insert(passkeys)
    .values({ id, userId, name })
    .onConflictDoUpdate({
      target: passkeys.id,
      set: { name },
      where: eq(passkeys.userId, userId),
    })
  return true
}

export async function forgetPasskey(userId: string, id: string): Promise<void> {
  await db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
}
