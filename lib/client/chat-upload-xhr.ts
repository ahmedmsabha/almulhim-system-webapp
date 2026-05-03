"use client"

import { STORAGE_BUCKETS } from "@/lib/config"
import { uploadMaterialsPdfViaSignedToken } from "@/lib/client/admin-upload-xhr"

export async function uploadChatAttachmentViaSignedToken(opts: {
  storagePath: string
  token: string
  file: File | Blob
  fileNameForFallback?: string
  onProgress?: (percent: number) => void
}): Promise<void> {
  const file =
    opts.file instanceof File ?
      opts.file
    : new File([opts.file], opts.fileNameForFallback ?? "recording.webm", {
        type: opts.file.type || "audio/webm",
      })

  return uploadMaterialsPdfViaSignedToken({
    bucket: STORAGE_BUCKETS.chatAttachments,
    storagePath: opts.storagePath,
    token: opts.token,
    file,
    upsert: true,
    onProgress: opts.onProgress,
  })
}
