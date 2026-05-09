import "server-only"

import { execFile, execFileSync, spawn } from "node:child_process"
import { promisify } from "node:util"
import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"

import { adminUpdateVideoLesson, getVideoById } from "@/lib/db/queries/videos"
import {
  getR2PublicBaseUrl,
  isR2Configured,
  lessonHlsObjectPrefix,
  r2DeleteLessonHlsExceptSource,
  r2DownloadObjectToFile,
  r2PutObjectFromFile,
} from "@/lib/storage/r2-hls-presign"

function ffmpegPath(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg"
}

function ffprobePath(): string {
  return process.env.FFPROBE_PATH?.trim() || "ffprobe"
}

export function isFfmpegAvailable(): boolean {
  const bin = ffmpegPath()
  try {
    execFileSync(bin, ["-hide_banner", "-version"], { stdio: "ignore", timeout: 5000 })
    return true
  } catch {
    return false
  }
}

function publicUrlForObjectKey(objectKey: string): string | null {
  const base = getR2PublicBaseUrl()
  if (!base) return null
  const path = objectKey
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/")
  return `${base.replace(/\/$/, "")}/${path}`
}

function guessContentType(rel: string): string {
  const lower = rel.toLowerCase()
  if (lower.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (lower.endsWith(".ts")) return "video/mp2t"
  return "application/octet-stream"
}

const execFileAsync = promisify(execFile)

async function probeHasAudio(inputPath: string): Promise<boolean> {
  const probe = ffprobePath()
  try {
    const { stdout } = await execFileAsync(
      probe,
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=index",
        "-of",
        "csv=p=0",
        inputPath,
      ],
      { maxBuffer: 256_000 }
    )
    return Boolean(String(stdout).trim())
  } catch {
    return false
  }
}

/** مدة الفيديو بالثواني (لحفظ حقل duration للدرس). */
async function probeDurationSeconds(inputPath: string): Promise<number | null> {
  const probe = ffprobePath()
  try {
    const { stdout } = await execFileAsync(
      probe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        inputPath,
      ],
      { maxBuffer: 64_000 }
    )
    const n = parseFloat(String(stdout).trim())
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  } catch {
    return null
  }
}

function runFfmpeg(args: string[], cwd: string): Promise<void> {
  const bin = ffmpegPath()
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd, windowsHide: true })
    let stderr = ""
    p.stderr?.setEncoding("utf8")
    p.stderr?.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-12_000)
    })
    p.on("error", reject)
    p.on("close", (code) => {
      if (code === 0) resolve()
      else {
        reject(
          new Error(
            `فشل ffmpeg (رمز ${code}). تأكد أن ffmpeg مثبت على الخادم (أو عيّن FFMPEG_PATH). ${stderr.slice(-1800)}`
          )
        )
      }
    })
  })
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

export function assertValidSourceRelativePath(raw: string): string {
  const n = raw.replace(/\\/g, "/").replace(/^\/+/, "").trim()
  if (!n.startsWith("_source/") || n.includes("..")) {
    throw new Error("مسار ملف المصدر غير صالح")
  }
  const rest = n.slice("_source/".length)
  if (!rest || rest.includes("/")) {
    throw new Error("يُسمح فقط بملف واحد داخل _source/")
  }
  return n
}

export function isLessonVideoTranscodeAvailable(): boolean {
  if (process.env.DISABLE_SERVER_VIDEO_TRANSCODE === "1") {
    return false
  }
  return isR2Configured() && isFfmpegAvailable()
}

export async function transcodeLessonSourceOnServer(
  lessonId: string,
  sourceRelativePath: string
): Promise<{ masterPublicUrl: string; durationSec?: number }> {
  if (process.env.DISABLE_SERVER_VIDEO_TRANSCODE === "1") {
    throw new Error("تم تعطيل تحويل الفيديو على الخادم")
  }
  if (!isR2Configured()) {
    throw new Error("R2 غير مُهيأ")
  }
  if (!isFfmpegAvailable()) {
    throw new Error(
      "لم يُعثر على ffmpeg على الخادم. ثبّت ffmpeg أو عيّن المتغير FFMPEG_PATH (واختيارياً FFPROBE_PATH)."
    )
  }

  const rel = assertValidSourceRelativePath(sourceRelativePath)
  const sourceKey = `${lessonHlsObjectPrefix(lessonId)}/${rel}`

  const lesson = await getVideoById(lessonId)
  if (!lesson) {
    throw new Error("الدرس غير موجود")
  }

  await r2DeleteLessonHlsExceptSource(lessonId)

  const tmpRoot = await mkdtemp(join(tmpdir(), `hls-src-${lessonId}-`))
  const localIn = join(tmpRoot, "source.bin")
  const outDir = join(tmpRoot, "out")

  try {
    await r2DownloadObjectToFile(sourceKey, localIn)
    const { mkdir } = await import("node:fs/promises")
    await mkdir(outDir, { recursive: true })

    const durationSec = await probeDurationSeconds(localIn)
    const hasAudio = await probeHasAudio(localIn)
    const inputPosix = localIn.replace(/\\/g, "/")

    const args: string[] = ["-y", "-i", inputPosix]

    args.push(
      "-filter_complex",
      "[0:v]split=3[v1080][v720][v480];" +
        "[v1080]scale=-2:1080:flags=lanczos,setsar=1[v1080s];" +
        "[v720]scale=-2:720:flags=lanczos,setsar=1[v720s];" +
        "[v480]scale=-2:480:flags=lanczos,setsar=1[v480s]"
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
        "2400k"
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
      hasAudio ? "v:0,a:0 v:1,a:1 v:2,a:2" : "v:0 v:1 v:2",
      "v%v/index.m3u8"
    )

    await runFfmpeg(args, outDir)

    const files = await walkFiles(outDir)
    if (!files.length) {
      throw new Error("لم يُنتج ffmpeg أي ملفات")
    }

    const baseKey = `${lessonHlsObjectPrefix(lessonId)}`
    for (const abs of files) {
      const relPath = relative(outDir, abs).replace(/\\/g, "/")
      const key = `${baseKey}/${relPath}`
      await r2PutObjectFromFile(key, abs, guessContentType(relPath))
    }

    const masterKey = `${baseKey}/master.m3u8`
    const masterPublicUrl = publicUrlForObjectKey(masterKey)
    if (!masterPublicUrl) {
      throw new Error("NEXT_PUBLIC_R2_PUBLIC_BASE_URL غير مضبوط — مطلوب لربط الدرس")
    }

    const lessonPatch: { hls_url: string; duration?: number } = { hls_url: masterPublicUrl }
    if (durationSec != null && durationSec > 0) {
      lessonPatch.duration = durationSec
    }
    await adminUpdateVideoLesson(lessonId, lessonPatch)

    return { masterPublicUrl, durationSec: durationSec ?? undefined }
  } finally {
    try {
      await rm(tmpRoot, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}
