import "server-only"

import { cache } from "react"
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm"
import { unstable_noStore as noStore } from "next/cache"

import {
  getMergedTeacherContact,
  resolveTeacherDisplayName,
  type MergedTeacherContact,
} from "@/lib/db/queries/site-settings"
import { adminDb } from "@/lib/db/client"
import {
  pdfMaterials,
  profiles,
  subscriptions,
  videoLessons,
} from "@/lib/db/schema"
import { rowToVideoLesson } from "@/lib/db/queries/videos"
import type { VideoLesson } from "@/types"

export type PublicLandingStats = {
  /** طلاب لديهم اشتراك فعّال حسب جدول الاشتراكات وتاريخ الانتهاء. */
  activeSubscribers: number
  publishedLessons: number
  publishedPdfs: number
  freePreviewLessons: number
}

export type PublicSiteSnapshot = {
  teacherDisplayName: string
  teacherEmail: string | null
  contact: MergedTeacherContact
  landingStats: PublicLandingStats
  previewLessons: VideoLesson[]
}

/**
 * بيانات عامة للصفحة الرئيسية والتذييل: معلِّم من جدول الملفات الشخصية، إحصاءات من الجداول، دروس المعاينة المنشورة.
 */
export const getPublicSiteSnapshot = cache(async (): Promise<PublicSiteSnapshot> => {
  /** يمنع تخزين RSC/HTML لهذا المسار في كاش مسار Next — يكمِّل تعطيل الكاش عن طريق SW في الإنتاج */
  noStore()

  const today = sql`timezone('utc'::text, now())::timestamp with time zone`

  const [
    contact,
    adminRows,
    activeSubscribersRow,
    lessonCountRow,
    pdfCountRow,
    previewRows,
  ] = await Promise.all([
    getMergedTeacherContact(),
    adminDb
      .select({ full_name: profiles.full_name, email: profiles.email })
      .from(profiles)
      .where(sql`lower(trim(coalesce(${profiles.role}, ''))) = 'admin'`)
      .orderBy(desc(profiles.updated_at))
      .limit(1),
    adminDb
      .select({
        n: sql<number>`cast(count(distinct ${subscriptions.student_id}) as integer)`,
      })
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.status, ["active", "expiring_soon"]),
          sql`${subscriptions.end_date}::timestamp with time zone >= (${today})`
        )
      ),
    adminDb
      .select({ c: count() })
      .from(videoLessons)
      .where(eq(videoLessons.is_published, true)),
    adminDb
      .select({ c: count() })
      .from(pdfMaterials)
      .where(eq(pdfMaterials.is_published, true)),
    adminDb
      .select()
      .from(videoLessons)
      .where(
        and(eq(videoLessons.is_published, true), eq(videoLessons.is_preview, true))
      )
      .orderBy(asc(videoLessons.order), asc(videoLessons.created_at))
      .limit(9),
  ])

  const admin = adminRows[0]
  const teacherDisplayName = resolveTeacherDisplayName(admin?.full_name)
  const teacherEmail = admin?.email?.trim() || null

  const activeSubscribers = Number(activeSubscribersRow[0]?.n ?? 0)
  const publishedLessons = Number(lessonCountRow[0]?.c ?? 0)
  const publishedPdfs = Number(pdfCountRow[0]?.c ?? 0)
  const previewLessons = previewRows.map(rowToVideoLesson)

  return {
    teacherDisplayName,
    teacherEmail,
    contact,
    landingStats: {
      activeSubscribers,
      publishedLessons,
      publishedPdfs,
      freePreviewLessons: previewLessons.length,
    },
    previewLessons,
  }
})
