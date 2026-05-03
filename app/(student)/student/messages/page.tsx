import type { Metadata } from 'next'

import { MessagesContent } from './messages-content'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'
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
  const { profile, accessToken } = await requireStudentContentAccess()

  const conv = await getOrCreateConversation(profile.id, accessToken)
  const initialMessages = await getMessages(conv.id, accessToken)
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
