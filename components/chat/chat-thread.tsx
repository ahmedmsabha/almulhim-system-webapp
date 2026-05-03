"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle, Clock } from "lucide-react"

import { ChatComposer } from "@/components/chat/chat-composer"
import { useConversationMessagesRealtime } from "@/components/chat/use-conversation-realtime"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Message, MessageAttachment } from "@/types"
import type { ActionResult } from "@/types/api"
import Link from "next/link"

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  if (days === 1) return "أمس"
  if (days < 7) return `منذ ${days} أيام`
  return date.toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
  })
}

function AttachmentGrid({ items }: { items: MessageAttachment[] }) {
  const images = items.filter((a) => a.kind === "image")
  const rest = items.filter((a) => a.kind !== "image")

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {images.map((a) => (
            <div key={a.storage_path} className="overflow-hidden rounded-lg bg-background/20">
              {a.signed_url ?
                <a
                  href={a.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL موقّع من التخزين */}
                  <img
                    src={a.signed_url}
                    alt={a.file_name}
                    className="max-h-48 w-full object-cover"
                  />
                </a>
              : <p className="p-2 text-center text-xs opacity-80">جاري جلب الصورة…</p>}
            </div>
          ))}
        </div>
      )}
      {rest.map((a) => (
        <div key={a.storage_path}>
          {a.kind === "pdf" ?
            <Link
              href={a.signed_url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "text-sm underline underline-offset-2",
                !a.signed_url && "pointer-events-none opacity-50"
              )}
            >
              📄 {a.file_name}
            </Link>
          : a.signed_url ?
            <audio controls className="h-9 w-full max-w-[280px]" src={a.signed_url}>
              <track kind="captions" />
            </audio>
          : <p className="text-xs opacity-80">جاري تجهيز التسجيل…</p>}
        </div>
      ))}
    </div>
  )
}

export function ChatThread({
  conversationId,
  viewerUserId,
  peerName,
  peerAvatarUrl,
  viewerInitial,
  peerInitial,
  initialMessages,
  onSend,
  markReadOnMount,
  composerDisabled,
}: {
  conversationId: string
  viewerUserId: string
  peerName: string
  peerAvatarUrl: string | null
  viewerInitial: string
  peerInitial: string
  initialMessages: Message[]
  onSend: (text: string, attachments: MessageAttachment[]) => Promise<ActionResult<Message>>
  markReadOnMount: () => Promise<unknown>
  composerDisabled?: boolean
}) {
  const [messages, setMessages] = useState(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    void markReadOnMount()
  }, [conversationId, markReadOnMount])

  const appendIncoming = useCallback((m: Message) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev
      return [...prev, m]
    })
  }, [])

  useConversationMessagesRealtime(conversationId, appendIncoming)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (text: string, attachments: MessageAttachment[]) =>
    onSend(text, attachments).then((res) => {
      if (res.success) {
        appendIncoming(res.data)
      }
      return res
    })

  return (
    <div className="flex h-full min-h-[50vh] flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b px-4 py-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={peerAvatarUrl || undefined} />
          <AvatarFallback>{peerInitial}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{peerName}</p>
          <p className="text-xs text-muted-foreground">دردشة مباشرة</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isViewer = message.sender_id === viewerUserId
            return (
              <div
                key={message.id}
                className={cn("flex gap-3", isViewer && "flex-row-reverse")}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>{isViewer ? viewerInitial : peerInitial}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 sm:max-w-[70%]",
                    isViewer ?
                      "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                  )}
                >
                  {message.content ?
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  : null}
                  {message.attachments.length > 0 && (
                    <div className={cn(message.content && "mt-2")}>
                      <AttachmentGrid items={message.attachments} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs",
                      isViewer ?
                        "justify-start text-primary-foreground/70"
                      : "justify-end text-muted-foreground"
                    )}
                  >
                    <span>{formatMessageTime(message.created_at)}</span>
                    {isViewer &&
                      (message.is_read ?
                        <CheckCircle className="h-3 w-3" />
                      : <Clock className="h-3 w-3" />)}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <ChatComposer
        conversationId={conversationId}
        disabled={composerDisabled}
        onSend={handleSend}
      />
    </div>
  )
}
