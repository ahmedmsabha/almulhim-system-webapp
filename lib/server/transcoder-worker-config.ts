import "server-only"

export function isTranscoderWorkerQueueConfigured(): boolean {
  return !!(
    process.env.TRANSCODER_WORKER_URL?.trim() &&
    process.env.TRANSCODER_WEBHOOK_SECRET?.trim() &&
    (process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim())
  )
}
