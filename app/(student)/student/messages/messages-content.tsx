'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { sendMessage as sendMessageAction } from '@/actions/messages'
import type { Message } from '@/types'

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else if (days === 1) {
    return 'أمس'
  } else if (days < 7) {
    return `منذ ${days} أيام`
  } else {
    return date.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
    })
  }
}

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
  const router = useRouter()
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newMessage.trim()
    if (!text || sending) return

    setSending(true)
    try {
      const result = await sendMessageAction({
        conversationId,
        senderId: studentId,
        content: text,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setNewMessage('')
      router.refresh()
    } catch {
      toast.error('تعذر إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  const studentInitial = studentName.trim()[0] ?? '?'
  const adminInitial = adminName.trim()[0] ?? 'م'

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title-student">الرسائل</h1>
        <p className="page-subtitle-student">
          طرح أسئلتك بخصوص الدروس والتجارب — المعلِّم يرى المحادثة هنا
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={adminAvatarUrl || undefined} />
                <AvatarFallback>{adminInitial}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{adminName}</CardTitle>
                <p className="text-xs text-muted-foreground">المدرس</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[50vh] p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isStudent = message.sender_role === 'student'
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        isStudent && 'flex-row-reverse'
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          {isStudent ? studentInitial : adminInitial}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          isStudent
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        )}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div
                          className={cn(
                            'mt-1 flex items-center gap-1 text-xs',
                            isStudent
                              ? 'text-primary-foreground/70 justify-start'
                              : 'text-muted-foreground justify-end'
                          )}
                        >
                          <span>{formatMessageTime(message.created_at)}</span>
                          {isStudent && (
                            message.is_read ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 border-t p-4"
            >
              <Input
                placeholder="اكتب رسالتك..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || sending}
                className="min-h-11 min-w-11 shrink-0 sm:min-h-10 sm:min-w-10"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">إرسال</span>
              </Button>
            </form>
          </CardContent>
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
              <h4 className="mb-2 font-medium">ملاحظة</h4>
              <p className="text-sm text-muted-foreground">
                للاستفسارات العاجلة، يمكنك التواصل عبر واتساب على الرقم المسجل في صفحة الاشتراك.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
