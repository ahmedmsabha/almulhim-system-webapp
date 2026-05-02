import { redirect } from 'next/navigation'

import { LessonsContent } from './lessons-content'
import { createClient } from '@/lib/supabase/server'
import { getSubscriberVideos, watchProgressForUser } from '@/lib/db/queries/videos'
import { mergeLessonsWithProgress } from '@/lib/server/student-home-data'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'

export default async function LessonsPage() {
  await requireStudentContentAccess()
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) redirect('/login')

  const [lessons, progress] = await Promise.all([
    getSubscriberVideos(session.access_token),
    watchProgressForUser(session.access_token),
  ])
  const merged = mergeLessonsWithProgress(lessons, progress)
  return <LessonsContent initialLessons={merged} />
}
