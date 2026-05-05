import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { AnnouncementsFeed } from '@/components/student/announcements/announcements-feed'
import { getAnnouncements as fetchAnnouncementsFromDb } from '@/lib/db/queries/announcements'
import { queryKeys } from '@/lib/query-keys'
import { getServerQueryClient } from '@/lib/server/prefetch'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'
import { sortAnnouncementsForStudentUi } from '@/lib/student-catalog-merge'

export const metadata: Metadata = {
  title: 'الإعلانات',
  description: 'آخر الإعلانات والتحديثات من المدرس',
}

export const revalidate = 60

export default async function AnnouncementsPage() {
  const ctx = await requireStudentContentAccess()
  const queryClient = getServerQueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.studentAnnouncements(),
      queryFn: async () => {
        try {
          const list = await fetchAnnouncementsFromDb(ctx.accessToken, {
            is_published: true,
          })
          return sortAnnouncementsForStudentUi(list)
        } catch (e) {
          throw e instanceof Error ? e : new Error('prefetch announcements failed')
        }
      },
    })
  } catch {
    /* يتابع العميل */
  }

  return (
    <div className="space-y-8">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AnnouncementsFeed />
      </HydrationBoundary>
    </div>
  )
}
