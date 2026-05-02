import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AnnouncementCard } from '@/components/student/announcements/announcement-card'
import { EmptyState } from '@/components/shared/feedback/empty-state'
import { Bell } from 'lucide-react'
import { getMonthStickyLabel } from '@/lib/format-relative-ar'
import { createClient } from '@/lib/supabase/server'
import { getAnnouncements } from '@/lib/db/queries/announcements'

export const metadata: Metadata = {
  title: 'الإعلانات',
  description: 'آخر الإعلانات والتحديثات من المدرس',
}

function monthStamp(isoDate: string): string {
  const d = new Date(isoDate)
  return `${d.getFullYear()}-${d.getMonth()}`
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) redirect('/login')

  const list = await getAnnouncements(session.access_token, { is_published: true })
  const sortedAnnouncements = [...list].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  })

  return (
    <div className="space-y-8">
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
    </div>
  )
}
