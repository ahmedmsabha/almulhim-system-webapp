'use client'

import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'

import { getAnnouncements } from '@/actions/announcements'
import { AnnouncementCard } from '@/components/student/announcements/announcement-card'
import { EmptyState } from '@/components/shared/feedback/empty-state'
import { getMonthStickyLabel } from '@/lib/format-relative-ar'
import { queryKeys } from '@/lib/query-keys'
import { sortAnnouncementsForStudentUi } from '@/lib/student-catalog-merge'

function monthStamp(isoDate: string): string {
  const d = new Date(isoDate)
  return `${d.getFullYear()}-${d.getMonth()}`
}

export function AnnouncementsFeed() {
  const { data: sortedAnnouncements = [] } = useQuery({
    queryKey: queryKeys.studentAnnouncements(),
    queryFn: async () => {
      try {
        const res = await getAnnouncements()
        if (!res.success) {
          throw new Error(res.error)
        }
        return sortAnnouncementsForStudentUi(res.data)
      } catch (e) {
        throw e instanceof Error ? e : new Error('فشل تحميل الإعلانات')
      }
    },
  })

  return (
    <>
      <header>
        <h1 className="page-title-student">الإعلانات</h1>
        <p className="page-subtitle-student">
          رسائل مهمة وجداول ومعلومات من المعلِّم قبل الحصّة والاختبارات
        </p>
      </header>

      {sortedAnnouncements.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="لا توجد إعلانات"
          description="لم يتم نشر إعلانات بعد. ستظهر هنا فور طرح أي تحديث."
          variant="card"
        />
      ) : (
        <div className="relative space-y-6">
          {sortedAnnouncements.map((announcement, index) => {
            const stamp = monthStamp(announcement.published_at)
            const prevStamp =
              index === 0 ? null : monthStamp(sortedAnnouncements[index - 1]?.published_at ?? '')
            const showMonthRibbon = stamp !== prevStamp

            return (
              <div key={announcement.id}>
                {showMonthRibbon && (
                  <div
                    className="sticky top-[6.85rem] z-10 mb-6 mt-14 flex justify-center px-4 first:-mt-0 sm:top-[7.85rem]"
                    role="presentation"
                  >
                    <span className="inline-flex min-w-[12rem] items-center justify-center rounded-full border border-border/70 bg-muted/95 px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-lg">
                      {getMonthStickyLabel(announcement.published_at)}
                    </span>
                  </div>
                )}
                <AnnouncementCard announcement={announcement} />
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
