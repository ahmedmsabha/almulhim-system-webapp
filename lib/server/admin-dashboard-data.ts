import "server-only"

import { count, desc, eq, gt, inArray } from "drizzle-orm"

import { adminDb } from "@/lib/db/client"
import {
  conversations,
  pdfMaterials,
  profiles,
  subscriptions,
  videoLessons,
  watchProgress,
} from "@/lib/db/schema"

export type AdminDashboardRecentWatch = {
  studentName: string
  lessonTitle: string
  completed: boolean
  lastPositionSeconds: number
  progressPercent: number
  lastWatchedAt: Date
}

export type AdminDashboardRecentStudent = {
  id: string
  full_name: string
  email: string
  planLabel: string
  isActive: boolean
}

export type AdminDashboardData = {
  studentCount: number
  lessonCount: number
  pdfCount: number
  watchEngagementCount: number
  recentWatch: AdminDashboardRecentWatch[]
  unreadConversationsCount: number
  recentStudents: AdminDashboardRecentStudent[]
}

function toInt(n: unknown): number {
  if (typeof n === "bigint") return Number(n)
  if (typeof n === "number" && Number.isFinite(n)) return n
  const parsed = Number(n)
  return Number.isFinite(parsed) ? parsed : 0
}

function latestSubIsActive(row: typeof subscriptions.$inferSelect | undefined): boolean {
  if (!row) return false
  if (row.status !== "active" && row.status !== "expiring_soon") return false
  const end = row.end_date instanceof Date ? row.end_date : new Date(row.end_date)
  return end.getTime() >= Date.now()
}

export async function loadAdminDashboardData(): Promise<AdminDashboardData> {
  const empty: AdminDashboardData = {
    studentCount: 0,
    lessonCount: 0,
    pdfCount: 0,
    watchEngagementCount: 0,
    recentWatch: [],
    unreadConversationsCount: 0,
    recentStudents: [],
  }

  try {
    const [
      studentCountRow,
      lessonCountRow,
      pdfCountRow,
      watchEngagementRow,
      recentWatchRows,
      unreadConvsRow,
      recentProfileRows,
    ] = await Promise.all([
      adminDb
        .select({ count: count() })
        .from(profiles)
        .where(eq(profiles.role, "student")),
      adminDb
        .select({ count: count() })
        .from(videoLessons)
        .where(eq(videoLessons.is_published, true)),
      adminDb
        .select({ count: count() })
        .from(pdfMaterials)
        .where(eq(pdfMaterials.is_published, true)),
      adminDb
        .select({ count: count() })
        .from(watchProgress)
        .where(gt(watchProgress.progress, 0)),
      adminDb
        .select({
          studentName: profiles.full_name,
          lessonTitle: videoLessons.title,
          completed: watchProgress.completed,
          lastPositionSeconds: watchProgress.last_position,
          progressPercent: watchProgress.progress,
          lastWatchedAt: watchProgress.last_watched_at,
        })
        .from(watchProgress)
        .innerJoin(profiles, eq(watchProgress.student_id, profiles.id))
        .innerJoin(videoLessons, eq(watchProgress.lesson_id, videoLessons.id))
        .orderBy(desc(watchProgress.last_watched_at))
        .limit(5),
      adminDb
        .select({ count: count() })
        .from(conversations)
        .where(gt(conversations.unread_count, 0)),
      adminDb
        .select({
          id: profiles.id,
          full_name: profiles.full_name,
          email: profiles.email,
        })
        .from(profiles)
        .where(eq(profiles.role, "student"))
        .orderBy(desc(profiles.created_at))
        .limit(5),
    ])

    const studentIds = recentProfileRows.map((r) => r.id)
    const subRows =
      studentIds.length === 0 ?
        []
      : await adminDb
          .select()
          .from(subscriptions)
          .where(inArray(subscriptions.student_id, studentIds))
          .orderBy(desc(subscriptions.created_at))

    const latestByStudent = new Map<string, typeof subscriptions.$inferSelect>()
    for (const row of subRows) {
      if (!latestByStudent.has(row.student_id)) {
        latestByStudent.set(row.student_id, row)
      }
    }

    const recentStudents: AdminDashboardRecentStudent[] = recentProfileRows.map((p) => {
      const latest = latestByStudent.get(p.id)
      const planLabel = latest?.plan_name?.trim() || "بانتظار التفعيل"
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        planLabel,
        isActive: latestSubIsActive(latest),
      }
    })

    const recentWatch: AdminDashboardRecentWatch[] = recentWatchRows.map((r) => ({
      studentName: r.studentName,
      lessonTitle: r.lessonTitle,
      completed: r.completed,
      lastPositionSeconds: r.lastPositionSeconds,
      progressPercent: r.progressPercent,
      lastWatchedAt:
        r.lastWatchedAt instanceof Date ? r.lastWatchedAt : new Date(r.lastWatchedAt),
    }))

    return {
      studentCount: toInt(studentCountRow[0]?.count),
      lessonCount: toInt(lessonCountRow[0]?.count),
      pdfCount: toInt(pdfCountRow[0]?.count),
      watchEngagementCount: toInt(watchEngagementRow[0]?.count),
      recentWatch,
      unreadConversationsCount: toInt(unreadConvsRow[0]?.count),
      recentStudents,
    }
  } catch {
    return empty
  }
}
