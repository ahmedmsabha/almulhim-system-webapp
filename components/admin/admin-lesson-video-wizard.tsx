"use client"

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react"

import { Loader2, Upload } from "lucide-react"

import { adminBindLessonHlsFromStandardR2Path } from "@/actions/admin-media-hls"
import { adminQueueTranscodeJob } from "@/actions/admin-media-transcode-queue"
import { adminPresignLessonSourceVideoUpload } from "@/actions/admin-media-video-source"
import { xhrPutBlob } from "@/lib/client/admin-upload-xhr"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { VideoLesson } from "@/types"

const MAX_BYTES = 4 * 1024 * 1024 * 1024

function messagePresignFailure(): string {
  return "تعذّر تجهيز الرفع. تحقق من اتصالك بالإنترنت وحاول مرة أخرى."
}

function messageUploadFailure(): string {
  return "تعذّر رفع الملف. تحقق من الاتصال أو جرّب ملفاً أصغر، ثم أعد المحاولة."
}

function messageQueueFailure(): string {
  return "تعذّر إرسال طلب التحويل. انتظر قليلاً ثم اضغط «إعادة المحاولة»."
}

function messageBindFailure(raw: string): string {
  const t = raw.trim()
  if (t && /[\u0600-\u06FF]/.test(t)) {
    return t
  }
  return "تعذّر ربط الفيديو. تأكد من اكتمال التحويل ثم أعد المحاولة."
}

type WizardStep = 1 | 2 | 3

export function AdminLessonVideoWizard({
  lessonId,
  hlsUrl,
  disabled = false,
  onVideoLinked,
}: {
  lessonId: string
  hlsUrl: string | null
  disabled?: boolean
  onVideoLinked: (lesson: VideoLesson) => void
}) {
  const hasLinkedVideo = Boolean(hlsUrl?.trim())
  const [reuploading, setReuploading] = useState(false)
  const [step, setStep] = useState<WizardStep>(1)
  const [uploadPct, setUploadPct] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pendingRelativePath, setPendingRelativePath] = useState<string | null>(null)
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [step3Error, setStep3Error] = useState<string | null>(null)
  const [queueSentOk, setQueueSentOk] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const showWizard = !hasLinkedVideo || reuploading

  useEffect(() => {
    setReuploading(false)
    setStep(1)
    setUploadPct(0)
    setPendingRelativePath(null)
    setStep1Error(null)
    setStep2Error(null)
    setStep3Error(null)
    setQueueSentOk(false)
    setBusy(false)
  }, [lessonId])

  const resetForReupload = useCallback(() => {
    setReuploading(true)
    setStep(1)
    setUploadPct(0)
    setPendingRelativePath(null)
    setStep1Error(null)
    setStep2Error(null)
    setStep3Error(null)
    setQueueSentOk(false)
    setBusy(false)
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      if (disabled || busy) return

      const isMp4 = file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4")
      if (!isMp4) {
        setStep1Error("يُقبل ملف MP4 فقط.")
        return
      }
      if (!file.size || file.size > MAX_BYTES) {
        setStep1Error("حجم الملف غير مناسب (الحد الأقصى 4 غيغابايت).")
        return
      }

      setBusy(true)
      setStep1Error(null)
      setStep2Error(null)
      setStep3Error(null)
      setQueueSentOk(false)
      setStep(1)
      setUploadPct(0)
      setPendingRelativePath(null)

      try {
        const presign = await adminPresignLessonSourceVideoUpload(
          lessonId,
          file.name,
          file.type || "video/mp4",
          file.size,
        )
        if (!presign.success) {
          setStep1Error(messagePresignFailure())
          return
        }

        const { signedUrl, relativePath, contentType } = presign.data

        try {
          await xhrPutBlob(signedUrl, file, contentType, (loaded, total) => {
            setUploadPct(Math.min(100, Math.round((loaded / Math.max(total, 1)) * 100)))
          })
        } catch {
          setStep1Error(messageUploadFailure())
          return
        }

        setUploadPct(100)
        setPendingRelativePath(relativePath)
        setStep(2)

        const sourceR2Key = `hls/${lessonId}/${relativePath}`
        let qr: Awaited<ReturnType<typeof adminQueueTranscodeJob>>
        try {
          qr = await adminQueueTranscodeJob({ lessonId, sourceR2Key })
        } catch {
          setStep2Error(messageQueueFailure())
          return
        }
        if (!qr.success) {
          setStep2Error(messageQueueFailure())
          return
        }

        setQueueSentOk(true)
        setStep(3)
      } finally {
        setBusy(false)
      }
    },
    [busy, disabled, lessonId],
  )

  const retryQueue = useCallback(async () => {
    if (!pendingRelativePath || disabled || busy) return
    setBusy(true)
    setStep2Error(null)
    try {
      const sourceR2Key = `hls/${lessonId}/${pendingRelativePath}`
      const qr = await adminQueueTranscodeJob({ lessonId, sourceR2Key })
      if (!qr.success) {
        setStep2Error(messageQueueFailure())
        return
      }
      setQueueSentOk(true)
      setStep(3)
    } catch {
      setStep2Error(messageQueueFailure())
    } finally {
      setBusy(false)
    }
  }, [busy, disabled, lessonId, pendingRelativePath])

  const bindVideo = useCallback(async () => {
    if (disabled || busy) return
    setBusy(true)
    setStep3Error(null)
    try {
      const res = await adminBindLessonHlsFromStandardR2Path(lessonId)
      if (!res.success) {
        setStep3Error(messageBindFailure(res.error))
        return
      }
      if (!res.data) {
        setStep3Error(messageBindFailure(""))
        return
      }
      onVideoLinked(res.data)
      setReuploading(false)
    } catch {
      setStep3Error(messageBindFailure(""))
    } finally {
      setBusy(false)
    }
  }, [busy, disabled, lessonId, onVideoLinked])

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (f) void processFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (disabled || busy) return
    const f = e.dataTransfer.files?.[0]
    if (f) void processFile(f)
  }

  if (!showWizard) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          ✓ الفيديو مرتبط بهذا الدرس وجاهز للطلاب بعد الحفظ.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => resetForReupload()}
        >
          إعادة رفع فيديو جديد
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/15 p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            step === 1 ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          1
        </span>
        <span className="text-muted-foreground/60">—</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            step === 2 ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          2
        </span>
        <span className="text-muted-foreground/60">—</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            step === 3 ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          3
        </span>
      </div>

      {step === 1 ?
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">رفع الفيديو</p>
          <p className="text-xs text-muted-foreground">اسحب ملف MP4 هنا أو اختره من جهازك.</p>

          {step1Error ?
            <p className="text-sm text-destructive leading-relaxed">{step1Error}</p>
          : null}

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(ke) => ke.key === "Enter" && !busy && fileInputRef.current?.click()}
            onDragEnter={(ev) => {
              ev.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDragOver={(ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              setDragOver(true)
            }}
            onDrop={(ev) => void handleDrop(ev)}
            className={cn(
              "rounded-lg border border-dashed p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[140px]",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
              disabled || busy ? "opacity-60 pointer-events-none" : "cursor-pointer",
            )}
            onClick={() => !busy && !disabled && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,.mp4"
              className="hidden"
              disabled={disabled || busy}
              onChange={(ev) => void handlePick(ev)}
            />
            {busy ?
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            : <Upload className="h-8 w-8 text-muted-foreground" />}
            <span className="text-sm text-foreground">اضغط أو اسحب ملف MP4</span>
          </div>

          {busy && step === 1 ?
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>جارٍ الرفع…</span>
                <span>{uploadPct}%</span>
              </div>
              <Progress value={uploadPct} />
            </div>
          : null}
        </div>
      : null}

      {step === 2 ?
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">جارٍ التحويل</p>
          {step2Error ?
            <>
              <p className="text-sm text-destructive leading-relaxed">{step2Error}</p>
              <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void retryQueue()}>
                إعادة المحاولة
              </Button>
            </>
          : <>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                <span>جارٍ تحويل الفيديو إلى عدة جودات…</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                قد يستغرق هذا بضع دقائق، يمكنك مغادرة الصفحة
              </p>
            </>
          }
        </div>
      : null}

      {step === 3 ?
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">ربط الدرس</p>
          {queueSentOk ?
            <p className="text-sm text-emerald-700 dark:text-emerald-400">تم إرسال طلب التحويل ✓</p>
          : null}
          <p className="text-sm text-muted-foreground leading-relaxed">
            بعد اكتمال التحويل، اضغط الزر أدناه لربط الفيديو بالدرس
          </p>
          {step3Error ?
            <p className="text-sm text-destructive leading-relaxed">{step3Error}</p>
          : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void bindVideo()}>
              {busy ?
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الربط…
                </>
              : "ربط الفيديو بالدرس"}
            </Button>
            {step3Error ?
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void bindVideo()}>
                إعادة المحاولة
              </Button>
            : null}
          </div>
        </div>
      : null}
    </div>
  )
}
