import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { LessonsContent } from './lessons-content'
import {
  getSubscriberVideos,
  watchProgressForUser,
} from '@/lib/db/queries/videos'
import { queryKeys } from '@/lib/query-keys'
import { getServerQueryClient } from '@/lib/server/prefetch'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'
import { mergeLessonsWithProgress } from '@/lib/student-catalog-merge'

export const revalidate = 60

export default async function LessonsPage() {
  const ctx = await requireStudentContentAccess()
  const queryClient = getServerQueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.studentLessons(),
      queryFn: async () => {
        try {
          const [lessons, progress] = await Promise.all([
            getSubscriberVideos(ctx.accessToken),
            watchProgressForUser(ctx.accessToken),
          ])
          return mergeLessonsWithProgress(lessons, progress)
        } catch (e) {
          throw e instanceof Error ? e : new Error('prefetch lessons failed')
        }
      },
    })
  } catch {
    /* يعرض المحتوى من العميل عبر الإجراء */
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LessonsContent />
    </HydrationBoundary>
  )
}
