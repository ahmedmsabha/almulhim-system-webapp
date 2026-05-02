import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { MessagesContent } from './messages-content'
import { createClient } from '@/lib/supabase/server'
import { requireStudentLayoutContext } from '@/lib/server/layout-gates'
import {
  getDefaultAdminContact,
  getMessages,
  getOrCreateConversation,
} from '@/lib/db/queries/messages'

export const metadata: Metadata = {
  title: 'الرسائل',
  description: 'التواصل مع المدرس',
}

export default async function MessagesPage() {
  const { profile } = await requireStudentLayoutContext()
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) redirect('/login')

  const conv = await getOrCreateConversation(profile.id, session.access_token)
  const initialMessages = await getMessages(conv.id, session.access_token)
  const admin = await getDefaultAdminContact()

  return (
    <MessagesContent
      conversationId={conv.id}
      studentId={profile.id}
      studentName={profile.full_name}
      adminName={admin.full_name}
      adminAvatarUrl={admin.avatar_url}
      initialMessages={initialMessages}
    />
  )
}
