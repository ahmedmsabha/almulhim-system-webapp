"use client"

import { useCallback, useEffect, useState } from "react"
import { Mail, Search, User } from "lucide-react"

import {
  loadAdminThread,
  markAdminConversationRead,
  sendAdminThreadMessage,
} from "@/actions/messages"
import { ChatThread } from "@/components/chat/chat-thread"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { queryKeys } from "@/lib/query-keys"
import type { Conversation, MessageAttachment } from "@/types"

function convPreview(c: Conversation): string {
  const t = (c.last_message ?? "").trim().split("\n")[0] ?? ""
  return t.length <= 72 ? t : `${t.slice(0, 69)}…`
}

export function AdminMessagesClient({
  adminId,
  adminName,
  initialConversations,
}: {
  adminId: string
  adminName: string
  initialConversations: Conversation[]
}) {
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  )
  const [search, setSearch] = useState("")

  const adminInitial = adminName.trim()[0] ?? "م"

  useEffect(() => {
    setConversations(initialConversations)
  }, [initialConversations])

  useEffect(() => {
    if (!selectedId) return
    void (async () => {
      try {
        await markAdminConversationRead(selectedId)
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c))
        )
      } catch {
        /* ignore */
      }
    })()
  }, [selectedId])

  const filtered = conversations.filter((c) =>
    `${c.student_name} ${c.last_message ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  const fetchMessages = useCallback(async () => {
    if (!selectedId) {
      throw new Error("لا محادثة محددة")
    }
    try {
      const res = await loadAdminThread(selectedId)
      if (!res.success) {
        throw new Error(res.error)
      }
      return res.data
    } catch (e) {
      throw e instanceof Error ? e : new Error("فشل تحميل الرسائل")
    }
  }, [selectedId])

  const onSend = useCallback(
    async (content: string, attachments: MessageAttachment[]) =>
      sendAdminThreadMessage({
        conversationId: selectedId!,
        content,
        attachments,
      }),
    [selectedId]
  )

  const markReadNoop = useCallback(async () => Promise.resolve(), [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الرسائل</h1>
        <p className="text-muted-foreground">
          محادثات مباشرة مع الطلاب — نص، صور، PDF، ورسائل صوتية
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الطالب أو آخر رسالة…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
                dir="rtl"
              />
            </div>
          </div>
          <div className="max-h-[70vh] divide-y overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                لا توجد محادثات مطابقة
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-start gap-3 p-4 text-right transition-colors hover:bg-muted/50",
                  selectedId === c.id && "bg-muted/60"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                    c.unread_count > 0 ? "bg-primary/15" : "bg-muted"
                  )}
                >
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{c.student_name}</span>
                    {c.unread_count > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {convPreview(c) || "…"}
                  </p>
                  {c.last_message_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-[70vh] flex-col overflow-hidden border-0 shadow-sm lg:col-span-3">
          {!selected ?
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
              <Mail className="h-12 w-12 opacity-40" />
              <p>اختر محادثة من القائمة</p>
            </div>
          : <ChatThread
              key={selected.id}
              conversationId={selected.id}
              viewerUserId={adminId}
              peerName={selected.student_name}
              peerAvatarUrl={selected.student_avatar}
              viewerInitial={adminInitial}
              peerInitial={selected.student_name.trim()[0] ?? "ط"}
              messagesQueryKey={queryKeys.adminConversation(selected.id)}
              fetchMessages={fetchMessages}
              senderRole="admin"
              onSend={onSend}
              markReadOnMount={markReadNoop}
            />
          }
        </Card>
      </div>
    </div>
  )
}
