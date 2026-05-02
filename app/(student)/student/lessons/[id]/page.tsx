import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { StudentLessonDetail } from '@/components/student/lessons/student-lesson-detail'
import { createClient } from '@/lib/supabase/server'
import { requireStudentLayoutContext } from '@/lib/server/layout-gates'
import { getSubscriberVideos, watchProgressForUser, getVideoById } from '@/lib/db/queries/videos'
import { mergeLessonsWithProgress } from '@/lib/server/student-home-data'

interface LessonPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { id } = await params
  const lesson = await getVideoById(id)

  if (!lesson) {
    return { title: 'درس غير موجود' }
  }

  return {
    title: lesson.title,
    description: lesson.description,
  }
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params
  const { subscriptionStatus } = await requireStudentLayoutContext()
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) notFound()

  const [lessons, progress] = await Promise.all([
    getSubscriberVideos(session.access_token),
    watchProgressForUser(session.access_token),
  ])
  const merged = mergeLessonsWithProgress(lessons, progress)
  const lesson = merged.find((l) => l.id === id)
  if (!lesson) notFound()

  const relatedLessons = merged
    .filter((l) => l.unit === lesson.unit && l.id !== lesson.id)
    .slice(0, 8)

  return (
    <StudentLessonDetail
      lesson={lesson}
      relatedLessons={relatedLessons}
      isSubscriptionExpired={subscriptionStatus === 'expired' || subscriptionStatus === 'none'}
    />
  )
}
