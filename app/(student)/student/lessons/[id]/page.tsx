import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { StudentLessonDetail } from '@/components/student/lessons/student-lesson-detail'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'
import { getSubscriberLessonDetailPage, getVideoById } from '@/lib/db/queries/videos'

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
  const { accessToken } = await requireStudentContentAccess()

  const detail = await getSubscriberLessonDetailPage(accessToken, id)
  if (!detail) notFound()

  const { lesson, related } = detail

  return (
    <StudentLessonDetail
      lesson={lesson}
      relatedLessons={related}
      isSubscriptionExpired={false}
    />
  )
}
