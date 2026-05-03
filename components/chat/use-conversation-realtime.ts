"use client"

import { useEffect, useRef } from "react"

import { signChatAttachmentUrls } from "@/actions/chat-upload"
import { createClient } from "@/lib/supabase/client"
import type { Message, MessageAttachment } from "@/types"

function normalizeAttachments(raw: unknown): MessageAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw as MessageAttachment[]
}

function rowToMessage(
  row: Record<string, unknown>,
  signed: Record<string, string>
): Message {
  const attachments = normalizeAttachments(row.attachments).map((a) => ({
    ...a,
    signed_url: signed[a.storage_path] ?? a.signed_url,
  }))

  const createdRaw = row.created_at
  const created_at =
      typeof createdRaw === "string" ?
        createdRaw
      : createdRaw instanceof Date ?
        createdRaw.toISOString()
      : new Date(String(createdRaw)).toISOString()

  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    sender_id: String(row.sender_id),
    sender_role: row.sender_role === "admin" ? "admin" : "student",
    content: String(row.content ?? ""),
    attachments,
    is_read: Boolean(row.is_read),
    created_at,
  }
}

export function useConversationMessagesRealtime(
  conversationId: string | null,
  onInsert: (message: Message) => void
) {
  const cbRef = useRef(onInsert)
  cbRef.current = onInsert

  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${conversationId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>
          const paths = normalizeAttachments(row.attachments).map((a) => a.storage_path)
          let signed: Record<string, string> = {}
          if (paths.length) {
            const res = await signChatAttachmentUrls({ conversationId, paths })
            if (res.success) signed = res.data
          }
          cbRef.current(rowToMessage(row, signed))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId])
}
