import "server-only"

import { STORAGE_BUCKETS } from "@/lib/config"
import { createSupabaseForSignedStorageOps } from "@/lib/supabase/storage-admin-client"
import type { Message, MessageAttachment } from "@/types"

const CHAT_BUCKET = STORAGE_BUCKETS.chatAttachments

export async function signChatStoragePaths(
  paths: string[],
  expiresSec = 3600
): Promise<Map<string, string>> {
  const uniq = [...new Set(paths.filter(Boolean))]
  const out = new Map<string, string>()
  if (!uniq.length) return out

  const supabase = await createSupabaseForSignedStorageOps()
  await Promise.all(
    uniq.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(CHAT_BUCKET)
        .createSignedUrl(path, expiresSec)
      if (!error && data?.signedUrl) {
        out.set(path, data.signedUrl)
      }
    })
  )
  return out
}

export function withSignedAttachmentUrls<T extends { attachments: MessageAttachment[] }>(
  row: T,
  signed: Map<string, string>
): T {
  return {
    ...row,
    attachments: row.attachments.map((a) => ({
      ...a,
      signed_url: signed.get(a.storage_path) ?? a.signed_url,
    })),
  }
}

export async function hydrateMessageList(messages: Message[]): Promise<Message[]> {
  const paths = [...new Set(messages.flatMap((m) => m.attachments.map((a) => a.storage_path)))]
  const signed = await signChatStoragePaths(paths)
  return messages.map((m) => withSignedAttachmentUrls(m, signed))
}
