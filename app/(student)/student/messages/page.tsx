import type { Metadata } from 'next'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { MessagesContent } from './messages-content'
import { queryKeys } from '@/lib/query-keys'
import { getServerQueryClient } from '@/lib/server/prefetch'
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
  const admin = await getDefaultAdminContact()

  const queryClient = getServerQueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.studentMessages(conv.id),
      queryFn: async () => {
        try {
          return await getMessages(conv.id, accessToken)
        } catch (e) {
          throw e instanceof Error ? e : new Error('prefetch messages failed')
        }
      },
    })
  } catch {
    /* العميل يعيد الجلب */
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MessagesContent
        conversationId={conv.id}
        studentId={profile.id}
        studentName={profile.full_name}
        adminName={admin.full_name}
        adminAvatarUrl={admin.avatar_url}
      />
    </HydrationBoundary>
  )
}
