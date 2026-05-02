import "server-only"

import { asc, eq } from "drizzle-orm"

import { adminDb } from "@/lib/db/client"
import { subscriptionPlans } from "@/lib/db/schema"
import type { SubscriptionPlan } from "@/types"

function mapPlanRow(row: typeof subscriptionPlans.$inferSelect): SubscriptionPlan {
  const raw = typeof row.price === "string" ? Number(row.price) : Number(row.price)
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    duration_days: row.duration_days,
    price: raw,
    is_active: row.is_active,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

/** كل الخطط (للمشرف) — بما فيها المعطّلة */
export async function listSubscriptionPlansAdmin(): Promise<SubscriptionPlan[]> {
  const rows = await adminDb.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.price))

  return rows.map(mapPlanRow)
}

export async function adminUpdateSubscriptionPlanRow(
  id: string,
  input: Partial<{
    name: string
    description: string | null
    duration_days: number
    price: number
    is_active: boolean
  }>
): Promise<SubscriptionPlan | null> {
  const updatePayload: Record<string, unknown> = { updated_at: new Date() }
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) updatePayload[k] = v
  }
  const [row] = await adminDb
    .update(subscriptionPlans)
    .set(updatePayload as Partial<typeof subscriptionPlans.$inferInsert>)
    .where(eq(subscriptionPlans.id, id))
    .returning()

  return row ? mapPlanRow(row) : null
}
