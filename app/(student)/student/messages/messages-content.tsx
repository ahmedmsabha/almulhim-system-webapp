'use client'

import { useCallback } from 'react'

import { markAsRead, sendStudentMessage } from '@/actions/messages'
import { ChatThread } from '@/components/chat/chat-thread'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Message, MessageAttachment } from '@/types'

export function MessagesContent({
  conversationId,
  studentId,
  studentName,
  adminName,
  adminAvatarUrl,
  initialMessages,
}: {
  conversationId: string
  studentId: string
  studentName: string
  adminName: string
  adminAvatarUrl: string | null
  initialMessages: Message[]
}) {
  const studentInitial = studentName.trim()[0] ?? '?'
  const adminInitial = adminName.trim()[0] ?? 'م'

  const markReadOnMount = useCallback(() => markAsRead(conversationId), [conversationId])

  const onSend = useCallback(
    (content: string, attachments: MessageAttachment[]) =>
      sendStudentMessage({ conversationId, content, attachments }),
    [conversationId]
  )

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title-student">الرسائل</h1>
        <p className="page-subtitle-student">
          طرح أسئلتك بخصوص الدروس والتجارب — تواصل مباشر مع المعلِّم (نص، صور، PDF، صوت)
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <Card className="flex min-h-[60vh] flex-col overflow-hidden lg:col-span-2">
          <ChatThread
            conversationId={conversationId}
            viewerUserId={studentId}
            peerName={adminName}
            peerAvatarUrl={adminAvatarUrl}
            viewerInitial={studentInitial}
            peerInitial={adminInitial}
            initialMessages={initialMessages}
            onSend={onSend}
            markReadOnMount={markReadOnMount}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">معلومات المدرس</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={adminAvatarUrl || undefined} />
                <AvatarFallback className="text-lg">{adminInitial}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{adminName}</p>
                <p className="text-sm text-muted-foreground">مدرس الفيزياء</p>
              </div>
            </div>

            <hr />

            <div>
              <h4 className="mb-2 font-medium">أوقات التواصل</h4>
              <p className="text-sm text-muted-foreground">
                متاح للرد على الرسائل من 9 صباحاً حتى 9 مساءً
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">المرفقات</h4>
              <p className="text-sm text-muted-foreground">
                يمكنك إرسال حتى ٥ صور في رسالة واحدة، أو حتى ٥ ملفات (PDF/صوت) — دون خلط الصور
                مع الملفات في نفس الرسالة.
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">ملاحظة</h4>
              <p className="text-sm text-muted-foreground">
                للاستفسارات العاجلة، يمكنك التواصل عبر واتساب على الرقم المسجل في صفحة
                الاشتراك.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
