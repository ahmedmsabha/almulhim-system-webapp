import "server-only"
import { and, desc, eq, ne } from "drizzle-orm"
import { jwtDecode, type JwtPayload } from "jwt-decode"

import { validateAttachmentBatch } from "@/lib/chat/attachment-rules"
import { adminDb, withUserDb } from "@/lib/db/client"
import { conversations, messages, profiles } from "@/lib/db/schema"
import { UnauthorizedError } from "@/lib/db/errors"
import { hydrateMessageList } from "@/lib/server/chat-signing"
import type { Conversation, Message as MessageType, MessageAttachment } from "@/types"

function previewMessage(text: string, attachments: MessageAttachment[]): string {
  const t = text.trim()
  if (t) {
    return t.length > 140 ? `${t.slice(0, 137)}...` : t
  }
  if (!attachments.length) return "…"
  if (attachments.every((a) => a.kind === "image")) {
    return attachments.length === 1 ? "[صورة]" : `[${attachments.length} صور]`
  }
  const audio = attachments.filter((a) => a.kind === "audio").length
  const pdf = attachments.filter((a) => a.kind === "pdf").length
  const parts: string[] = []
  if (pdf) parts.push(pdf === 1 ? "PDF" : `${pdf} ملفات PDF`)
  if (audio) parts.push(audio === 1 ? "رسالة صوتية" : `${audio} رسائل صوتية`)
  return `[${parts.join(" · ")}]`
}

function normalizeAttachments(raw: unknown): MessageAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(Boolean) as MessageAttachment[]
}

function mapMessage(row: typeof messages.$inferSelect): MessageType {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_role: row.sender_role as MessageType["sender_role"],
    content: row.content,
    attachments: normalizeAttachments(row.attachments),
    is_read: row.is_read,
    created_at: row.created_at.toISOString(),
  }
}

function mapConversationRow(
  conv: typeof conversations.$inferSelect,
  studentName: string,
  studentAvatar: string | null
): Conversation {
  return {
    id: conv.id,
    student_id: conv.student_id,
    student_name: studentName,
    student_avatar: studentAvatar,
    last_message: conv.last_message ?? null,
    last_message_at: conv.last_message_at ? conv.last_message_at.toISOString() : null,
    unread_count: conv.unread_count,
    created_at: conv.created_at.toISOString(),
  }
}

/** Admin: optionally filter by student. */
export async function getConversationsForAdmin(studentFilterId?: string): Promise<Conversation[]> {
  const convs = studentFilterId ?
      await adminDb
        .select()
        .from(conversations)
        .where(eq(conversations.student_id, studentFilterId))
        .orderBy(desc(conversations.last_message_at))
    : await adminDb
        .select()
        .from(conversations)
        .orderBy(desc(conversations.last_message_at))

  const results: Conversation[] = []
  for (const conv of convs) {
    const [profile] = await adminDb
      .select()
      .from(profiles)
      .where(eq(profiles.id, conv.student_id))
      .limit(1)
    results.push(mapConversationRow(conv, profile?.full_name ?? "", profile?.avatar_url ?? null))
  }
  return results
}

export async function getOrCreateConversation(studentId: string, accessToken: string) {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub || sub !== studentId) throw new UnauthorizedError()

  return withUserDb(accessToken, async (tx) => {
    const existing = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.student_id, studentId))
      .limit(1)

    if (existing[0]) return existing[0]

    const [created] = await tx.insert(conversations).values({ student_id: studentId }).returning()

    return created!
  })
}

export async function getMessages(
  conversationId: string,
  accessToken: string
): Promise<MessageType[]> {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub) throw new UnauthorizedError()

  const rows = await withUserDb(accessToken, async (tx) => {
    const [conv] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conv || conv.student_id !== sub) throw new UnauthorizedError()

    return tx
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(messages.created_at)
  })

  const mapped = rows.map(mapMessage)
  return hydrateMessageList(mapped)
}

/** Admin inbox pages: full thread (admin routes only — never expose to anonymous clients). */
export async function getMessagesForAdmin(conversationId: string): Promise<MessageType[]> {
  const rows = await adminDb
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(messages.created_at)

  const mapped = rows.map(mapMessage)
  return hydrateMessageList(mapped)
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  accessToken: string,
  attachments?: MessageAttachment[]
): Promise<MessageType> {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub || sub !== senderId) throw new UnauthorizedError()

  validateAttachmentBatch(attachments)
  const att = attachments?.length ? attachments : []
  const trimmed = content.trim()
  if (!trimmed && !att.length) {
    throw new Error("أدخل نصاً أو أرفق ملفاً")
  }

  const inserted = await withUserDb(accessToken, async (tx) => {
    const [[conv], [sender]] = await Promise.all([
      tx.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1),
      tx.select().from(profiles).where(eq(profiles.id, senderId)).limit(1),
    ])

    if (!conv || !sender) throw new UnauthorizedError()

    const participantOk =
      (sender.role === "student" && conv.student_id === senderId) || sender.role === "admin"

    if (!participantOk) throw new UnauthorizedError()

    const senderRoleTag: MessageType["sender_role"] =
      sender.role === "admin" ? "admin" : "student"

    const [row] = await tx
      .insert(messages)
      .values({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRoleTag,
        content: trimmed,
        attachments: att,
        is_read: false,
      })
      .returning()

    const unreadAfter =
      sender.role === "student" ? conv.unread_count + 1 : conv.unread_count

    await tx
      .update(conversations)
      .set({
        last_message_at: new Date(),
        last_message: previewMessage(trimmed, att),
        unread_count: unreadAfter,
      })
      .where(eq(conversations.id, conversationId))

    return row!
  })

  const mapped = mapMessage(inserted)
  const [hydrated] = await hydrateMessageList([mapped])
  return hydrated
}

export async function markMessagesAsRead(
  conversationId: string,
  accessToken: string
): Promise<void> {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub) throw new UnauthorizedError()

  await withUserDb(accessToken, async (tx) => {
    const [conv] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conv || conv.student_id !== sub) throw new UnauthorizedError()

    await tx
      .update(messages)
      .set({ is_read: true })
      .where(and(eq(messages.conversation_id, conversationId), ne(messages.sender_id, sub)))
  })
}

/** عند فتح المعلِّم للمحادثة: تصفير غير المقروء وتمييز رسائل الطالب. */
export async function markConversationReadByAdmin(conversationId: string): Promise<void> {
  await adminDb.transaction(async (tx) => {
    await tx
      .update(messages)
      .set({ is_read: true })
      .where(
        and(eq(messages.conversation_id, conversationId), eq(messages.sender_role, "student"))
      )

    await tx
      .update(conversations)
      .set({ unread_count: 0 })
      .where(eq(conversations.id, conversationId))
  })
}

export async function assertConversationParticipant(
  conversationId: string,
  accessToken: string
): Promise<void> {
  const sub = jwtDecode<JwtPayload>(accessToken).sub
  if (!sub) throw new UnauthorizedError()

  await withUserDb(accessToken, async (tx) => {
    const [conv] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)
    const [me] = await tx.select().from(profiles).where(eq(profiles.id, sub)).limit(1)
    if (!conv || !me) throw new UnauthorizedError()
    const ok =
      (me.role === "student" && conv.student_id === sub) || me.role === "admin"
    if (!ok) throw new UnauthorizedError()
  })
}

export async function assertParticipantPathsForConversation(
  conversationId: string,
  paths: string[],
  accessToken: string
): Promise<void> {
  await assertConversationParticipant(conversationId, accessToken)
  if (!paths.length) return
  const bad = paths.filter((p) => !p.startsWith(`${conversationId}/`))
  if (bad.length) {
    throw new UnauthorizedError()
  }
}


export async function getDefaultAdminContact(): Promise<{
  full_name: string
  avatar_url: string | null
}> {
  const rows = await adminDb
    .select()
    .from(profiles)
    .where(eq(profiles.role, "admin"))
    .limit(1)
  const r = rows[0]
  return {
    full_name: r?.full_name ?? "المدرّس",
    avatar_url: r?.avatar_url ?? null,
  }
}
