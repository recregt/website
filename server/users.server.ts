import { env } from 'cloudflare:workers'
import { and, asc, eq, lt, notExists } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'

import { type Account, users } from './schema.server'

const db = drizzle(env.DB)

const account = {
  id: users.id,
  handle: users.handle,
  status: users.status,
  role: users.role,
  createdAt: users.createdAt,
}

export async function findAccount(id: string): Promise<Account | null> {
  const [found] = await db.select(account).from(users).where(eq(users.id, id))
  return found ?? null
}

export async function adminHandles(): Promise<string[]> {
  const admins = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.role, 'admin'))
  return admins.map((admin) => admin.handle)
}

export async function renameAccount(id: string, handle: string): Promise<boolean> {
  const holder = db.select({ id: users.id }).from(users).where(eq(users.handle, handle))
  const renamed = await db
    .update(users)
    .set({ handle })
    .where(and(eq(users.id, id), notExists(holder)))
    .returning({ id: users.id })
  return renamed.length === 1
}

export async function findAccountByHandle(handle: string): Promise<Account | null> {
  const [found] = await db.select(account).from(users).where(eq(users.handle, handle))
  return found ?? null
}

export async function findOldestPending(startedBefore: Date): Promise<Account | null> {
  const [found] = await db
    .select(account)
    .from(users)
    .where(and(eq(users.status, 'pending'), lt(users.createdAt, startedBefore)))
    .orderBy(asc(users.createdAt))
    .limit(1)
  return found ?? null
}

export async function reserve(id: string, handle: string): Promise<boolean> {
  const reserved = await db
    .insert(users)
    .values({ id, handle, status: 'pending' })
    .onConflictDoNothing({ target: users.handle })
    .returning({ id: users.id })
  return reserved.length === 1
}

export async function activate(id: string): Promise<boolean> {
  const activated = await db
    .update(users)
    .set({ status: 'active' })
    .where(and(eq(users.id, id), eq(users.status, 'pending')))
    .returning({ id: users.id })
  return activated.length === 1
}

export async function deleteAccount(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id))
}

export async function release(id: string): Promise<void> {
  await db.delete(users).where(and(eq(users.id, id), eq(users.status, 'pending')))
}
