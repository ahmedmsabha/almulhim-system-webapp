"use server"

import { randomUUID } from "crypto"

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from "@/lib/action-utils"
import {
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  MAX_CHAT_FILE_BYTES,
  mimeMatchesKind,
  validateAttachmentBatch,
} from "@/lib/chat/attachment-rules"
import { assertConversationParticipant, assertParticipantPathsForConversation } from "@/lib/db/queries/messages"
import { requireStudentOrAdminSession } from "@/actions/auth"
import { STORAGE_BUCKETS } from "@/lib/config"
import { createSupabaseForSignedStorageOps } from "@/lib/supabase/storage-admin-client"
import type { ActionResult } from "@/types/api"
import type { ChatAttachmentKind, MessageAttachment } from "@/types"
import { z } from "zod"

const uploadItemSchema = z.object({
  fileName: z.string().min(1).max(220),
  mimeType: z.string().min(1),
  kind: z.enum(["image", "pdf", "audio"]),
  sizeBytes: z.number().int().positive().max(MAX_CHAT_FILE_BYTES).optional(),
})

function safeFileSegment(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._\u0600-\u06FF-]/g, "_").slice(0, 100)
  return base || "file"
}

export async function requestChatAttachmentUploads(input: {
  conversationId: string
  items: z.infer<typeof uploadItemSchema>[]
}): Promise<ActionResult<{ path: string; token: string }[]>> {
  try {
    const gate = await requireStudentOrAdminSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const parsed = z
      .object({
        conversationId: z.string().uuid(),
        items: z.array(uploadItemSchema).min(1).max(MAX_CHAT_ATTACHMENTS_PER_MESSAGE),
      })
      .safeParse(input)

    if (!parsed.success) {
      return actionFailure("بيانات غير صالحة", "UNKNOWN")
    }

    const { conversationId, items } = parsed.data
    const pseudoAttach: MessageAttachment[] = items.map((it) => ({
      kind: it.kind as ChatAttachmentKind,
      storage_path: `${conversationId}/pending`,
      file_name: it.fileName,
      mime_type: it.mimeType,
      size_bytes: it.sizeBytes,
    }))
    validateAttachmentBatch(pseudoAttach)

    for (let i = 0; i < items.length; i++) {
      const it = items[i]!
      const pa = pseudoAttach[i]!
      if (!mimeMatchesKind(it.mimeType, pa.kind)) {
        return actionFailure("نوع الملف غير متوافق مع الفئة", "UNKNOWN")
      }
    }

    const token = gate.data.accessToken

    const supabase = await createSupabaseForSignedStorageOps()
    const outs: { path: string; token: string }[] = []

    for (const it of items) {
      const path = `${conversationId}/${randomUUID()}_${safeFileSegment(it.fileName)}`
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.chatAttachments)
        .createSignedUploadUrl(path, { upsert: true })

      if (error || !data?.token) {
        return actionFailure(
          error?.message ?? "تعذر إنشاء رابط الرفع — تحقق من حاوية chat_attachments",
          "UNKNOWN"
        )
      }
      outs.push({ path: data.path, token: data.token })
    }

    return actionSuccess(outs)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}

const signedPathsSchema = z.object({
  conversationId: z.string().uuid(),
  paths: z.array(z.string().min(3)).max(25),
})

export async function signChatAttachmentUrls(input: {
  conversationId: string
  paths: string[]
}): Promise<ActionResult<Record<string, string>>> {
  try {
    const gate = await requireStudentOrAdminSession()
    if (!gate.success) {
      return actionFailure(gate.error, gate.code)
    }

    const parsed = signedPathsSchema.safeParse(input)
    if (!parsed.success) {
      return actionFailure("بيانات غير صالحة", "UNKNOWN")
    }

    await assertParticipantPathsForConversation(
      parsed.data.conversationId,
      parsed.data.paths,
      gate.data.accessToken
    )

    const { signChatStoragePaths } = await import("@/lib/server/chat-signing")
    const map = await signChatStoragePaths(parsed.data.paths)
    const record: Record<string, string> = {}
    for (const [k, v] of map) {
      record[k] = v
    }
    return actionSuccess(record)
  } catch (e) {
    return mapCaughtErrorToAction(e)
  }
}
