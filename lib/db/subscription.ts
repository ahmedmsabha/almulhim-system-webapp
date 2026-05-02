import "server-only"
import { and, eq, inArray, sql } from "drizzle-orm"

import { adminDb, type UserDb } from "@/lib/db/client"
import { subscriptions } from "@/lib/db/schema"

/** Bypass RLS for server actions — same rules as JWT-scoped subscription check. */
export async function subscriptionIsActiveAdmin(studentId: string): Promise<boolean> {
  const today = sql`timezone('utc'::text, now())::timestamp with time zone`
  const subs = await adminDb
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.student_id, studentId),
        inArray(subscriptions.status, ["active", "expiring_soon"]),
        sql`${subscriptions.end_date}::timestamp with time zone >= (${today})`
      )
    )
    .limit(1)

  return subs.length > 0
}

/** Matches legacy `subscriptions.status IN ('active', 'expiring_soon')` with end date still in range. */
export async function subscriptionIsActive(tx: UserDb, studentId: string): Promise<boolean> {
  const today = sql`timezone('utc'::text, now())::timestamp with time zone`
  const subs = await tx
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.student_id, studentId),
        inArray(subscriptions.status, ["active", "expiring_soon"]),
        sql`${subscriptions.end_date}::timestamp with time zone >= (${today})`
      )
    )
    .limit(1)

  return subs.length > 0
}
