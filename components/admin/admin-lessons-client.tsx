"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  Plus,
  MoreVertical,
  Play,
  Eye,
  Edit,
  Trash2,
  Clock,
  Lock,
  Loader2,
  Unlock,
  Video,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AdminUploadOverlay } from "@/components/admin/admin-upload-overlay"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  adminCreateVideo,
  adminListVideos,
  adminRemoveVideo,
  adminUpdateVideo,
} from "@/actions/admin-lessons"
import {
  adminBindLessonHlsFromStandardR2Path,
  adminFinalizeLessonHlsFromUpload,
  adminGetLessonHlsR2Layout,
  adminGetLessonHlsVariants,
  adminPresignHlsPartUploads,
  adminSaveLessonHlsVariants,
} from "@/actions/admin-media-hls"
import {
  adminFinalizeStreamLesson,
  adminCreateStreamUploadUrl,
} from "@/actions/admin-media-stream"
import {
  adminPresignLessonSourceVideoUpload,
  adminTranscodeLessonUploadedVideo,
} from "@/actions/admin-media-video-source"
import { AdminLessonVideoWizard } from "@/components/admin/admin-lesson-video-wizard"
import { Checkbox } from "@/components/ui/checkbox"
import { collectFilesWithRelativePathsFromDrop } from "@/lib/client/collect-files-from-data-transfer"
import { xhrPutBlob } from "@/lib/client/admin-upload-xhr"
import { queryKeys } from "@/lib/query-keys"
import type { VideoLesson } from "@/types"
import { Upload } from "tus-js-client"

function looksLikeCloudflareStreamHlsMaster(url: string): boolean {
  return /^https:\/\/customer-[^.]+\.cloudflarestream\.com\/.+\/manifest\/video\.m3u8/i.test(
    url.trim()
  )
}

function normalizeRelativePath(raw: string): string {
  return raw.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/").trim()
}

function guessContentType(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (lower.endsWith(".ts")) return "video/mp2t"
  if (lower.endsWith(".mp4")) return "video/mp4"
  if (lower.endsWith(".vtt")) return "text/vtt"
  return "application/octet-stream"
}

async function mapPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    async () => {
      while (cursor < items.length) {
        const i = cursor++
        await worker(items[i])
      }
    }
  )
  await Promise.all(workers)
}

/** تقدير مدة الفيديو من المتصفح قبل الرفع (بالثواني). */
function probeDurationFromVideoFile(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    const finish = (sec: number | null) => {
      URL.revokeObjectURL(url)
      resolve(sec)
    }
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      const d = video.duration
      finish(Number.isFinite(d) && d > 0 ? d : null)
    }
    video.onerror = () => finish(null)
    video.src = url
  })
}

/** Cloudflare tus chunk size aligned to 256 KiB; files ≤5 MiB upload in one chunk. */
function pickStreamTusChunkSize(fileSize: number): number {
  const MIN = 5242880
  const MAX = 209715200
  const UNIT = 256 * 1024
  if (fileSize <= MIN) return fileSize
  const capped = Math.min(fileSize, MAX)
  const pref = Math.min(50 * 1024 * 1024, capped)
  const rounded = Math.floor(pref / UNIT) * UNIT
  return Math.max(MIN, rounded)
}

export function AdminLessonsClient({
  initialLessons,
  autoOpenCreate = false,
  enableR2LessonUpload = false,
  r2PublicPlaybackReady = false,
  enableR2ServerMedia = false,
  enableServerVideoTranscode = false,
  enableTranscoderWorkerQueue = false,
  enableCloudflareStreamUpload = false,
  r2BucketDisplayName = null,
}: {
  initialLessons: VideoLesson[]
  autoOpenCreate?: boolean
  /** بيانات R2 على الخادم — يُظهر الرفع إلى الحاوية دون بوابة Cloudflare */
  enableR2LessonUpload?: boolean
  /** دومين الملفات العام (NEXT_PUBLIC_R2_PUBLIC_BASE_URL) — للتشغيل وربط master بعد الرفع */
  r2PublicPlaybackReady?: boolean
  /** قراءة/كتابة master ومسح الملفات يعتمد على مفاتيح R2 على الخادم */
  enableR2ServerMedia?: boolean
  /** رفع فيديو خام + ffmpeg على هذا الخادم (يتطلب ffmpeg) */
  enableServerVideoTranscode?: boolean
  /** صف تحويل خارجي (عامل Railway/VM) بعد الرفع إلى R2 — يُهيأ بـ TRANSCODER_WORKER_URL */
  enableTranscoderWorkerQueue?: boolean
  /** رفع فيديو خام عبر Cloudflare Stream (tus)، بدون ffmpeg على الخادم */
  enableCloudflareStreamUpload?: boolean
  /** اسم الحاوية من R2_BUCKET_NAME (للعرض في لوحة الإدارة) */
  r2BucketDisplayName?: string | null
}) {
  const queryClient = useQueryClient()
  const rawR2TranscodeAvailable =
    enableServerVideoTranscode || enableTranscoderWorkerQueue
  const workerOnlyVideoUi = enableTranscoderWorkerQueue

  const { data: lessons = initialLessons } = useQuery({
    queryKey: queryKeys.adminLessons(),
    queryFn: async () => {
      try {
        const res = await adminListVideos()
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل تحميل الدروس")
      }
    },
    initialData: initialLessons,
  })

  const togglePreviewMutation = useMutation({
    mutationFn: async ({ id, isPreview }: { id: string; isPreview: boolean }) => {
      try {
        const res = await adminUpdateVideo(id, { is_preview: !isPreview })
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل التحديث")
      }
    },
    onSuccess: async () => {
      toast.success("تم تحديث نوع الدرس")
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const res = await adminRemoveVideo(id)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الحذف")
      }
    },
    onSuccess: async (data) => {
      const n = data?.r2Removed
      toast.success(
        typeof n === "number" && n > 0
          ? `تم حذف الدرس وإزالة ${n} ملفاً من R2`
          : "تم حذف الدرس"
      )
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const createLessonMutation = useMutation({
    mutationFn: async (input: Parameters<typeof adminCreateVideo>[0]) => {
      try {
        const res = await adminCreateVideo(input)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الإنشاء")
      }
    },
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    },
  })

  const updateLessonMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Parameters<typeof adminUpdateVideo>[1]
    }) => {
      try {
        const res = await adminUpdateVideo(id, patch)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الحفظ")
      }
    },
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    },
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUnit, setSelectedUnit] = useState<string>("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingLesson, setEditingLesson] = useState<VideoLesson | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formHlsUrl, setFormHlsUrl] = useState("")
  const [formYoutubeId, setFormYoutubeId] = useState("")
  const [formUnit, setFormUnit] = useState("عام")
  const [formDurationMin, setFormDurationMin] = useState("30")
  const [formOrder, setFormOrder] = useState("0")
  const [formPreview, setFormPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hlsUploadOverlay, setHlsUploadOverlay] = useState<{
    pct: number
    title: string
    subtitle?: string
  } | null>(null)
  const hlsBusy = hlsUploadOverlay !== null
  const hlsFolderInputRef = useRef<HTMLInputElement>(null)
  const rawVideoInputRef = useRef<HTMLInputElement>(null)
  const [hlsDragOver, setHlsDragOver] = useState(false)
  const [sourceVideoDragOver, setSourceVideoDragOver] = useState(false)
  const [hlsVariantRows, setHlsVariantRows] = useState<Array<{ uri: string; label: string }>>([])
  const [hlsVariantSelected, setHlsVariantSelected] = useState<Set<string>>(() => new Set())
  const [hlsVariantsLoading, setHlsVariantsLoading] = useState(false)
  const [hlsVariantsSaving, setHlsVariantsSaving] = useState(false)
  const [hlsR2ProbeBusy, setHlsR2ProbeBusy] = useState(false)
  const [hlsR2BindBusy, setHlsR2BindBusy] = useState(false)
  const [hlsR2Layout, setHlsR2Layout] = useState<{
    masterExists: boolean
    derivedMasterUrl: string | null
    qualities: number[]
  } | null>(null)
  /** مُنشأ تلقائياً للرفع قبل أول «حفظ»؛ عند الإلغاء يُحذف إن لم يُرفع وسيط */
  const [mediaDraftFlow, setMediaDraftFlow] = useState(false)
  const [mediaDraftCreating, setMediaDraftCreating] = useState(false)
  const [mediaDraftError, setMediaDraftError] = useState<string | null>(null)
  const [mediaDraftRetryNonce, setMediaDraftRetryNonce] = useState(0)
  const mediaDraftSeqRef = useRef(0)
  const editingLessonRef = useRef<VideoLesson | null>(null)

  useEffect(() => {
    editingLessonRef.current = editingLesson
  }, [editingLesson])

  function waitForEditingLessonId(timeoutMs = 5000, intervalMs = 100): Promise<string | null> {
    const deadline = Date.now() + timeoutMs
    return new Promise((resolve) => {
      const tick = () => {
        const id = editingLessonRef.current?.id
        if (id) {
          resolve(id)
          return
        }
        if (Date.now() >= deadline) {
          resolve(null)
          return
        }
        window.setTimeout(tick, intervalMs)
      }
      tick()
    })
  }

  useEffect(() => {
    if (!autoOpenCreate) return
    setEditingLesson(null)
    setMediaDraftFlow(false)
    setMediaDraftError(null)
    setFormTitle("")
    setFormDesc("")
    setFormHlsUrl("")
    setFormYoutubeId("")
    setFormUnit("عام")
    setFormDurationMin("30")
    setFormOrder("0")
    setFormPreview(false)
  }, [autoOpenCreate])

  useEffect(() => {
    setHlsR2Layout(null)
  }, [editingLesson?.id])

  useEffect(() => {
    setHlsVariantRows([])
    setHlsVariantSelected(new Set())
  }, [editingLesson?.id])

  const units = useMemo(() => {
    const u = [...new Set(lessons.map((l) => l.unit).filter(Boolean))]
    if (!u.includes("عام")) u.unshift("عام")
    return u
  }, [lessons])

  const closeLessonDialog = () => {
    mediaDraftSeqRef.current += 1
    if (mediaDraftFlow && editingLesson?.id) {
      const hasMedia = Boolean(formHlsUrl.trim() || formYoutubeId.trim())
      if (!hasMedia) {
        void adminRemoveVideo(editingLesson.id).then((res) => {
          if (res.success) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
          }
        })
      }
    }
    setMediaDraftFlow(false)
    setMediaDraftCreating(false)
    setMediaDraftError(null)
    setShowAddDialog(false)
    setEditingLesson(null)
  }

  /** عند تفعيل الرفع على R2: إنشاء درس مسوّد فوراً ليظهر مربع الرفع دون الضغط على «إضافة». */
  useEffect(() => {
    if (!showAddDialog) return
    if (editingLesson || formPreview) return
    if (!enableR2LessonUpload && !rawR2TranscodeAvailable && !enableCloudflareStreamUpload) return

    const seq = ++mediaDraftSeqRef.current
    let cancelled = false
    setMediaDraftCreating(true)
    setMediaDraftError(null)

    ;(async () => {
      try {
        const res = await adminCreateVideo({
          title: "درس جديد",
          description: "",
          unit: "عام",
          duration: 1800,
          hls_url: null,
          youtube_id: null,
          is_preview: false,
          is_published: false,
        })
        if (cancelled || seq !== mediaDraftSeqRef.current) return
        if (!res.success) {
          console.error("mediaDraft: adminCreateVideo failed", res)
          setMediaDraftError(res.error)
          toast.error(res.error)
          return
        }
        setEditingLesson(res.data)
        setMediaDraftFlow(true)
        setMediaDraftError(null)
        setFormTitle((t) => (t.trim() ? t : res.data!.title))
        setFormDesc((d) => (d.trim() ? d : res.data!.description ?? ""))
        setFormUnit(res.data!.unit || "عام")
        setFormDurationMin(String(Math.max(1, Math.round(res.data!.duration / 60))))
        setFormOrder(String(res.data!.order ?? 0))
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch (e) {
        console.error("mediaDraft: adminCreateVideo threw", e)
        const msg = e instanceof Error ? e.message : "تعذّر تجهيز الدرس للرفع"
        if (!cancelled && seq === mediaDraftSeqRef.current) {
          setMediaDraftError(msg)
        }
        toast.error(msg)
      } finally {
        if (!cancelled && seq === mediaDraftSeqRef.current) {
          setMediaDraftCreating(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    showAddDialog,
    editingLesson,
    formPreview,
    enableR2LessonUpload,
    enableServerVideoTranscode,
    enableTranscoderWorkerQueue,
    enableCloudflareStreamUpload,
    queryClient,
    mediaDraftRetryNonce,
  ])

  const openAdd = () => {
    mediaDraftSeqRef.current += 1
    setEditingLesson(null)
    setMediaDraftFlow(false)
    setMediaDraftError(null)
    setMediaDraftCreating(false)
    setFormTitle("")
    setFormDesc("")
    setFormHlsUrl("")
    setFormYoutubeId("")
    setFormUnit("عام")
    setFormDurationMin("30")
    setFormOrder("0")
    setFormPreview(false)
    setHlsVariantRows([])
    setHlsVariantSelected(new Set())
    setShowAddDialog(true)
  }

  const openEdit = (lesson: VideoLesson) => {
    mediaDraftSeqRef.current += 1
    setShowAddDialog(false)
    setMediaDraftFlow(false)
    setMediaDraftError(null)
    setMediaDraftCreating(false)
    setEditingLesson(lesson)
    setFormTitle(lesson.title)
    setFormDesc(lesson.description ?? "")
    setFormHlsUrl(lesson.hls_url ?? "")
    setFormYoutubeId(lesson.youtube_id ?? "")
    setFormUnit(lesson.unit || "عام")
    setFormDurationMin(String(Math.max(1, Math.round(lesson.duration / 60))))
    setFormOrder(String(lesson.order ?? 0))
    setFormPreview(lesson.is_preview)
  }

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUnit = selectedUnit === "all" || lesson.unit === selectedUnit
    return matchesSearch && matchesUnit
  })

  const runHlsFolderUpload = async (list: File[], lessonIdOverride?: string) => {
    const lessonId = lessonIdOverride ?? editingLesson?.id
    if (!lessonId) return

    const files = Array.from(list).filter(
      (f) => !normalizeRelativePath(f.webkitRelativePath || f.name).includes("..")
    )
    if (!files.length) {
      toast.error("لا توجد ملفات صالحة")
      return
    }

    const normalized = files.map((file) => ({
      file,
      rel: normalizeRelativePath(file.webkitRelativePath || file.name),
    }))
    const master = normalized.find(({ rel }) => rel.endsWith("master.m3u8"))
    if (!master) {
      toast.error("يجب أن يحتوي المجلد على ملف master.m3u8")
      return
    }

    const BATCH = 80
    const totalBytes = normalized.reduce((s, x) => s + x.file.size, 0) || 1
    const loadedByRel = new Map<string, number>()

    const bumpProgress = () => {
      let sum = 0
      for (const x of normalized) {
        sum += Math.min(x.file.size, loadedByRel.get(x.rel) ?? 0)
      }
      const ratio = sum / totalBytes
      const pct = Math.min(92, Math.round(ratio * 92))
      setHlsUploadOverlay({
        pct,
        title: "رفع ملفات الفيديو إلى السحابة",
        subtitle: `${Math.round(ratio * 100)}% من الحجم الإجمالي (${normalized.length} ملفاً)`,
      })
    }

    setHlsUploadOverlay({
      pct: 4,
      title: "جاري التجهيز",
      subtitle: "طلب روابط الرفع الآمنة من الخادم…",
    })

    try {
      for (let i = 0; i < normalized.length; i += BATCH) {
        const slice = normalized.slice(i, i + BATCH)
        const payload = slice.map(({ rel, file }) => ({
          relativePath: rel,
          contentType: guessContentType(file.name),
        }))
        const presign = await adminPresignHlsPartUploads(lessonId, payload)
        if (!presign.success) {
          toast.error(presign.error)
          return
        }
        const signedMap = new Map(presign.data.map((x) => [x.relativePath, x.signedUrl]))

        await mapPool(slice, 6, async ({ file, rel }) => {
          const url = signedMap.get(rel)
          if (!url) throw new Error("تعذّر الحصول على رابط الرفع")
          const ct = guessContentType(file.name)
          await xhrPutBlob(url, file, ct, (loaded) => {
            loadedByRel.set(rel, loaded)
            bumpProgress()
          })
          loadedByRel.set(rel, file.size)
          bumpProgress()
        })
      }

      setHlsUploadOverlay({
        pct: 94,
        title: "إنهاء الإعداد",
        subtitle: "ربط قائمة التشغيل بالدرس في قاعدة البيانات…",
      })

      const fin = await adminFinalizeLessonHlsFromUpload(lessonId, master.rel)
      if (!fin.success) {
        toast.error(fin.error)
        return
      }

      setHlsUploadOverlay({
        pct: 100,
        title: "اكتمل الرفع",
        subtitle: "تم ضبط رابط الدرس",
      })
      await new Promise((r) => setTimeout(r, 420))

      toast.success("تم رفع المجلد وربط قائمة التشغيل بالدرس")
      setFormHlsUrl(fin.data?.hls_url ?? "")
      if (fin.data) {
        setEditingLesson(fin.data)
      }
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل رفع المجلد")
    } finally {
      setHlsUploadOverlay(null)
    }
  }

  const handleHlsFolderPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    e.target.value = ""
    if (!list?.length) return
    let lessonId = editingLessonRef.current?.id
    if (!lessonId) {
      lessonId = (await waitForEditingLessonId()) ?? undefined
    }
    if (!lessonId) {
      toast.error(
        "تعذّر جاهزية معرّف الدرس بعد الانتظار. استخدم «إعادة المحاولة» في مربع الرفع أو أغلق النافذة وأعد فتحها."
      )
      return
    }
    await runHlsFolderUpload(Array.from(list), lessonId)
  }

  const handleHlsDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setHlsDragOver(false)
    if (!editingLesson?.id || hlsBusy || saving || formPreview) return
    const collected = await collectFilesWithRelativePathsFromDrop(e.dataTransfer)
    if (!collected.length) {
      toast.error("أسقط مجلداً أو ملفات HLS صالحة")
      return
    }
    await runHlsFolderUpload(collected)
  }

  const runRawVideoUploadAndTranscode = async (file: File, lessonIdOverride?: string) => {
    const lessonId = lessonIdOverride ?? editingLesson?.id
    if (!lessonId) {
      toast.error("احفظ الدرس أولاً ليُنشأ معرّف ثابت")
      return
    }
    if (formPreview) return
    if (enableTranscoderWorkerQueue) {
      return
    }
    const looksVideo =
      (file.type && file.type.startsWith("video/")) ||
      /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)
    if (!file.size || !looksVideo) {
      toast.error("اختر ملف فيديو صالحاً (mp4، mov، webm…)")
      return
    }
    const maxBytes = 4 * 1024 * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error("الحد الأقصى لحجم الملف 4 غيغابايت")
      return
    }

    const metaDur = await probeDurationFromVideoFile(file)
    if (metaDur != null) {
      setFormDurationMin(String(Math.max(1, Math.ceil(metaDur / 60))))
    }

    const uploadTitle = "رفع الفيديو إلى R2"
    const uploadSubtitleStart = "جاري طلب رابط الرفع…"

    setHlsUploadOverlay({
      pct: 5,
      title: uploadTitle,
      subtitle: uploadSubtitleStart,
    })

    try {
      const presign = await adminPresignLessonSourceVideoUpload(
        lessonId,
        file.name,
        file.type || "application/octet-stream",
        file.size
      )
      if (!presign.success) {
        toast.error(presign.error)
        return
      }

      const { signedUrl, relativePath, contentType } = presign.data
      await xhrPutBlob(signedUrl, file, contentType, (loaded, total) => {
        const ratio = Math.min(1, loaded / Math.max(total, 1))
        setHlsUploadOverlay({
          pct: Math.min(88, 5 + Math.round(ratio * 83)),
          title: uploadTitle,
          subtitle: `${Math.round(ratio * 100)}%`,
        })
      })

      if (!enableServerVideoTranscode) {
        toast.error("لا عميل تحويل متاح: فعّل TRANSCODER_WORKER_URL أو ffmpeg على الخادم")
        return
      }

      setHlsUploadOverlay({
        pct: 48,
        title: "تحويل الفيديو إلى HLS",
        subtitle: "يعمل ffmpeg على الخادم — قد يستغرق عدة دقائق لحسب طول الفيديو…",
      })

      const trans = await adminTranscodeLessonUploadedVideo(lessonId, relativePath)
      if (!trans.success) {
        toast.error(trans.error)
        return
      }

      setHlsUploadOverlay({
        pct: 100,
        title: "اكتمل",
        subtitle: "تم إنشاء HLS وربطه بالدرس",
      })
      await new Promise((r) => setTimeout(r, 400))

      toast.success("تم رفع الفيديو وتحويله إلى HLS")
      if (trans.data) {
        setEditingLesson(trans.data)
        setFormHlsUrl(trans.data.hls_url ?? "")
        if (trans.data.duration != null && trans.data.duration > 0) {
          setFormDurationMin(String(Math.max(1, Math.round(trans.data.duration / 60))))
        }
      }
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الرفع أو التحويل")
    } finally {
      setHlsUploadOverlay(null)
    }
  }

  const runStreamVideoUpload = async (file: File, lessonIdOverride?: string) => {
    const lessonId = lessonIdOverride ?? editingLesson?.id
    if (!lessonId) {
      toast.error("احفظ الدرس أولاً ليُنشأ معرّف ثابت")
      return
    }
    if (formPreview) return
    const looksVideo =
      (file.type && file.type.startsWith("video/")) ||
      /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)
    if (!file.size || !looksVideo) {
      toast.error("اختر ملف فيديو صالحاً (mp4، mov، webm…)")
      return
    }
    const maxBytes = 4 * 1024 * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error("الحد الأقصى لحجم الملف 4 غيغابايت")
      return
    }

    const metaDur = await probeDurationFromVideoFile(file)
    if (metaDur != null) {
      setFormDurationMin(String(Math.max(1, Math.ceil(metaDur / 60))))
    }

    setHlsUploadOverlay({
      pct: 4,
      title: "تهيئة رفع Stream",
      subtitle: "طلب عنوان الرفع القابل للاستئناف…",
    })

    try {
      const slot = await adminCreateStreamUploadUrl({
        lessonId,
        fileSizeBytes: file.size,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      })
      if (!slot.success) {
        toast.error(slot.error)
        return
      }

      const { uploadUrl, videoUid } = slot.data

      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          uploadUrl,
          uploadSize: file.size,
          chunkSize: pickStreamTusChunkSize(file.size),
          retryDelays: [0, 3000, 7000, 12000],
          removeFingerprintOnSuccess: true,
          onProgress: (sent, total) => {
            const ratio = Math.min(1, sent / Math.max(total, 1))
            setHlsUploadOverlay({
              pct: Math.min(90, 10 + Math.round(ratio * 80)),
              title: "رفع الفيديو إلى Cloudflare Stream",
              subtitle: `${Math.round(ratio * 100)}%`,
            })
          },
          onSuccess: () => resolve(),
          onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
        })
        upload.start()
      })

      setHlsUploadOverlay({
        pct: 92,
        title: "إنهاء الربط",
        subtitle: "حفظ رابط HLS في قاعدة البيانات…",
      })

      const fin = await adminFinalizeStreamLesson({ lessonId, videoUid })
      if (!fin.success) {
        toast.error(fin.error)
        return
      }

      setHlsUploadOverlay({
        pct: 100,
        title: "اكتمل",
        subtitle: "Stream يعالج الفيديو؛ قد يستغرق ظهور الجودات قليلاً",
      })
      await new Promise((r) => setTimeout(r, 400))

      toast.success("تم رفع الفيديو وربط قائمة Stream بالدرس")
      if (fin.data) {
        setEditingLesson(fin.data)
        setFormHlsUrl(fin.data.hls_url ?? "")
      }
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الرفع إلى Stream")
    } finally {
      setHlsUploadOverlay(null)
    }
  }

  const handleRawVideoPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    e.target.value = ""
    if (!list?.length) return
    const file = list[0]
    let lessonId = editingLessonRef.current?.id
    if (!lessonId) {
      lessonId = (await waitForEditingLessonId()) ?? undefined
    }
    if (!lessonId) {
      toast.error(
        "تعذّر جاهزية معرّف الدرس بعد الانتظار. استخدم «إعادة المحاولة» في مربع الرفع أو أغلق النافذة وأعد فتحها."
      )
      return
    }
    if (enableCloudflareStreamUpload && !enableTranscoderWorkerQueue) {
      await runStreamVideoUpload(file, lessonId)
    } else {
      await runRawVideoUploadAndTranscode(file, lessonId)
    }
  }

  const handleRawVideoDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setSourceVideoDragOver(false)
    if (!editingLesson?.id || hlsBusy || saving || formPreview) return
    if (!enableCloudflareStreamUpload && !rawR2TranscodeAvailable) return
    const f = e.dataTransfer.files?.[0]
    if (!f) {
      toast.error("أسقط ملف فيديو واحداً")
      return
    }
    if (enableCloudflareStreamUpload && !enableTranscoderWorkerQueue) {
      await runStreamVideoUpload(f)
    } else {
      await runRawVideoUploadAndTranscode(f)
    }
  }

  const loadHlsVariantsFromR2 = async () => {
    const id = editingLesson?.id
    if (!id) return
    setHlsVariantsLoading(true)
    try {
      const res = await adminGetLessonHlsVariants(id)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setHlsVariantRows(res.data.variants)
      setHlsVariantSelected(new Set(res.data.variants.map((v) => v.uri)))
      toast.success("تم تحميل الجودات من master.m3u8")
    } finally {
      setHlsVariantsLoading(false)
    }
  }

  const saveHlsVariantsToR2 = async () => {
    const id = editingLesson?.id
    if (!id) return
    const ordered = hlsVariantRows
      .filter((v) => hlsVariantSelected.has(v.uri))
      .map((v) => v.uri)
    if (!ordered.length) {
      toast.error("فعّل جودة واحدة على الأقل")
      return
    }
    setHlsVariantsSaving(true)
    try {
      const res = await adminSaveLessonHlsVariants(id, ordered)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success("تم تحديث قائمة الجودات على R2")
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    } finally {
      setHlsVariantsSaving(false)
    }
  }

  const probeLessonHlsOnR2 = async () => {
    const id = editingLesson?.id
    if (!id) return
    setHlsR2ProbeBusy(true)
    try {
      const res = await adminGetLessonHlsR2Layout(id)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setHlsR2Layout({
        masterExists: res.data.masterExists,
        derivedMasterUrl: res.data.derivedMasterUrl,
        qualities: res.data.qualities,
      })
      toast.success("تمت قراءة الحاوية")
    } finally {
      setHlsR2ProbeBusy(false)
    }
  }

  const bindStandardR2Master = async () => {
    const id = editingLesson?.id
    if (!id) return
    setHlsR2BindBusy(true)
    try {
      const res = await adminBindLessonHlsFromStandardR2Path(id)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setFormHlsUrl(res.data?.hls_url ?? "")
      const lay = await adminGetLessonHlsR2Layout(id)
      if (lay.success) {
        setHlsR2Layout({
          masterExists: lay.data.masterExists,
          derivedMasterUrl: lay.data.derivedMasterUrl,
          qualities: lay.data.qualities,
        })
      }
      toast.success("تم ربط رابط master من المسار القياسي في R2")
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
      } catch {
        /* ignore */
      }
    } finally {
      setHlsR2BindBusy(false)
    }
  }

  const saveDialog = async () => {
    const orderNum = parseInt(formOrder, 10)
    const order = Number.isFinite(orderNum) && orderNum >= 0 ? orderNum : 0
    const durationMinNum = parseInt(formDurationMin, 10)
    const durationSec =
      Math.max(60, (Number.isFinite(durationMinNum) && durationMinNum > 0 ? durationMinNum : 30) * 60)
    const keepOpen =
      (enableR2LessonUpload || rawR2TranscodeAvailable || enableCloudflareStreamUpload) && !formPreview

    const hadManualHlsUrl = Boolean(formHlsUrl.trim())
    let hlsForSave = formHlsUrl.trim() || null

    setSaving(true)
    try {
      if (editingLesson && !formPreview && enableR2ServerMedia && !hlsForSave) {
        const lay = await adminGetLessonHlsR2Layout(editingLesson.id)
        if (lay.success && lay.data.masterExists && lay.data.derivedMasterUrl) {
          hlsForSave = lay.data.derivedMasterUrl
        }
      }

      let shouldCloseDialog = false
      if (editingLesson) {
        const wasMediaDraft = mediaDraftFlow
        await updateLessonMutation.mutateAsync({
          id: editingLesson.id,
          patch: {
            title: formTitle.trim(),
            description: formDesc,
            hls_url: hlsForSave,
            youtube_id: formYoutubeId.trim() || null,
            unit: formUnit.trim() || "عام",
            duration: durationSec,
            order,
            is_preview: formPreview,
          },
        })
        if (mediaDraftFlow) {
          setMediaDraftFlow(false)
          toast.success("تم حفظ الدرس ونشره للطلاب")
        } else {
          toast.success("تم حفظ التعديلات")
        }
        if (hlsForSave && !hadManualHlsUrl) {
          setFormHlsUrl(hlsForSave)
        }
        if (wasMediaDraft || !keepOpen) {
          shouldCloseDialog = true
        }
      } else {
        const created = await createLessonMutation.mutateAsync({
          title: formTitle.trim(),
          description: formDesc,
          hls_url: hlsForSave,
          youtube_id: formYoutubeId.trim() || null,
          unit: formUnit.trim() || "عام",
          duration: durationSec,
          order,
          is_preview: formPreview,
          is_published: true,
        })
        toast.success(
          keepOpen ?
            "تمت إضافة الدرس — يمكنك الآن رفع مجلد HLS أو فيديو خام من الأسفل دون إغلاق النافذة"
          : "تمت إضافة الدرس"
        )
        if (keepOpen && created) {
          setEditingLesson(created)
        }
        if (!keepOpen) {
          shouldCloseDialog = true
        }
      }

      if (shouldCloseDialog) {
        setShowAddDialog(false)
        setEditingLesson(null)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة الدروس</h1>
          <p className="text-muted-foreground">إجمالي {lessons.length} درس</p>
        </div>
        <Button type="button" onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة درس
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن درس..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedUnit === "all" ? "default" : "outline"}
                size="sm"
                type="button"
                onClick={() => setSelectedUnit("all")}
              >
                الكل
              </Button>
              {units.map((unit) => (
                <Button
                  key={unit}
                  variant={selectedUnit === unit ? "default" : "outline"}
                  size="sm"
                  type="button"
                  onClick={() => setSelectedUnit(unit)}
                >
                  {unit}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLessons.map((lesson) => (
          <Card
            key={lesson.id}
            className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="h-6 w-6 text-primary mr-[-2px]" />
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(lesson.duration / 60)} دقيقة
              </div>
              <div
                className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                  lesson.is_preview ? "bg-chart-2/90 text-white" : "bg-chart-4/90 text-white"
                }`}
              >
                {lesson.is_preview ?
                  <>
                    <Unlock className="h-3 w-3" />
                    معاينة
                  </>
                : <>
                    <Lock className="h-3 w-3" />
                    مشتركين
                  </>
                }
              </div>
            </div>

            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{lesson.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {lesson.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => openEdit(lesson)}>
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        void togglePreviewMutation.mutate({
                          id: lesson.id,
                          isPreview: lesson.is_preview,
                        })
                      }
                    >
                      {lesson.is_preview ?
                        <>
                          <Lock className="h-4 w-4 ml-2" />
                          جعله للمشتركين
                        </>
                      : <>
                          <Unlock className="h-4 w-4 ml-2" />
                          جعله معاينة
                        </>
                      }
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => void deleteLessonMutation.mutate(lesson.id)}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="bg-muted px-2 py-1 rounded-full">{lesson.unit}</span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {lesson.is_published ? "منشور" : "مسودّة"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLessons.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد دروس مطابقة</p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showAddDialog || !!editingLesson}
        onOpenChange={(open) => {
          if (!open) closeLessonDialog()
        }}
      >
        <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {mediaDraftFlow ? "إضافة درس جديد" : editingLesson ? "تعديل الدرس" : "إضافة درس جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                عنوان الدرس
              </label>
              <Input
                placeholder="أدخل عنوان الدرس"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">الوصف</label>
              <Textarea
                placeholder="أدخل وصف الدرس"
                rows={3}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">ترتيب العرض</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={formOrder}
                onChange={(e) => setFormOrder(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">رقم أصغر يظهر أولاً في قائمة الدروس</p>
            </div>
            {(enableR2LessonUpload || rawR2TranscodeAvailable || enableCloudflareStreamUpload) &&
            !formPreview &&
            workerOnlyVideoUi ?
              <div className="space-y-3">
                {mediaDraftError && !editingLesson ?
                  <div
                    dir="rtl"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2.5 space-y-2"
                  >
                    <p className="text-sm text-destructive font-medium leading-relaxed">{mediaDraftError}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={mediaDraftCreating}
                      onClick={() => setMediaDraftRetryNonce((n) => n + 1)}
                    >
                      {mediaDraftCreating ?
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          جاري المحاولة…
                        </>
                      : "إعادة المحاولة"}
                    </Button>
                  </div>
                : null}
                {mediaDraftCreating && !mediaDraftError ?
                  <div className="rounded-lg border border-dashed border-border p-3 space-y-3 bg-muted/30 min-h-[124px] flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <div className="h-2 w-full max-w-[260px] rounded bg-muted/80 animate-pulse" />
                    <p className="text-xs text-muted-foreground">جاري تجهيز الدرس…</p>
                  </div>
                : null}
                {editingLesson && !mediaDraftCreating ?
                  <AdminLessonVideoWizard
                    lessonId={editingLesson.id}
                    hlsUrl={formHlsUrl.trim() ? formHlsUrl : editingLesson.hls_url}
                    disabled={saving}
                    onVideoLinked={(lesson) => {
                      setEditingLesson(lesson)
                      setFormHlsUrl(lesson.hls_url ?? "")
                      toast.success("✓ تم ربط الفيديو بنجاح")
                      void queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
                    }}
                  />
                : null}
              </div>
            : null}
            {(enableR2LessonUpload || rawR2TranscodeAvailable || enableCloudflareStreamUpload) &&
            !formPreview &&
            !workerOnlyVideoUi ?
              <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
                <p className="text-sm font-semibold text-foreground">رفع الفيديو هنا</p>
                {enableR2LessonUpload && !r2PublicPlaybackReady ?
                  <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2">
                    لربط التشغيل بعد الرفع وتوليد روابط master للطلاب، عيّن{" "}
                    <code className="rounded bg-muted/80 px-1" dir="ltr">
                      NEXT_PUBLIC_R2_PUBLIC_BASE_URL
                    </code>{" "}
                    بلا ذلك قد ينجح الرفع إلى R2 لكن لن يُبنى رابط عام تلقائياً.
                  </p>
                : null}
                {mediaDraftError && !editingLesson ?
                  <div
                    dir="rtl"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2.5 space-y-2"
                  >
                    <p className="text-sm text-destructive font-medium leading-relaxed">{mediaDraftError}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={mediaDraftCreating}
                      onClick={() => setMediaDraftRetryNonce((n) => n + 1)}
                    >
                      {mediaDraftCreating ?
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          جاري المحاولة…
                        </>
                      : "إعادة المحاولة"}
                    </Button>
                  </div>
                : null}
                {mediaDraftCreating && !mediaDraftError ?
                  <div className="space-y-3">
                    {enableR2LessonUpload ?
                      <div className="rounded-lg border border-dashed border-border p-3 space-y-3 bg-muted/30 min-h-[124px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <div className="h-3 w-3/4 max-w-[200px] rounded bg-muted animate-pulse" />
                        <div className="h-2 w-full max-w-[260px] rounded bg-muted/80 animate-pulse" />
                        <p className="text-xs text-muted-foreground">جاري تجهيز رفع مجلد HLS…</p>
                      </div>
                    : null}
                    {enableCloudflareStreamUpload ?
                      <div className="rounded-lg border border-dashed border-border p-3 space-y-3 bg-muted/30 min-h-[124px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <div className="h-3 w-2/3 max-w-[200px] rounded bg-muted animate-pulse" />
                        <div className="h-2 w-full max-w-[260px] rounded bg-muted/80 animate-pulse" />
                        <p className="text-xs text-muted-foreground">جاري تجهيز رفع Stream…</p>
                      </div>
                    : null}
                    {rawR2TranscodeAvailable && !enableCloudflareStreamUpload ?
                      <div className="rounded-lg border border-dashed border-border p-3 space-y-3 bg-muted/30 min-h-[124px] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <div className="h-3 w-2/3 max-w-[180px] rounded bg-muted animate-pulse" />
                        <div className="h-2 w-full max-w-[260px] rounded bg-muted/80 animate-pulse" />
                        <p className="text-xs text-muted-foreground">جاري تجهيز رفع الفيديو الخام…</p>
                      </div>
                    : null}
                  </div>
                : null}
                {enableR2LessonUpload && editingLesson && !mediaDraftCreating ?
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ke) =>
                      ke.key === "Enter" && !hlsBusy && hlsFolderInputRef.current?.click()
                    }
                    onDragEnter={(ev) => {
                      ev.preventDefault()
                      setHlsDragOver(true)
                    }}
                    onDragLeave={() => setHlsDragOver(false)}
                    onDragOver={(ev) => {
                      ev.preventDefault()
                      ev.stopPropagation()
                      setHlsDragOver(true)
                    }}
                    onDrop={(ev) => void handleHlsDrop(ev)}
                    className={`rounded-lg border border-dashed p-3 space-y-2 bg-muted/30 transition-colors ${
                      hlsDragOver ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      ref={hlsFolderInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      {...({ webkitdirectory: "" } as Record<string, string>)}
                      onChange={(ev) => void handleHlsFolderPick(ev)}
                    />
                    <p className="text-sm font-medium text-foreground">مجلد HLS جاهز</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اسحب المجلد أو اختره — يجب أن يتضمّن{" "}
                      <code className="rounded bg-muted px-1">master.m3u8</code> والجزئيات. CORS للـ PUT على
                      R2 يجب أن يسمح بأصل موقعك.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={hlsBusy || saving}
                      onClick={() => hlsFolderInputRef.current?.click()}
                    >
                      {hlsBusy ? "جاري الرفع…" : "اختيار مجلد HLS"}
                    </Button>
                  </div>
                : null}
                {(enableCloudflareStreamUpload || rawR2TranscodeAvailable) &&
                editingLesson &&
                !mediaDraftCreating ?
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ke) => {
                      if (ke.key !== "Enter" || hlsBusy) return
                      if (!enableCloudflareStreamUpload && !rawR2TranscodeAvailable) return
                      rawVideoInputRef.current?.click()
                    }}
                    onDragEnter={(ev) => {
                      ev.preventDefault()
                      setSourceVideoDragOver(true)
                    }}
                    onDragLeave={() => setSourceVideoDragOver(false)}
                    onDragOver={(ev) => {
                      ev.preventDefault()
                      ev.stopPropagation()
                      setSourceVideoDragOver(true)
                    }}
                    onDrop={(ev) => void handleRawVideoDrop(ev)}
                    className={`rounded-lg border border-dashed p-3 space-y-2 bg-muted/30 transition-colors ${
                      sourceVideoDragOver ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      ref={rawVideoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(ev) => void handleRawVideoPick(ev)}
                    />
                    <p className="text-sm font-medium text-foreground">
                      فيديو خام{" "}
                      {enableCloudflareStreamUpload ?
                        "(Cloudflare Stream)"
                      : enableServerVideoTranscode ?
                        "(ffmpeg محلّياً)"
                      : ""}{" "}
                      (سحب أو اختيار)
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {enableCloudflareStreamUpload ?
                        <>
                          الرفع إلى Cloudflare Stream عبر البروتوكول TUS (قابل للاستئناف)، والتحويل إلى HLS
                          بجودات متعددة (مثل <strong>1080p و720p و480p و360p</strong>) يتم على شبكة Stream. التشغيل
                          للطلاب يعتمد روابطًا موقّعة.
                        </>
                      : enableServerVideoTranscode ?
                        <>
                          يُحوَّل على الخادم إلى HLS:{" "}
                          <strong>1080p و720p و480p و360p</strong>. المدة تُحدَّد تلقائياً. التحويل يحتاج ffmpeg على
                          السيرفر؛ خطط مثل Vercel قد توقف الفيديو الطويل قبل انتهاء التحويل.
                        </>
                      : null}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={hlsBusy || saving}
                      onClick={() => rawVideoInputRef.current?.click()}
                    >
                      {hlsBusy ? "جاري العمل…" : "اختيار ملف فيديو"}
                    </Button>
                  </div>
                : null}
              </div>
            : null}
            {enableR2ServerMedia && editingLesson && !formPreview && !workerOnlyVideoUi ?
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
                <p className="text-sm font-medium text-foreground">تخزين الفيديو على R2</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  مسار الدرس في الحاوية{" "}
                  <span className="font-mono" dir="ltr">
                    {r2BucketDisplayName ? `${r2BucketDisplayName} / ` : ""}hls/{editingLesson.id}/
                  </span>
                  — يُرفع المصدر إلى{" "}
                  <code className="rounded bg-muted px-1" dir="ltr">
                    _source/
                  </code>
                  ثم عامل التحويل (متغيّر البيئة{" "}
                  <code className="rounded bg-muted px-1" dir="ltr">
                    TRANSCODER_WORKER_URL
                  </code>
                  ) يُنتج مجلدات{" "}
                  <strong>1080p و720p و480p و360p</strong> مع{" "}
                  <code className="rounded bg-muted px-1">master.m3u8</code>. لا حاجة لنسخ الرابط يدوياً
                  إن وُجد الـ master على هذا المسار.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={hlsBusy || saving || hlsR2ProbeBusy || hlsR2BindBusy}
                    onClick={() => void probeLessonHlsOnR2()}
                  >
                    {hlsR2ProbeBusy ? "جاري القراءة…" : "قراءة الحاوية (master + الجودات)"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={hlsBusy || saving || hlsR2ProbeBusy || hlsR2BindBusy}
                    onClick={() => void bindStandardR2Master()}
                  >
                    {hlsR2BindBusy ? "جاري الربط…" : "ربط master تلقائياً في قاعدة البيانات"}
                  </Button>
                </div>
                {hlsR2Layout ?
                  <div className="text-xs space-y-1.5">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">master.m3u8:</span>{" "}
                      {hlsR2Layout.masterExists ?
                        "موجود على R2"
                      : "غير موجود بعد"}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">مجلدات الجودة المرصودة:</span>{" "}
                      {hlsR2Layout.qualities.length ?
                        hlsR2Layout.qualities.map((h) => `${h}p`).join("، ")
                      : "لا يوجد (أو أسماء مختلفة عن 360p…1080p)"}
                    </p>
                    {hlsR2Layout.derivedMasterUrl ?
                      <p className="font-mono break-all text-muted-foreground" dir="ltr">
                        {hlsR2Layout.derivedMasterUrl}
                      </p>
                    : null}
                  </div>
                : null}
              </div>
            : null}
            {!workerOnlyVideoUi ?
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  رابط HLS (master.m3u8) — اختياري عند الربط التلقائي من R2
                </label>
                <Input
                  placeholder="https://…/hls/{معرّف الدرس}/master.m3u8"
                  dir="ltr"
                  value={formHlsUrl}
                  onChange={(e) => setFormHlsUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  عند ترك الحقل فارغاً والحفظ: إن وُجد ملف master على المسار القياسي في الحاوية يُستنتج الرابط
                  تلقائياً. أو استخدم «ربط master تلقائياً» أعلاه.
                </p>
              </div>
            : null}
            {enableR2ServerMedia &&
            editingLesson &&
            !formPreview &&
            !workerOnlyVideoUi &&
            formHlsUrl.trim() &&
            !looksLikeCloudflareStreamHlsMaster(formHlsUrl) ?
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
                <p className="text-sm font-medium text-foreground">تعديل الجودات على R2</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يُقرأ ملف <code className="rounded bg-muted px-1">master.m3u8</code> من السحابة. أزل
                  علامة أي جودة لإخفائها عن قائمة التشغيل (الملفات تبقى على R2 ما لم تحذف المجلد يدوياً).
                  إن كان الدرس قد أُنشئ برابط يدوي خارج مسار التطبيق قد لا يتوفر هذا الخيار.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={hlsBusy || saving || hlsVariantsLoading}
                    onClick={() => void loadHlsVariantsFromR2()}
                  >
                    {hlsVariantsLoading ? "جاري التحميل…" : "جلب الجودات الحالية"}
                  </Button>
                </div>
                {hlsVariantRows.length > 0 ?
                  <ul className="space-y-2">
                    {hlsVariantRows.map((row, idx) => (
                      <li key={`${row.uri}-${idx}`} className="flex items-start gap-2">
                        <Checkbox
                          id={`hls-var-${editingLesson.id}-${idx}`}
                          checked={hlsVariantSelected.has(row.uri)}
                          onCheckedChange={(c) => {
                            setHlsVariantSelected((prev) => {
                              const next = new Set(prev)
                              if (c === true) next.add(row.uri)
                              else if (c === false) next.delete(row.uri)
                              return next
                            })
                          }}
                        />
                        <label
                          htmlFor={`hls-var-${editingLesson.id}-${idx}`}
                          className="text-sm leading-tight cursor-pointer flex-1"
                        >
                          <span className="font-medium">{row.label}</span>
                          <span className="block text-xs text-muted-foreground font-mono break-all">
                            {row.uri}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                : null}
                {hlsVariantRows.length > 0 ?
                  <Button
                    type="button"
                    size="sm"
                    disabled={hlsBusy || saving || hlsVariantsSaving}
                    onClick={() => void saveHlsVariantsToR2()}
                  >
                    {hlsVariantsSaving ? "جاري الحفظ…" : "حفظ الجودات على R2"}
                  </Button>
                : null}
              </div>
            : null}
            {!workerOnlyVideoUi ?
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  معرّف يوتيوب (معاينات فقط)
                </label>
                <Input
                  placeholder="مثال: dQw4w9WgXcQ"
                  dir="ltr"
                  value={formYoutubeId}
                  onChange={(e) => setFormYoutubeId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  استخدم مع «درس معاينة»؛ يعرض اليوتيوب بدلاً من HLS.
                </p>
              </div>
            : null}
            {!workerOnlyVideoUi ?
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">الوحدة</label>
                  <Input
                    list="lesson-units"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                  <datalist id="lesson-units">
                    {units.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    المدة (دقائق)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={formDurationMin}
                    onChange={(e) => setFormDurationMin(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    عند اختيار فيديو خام للرفع والتحويل تُملأ المدة تلقائياً من الملف؛ يمكنك تعديلها يدوياً.
                  </p>
                </div>
              </div>
            : null}
            {!workerOnlyVideoUi ?
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isFree"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={formPreview}
                  onChange={(e) => setFormPreview(e.target.checked)}
                />
                <label htmlFor="isFree" className="text-sm text-foreground">
                  درس معاينة (ظاهر بدون اشتراك كامل)
                </label>
              </div>
            : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={hlsBusy}
              onClick={() => closeLessonDialog()}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={saving || hlsBusy || !formTitle.trim()}
              onClick={() => void saveDialog()}
            >
              {!editingLesson ? "إضافة" : mediaDraftFlow ? "حفظ ونشر" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminUploadOverlay
        open={hlsUploadOverlay !== null}
        percent={hlsUploadOverlay?.pct ?? 0}
        title={hlsUploadOverlay?.title ?? ""}
        subtitle={hlsUploadOverlay?.subtitle}
      />
    </div>
  )
}
