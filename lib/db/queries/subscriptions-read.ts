import "server-only"
import { desc, eq } from "drizzle-orm"
import { jwtDecode, type JwtPayload } from "jwt-decode"

import { withUserDb } from "@/lib/db/client"
import { subscriptions } from "@/lib/db/schema"
import { UnauthorizedError } from "@/lib/db/errors"
import type { Subscription } from "@/types"

function mapRow(row: typeof subscriptions.$inferSelect): Subscription {
  return {
    id: row.id,
    student_id: row.student_id,
    plan_id: row.plan_id,
    plan_name: row.plan_name ?? "",
    status: row.status as Subscription["status"],
    start_date: row.start_date.toISOString(),
    end_date: row.end_date.toISOString(),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

/** أحدث اشتراك للطالب الحالي؛ يُعرض كـ expired إذا تجاوز end_date والحالة ليست cancelled */
export async function getLatestSubscriptionForStudent(
  accessToken: string
): Promise<Subscription | null> {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub) throw new UnauthorizedError()

  return withUserDb(accessToken, async (tx) => {
    const rows = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.student_id, sub))
      .orderBy(desc(subscriptions.created_at))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    const mapped = mapRow(row)
    const endMs = row.end_date.getTime()
    if (Date.now() > endMs && mapped.status !== "cancelled") {
      return { ...mapped, status: "expired" }
    }
    return mapped
  })
}
