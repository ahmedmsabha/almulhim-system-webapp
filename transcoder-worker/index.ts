import "dotenv/config"

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { spawn } from "node:child_process"
import { createHmac } from "node:crypto"
import { mkdirSync } from "node:fs"
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative as pathRelative } from "node:path"
import axios from "axios"
import express from "express"
import ffmpegLib from "fluent-ffmpeg"

const SIGNATURE_HEADER = "x-transcode-signature"

if (process.env.FFMPEG_PATH) {
  ffmpegLib.setFfmpegPath(process.env.FFMPEG_PATH)
}
if (process.env.FFPROBE_PATH) {
  ffmpegLib.setFfprobePath(process.env.FFPROBE_PATH)
}

type TranscodePayload = {
  lessonId: string
  sourceKey: string
  webhookUrl: string
  webhookSecret: string
}

function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID?.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY required on worker")
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function requireBucket(): string {
  const b = process.env.R2_BUCKET_NAME?.trim()
  if (!b) throw new Error("R2_BUCKET_NAME required on worker")
  return b
}

function signingKeyForWebhook(webhookSecret: string): string {
  const fromEnv = process.env.WORKER_SECRET?.trim()
  if (fromEnv) return fromEnv
  const fromBody = webhookSecret.trim()
  if (fromBody) return fromBody
  throw new Error("WORKER_SECRET or webhookSecret required for webhook HMAC")
}

function guessCt(rel: string): string {
  const lower = rel.toLowerCase()
  if (lower.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (lower.endsWith(".ts")) return "video/mp2t"
  if (lower.endsWith(".mp4")) return "video/mp4"
  return "application/octet-stream"
}

async function walkFiles(dir: string): Promise<string[]> {
  const dirents = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const d of dirents) {
    const p = join(dir, d.name)
    if (d.isDirectory()) {
      out.push(...(await walkFiles(p)))
    } else if (d.isFile()) {
      out.push(p)
    }
  }
  return out
}

async function purgeLessonHlsExceptSource(
  client: S3Client,
  bucket: string,
  lessonId: string
): Promise<void> {
  const prefix = `hls/${lessonId}/`
  let token: string | undefined
  const keys: string[] = []
  for (;;) {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      })
    )
    for (const o of out.Contents ?? []) {
      if (!o.Key) continue
      const rest = o.Key.slice(prefix.length)
      if (rest.startsWith("_source/")) continue
      keys.push(o.Key)
    }
    if (!out.IsTruncated || !out.NextContinuationToken) break
    token = out.NextContinuationToken
  }

  const batch = 1000
  for (let i = 0; i < keys.length; i += batch) {
    const slice = keys.slice(i, i + batch)
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: slice.map((Key) => ({ Key })), Quiet: true },
      })
    )
  }
}

function ffprobeAudioAndDuration(inputPath: string): Promise<{ hasAudio: boolean; durationSec: number | null }> {
  return new Promise((resolve, reject) => {
    ffmpegLib(inputPath).ffprobe((err: Error | undefined, data) => {
      if (err) {
        reject(err)
        return
      }
      const hasAudio = Boolean(data.streams?.some((s) => s.codec_type === "audio"))
      const raw = data.format?.duration
      const n = raw != null ? Number(raw) : Number.NaN
      const durationSec = Number.isFinite(n) && n > 0 ? Math.round(n) : null
      resolve({ hasAudio, durationSec })
    })
  })
}

function buildEncodeArgs(inputPosix: string, hasAudio: boolean): string[] {
  const args: string[] = ["-y", "-i", inputPosix]

  args.push(
    "-filter_complex",
    "[0:v]split=4[v1080][v720][v480][v360];" +
      "[v1080]scale=-2:1080:flags=lanczos,setsar=1[v1080s];" +
      "[v720]scale=-2:720:flags=lanczos,setsar=1[v720s];" +
      "[v480]scale=-2:480:flags=lanczos,setsar=1[v480s];" +
      "[v360]scale=-2:360:flags=lanczos,setsar=1[v360s]"
  )

  if (hasAudio) {
    args.push(
      "-map",
      "[v1080s]",
      "-map",
      "0:a:0?",
      "-map",
      "[v720s]",
      "-map",
      "0:a:0?",
      "-map",
      "[v480s]",
      "-map",
      "0:a:0?",
      "-map",
      "[v360s]",
      "-map",
      "0:a:0?",
      "-c:v:0",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-b:v:0",
      "5500k",
      "-maxrate:v:0",
      "6000k",
      "-bufsize:v:0",
      "12000k",
      "-c:v:1",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "21",
      "-b:v:1",
      "2800k",
      "-maxrate:v:1",
      "3100k",
      "-bufsize:v:1",
      "6200k",
      "-c:v:2",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-b:v:2",
      "1000k",
      "-maxrate:v:2",
      "1200k",
      "-bufsize:v:2",
      "2400k",
      "-c:v:3",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-b:v:3",
      "650k",
      "-maxrate:v:3",
      "800k",
      "-bufsize:v:3",
      "1600k",
      "-c:a:0",
      "aac",
      "-b:a:0",
      "160k",
      "-c:a:1",
      "aac",
      "-b:a:1",
      "128k",
      "-c:a:2",
      "aac",
      "-b:a:2",
      "96k",
      "-c:a:3",
      "aac",
      "-b:a:3",
      "96k"
    )
  } else {
    args.push(
      "-map",
      "[v1080s]",
      "-map",
      "[v720s]",
      "-map",
      "[v480s]",
      "-map",
      "[v360s]",
      "-c:v:0",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-b:v:0",
      "5500k",
      "-maxrate:v:0",
      "6000k",
      "-bufsize:v:0",
      "12000k",
      "-c:v:1",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "21",
      "-b:v:1",
      "2800k",
      "-maxrate:v:1",
      "3100k",
      "-bufsize:v:1",
      "6200k",
      "-c:v:2",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-b:v:2",
      "1000k",
      "-maxrate:v:2",
      "1200k",
      "-bufsize:v:2",
      "2400k",
      "-c:v:3",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-b:v:3",
      "650k",
      "-maxrate:v:3",
      "800k",
      "-bufsize:v:3",
      "1600k"
    )
  }

  args.push(
    "-f",
    "hls",
    "-hls_time",
    "6",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_type",
    "mpegts",
    "-master_pl_name",
    "master.m3u8",
    "-hls_segment_filename",
    "v%v/seg%03d.ts",
    "-var_stream_map",
    hasAudio ? "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" : "v:0 v:1 v:2 v:3",
    "v%v/index.m3u8"
  )

  return args
}

function runFfmpeg(args: string[], cwd: string): Promise<void> {
  const bin = process.env.FFMPEG_PATH?.trim() || "ffmpeg"
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd, windowsHide: true })
    let stderr = ""
    p.stderr?.setEncoding("utf8")
    p.stderr?.on("data", (c: string) => {
      stderr = (stderr + c).slice(-12000)
    })
    p.on("error", reject)
    p.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-900)}`))
    })
  })
}

/** إعادة تسمية مخرجات ffmpeg (v0…v3) إلى 1080p … 360p وتحديث master.m3u8 */
async function renameFfmpegVariantDirsToResolutionLabels(outDirAbs: string): Promise<void> {
  const { rename, readFile, writeFile } = await import("node:fs/promises")
  const mapping: Array<[string, string]> = [
    ["v0", "1080p"],
    ["v1", "720p"],
    ["v2", "480p"],
    ["v3", "360p"],
  ]
  for (const [from, to] of mapping) {
    await rename(join(outDirAbs, from), join(outDirAbs, to))
  }
  const masterPath = join(outDirAbs, "master.m3u8")
  let text = await readFile(masterPath, "utf8")
  for (const [from, to] of mapping) {
    const needle = `${from}/`
    const repl = `${to}/`
    if (!text.includes(needle)) continue
    text = text.split(needle).join(repl)
  }
  await writeFile(masterPath, text, "utf8")
}

async function downloadSource(client: S3Client, bucket: string, sourceKey: string, destPath: string) {
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: sourceKey }))
  const body = await out.Body!.transformToByteArray()
  await writeFile(destPath, body)
}

async function uploadOutputs(client: S3Client, bucket: string, baseKey: string, outDirAbs: string) {
  const files = await walkFiles(outDirAbs)
  for (const abs of files) {
    const rel = pathRelative(outDirAbs, abs).replace(/\\/g, "/")
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${baseKey}/${rel}`,
        Body: await readFile(abs),
        ContentType: guessCt(rel),
      })
    )
  }
}

async function postWebhook(opts: { webhookUrl: string; webhookSecret: string; lessonId: string; masterKey: string }): Promise<void> {
  const payload = {
    lessonId: opts.lessonId,
    masterKey: opts.masterKey,
  }
  const rawBody = JSON.stringify(payload)
  const key = signingKeyForWebhook(opts.webhookSecret)
  const sigHeader = `sha256=${createHmac("sha256", key).update(rawBody, "utf8").digest("hex")}`
  const res = await axios.post(opts.webhookUrl, rawBody, {
    headers: {
      "Content-Type": "application/json",
      [SIGNATURE_HEADER]: sigHeader,
    },
    timeout: 60_000,
    transitional: { forcedJSONParsing: false },
    responseType: "text",
    validateStatus: () => true,
  })
  if (res.status < 200 || res.status >= 300) {
    const txt = typeof res.data === "string" ? res.data : String(res.data ?? "")
    throw new Error(`webhook HTTP ${String(res.status)} ${txt.slice(0, 500)}`)
  }
}

async function processTranscodeJob(p: TranscodePayload): Promise<void> {
  const { lessonId, sourceKey, webhookSecret, webhookUrl } = p
  if (!webhookUrl.startsWith("http")) {
    throw new Error("webhookUrl must be absolute https/http URL")
  }

  const client = getS3Client()
  const bucket = requireBucket()

  console.info(`[transcoder] purge old outputs lesson=${lessonId}`)
  await purgeLessonHlsExceptSource(client, bucket, lessonId)

  const tmpRoot = await mkdtemp(join(tmpdir(), `hls-job-${lessonId}-`))
  const localIn = join(tmpRoot, "source.bin")
  const outDir = join(tmpRoot, "out")

  try {
    console.info(`[transcoder] download ${sourceKey}`)
    await downloadSource(client, bucket, sourceKey, localIn)
    mkdirSync(outDir, { recursive: true })

    const { hasAudio } = await ffprobeAudioAndDuration(localIn)
    const inputPosix = localIn.replace(/\\/g, "/")
    const args = buildEncodeArgs(inputPosix, hasAudio)
    console.info(`[transcoder] ffmpeg start lesson=${lessonId}`)
    await runFfmpeg(args, outDir)
    await renameFfmpegVariantDirsToResolutionLabels(outDir)

    const files = await walkFiles(outDir)
    if (!files.length) throw new Error("ffmpeg produced zero files")

    const baseKey = `hls/${lessonId}`
    console.info(`[transcoder] upload ${String(files.length)} objects`)
    await uploadOutputs(client, bucket, baseKey, outDir)

    const masterKey = `${baseKey}/master.m3u8`
    console.info(`[transcoder] webhook ${webhookUrl}`)
    await postWebhook({ webhookUrl, webhookSecret, lessonId, masterKey })
    console.info(`[transcoder] ok lesson=${lessonId}`)
  } finally {
    try {
      await rm(tmpRoot, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

function parseTranscodeBody(body: unknown): TranscodePayload | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  const lessonId = typeof b.lessonId === "string" ? b.lessonId : ""
  const sourceKey = typeof b.sourceKey === "string" ? b.sourceKey : ""
  const webhookSecret = typeof b.webhookSecret === "string" ? b.webhookSecret : ""
  const webhookUrl = typeof b.webhookUrl === "string" ? b.webhookUrl.trim() : ""

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId) ||
    !sourceKey ||
    !webhookSecret ||
    !webhookUrl
  ) {
    return null
  }

  const sourcePrefix = `hls/${lessonId}/_source/`
  if (!sourceKey.startsWith(sourcePrefix) || sourceKey.includes("..")) {
    return null
  }
  const rest = sourceKey.slice(sourcePrefix.length)
  if (!rest || rest.includes("/")) {
    return null
  }
  return { lessonId, sourceKey, webhookSecret, webhookUrl }
}

const app = express()
app.use(express.json({ limit: "512kb" }))

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.post("/transcode", async (req, res) => {
  const payload = parseTranscodeBody(req.body)
  if (!payload) {
    res.status(400).json({ ok: false, error: "invalid_payload" })
    return
  }
  void processTranscodeJob(payload).catch((err: unknown) => {
    console.error("[transcoder job failed]", err)
  })
  res.status(202).json({ ok: true, accepted: true })
})

const port = Number(process.env.PORT || 8790)
app.listen(port, () => {
  console.info(`[transcoder] listening ${String(port)}`)
})
