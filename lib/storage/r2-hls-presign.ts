import "server-only"

import {
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { OFFLINE_KEY_PLACEHOLDER, offlineSegmentPlaceholder } from "@/lib/offline/constants"

function streamToBuffer(stream: GetObjectCommandOutput["Body"]): Promise<Buffer> {
  if (!stream) return Promise.resolve(Buffer.alloc(0))
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const s = stream as NodeJS.ReadableStream
    s.on("data", (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)))
    s.on("end", () => resolve(Buffer.concat(chunks)))
    s.on("error", reject)
  })
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim()
  )
}

/** Origin shown to browsers for GET (custom domain or public bucket URL). */
export function getR2PublicBaseUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim()
  return u ? u.replace(/\/$/, "") : null
}

/** Presigned PUT uploads + constructing master playlist URLs after upload. */
export function isR2BrowserUploadConfigured(): boolean {
  return isR2Configured() && Boolean(getR2PublicBaseUrl())
}

export async function presignR2PutObject(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }
  const client = getS3Client()
  const bucket = getBucket()
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
  })
  return getSignedUrl(client, cmd, { expiresIn: expiresInSeconds })
}

function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID?.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials incomplete")
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

function getBucket(): string {
  const b = process.env.R2_BUCKET_NAME?.trim()
  if (!b) throw new Error("R2_BUCKET_NAME missing")
  return b
}

/** Pathname without leading slash = R2 object key (custom domain convention). */
export function objectKeyFromHlsMasterUrl(masterUrl: string): string | null {
  try {
    const u = new URL(masterUrl.trim())
    return u.pathname.replace(/^\//, "") || null
  } catch {
    return null
  }
}

function dirnameKey(key: string): string {
  const i = key.lastIndexOf("/")
  return i <= 0 ? "" : key.slice(0, i)
}

function resolveRelativeObjectKey(directoryKey: string, uri: string): string {
  const trimmed = uri.trim()
  if (!trimmed) return directoryKey

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).pathname.replace(/^\//, "")
    }
  } catch {
    // relative path
  }

  const stack = [...directoryKey.split("/").filter(Boolean)]
  for (const seg of trimmed.split("/").filter(Boolean)) {
    if (seg === "..") stack.pop()
    else if (seg !== ".") stack.push(seg)
  }
  return stack.join("/")
}

function isMasterPlaylist(text: string): boolean {
  return text.includes("#EXT-X-STREAM-INF")
}

function pickVariantUri(masterText: string, qualityHeight: number): string | null {
  const lines = masterText.split("\n").map((l) => l.trim())
  const tag = `/${qualityHeight}p/`
  const prefer = `${qualityHeight}p/`

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]?.startsWith("#EXT-X-STREAM-INF")) continue
    const next = lines[i + 1]?.trim()
    if (!next || next.startsWith("#")) continue
    if (next.includes(tag) || next.includes(prefer)) return next
  }

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]?.startsWith("#EXT-X-STREAM-INF")) continue
    const next = lines[i + 1]?.trim()
    if (next && !next.startsWith("#")) return next
  }
  return null
}

async function fetchObjectUtf8(client: S3Client, bucket: string, key: string): Promise<string> {
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const buf = await streamToBuffer(out.Body)
  return buf.toString("utf8")
}

export type PresignedOfflineBundle = {
  segmentUrls: string[]
  encryptionKeyHex: string
  playlistTemplate: string
}

export async function presignHlsOfflineBundle(
  masterM3u8Url: string,
  qualityHeight: number
): Promise<PresignedOfflineBundle> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }

  const masterKey = objectKeyFromHlsMasterUrl(masterM3u8Url)
  if (!masterKey) {
    throw new Error("Invalid HLS master URL")
  }

  const client = getS3Client()
  const bucket = getBucket()
  const masterDir = dirnameKey(masterKey)
  const masterText = await fetchObjectUtf8(client, bucket, masterKey)

  let variantKey: string
  let variantText: string

  if (isMasterPlaylist(masterText)) {
    const variantUri = pickVariantUri(masterText, qualityHeight)
    if (!variantUri) throw new Error("No variant playlist found in master")

    variantKey = resolveRelativeObjectKey(masterDir, variantUri)
    variantText = await fetchObjectUtf8(client, bucket, variantKey)
  } else {
    variantKey = masterKey
    variantText = masterText
  }

  const variantDir = dirnameKey(variantKey)
  const rawLines = variantText.split("\n")

  let encryptionKeyHex = ""
  let expectSegmentUri = false
  let segmentIndex = 0
  const segmentUrls: string[] = []
  const outLines: string[] = []

  for (const line of rawLines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("#EXT-X-KEY")) {
      const method = /METHOD=([^,\s]+)/.exec(trimmed)?.[1]?.toUpperCase() ?? ""
      const uriMatch = trimmed.match(/URI="([^"]+)"/)
      const uriRaw =
        uriMatch?.[1] ??
        (() => {
          const m = trimmed.match(/URI=([^\s,]+)/)
          return m?.[1]?.replace(/^"/, "").replace(/"$/, "") ?? null
        })()

      if (method === "AES-128" && uriRaw) {
        const keyKey = resolveRelativeObjectKey(variantDir, uriRaw)
        const keyBuf = await streamToBuffer(
          (await client.send(new GetObjectCommand({ Bucket: bucket, Key: keyKey }))).Body
        )
        encryptionKeyHex = keyBuf.toString("hex")

        const replacedUriLine = trimmed.replace(
          /URI="[^"]+"/,
          `URI="${OFFLINE_KEY_PLACEHOLDER}"`
        )
        outLines.push(replacedUriLine)
        continue
      }

      outLines.push(line)
      continue
    }

    if (trimmed.startsWith("#EXTINF")) {
      expectSegmentUri = true
      outLines.push(line)
      continue
    }

    if (expectSegmentUri && trimmed && !trimmed.startsWith("#")) {
      expectSegmentUri = false
      const segKey = resolveRelativeObjectKey(variantDir, trimmed)
      const signed = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: segKey,
        }),
        { expiresIn: 3600 }
      )
      segmentUrls.push(signed)
      const ph = offlineSegmentPlaceholder(segmentIndex)
      segmentIndex += 1
      const indent = line.indexOf(trimmed) >= 0 ? line.slice(0, line.indexOf(trimmed)) : ""
      outLines.push(`${indent}${ph}`)
      continue
    }

    if (trimmed) expectSegmentUri = false
    outLines.push(line)
  }

  return {
    segmentUrls,
    encryptionKeyHex,
    playlistTemplate: outLines.join("\n"),
  }
}
