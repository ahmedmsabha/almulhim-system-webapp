import "server-only"

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
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

/** Builds the public CDN URL for an object key using `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`. */
export function buildR2PublicUrlForObjectKey(objectKey: string): string | null {
  const base = getR2PublicBaseUrl()
  if (!base) return null
  const path = objectKey
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/")
  return `${base.replace(/\/$/, "")}/${path}`
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

export function isUrlUnderR2PublicBase(masterUrl: string): boolean {
  const base = getR2PublicBaseUrl()
  if (!base) return false
  try {
    return new URL(masterUrl.trim()).origin === new URL(base).origin
  } catch {
    return false
  }
}

export function lessonHlsObjectPrefix(lessonId: string): string {
  return `hls/${lessonId}`
}

/** True when the stored master URL points to objects under `hls/{lessonId}/…` on this bucket. */
export function masterObjectKeyBelongsToLesson(lessonId: string, masterUrl: string | null): boolean {
  if (!masterUrl) return false
  const key = objectKeyFromHlsMasterUrl(masterUrl)
  if (!key) return false
  return key.startsWith(`${lessonHlsObjectPrefix(lessonId)}/`)
}

export async function r2GetObjectUtf8(objectKey: string): Promise<string> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }
  const client = getS3Client()
  const bucket = getBucket()
  return fetchObjectUtf8(client, bucket, objectKey)
}

export async function r2PutObjectUtf8(
  objectKey: string,
  body: string,
  contentType: string
): Promise<void> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }
  const client = getS3Client()
  const bucket = getBucket()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: Buffer.from(body, "utf8"),
      ContentType: contentType,
      ContentDisposition: "inline",
    })
  )
}

const R2_DELETE_BATCH = 1000

/** Deletes every object whose key starts with `{prefix}/`. Returns count removed. */
export async function r2DeleteObjectsWithPrefix(prefix: string): Promise<number> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }
  const normalized = prefix.replace(/^\/+/, "").replace(/\/+$/, "")
  const listPrefix = normalized ? `${normalized}/` : ""
  const client = getS3Client()
  const bucket = getBucket()
  let deleted = 0
  let continuationToken: string | undefined

  for (;;) {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: listPrefix,
        ContinuationToken: continuationToken,
      })
    )
    const keys =
      list.Contents?.map((o) => o.Key).filter((k): k is string => Boolean(k)) ?? []
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined

    for (let i = 0; i < keys.length; i += R2_DELETE_BATCH) {
      const slice = keys.slice(i, i + R2_DELETE_BATCH)
      if (!slice.length) continue
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: slice.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      )
      deleted += slice.length
    }

    if (!continuationToken) break
  }

  return deleted
}

/** يحذف كل مفاتيح `hls/{lessonId}/…` ما عدا البادئة `hls/{lessonId}/_source/…`. */
export async function r2DeleteLessonHlsExceptSource(lessonId: string): Promise<number> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }
  const listPrefix = `${lessonHlsObjectPrefix(lessonId)}/`
  const keepPrefix = `${lessonHlsObjectPrefix(lessonId)}/_source/`
  const client = getS3Client()
  const bucket = getBucket()
  let deleted = 0
  let continuationToken: string | undefined
  const toDelete: string[] = []

  for (;;) {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: listPrefix,
        ContinuationToken: continuationToken,
      })
    )
    const keys =
      list.Contents?.map((o) => o.Key).filter((k): k is string => Boolean(k)) ?? []
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined

    for (const key of keys) {
      if (!key.startsWith(keepPrefix)) {
        toDelete.push(key)
      }
    }

    if (!continuationToken) break
  }

  for (let i = 0; i < toDelete.length; i += R2_DELETE_BATCH) {
    const slice = toDelete.slice(i, i + R2_DELETE_BATCH)
    if (!slice.length) continue
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: slice.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    )
    deleted += slice.length
  }

  return deleted
}

export async function r2DownloadObjectToFile(objectKey: string, destPath: string): Promise<void> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }
  const { createWriteStream } = await import("node:fs")
  const { pipeline } = await import("node:stream/promises")
  const client = getS3Client()
  const bucket = getBucket()
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }))
  if (!out.Body) {
    throw new Error("empty R2 object body")
  }
  await pipeline(out.Body as NodeJS.ReadableStream, createWriteStream(destPath))
}

export async function r2PutObjectFromFile(
  objectKey: string,
  filePath: string,
  contentType: string
): Promise<void> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured")
  }
  const { readFile } = await import("node:fs/promises")
  const client = getS3Client()
  const bucket = getBucket()
  const Body = await readFile(filePath)
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body,
      ContentType: contentType,
      ContentDisposition: "inline",
    })
  )
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
