import "server-only"

import { getAnnouncements } from "@/lib/db/queries/announcements"
import { getSubscriberPdfs } from "@/lib/db/queries/pdfs"
import { getSubscriberVideos, watchProgressForUser } from "@/lib/db/queries/videos"
import type {
  Announcement,
  LessonWithProgress,
  MaterialWithStatus,
  PDFMaterial,
  Subscription,
  VideoLesson,
  WatchProgress,
} from "@/types"

export function mergeLessonsWithProgress(
  lessons: VideoLesson[],
  progress: WatchProgress[]
): LessonWithProgress[] {
  const byLesson = new Map(progress.map((p) => [p.lesson_id, p]))
  return lessons.map((l) => ({
    ...l,
    watch_progress: byLesson.get(l.id),
    download_status: "not_downloaded" as const,
  }))
}

export function materialsWithPlaceholderStatus(pdfs: PDFMaterial[]): MaterialWithStatus[] {
  return pdfs.map((m) => ({
    ...m,
    download_status: "not_downloaded" as const,
  }))
}

export type StudentHomePayload = {
  lessonsWithProgress: LessonWithProgress[]
  materials: MaterialWithStatus[]
  announcements: Announcement[]
  watchProgress: WatchProgress[]
  subscription: Subscription | null
}

export async function loadStudentHomeData(
  accessToken: string,
  subscription: Subscription | null
): Promise<StudentHomePayload> {
  const [lessons, progress, pdfs, announcementRows] = await Promise.all([
    getSubscriberVideos(accessToken),
    watchProgressForUser(accessToken),
    getSubscriberPdfs(accessToken),
    getAnnouncements(accessToken, { is_published: true }),
  ])

  return {
    lessonsWithProgress: mergeLessonsWithProgress(lessons, progress),
    materials: materialsWithPlaceholderStatus(pdfs),
    announcements: announcementRows,
    watchProgress: progress,
    subscription,
  }
}
