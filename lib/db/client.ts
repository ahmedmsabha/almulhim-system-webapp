import "server-only"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { jwtDecode } from "jwt-decode"
import postgres from "postgres"
import { sql } from "drizzle-orm"

import * as schema from "./schema"
import { env } from "@/lib/env"

export type UserDb = PostgresJsDatabase<typeof schema>

let adminPg: ReturnType<typeof postgres> | undefined

function getAdminPg() {
  if (!adminPg) {
    adminPg = postgres(env.DATABASE_URL, { prepare: false, max: 10 })
  }
  return adminPg
}

/**
 * Admin database client.
 * Connects directly to PostgreSQL using the service role.
 * BYPASSES all Row Level Security (RLS) policies.
 * Use ONLY in:
 * - Admin server actions (role verified before calling)
 * - Cron jobs and scheduled tasks
 * - Data migrations
 * NEVER use this for student-facing queries.
 */
export const adminDb = drizzle(getAdminPg(), { schema })

/**
 * RLS-aware database client.
 * Injects the user JWT into the PostgreSQL session so that
 * RLS policies evaluate correctly for the current user.
 * Use for ALL student-facing queries.
 * The injected role and JWT claims make Supabase RLS behave
 * exactly as if the query came through the Supabase JS client.
 */
export async function withUserDb<T>(
  accessToken: string,
  fn: (db: UserDb) => Promise<T>
): Promise<T> {
  const pg = postgres(env.databaseUrlPooler, { prepare: false, max: 1 })
  const db = drizzle(pg, { schema })

  try {
    return await db.transaction(async (tx) => {
      const payload = jwtDecode<Record<string, unknown>>(accessToken)
      const claimsJson = JSON.stringify(payload)

      await tx.execute(sql`select set_config('request.jwt.claims', ${claimsJson}, true)`)
      await tx.execute(sql`set local role authenticated`)

      return await fn(tx)
    })
  } finally {
    await pg.end({ timeout: 5 }).catch(() => undefined)
  }
}
