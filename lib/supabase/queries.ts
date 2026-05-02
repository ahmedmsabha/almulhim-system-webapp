import { asc, desc, eq } from "drizzle-orm"

import { createClient } from "./server"

import {
  listVideoLessonsForAdmin,
  getVideoById,
  getPublishedPdfsForAdmin,
  getPdfMaterialById,
  getAnnouncements as getAnnouncementsDb,
  getConversationsForAdmin,
  getMessagesForAdmin,
  watchProgressForUser,
  upsertWatchProgress,
  listStudentsWithSubscriptions,
} from "@/lib/db"

import { adminDb } from "@/lib/db/client"
import { subscriptionPlans, subscriptions } from "@/lib/db/schema"
import type { SubscriptionRow } from "@/lib/db/schema"

import type {
  Announcement,
  Conversation,
  Message,
  PDFMaterial,
  Profile,
  Subscription,
  SubscriptionPlan,
  WatchProgress,
  VideoLesson,
} from "@/types"

function mapSubscriptionRow(row: SubscriptionRow): Subscription {
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

// ============ VIDEO LESSONS ============

export async function getLessons(options?: {
  is_published?: boolean
  is_preview?: boolean
  unit?: string
}): Promise<VideoLesson[]> {
  return listVideoLessonsForAdmin(options)
}

export async function getLesson(id: string): Promise<VideoLesson | null> {
  return getVideoById(id)
}

// ============ PDF MATERIALS ============

export async function getMaterials(options?: {
  is_published?: boolean
  category?: string
}): Promise<PDFMaterial[]> {
  return getPublishedPdfsForAdmin(options)
}

export async function getMaterial(id: string): Promise<PDFMaterial | null> {
  return getPdfMaterialById(id)
}

// ============ ANNOUNCEMENTS ============

export async function getAnnouncements(options?: {
  is_published?: boolean
}): Promise<Announcement[]> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return []
  }

  return getAnnouncementsDb(session.access_token, options)
}

// ============ MESSAGES ============

export async function getConversations(userId?: string): Promise<Conversation[]> {
  return getConversationsForAdmin(userId)
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  return getMessagesForAdmin(conversationId)
}

// ============ SUBSCRIPTIONS ============

export async function getSubscription(studentId: string): Promise<Subscription | null> {
  const rows = await adminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.student_id, studentId))
    .orderBy(desc(subscriptions.created_at))
    .limit(1)

  const row = rows[0]
  return row ? mapSubscriptionRow(row) : null
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const rows = await adminDb
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.is_active, true))
    .orderBy(asc(subscriptionPlans.price))

  return rows.map(mapPlanRow)
}

// ============ WATCH PROGRESS ============

export async function getWatchProgress(
  studentId: string,
  lessonId?: string
): Promise<WatchProgress[]> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token || session.user.id !== studentId) {
    return []
  }

  return watchProgressForUser(session.access_token, lessonId)
}

export async function updateWatchProgress(
  studentId: string,
  lessonId: string,
  progress: number,
  lastPosition: number
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token || session.user.id !== studentId) {
      return false
    }

    await upsertWatchProgress(
      studentId,
      lessonId,
      lastPosition,
      progress,
      false,
      session.access_token
    )
    return true
  } catch (e) {
    console.error("Error updating watch progress:", e)
    return false
  }
}

// ============ STUDENTS (Admin) ============

export async function getStudents(options?: {
  search?: string
  subscription_status?: string
}): Promise<(Profile & { subscriptions: Subscription[] })[]> {
  const rows = await listStudentsWithSubscriptions({ search: options?.search })

  if (!options?.subscription_status) {
    return rows as (Profile & { subscriptions: Subscription[] })[]
  }

  return rows.filter((row) => {
    const primary = row.subscriptions[0]
    return primary?.status === options.subscription_status
  }) as (Profile & { subscriptions: Subscription[] })[]
}

// ============ STORAGE HELPERS ============

export async function getVideoSignedUrl(videoPath: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.storage.from("videos").createSignedUrl(videoPath, 3600)

  if (error) {
    console.error("Error getting video signed URL:", error)
    return null
  }

  return data.signedUrl
}

export async function getPdfSignedUrl(pdfPath: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.storage.from("materials").createSignedUrl(pdfPath, 3600)

  if (error) {
    console.error("Error getting PDF signed URL:", error)
    return null
  }

  return data.signedUrl
}

export async function uploadFile(
  bucket: "avatars" | "thumbnails" | "materials" | "announcements",
  file: File,
  path: string
) {
  const supabase = await createClient()

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  })

  if (error) {
    console.error("Error uploading file:", error)
    return null
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return urlData.publicUrl
}
