import { LessonsContent } from './lessons-content'
import { getSubscriberVideosWithProgress } from '@/lib/db/queries/videos'
import { mergeLessonsWithProgress } from '@/lib/server/student-home-data'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'

export default async function LessonsPage() {
  const { accessToken } = await requireStudentContentAccess()

  const { lessons, progress } = await getSubscriberVideosWithProgress(accessToken)
  const merged = mergeLessonsWithProgress(lessons, progress)
  return <LessonsContent initialLessons={merged} />
}
