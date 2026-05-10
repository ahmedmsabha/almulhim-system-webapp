import "server-only"

import { isR2Configured } from "@/lib/storage/r2-hls-presign"

export function isTranscoderWorkerQueueConfigured(): boolean {
  return Boolean(
    process.env.TRANSCODER_WORKER_URL?.trim() &&
      process.env.TRANSCODER_WEBHOOK_SECRET?.trim() &&
      isR2Configured()
  )
}
