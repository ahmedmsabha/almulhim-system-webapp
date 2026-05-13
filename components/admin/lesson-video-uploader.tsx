"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"

import { adminPresignLessonSourceVideoUpload } from "@/actions/admin-media-video-source"
import { adminQueueTranscodeJob } from "@/actions/admin-media-transcode-queue"
import { adminBindLessonHlsFromStandardR2Path } from "@/actions/admin-media-hls"

const MAX_BYTES = 4 * 1024 * 1024 * 1024

type UploaderState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string }
  | { status: "transcoding"; sourceR2Key: string }
  | { status: "binding" }

export interface LessonVideoUploaderProps {
  lessonId: string
  currentHlsUrl: string | null
  onSuccess: () => void
}

function truncateMiddle(url: string, max = 56): string {
  const u = url.trim()
  if (u.length <= max) return u
  const head = Math.floor(max / 2) - 1
  const tail = max - head - 1 - 3
  return `${u.slice(0, head)}…${u.slice(-tail)}`
}

function putLessonSourceWithXHR(
  signedUrl: string,
  contentType: string,
  file: File,
  setProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return
      const total = Math.max(e.total, 1)
      setProgress((e.loaded / total) * 100)
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error("upload_failed"))
    })
    xhr.addEventListener("error", () => reject(new Error("upload_failed")))
    xhr.addEventListener("abort", () => reject(new Error("upload_failed")))

    xhr.open("PUT", signedUrl)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.send(file)
  })
}

export function LessonVideoUploader({ lessonId, currentHlsUrl, onSuccess }: LessonVideoUploaderProps) {
  const inputId = useId()
  const [state, setState] = useState<UploaderState>({ status: "idle" })
  /** When HLS exists, clicking «رفع فيديو جديد» shows picker again instead of summary. */
  const [allowNewUpload, setAllowNewUpload] = useState(false)
  /** idle step errors */
  const [idleError, setIdleError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  /** transcoding: queue outcome (after adminQueueTranscodeJob settles) */
  const [queueDone, setQueueDone] = useState(false)
  const [queueOk, setQueueOk] = useState<boolean | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)

  /** binding sub-state */
  const [bindBusy, setBindBusy] = useState(false)
  const [bindSuccess, setBindSuccess] = useState(false)
  const [bindError, setBindError] = useState<string | null>(null)

  const onSuccessCalled = useRef(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setState({ status: "idle" })
    setAllowNewUpload(false)
    setIdleError(null)
    setDragOver(false)
    setQueueDone(false)
    setQueueOk(null)
    setQueueError(null)
    setBindBusy(false)
    setBindSuccess(false)
    setBindError(null)
    onSuccessCalled.current = false
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [lessonId])

  const transcodingKey = state.status === "transcoding" ? state.sourceR2Key : null

  /** On transcoding enter: enqueue job (then update Arabic messages). */
  useEffect(() => {
    if (!transcodingKey) return

    let cancelled = false

    setQueueDone(false)
    setQueueOk(null)
    setQueueError(null)

    void (async () => {
      try {
        const qr = await adminQueueTranscodeJob({ lessonId, sourceR2Key: transcodingKey })
        if (cancelled) return
        if (qr.success) {
          setQueueOk(true)
          setQueueError(null)
        } else {
          setQueueOk(false)
          setQueueError(qr.error)
        }
      } catch {
        if (cancelled) return
        setQueueOk(false)
        setQueueError("تعذّر إرسال طلب التحويل.")
      } finally {
        if (!cancelled) setQueueDone(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [lessonId, transcodingKey])

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const runBind = useCallback(async () => {
    setBindBusy(true)
    setBindError(null)
    setBindSuccess(false)
    try {
      const res = await adminBindLessonHlsFromStandardR2Path(lessonId)
      if (!res.success) {
        setBindError(res.error)
        setBindBusy(false)
        return
      }
      setBindSuccess(true)
      setBindBusy(false)
      setAllowNewUpload(false)
      if (!onSuccessCalled.current) {
        onSuccessCalled.current = true
        successTimerRef.current = setTimeout(() => {
          successTimerRef.current = null
          onSuccess()
        }, 1000)
      }
    } catch {
      setBindError("تعذّر ربط الفيديو. أعد المحاولة بعد التأكد من اكتمال التحويل.")
      setBindBusy(false)
    }
  }, [lessonId, onSuccess])

  const processSelectedFile = useCallback(
    async (file: File) => {
      setIdleError(null)

      if (file.size > MAX_BYTES) {
        setIdleError("حجم الملف يتجاوز الحد الأقصى البالغ 4 غيغابايت.")
        return
      }

      try {
        const presign = await adminPresignLessonSourceVideoUpload(
          lessonId,
          file.name,
          file.type || "video/mp4",
          file.size,
        )

        if (!presign.success) {
          setIdleError(presign.error)
          return
        }

        const { signedUrl, relativePath, contentType } = presign.data

        setState({ status: "uploading", progress: 0, fileName: file.name })

        try {
          await putLessonSourceWithXHR(signedUrl, contentType, file, (p) => {
            setState({ status: "uploading", progress: p, fileName: file.name })
          })
        } catch {
          setState({ status: "idle" })
          setIdleError("فشل رفع الملف. تحقق من الاتصال أو امتيازات CORS ثم حاول مجدداً.")
          return
        }

        const sourceR2Key = `hls/${lessonId}/${relativePath}`
        setState({ status: "transcoding", sourceR2Key })
      } catch {
        setIdleError("حدث خطأ غير متوقع أثناء تجهيز الرفع.")
      }
    },
    [lessonId],
  )

  function onInputChange(files: FileList | null) {
    const file = files?.[0]
    if (file) void processSelectedFile(file)
  }

  return (
    <div dir="rtl" className="rounded-lg border border-border bg-muted/15 p-4 space-y-4">
      {state.status === "idle" ?
        <>
          {currentHlsUrl && !allowNewUpload ?
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <span aria-hidden>✓</span>
                <span>الفيديو مرفوع ومنشور</span>
              </div>
              <div>
                <a
                  href={currentHlsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-primary underline underline-offset-2 hover:opacity-90 break-all inline-block max-w-full"
                  dir="ltr"
                >
                  {truncateMiddle(currentHlsUrl)}
                </a>
              </div>
              <button
                type="button"
                className="inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/60 transition-colors"
                onClick={() => {
                  setAllowNewUpload(true)
                  setState({ status: "idle" })
                  setIdleError(null)
                  setDragOver(false)
                  setQueueDone(false)
                  setQueueOk(null)
                  setQueueError(null)
                  setBindBusy(false)
                  setBindSuccess(false)
                  setBindError(null)
                  onSuccessCalled.current = false
                  if (successTimerRef.current) {
                    clearTimeout(successTimerRef.current)
                    successTimerRef.current = null
                  }
                }}
              >
                رفع فيديو جديد
              </button>
            </div>
          : <>
              {idleError ?
                <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{idleError}</p>
              : null}

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
                  if (f) void processSelectedFile(f)
                }}
                onKeyDown={(ke) => {
                  if (ke.key === "Enter" || ke.key === " ") {
                    ke.preventDefault()
                    document.getElementById(inputId)?.click()
                  }
                }}
                className={[
                  "flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
                ].join(" ")}
              >
                <input
                  id={inputId}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="sr-only"
                  onChange={(e) => {
                    onInputChange(e.target.files)
                    e.target.value = ""
                  }}
                />
                <span className="text-sm font-medium text-foreground">
                  اسحب فيديو MP4 هنا أو اضغط للاختيار
                </span>
                <span className="text-xs text-muted-foreground">الحد الأقصى: 4GB</span>
              </label>
            </>
          }
        </>
      : null}

      {state.status === "uploading" ?
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground text-right">{state.fileName}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${Math.min(100, Math.max(0, state.progress))}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            جارٍ الرفع... {Math.round(state.progress)}%
          </p>
        </div>
      : null}

      {state.status === "transcoding" ?
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-block h-9 w-9 shrink-0 rounded-full border-2 border-muted border-t-primary animate-spin"
              aria-hidden
            />
          </div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">تم رفع الفيديو ✓</p>
          {!queueDone ?
            <p className="text-sm text-foreground">جارٍ إرسال طلب التحويل...</p>
          : queueOk ?
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              ✓ طلب التحويل قُبل — سيستغرق التحويل بضع دقائق
            </p>
          : <p className="text-sm text-red-600 dark:text-red-400">{queueError ?? "فشل إرسال طلب التحويل."}</p>}

          <button
            type="button"
            className="inline-flex w-full sm:w-auto justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50"
            disabled={!queueDone}
            onClick={() => {
              setState({ status: "binding" })
              void runBind()
            }}
          >
            ربط الفيديو بالدرس بعد اكتمال التحويل ←
          </button>
        </div>
      : null}

      {state.status === "binding" ?
        <div className="space-y-3">
          {bindBusy && !bindSuccess && !bindError ?
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span
                className="inline-block h-5 w-5 shrink-0 rounded-full border-2 border-muted border-t-primary animate-spin"
                aria-hidden
              />
              <span>جارٍ ربط الفيديو...</span>
            </div>
          : null}

          {bindSuccess ?
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✓ تم ربط الفيديو بنجاح</p>
          : null}

          {bindError ?
            <>
              <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{bindError}</p>
              <button
                type="button"
                className="inline-flex rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent/60"
                disabled={bindBusy}
                onClick={() => void runBind()}
              >
                إعادة المحاولة
              </button>
            </>
          : null}
        </div>
      : null}
    </div>
  )
}
