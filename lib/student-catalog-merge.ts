import type {
  Announcement,
  LessonWithProgress,
  MaterialWithStatus,
  PDFMaterial,
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

export function sortAnnouncementsForStudentUi(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  })
}
