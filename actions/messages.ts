"use server"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import { requireAdmin, requireAdminSession, requireStudentSession } from "@/actions/auth"
import {
  getMessages as fetchMessages,
  getMessagesForAdmin,
  markConversationReadByAdmin as markConversationReadByAdminDb,
  markMessagesAsRead as markMessagesAsReadDb,
  sendMessage as sendMessageDb,
} from "@/lib/db/queries/messages"
import type { ActionResult } from "@/types/api"
import type { Message, MessageAttachment } from "@/types"
import { z } from "zod"

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string(),
  attachments: z
    .array(
      z.object({
        kind: z.enum(["image", "pdf", "audio"]),
        storage_path: z.string().min(1),
        file_name: z.string().min(1),
        mime_type: z.string().min(1),
        size_bytes: z.number().optional(),
      })
    )
    .optional(),
})

export async function getConversation(
  conversationId: string
): Promise<ActionResult<Message[]>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const data = await fetchMessages(conversationId, gate.data.accessToken)
    return actionSuccess(data)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function sendStudentMessage(
  input: z.infer<typeof sendSchema>
): Promise<ActionResult<Message>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const parsed = sendSchema.safeParse(input)
    if (!parsed.success) {
      return actionFailure("بيانات غير صالحة", "UNKNOWN")
    }

    const msg = await sendMessageDb(
      parsed.data.conversationId,
      gate.data.profile.id,
      parsed.data.content,
      gate.data.accessToken,
      parsed.data.attachments as MessageAttachment[] | undefined
    )
    return actionSuccess(msg)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function sendAdminThreadMessage(
  input: z.infer<typeof sendSchema>
): Promise<ActionResult<Message>> {
  try {
    const gate = await requireAdminSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const parsed = sendSchema.safeParse(input)
    if (!parsed.success) {
      return actionFailure("بيانات غير صالحة", "UNKNOWN")
    }

    const msg = await sendMessageDb(
      parsed.data.conversationId,
      gate.data.profile.id,
      parsed.data.content,
      gate.data.accessToken,
      parsed.data.attachments as MessageAttachment[] | undefined
    )
    return actionSuccess(msg)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function markAsRead(
  conversationId: string
): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireStudentSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    await markMessagesAsReadDb(conversationId, gate.data.accessToken)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function markAdminConversationRead(
  conversationId: string
): Promise<ActionResult<{ ok: true }>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    await markConversationReadByAdminDb(conversationId)
    return actionSuccess({ ok: true })
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

export async function loadAdminThread(
  conversationId: string
): Promise<ActionResult<Message[]>> {
  try {
    const gate = await requireAdmin()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const rows = await getMessagesForAdmin(conversationId)
    return actionSuccess(rows)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
