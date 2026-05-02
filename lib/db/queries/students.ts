import "server-only"
import {
  addDays,
  endOfDay,
  startOfDay,
} from "date-fns"
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
} from "drizzle-orm"

import { adminDb } from "@/lib/db/client"
import {
  profiles,
  studentDeviceBindings,
  subscriptionPlans,
  subscriptions,
} from "@/lib/db/schema"
import type { SubscriptionRow } from "@/lib/db/schema"
import { ResourceNotFoundError } from "@/lib/db/errors"
import type { Profile, Subscription as StudentSubscriptionType } from "@/types"

function mapDbProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    grade: row.grade,
    avatar_url: row.avatar_url,
    role: row.role as Profile["role"],
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

function mapSubscriptionRow(row: SubscriptionRow): StudentSubscriptionType {
  const start = typeof row.start_date === "string" ? row.start_date : row.start_date.toISOString()
  const end =
    typeof row.end_date === "string" ? row.end_date : row.end_date.toISOString()
  return {
    id: row.id,
    student_id: row.student_id,
    plan_id: row.plan_id,
    plan_name: row.plan_name ?? "",
    status: row.status as StudentSubscriptionType["status"],
    start_date: start,
    end_date: end,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function getAllStudents(): Promise<Profile[]> {
  const rows = await adminDb
    .select()
    .from(profiles)
    .where(eq(profiles.role, "student"))
    .orderBy(desc(profiles.created_at))

  return rows.map(mapDbProfile)
}

export async function getStudentById(id: string): Promise<
  (Profile & { subscription: StudentSubscriptionType | null }) | null
> {
  const [student] = await adminDb.select().from(profiles).where(eq(profiles.id, id)).limit(1)

  if (!student || student.role !== "student") {
    return null
  }

  const subsRows = await adminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.student_id, id))
    .orderBy(desc(subscriptions.created_at))

  const latest = subsRows[0]

  return {
    ...mapDbProfile(student),
    subscription: latest ? mapSubscriptionRow(latest) : null,
  }
}

export async function searchStudents(query: string): Promise<Profile[]> {
  const q = `%${query.trim()}%`
  const rows = await adminDb
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.role, "student"),
        or(
          ilike(profiles.full_name, q),
          ilike(profiles.email, q),
          ilike(profiles.phone, q)
        )
      )
    )
    .orderBy(desc(profiles.created_at))

  return rows.map(mapDbProfile)
}

export async function activateSubscription(
  userId: string,
  planId: string,
  startDate: Date,
  endDate: Date,
  activatedBy?: string | null,
  notes?: string | null
): Promise<void> {
  const planRows = await adminDb
    .select()
    .from(subscriptionPlans)
    .where(and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.is_active, true)))
    .limit(1)

  const plan = planRows[0]

  await adminDb.insert(subscriptions).values({
    student_id: userId,
    plan_id: planId,
    plan_name: plan?.name ?? null,
    status: "active",
    start_date: startDate,
    end_date: endDate,
    activated_by: activatedBy ?? null,
    notes: notes ?? null,
  })
}

export async function listStudentsWithSubscriptions(options?: {
  search?: string
}): Promise<(Profile & { subscriptions: StudentSubscriptionType[]; hasDeviceBinding: boolean })[]> {
  const students =
    options?.search?.trim() ?
      await searchStudents(options.search)
    : await getAllStudents()

  if (students.length === 0) return []

  const ids = students.map((s) => s.id)

  const subRows =
    ids.length === 0 ?
      []
      : await adminDb
          .select()
          .from(subscriptions)
          .where(inArray(subscriptions.student_id, ids))
          .orderBy(desc(subscriptions.created_at))

  const grouped = new Map<string, SubscriptionRow[]>()
  for (const row of subRows) {
    const arr = grouped.get(row.student_id) ?? []
    arr.push(row)
    grouped.set(row.student_id, arr)
  }

  const buckets: Record<string, StudentSubscriptionType[]> = {}
  for (const [sid, rows] of grouped) {
    rows.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    buckets[sid] = rows.map(mapSubscriptionRow)
  }

  const bindingRows =
    ids.length === 0 ?
      []
      : await adminDb
          .select({ student_id: studentDeviceBindings.student_id })
          .from(studentDeviceBindings)
          .where(inArray(studentDeviceBindings.student_id, ids))

  const boundIds = new Set(bindingRows.map((b) => b.student_id))

  return students.map((s) => ({
    ...s,
    subscriptions: buckets[s.id] ?? [],
    hasDeviceBinding: boundIds.has(s.id),
  }))
}

export async function renewSubscription(subscriptionId: string, newEndDate: Date) {
  await adminDb
    .update(subscriptions)
    .set({ end_date: newEndDate, updated_at: new Date() })
    .where(eq(subscriptions.id, subscriptionId))
}

export type AdminSubscriptionPatch = {
  planId?: string
  startDate?: Date
  endDate?: Date
  status?: string
}

/** تحديث صف اشتراك موجود (خطة، تواريخ، حالة). يستخدم من لوحة المعلّم. */
export async function updateSubscriptionRecord(
  subscriptionId: string,
  patch: AdminSubscriptionPatch
): Promise<void> {
  const rowUpdates: Partial<typeof subscriptions.$inferInsert> & { updated_at: Date } = {
    updated_at: new Date(),
  }

  if (patch.planId !== undefined) {
    const [plan] = await adminDb
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, patch.planId))
      .limit(1)
    rowUpdates.plan_id = patch.planId
    rowUpdates.plan_name = plan?.name ?? null
  }
  if (patch.startDate !== undefined) rowUpdates.start_date = patch.startDate
  if (patch.endDate !== undefined) rowUpdates.end_date = patch.endDate
  if (patch.status !== undefined) rowUpdates.status = patch.status

  await adminDb.update(subscriptions).set(rowUpdates).where(eq(subscriptions.id, subscriptionId))
}

export async function deactivateSubscription(subscriptionId: string): Promise<void> {
  await adminDb
    .update(subscriptions)
    .set({ status: "cancelled", updated_at: new Date() })
    .where(eq(subscriptions.id, subscriptionId))
}

export async function assertSubscriptionOwnedByStudent(
  subscriptionId: string,
  studentId: string
): Promise<void> {
  const [row] = await adminDb
    .select({ student_id: subscriptions.student_id })
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1)
  if (!row || row.student_id !== studentId) {
    throw new ResourceNotFoundError("الاشتراك غير موجود")
  }
}

export async function getExpiringSubscriptions(
  daysFromNow: number
): Promise<{ subscription: StudentSubscriptionType; profile: Profile }[]> {
  const now = startOfDay(new Date())
  const horizon = endOfDay(addDays(now, daysFromNow))

  const subs = await adminDb
    .select()
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.status, ["active", "expiring_soon"]),
        gte(subscriptions.end_date, now),
        lte(subscriptions.end_date, horizon)
      )
    )

  const profilesById =
    subs.length === 0 ?
      {}
      : (
          await adminDb
            .select()
            .from(profiles)
            .where(
              inArray(
                profiles.id,
                subs.map((s) => s.student_id)
              )
            )
        ).reduce<Record<string, typeof profiles.$inferSelect>>((acc, p) => {
          acc[p.id] = p
          return acc
        }, {})

  return subs.flatMap((s) => {
    const profileRow = profilesById[s.student_id]
    if (!profileRow) return []
    return [{ subscription: mapSubscriptionRow(s), profile: mapDbProfile(profileRow) }]
  })
}
