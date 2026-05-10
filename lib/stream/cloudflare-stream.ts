import "server-only"

import type { VideoLesson } from "@/types"

const STREAM_API = "https://api.cloudflare.com/client/v4"

const LESSON_MANIFEST_URL_RE =
  /^https:\/\/customer-([a-zA-Z0-9]+)\.cloudflarestream\.com\/([^/?#]+)\/manifest\/video\.m3u8$/i

export function isCloudflareStreamLessonManifestUrl(url: string): boolean {
  return LESSON_MANIFEST_URL_RE.test(url.trim())
}

export function parseCloudflareStreamLessonManifestUrl(url: string): {
  customerCode: string
  uidOrTokenSegment: string
} | null {
  const m = LESSON_MANIFEST_URL_RE.exec(url.trim())
  if (!m) return null
  const [, customerCode, segment] = m
  if (!customerCode || !segment) return null
  return { customerCode, uidOrTokenSegment: segment }
}

export function isLikelyCloudflareStreamVideoUid(segment: string): boolean {
  return /^[a-f0-9]{32}$/i.test(segment)
}

export function buildCloudflareStreamLessonManifestUrl(
  customerCode: string,
  videoUid: string
): string {
  const code = customerCode.trim()
  const uid = videoUid.trim()
  return `https://customer-${code}.cloudflarestream.com/${uid}/manifest/video.m3u8`
}

export function isCloudflareStreamUploadConfigured(): boolean {
  return Boolean(
    process.env.CF_STREAM_TOKEN?.trim() &&
      process.env.CF_STREAM_ACCOUNT_ID?.trim() &&
      process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER_CODE?.trim()
  )
}

function encodeTusMetadataValue(value: string): string {
  return Buffer.from(value, "utf8").toString("base64")
}

function rfc3339UtcNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z")
}

function buildUploadMetadataHeader(opts: {
  fileName: string
  contentType: string
  maxDurationSeconds: number
  uploadExpiresAt: Date
}): string {
  const parts = [
    `name ${encodeTusMetadataValue(opts.fileName)}`,
    `filetype ${encodeTusMetadataValue(opts.contentType)}`,
    "requiresignedurls",
    `maxDurationSeconds ${encodeTusMetadataValue(String(opts.maxDurationSeconds))}`,
    `expiry ${encodeTusMetadataValue(rfc3339UtcNoMs(opts.uploadExpiresAt))}`,
  ]
  return parts.join(",")
}

function parseVideoUidFromTusLocationHeader(location: string | null): string | null {
  if (!location) return null
  try {
    const u = new URL(location)
    const parts = u.pathname.split("/").filter(Boolean)
    const streamIdx = parts.indexOf("stream")
    const after = streamIdx >= 0 ? parts[streamIdx + 1] : null
    if (after && isLikelyCloudflareStreamVideoUid(after)) return after
    const last = parts[parts.length - 1]
    if (last && isLikelyCloudflareStreamVideoUid(last)) return last
    return last ?? null
  } catch {
    return null
  }
}

export async function createDirectCreatorTusUploadSlot(input: {
  uploadLengthBytes: number
  fileName: string
  contentType: string
}): Promise<{ uploadUrl: string; videoUid: string }> {
  const accountId = process.env.CF_STREAM_ACCOUNT_ID?.trim()
  const token = process.env.CF_STREAM_TOKEN?.trim()
  if (!accountId || !token) {
    throw new Error("Cloudflare Stream غير مُهيأ (CF_STREAM_ACCOUNT_ID / CF_STREAM_TOKEN)")
  }

  const endpoint = `${STREAM_API}/accounts/${accountId}/stream?direct_user=true`
  const uploadMetadata = buildUploadMetadataHeader({
    fileName: input.fileName,
    contentType: input.contentType,
    maxDurationSeconds: 4 * 3600,
    uploadExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  })

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(input.uploadLengthBytes),
      "Upload-Metadata": uploadMetadata,
    },
  })

  const streamMediaId = res.headers.get("stream-media-id")?.trim()
  const location = res.headers.get("Location")
  const videoUid = streamMediaId || parseVideoUidFromTusLocationHeader(location)

  if (!res.ok || !location || !videoUid) {
    let detail = ""
    try {
      const j = (await res.json()) as { errors?: Array<{ message?: string }> }
      const msg = j?.errors?.map((e) => e.message).filter(Boolean).join("; ")
      if (msg) detail = ` — ${msg}`
    } catch {
      /* ignore */
    }
    throw new Error(`تعذّر إنشاء رفع Stream (HTTP ${res.status})${detail}`)
  }

  return { uploadUrl: location, videoUid }
}

export async function fetchCloudflareStreamPlaybackToken(videoUid: string): Promise<string> {
  const accountId = process.env.CF_STREAM_ACCOUNT_ID?.trim()
  const token = process.env.CF_STREAM_TOKEN?.trim()
  if (!accountId || !token) {
    throw new Error("Cloudflare Stream غير مُهيأ")
  }

  const now = Math.floor(Date.now() / 1000)
  const res = await fetch(
    `${STREAM_API}/accounts/${accountId}/stream/${encodeURIComponent(videoUid)}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exp: now + 4 * 3600,
        nbf: now - 60,
      }),
    }
  )

  const j = (await res.json()) as {
    success?: boolean
    result?: { token?: string }
    errors?: Array<{ message?: string }>
  }

  if (!res.ok || !j.success || !j.result?.token) {
    const msg = j.errors?.map((e) => e.message).filter(Boolean).join("; ")
    throw new Error(msg || `تعذّر إصدار رمز التشغيل (HTTP ${res.status})`)
  }

  return j.result.token
}

export async function signCloudflareStreamStoredManifestForPlayback(
  storedManifestUrl: string
): Promise<string> {
  const parsed = parseCloudflareStreamLessonManifestUrl(storedManifestUrl)
  if (!parsed) return storedManifestUrl

  if (!isLikelyCloudflareStreamVideoUid(parsed.uidOrTokenSegment)) {
    return storedManifestUrl
  }

  if (!process.env.CF_STREAM_TOKEN?.trim() || !process.env.CF_STREAM_ACCOUNT_ID?.trim()) {
    return storedManifestUrl
  }

  try {
    const playbackToken = await fetchCloudflareStreamPlaybackToken(parsed.uidOrTokenSegment)
    return `https://customer-${parsed.customerCode}.cloudflarestream.com/${playbackToken}/manifest/video.m3u8`
  } catch (e) {
    console.error("[cloudflare-stream] failed to sign playback URL", e)
    return storedManifestUrl
  }
}

export async function applyStreamSignedPlaybackToVideoLesson(
  lesson: VideoLesson
): Promise<VideoLesson> {
  const raw = lesson.hls_url?.trim()
  if (!raw || !isCloudflareStreamLessonManifestUrl(raw)) {
    return lesson
  }
  const signed = await signCloudflareStreamStoredManifestForPlayback(raw)
  if (signed === raw) return lesson
  return { ...lesson, hls_url: signed }
}
