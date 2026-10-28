import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable(
  'users',
  {
    id: text().primaryKey(),
    handle: text().notNull().unique(),
    status: text({ enum: ['pending', 'active'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index('users_by_status_age').on(table.status, table.createdAt)],
)

export type Account = Pick<typeof users.$inferSelect, 'id' | 'handle' | 'status' | 'createdAt'>
export type User = Pick<Account, 'id' | 'handle'>
