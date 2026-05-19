"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  adminCreateVideo,
  adminListVideos,
  adminRemoveVideo,
  adminUpdateVideo,
} from "@/actions/admin-lessons"
import { adminGetLessonHlsR2Layout } from "@/actions/admin-media-hls"
import { LessonVideoUploader } from "@/components/admin/lesson-video-uploader"
import { queryKeys } from "@/lib/query-keys"
import type { VideoLesson } from "@/types"

export function AdminLessonsClient({
  initialLessons,
  autoOpenCreate = false,
  enableR2LessonUpload = false,
  r2PublicPlaybackReady = false,
  enableR2ServerMedia = false,
  enableServerVideoTranscode = false,
  enableTranscoderWorkerQueue = false,
  transcoderWorkerQueueConfigured = false,
  r2BucketDisplayName = null,
}: {
  initialLessons: VideoLesson[]
  autoOpenCreate?: boolean
  /** بيانات R2 على الخادم — يُظهر الرفع إلى الحاوية */
  enableR2LessonUpload?: boolean
  /** دومين الملفات العام (NEXT_PUBLIC_R2_PUBLIC_BASE_URL) — للتشغيل وربط master بعد الرفع */
  r2PublicPlaybackReady?: boolean
  /** قراءة/كتابة master ومسح الملفات يعتمد على مفاتيح R2 على الخادم */
  enableR2ServerMedia?: boolean
  /** إبقاء الخاصية للتوافق — مسار الخادم الوحيد للتحويل هو عامل Railway */
  enableServerVideoTranscode?: boolean
  /** مسار الرفع: R2 ثم TRANSCODER_WORKER_URL */
  enableTranscoderWorkerQueue?: boolean
  /** يستند إلى متغيّرات البيئة الفعلية (نفس فحص الإجراءات) */
  transcoderWorkerQueueConfigured?: boolean
  /** اسم الحاوية من R2_BUCKET_NAME (للعرض في لوحة الإدارة) */
  r2BucketDisplayName?: string | null
}) {
  const queryClient = useQueryClient()
  const router = useRouter()

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

  /** عند تحديث قائمة الدروس (مثلاً بعد webhook أو invalidate) حدّث رابط HLS في النموذج دون مسح بقية الحقول. */
  useEffect(() => {
    if (!editingLesson?.id) return
    const latest = lessons.find((l) => l.id === editingLesson.id)
    const nextUrl = latest?.hls_url?.trim()
    if (!nextUrl) return
    if (nextUrl === (editingLesson.hls_url ?? "").trim()) return
    setEditingLesson((prev) =>
      prev && prev.id === editingLesson.id ? { ...prev, hls_url: latest!.hls_url } : prev,
    )
  }, [lessons, editingLesson?.id, editingLesson?.hls_url])

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
    if (!enableR2LessonUpload && !enableTranscoderWorkerQueue) return

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
    enableTranscoderWorkerQueue,
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


  const saveDialog = async () => {
    const orderNum = parseInt(formOrder, 10)
    const order = Number.isFinite(orderNum) && orderNum >= 0 ? orderNum : 0
    const durationMinNum = parseInt(formDurationMin, 10)
    const durationSec =
      Math.max(60, (Number.isFinite(durationMinNum) && durationMinNum > 0 ? durationMinNum : 30) * 60)
    const keepOpen = (enableR2LessonUpload || enableTranscoderWorkerQueue) && !formPreview

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
            "تمت إضافة الدرس — يمكنك رفع الفيديو من الأسفل دون إغلاق النافذة"
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
            {enableTranscoderWorkerQueue && !formPreview ?
              <div className="space-y-3">
                {!transcoderWorkerQueueConfigured ?
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive leading-relaxed"
                  >
                    عامل التحويل غير مُهيأ على الخادم. مطلوب:{" "}
                    <code className="rounded bg-muted px-1" dir="ltr">
                      TRANSCODER_WORKER_URL
                    </code>
                    ،{" "}
                    <code className="rounded bg-muted px-1" dir="ltr">
                      TRANSCODER_WEBHOOK_SECRET
                    </code>
                    ، وإما{" "}
                    <code className="rounded bg-muted px-1" dir="ltr">
                      NEXT_PUBLIC_SITE_URL
                    </code>{" "}
                    أو{" "}
                    <code className="rounded bg-muted px-1" dir="ltr">
                      VERCEL_URL
                    </code>
                    .
                  </div>
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
                  <div className="rounded-lg border border-dashed border-border p-3 space-y-3 bg-muted/30 min-h-[124px] flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <div className="h-2 w-full max-w-[260px] rounded bg-muted/80 animate-pulse" />
                    <p className="text-xs text-muted-foreground">جاري تجهيز الدرس…</p>
                  </div>
                : null}
                {editingLesson && !mediaDraftCreating ?
                  <LessonVideoUploader
                    lessonId={editingLesson.id}
                    currentHlsUrl={editingLesson.hls_url ?? null}
                    transcoderWorkerQueueConfigured={transcoderWorkerQueueConfigured}
                    onSuccess={() => {
                      void queryClient.invalidateQueries({ queryKey: queryKeys.adminLessons() })
                      router.refresh()
                    }}
                  />
                : null}
              </div>
            : null}
            {enableR2ServerMedia && editingLesson && !formPreview ?
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                <p className="text-sm font-medium text-foreground">تخزين الفيديو على R2</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  مسار الدرس:{" "}
                  <span className="font-mono" dir="ltr">
                    {r2BucketDisplayName ? `${r2BucketDisplayName} / ` : ""}hls/{editingLesson.id}/
                  </span>
                  — يُرفع المصدر ثم عامل التحويل يكتب{" "}
                  <code className="rounded bg-muted px-1">master.m3u8</code> والجودات.
                </p>
              </div>
            : null}
            {enableR2LessonUpload && !r2PublicPlaybackReady && !formPreview ?
              <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2">
                للتشغيل العام للطلاب عيّن{" "}
                <code className="rounded bg-muted/80 px-1" dir="ltr">
                  NEXT_PUBLIC_R2_PUBLIC_BASE_URL
                </code>
                .
              </p>
            : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                رابط HLS (master.m3u8) — اختياري إذا يُملأ تلقائياً بعد التحويل
              </label>
              <Input
                placeholder="https://…/hls/{معرّف الدرس}/master.m3u8"
                dir="ltr"
                value={formHlsUrl}
                onChange={(e) => setFormHlsUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                عند ترك الحقل فارغاً والحفظ: إن وُجد ملف master على المسار القياسي في الحاوية يُستنتج الرابط
                تلقائياً.
              </p>
            </div>
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
              </div>
            </div>
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
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => closeLessonDialog()}>
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={saving || !formTitle.trim()}
              onClick={() => void saveDialog()}
            >
              {!editingLesson ? "إضافة" : mediaDraftFlow ? "حفظ ونشر" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
