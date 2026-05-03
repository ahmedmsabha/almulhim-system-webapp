import type { ChatAttachmentKind, MessageAttachment } from "@/types"

export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 5
export const MAX_CHAT_FILE_BYTES = 15 * 1024 * 1024

export function mimeMatchesKind(mime: string, kind: ChatAttachmentKind): boolean {
  const m = mime.toLowerCase()
  if (kind === "image") return m.startsWith("image/")
  if (kind === "pdf") return m === "application/pdf"
  if (kind === "audio") {
    return (
      m.startsWith("audio/") ||
      m === "application/ogg" ||
      m === "video/webm"
    )
  }
  return false
}

export function validateAttachmentBatch(att: MessageAttachment[] | undefined): void {
  if (!att?.length) return
  if (att.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
    throw new Error("يجب ألا يتجاوز المرفق خمس عناصر في رسالة واحدة")
  }
  let images = 0
  let files = 0
  for (const a of att) {
    if (a.kind === "image") images++
    else files++
  }
  if (images && files) {
    throw new Error("لا يمكن خلط الصور مع ملفات PDF أو الصوت في نفس الرسالة")
  }
  for (const a of att) {
    if (!a.storage_path?.trim() || !a.file_name?.trim() || !a.mime_type?.trim()) {
      throw new Error("بيانات المرفق غير كاملة")
    }
    if (!mimeMatchesKind(a.mime_type, a.kind)) {
      throw new Error("نوع الملف لا يطابق الفئة المختارة")
    }
    if (a.size_bytes != null && a.size_bytes > MAX_CHAT_FILE_BYTES) {
      throw new Error("حجم الملف كبير جداً (الحد 15 ميجابايت)")
    }
  }
}

export function classifyFileForChat(file: File): ChatAttachmentKind | null {
  if (file.type.startsWith("image/")) return "image"
  if (file.type === "application/pdf") return "pdf"
  if (
    file.type.startsWith("audio/") ||
    file.type === "video/webm" ||
    file.type === "application/ogg"
  ) {
    return "audio"
  }
  return null
}
