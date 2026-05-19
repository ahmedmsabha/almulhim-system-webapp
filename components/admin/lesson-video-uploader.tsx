"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { adminPresignLessonSourceVideoUpload } from "@/actions/admin-media-video-source"
import { adminQueueTranscodeJob } from "@/actions/admin-media-transcode-queue"
import { xhrPutBlob } from "@/lib/client/admin-upload-xhr"

const MAX_BYTES = 4 * 1024 * 1024 * 1024

function workerMisconfiguredMessage(): string {
  return (
    "عامل التحويل غير مُهيأ على الخادم. مطلوب: TRANSCODER_WORKER_URL و TRANSCODER_WEBHOOK_SECRET و " +
    "NEXT_PUBLIC_SITE_URL (أو VERCEL_URL في Vercel)."
  )
}

function truncateMiddle(url: string, max = 56): string {
  const u = url.trim()
  if (u.length <= max) return u
  const head = Math.floor(max / 2) - 1
  const tail = max - head - 1 - 3
  return `${u.slice(0, head)}…${u.slice(-tail)}`
}

type FlowStep = "pick" | "upload" | "queue" | "pending"

export interface LessonVideoUploaderProps {
  lessonId: string
  currentHlsUrl: string | null
  onSuccess?: () => void
  /** يُستدعى بعد اكتمال PUT إلى R2 بنجاح (قبل طابور التحويل). */
  onUploadComplete?: (payload: { sourceR2Key: string; relativePath: string }) => void
  disabled?: boolean
  transcoderWorkerQueueConfigured?: boolean
}

export function LessonVideoUploader({
  lessonId,
  currentHlsUrl,
  onSuccess,
  onUploadComplete,
  disabled = false,
  transcoderWorkerQueueConfigured = true,
}: LessonVideoUploaderProps) {
  const router = useRouter()
  const inputId = useId()
  const [allowNewUpload, setAllowNewUpload] = useState(false)
  const [step, setStep] = useState<FlowStep>("pick")
  const [busy, setBusy] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [sourceR2Key, setSourceR2Key] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const awaitingWebhookRef = useRef(false)
  const onSuccessFiredRef = useRef(false)

  const pipelineBlocked = disabled || !transcoderWorkerQueueConfigured
  const hasLinkedVideo = Boolean(currentHlsUrl?.trim())
  const inFlow = allowNewUpload || !hasLinkedVideo

  useEffect(() => {
    setAllowNewUpload(false)
    setStep("pick")
    setBusy(false)
    setUploadPct(0)
    setFileName(null)
    setSourceR2Key(null)
    setError(null)
    setQueueError(null)
    awaitingWebhookRef.current = false
    onSuccessFiredRef.current = false
  }, [lessonId])

  useEffect(() => {
    if (!currentHlsUrl?.trim() || !awaitingWebhookRef.current || onSuccessFiredRef.current) return
    onSuccessFiredRef.current = true
    awaitingWebhookRef.current = false
    onSuccess?.()
    setAllowNewUpload(false)
    setStep("pick")
    setSourceR2Key(null)
    setQueueError(null)
    setError(null)
  }, [currentHlsUrl, onSuccess])

  const processFile = useCallback(
    async (file: File) => {
      if (pipelineBlocked || busy) return

      const looksVideo =
        (file.type && file.type.startsWith("video/")) ||
        /\.(mp4|mov|webm|mkv|avi|m4v|mpeg|mpg)$/i.test(file.name)
      if (!looksVideo) {
        setError("يُقبل ملف فيديو فقط.")
        return
      }
      if (!file.size || file.size > MAX_BYTES) {
        setError("حجم الملف غير مناسب (الحد الأقصى 4 غيغابايت).")
        return
      }

      setBusy(true)
      setError(null)
      setQueueError(null)
      setStep("upload")
      setUploadPct(0)
      setFileName(file.name)

      try {
        const presign = await adminPresignLessonSourceVideoUpload(
          lessonId,
          file.name,
          file.type || "application/octet-stream",
          file.size,
        )
        if (!presign.success) {
          setError(presign.error)
          setStep("pick")
          return
        }

        const { signedUrl, relativePath: relPath, contentType } = presign.data

        try {
          await xhrPutBlob(signedUrl, file, contentType, (loaded, total) => {
            setUploadPct(Math.min(100, Math.round((loaded / Math.max(total, 1)) * 100)))
          })
        } catch {
          setError("تعذّر رفع الملف. تحقق من الاتصال أو جرّب ملفاً أصغر، ثم أعد المحاولة.")
          setStep("pick")
          return
        }

        setUploadPct(100)
        const key = `hls/${lessonId}/${relPath}`
        setSourceR2Key(key)
        setStep("queue")
        onUploadComplete?.({ sourceR2Key: key, relativePath: relPath })
      } catch {
        setError("حدث خطأ غير متوقع أثناء تجهيز الرفع.")
        setStep("pick")
      } finally {
        setBusy(false)
      }
    },
    [busy, lessonId, onUploadComplete, pipelineBlocked],
  )

  const startTranscode = useCallback(async () => {
    if (pipelineBlocked || busy || !sourceR2Key) return
    setBusy(true)
    setQueueError(null)
    try {
      const qr = await adminQueueTranscodeJob({ lessonId, sourceR2Key })
      if (!qr.success) {
        setQueueError("تعذّر إرسال طلب التحويل. انتظر قليلاً ثم أعد المحاولة.")
        return
      }
      awaitingWebhookRef.current = true
      onSuccessFiredRef.current = false
      setStep("pending")
    } catch {
      setQueueError("تعذّر إرسال طلب التحويل. انتظر قليلاً ثم أعد المحاولة.")
    } finally {
      setBusy(false)
    }
  }, [busy, lessonId, pipelineBlocked, sourceR2Key])

  if (hasLinkedVideo && !allowNewUpload) {
    return (
      <div dir="rtl" className="rounded-lg border border-border bg-muted/15 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <span aria-hidden>✓</span>
          <span>الفيديو جاهز (HLS على R2)</span>
        </div>
        <div>
          <a
            href={currentHlsUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-primary underline underline-offset-2 hover:opacity-90 break-all inline-block max-w-full"
            dir="ltr"
          >
            {truncateMiddle(currentHlsUrl!)}
          </a>
        </div>
        <button
          type="button"
          className="inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/60 transition-colors disabled:opacity-50"
          disabled={pipelineBlocked}
          onClick={() => {
            setAllowNewUpload(true)
            setStep("pick")
            setError(null)
            setQueueError(null)
            setSourceR2Key(null)
            awaitingWebhookRef.current = false
            onSuccessFiredRef.current = false
          }}
        >
          رفع فيديو جديد
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="rounded-lg border border-border bg-muted/15 p-4 space-y-4">
      {!transcoderWorkerQueueConfigured ?
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive leading-relaxed"
        >
          {workerMisconfiguredMessage()}
        </div>
      : null}

      {error ?
        <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
      : null}

      {step === "pick" && inFlow ?
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">1 — اختر ملف الفيديو</p>
          <label
            htmlFor={inputId}
            tabIndex={0}
            role="presentation"
            onDragEnter={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files?.[0]
              if (f) void processFile(f)
            }}
            onKeyDown={(ke) => {
              if (ke.key === "Enter" || ke.key === " ") {
                ke.preventDefault()
                document.getElementById(inputId)?.click()
              }
            }}
            className={[
              "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
              pipelineBlocked || busy ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            <input
              id={inputId}
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={pipelineBlocked || busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (file) void processFile(file)
              }}
            />
            <span className="text-sm font-medium text-foreground">اسحب فيديو هنا أو اضغط للاختيار</span>
            <span className="text-xs text-muted-foreground">الحد الأقصى: 4 غيغابايت — video/*</span>
          </label>
        </div>
      : null}

      {step === "upload" ?
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">2 — رفع المصدر إلى R2</p>
          {fileName ?
            <p className="text-sm text-foreground/90 text-right">{fileName}</p>
          : null}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${Math.min(100, Math.max(0, uploadPct))}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">جارٍ الرفع… {uploadPct}%</p>
        </div>
      : null}

      {step === "queue" ?
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">3 — طابور التحويل</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            المصدر على R2:{" "}
            <code className="rounded bg-muted px-1 font-mono text-[11px]" dir="ltr">
              {sourceR2Key}
            </code>
          </p>
          {queueError ?
            <p className="text-sm text-red-600 dark:text-red-400">{queueError}</p>
          : null}
          <button
            type="button"
            className="inline-flex w-full sm:w-auto justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50"
            disabled={pipelineBlocked || busy || !sourceR2Key}
            onClick={() => void startTranscode()}
          >
            {busy ? "جارٍ الإرسال…" : "بدء التحويل"}
          </button>
        </div>
      : null}

      {step === "pending" ?
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">4 — يتم التحويل على Railway</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            جارٍ التحويل… سيُحدَّث الدرس تلقائياً عند الانتهاء. يمكنك تحديث الصفحة لمتابعة الحالة.
          </p>
          {queueError ?
            <p className="text-sm text-red-600 dark:text-red-400">{queueError}</p>
          : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent/60 disabled:opacity-50"
              disabled={busy}
              onClick={() => router.refresh()}
            >
              تحديث الصفحة
            </button>
            {sourceR2Key ?
              <button
                type="button"
                className="inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent/60 disabled:opacity-50"
                disabled={pipelineBlocked || busy}
                onClick={() => void startTranscode()}
              >
                إعادة إرسال طابور التحويل
              </button>
            : null}
          </div>
        </div>
      : null}
    </div>
  )
}
