import "server-only"

import { and, asc, desc, eq } from "drizzle-orm"
import { jwtDecode, type JwtPayload } from "jwt-decode"

import { fetchAnnouncementsForTx, rowToAnnouncement } from "@/lib/db/queries/announcements"
import { rowToPdf } from "@/lib/db/queries/pdfs"
import { rowToVideoLesson, wpRow } from "@/lib/db/queries/videos"
import { withUserDb } from "@/lib/db/client"
import { pdfMaterials, videoLessons, watchProgress } from "@/lib/db/schema"
import { subscriptionIsActive } from "@/lib/db/subscription"
import { UnauthorizedError } from "@/lib/db/errors"
import type {
  Announcement,
  LessonWithProgress,
  MaterialWithStatus,
  PDFMaterial,
  Subscription,
  WatchProgress,
} from "@/types"
import {
  materialsWithPlaceholderStatus,
  mergeLessonsWithProgress,
} from "@/lib/student-catalog-merge"

export { mergeLessonsWithProgress, materialsWithPlaceholderStatus }

export type StudentHomePayload = {
  lessonsWithProgress: LessonWithProgress[]
  materials: MaterialWithStatus[]
  announcements: Announcement[]
  watchProgress: WatchProgress[]
  subscription: Subscription | null
}

/** One Postgres session for the whole dashboard (slow networks / pooler). */
export async function loadStudentHomeData(
  accessToken: string,
  subscription: Subscription | null
): Promise<StudentHomePayload> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub
  if (!subClaim) {
    throw new UnauthorizedError()
  }

  return withUserDb(accessToken, async (tx) => {
    const active = await subscriptionIsActive(tx, subClaim)

    const lessonRowsPromise =
      active ?
        tx
          .select()
          .from(videoLessons)
          .where(eq(videoLessons.is_published, true))
          .orderBy(asc(videoLessons.order), asc(videoLessons.created_at))
      : tx
          .select()
          .from(videoLessons)
          .where(and(eq(videoLessons.is_published, true), eq(videoLessons.is_preview, true)))
          .orderBy(asc(videoLessons.order), asc(videoLessons.created_at))

    const progressPromise = tx
      .select()
      .from(watchProgress)
      .where(eq(watchProgress.student_id, subClaim))

    const pdfRowsPromise =
      active ?
        tx
          .select()
          .from(pdfMaterials)
          .where(eq(pdfMaterials.is_published, true))
          .orderBy(desc(pdfMaterials.created_at))
      : Promise.resolve([] as (typeof pdfMaterials.$inferSelect)[])

    const announcementsPromise = fetchAnnouncementsForTx(tx, { is_published: true })

    const [lessonRows, progressRows, pdfRows, announcementRows] = await Promise.all([
      lessonRowsPromise,
      progressPromise,
      pdfRowsPromise,
      announcementsPromise,
    ])

    const lessons = lessonRows.map(rowToVideoLesson)
    const progress = progressRows.map(wpRow)
    const pdfs: PDFMaterial[] = pdfRows.map(rowToPdf)
    const announcements = announcementRows.map(rowToAnnouncement)

    return {
      lessonsWithProgress: mergeLessonsWithProgress(lessons, progress),
      materials: materialsWithPlaceholderStatus(pdfs),
      announcements,
      watchProgress: progress,
      subscription,
    }
  })
}
