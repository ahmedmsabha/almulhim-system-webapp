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
import {
  adminFinalizeLessonHlsFromUpload,
  adminPresignHlsPartUploads,
} from "@/actions/admin-media-hls"
import { AdminUploadOverlay } from "@/components/admin/admin-upload-overlay"
import { collectFilesWithRelativePathsFromDrop } from "@/lib/client/collect-files-from-data-transfer"
import { xhrPutBlob } from "@/lib/client/admin-upload-xhr"
import { queryKeys } from "@/lib/query-keys"
import type { VideoLesson } from "@/types"

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

export function AdminLessonsClient({
  initialLessons,
  autoOpenCreate = false,
  enableR2FolderUpload = false,
}: {
  initialLessons: VideoLesson[]
  autoOpenCreate?: boolean
  enableR2FolderUpload?: boolean
}) {
  const queryClient = useQueryClient()

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
    onSuccess: async () => {
      toast.success("تم حذف الدرس")
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
  const [formPreview, setFormPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hlsUploadOverlay, setHlsUploadOverlay] = useState<{
    pct: number
    title: string
    subtitle?: string
  } | null>(null)
  const hlsBusy = hlsUploadOverlay !== null
  const hlsFolderInputRef = useRef<HTMLInputElement>(null)
  const [hlsDragOver, setHlsDragOver] = useState(false)

  useEffect(() => {
    if (!autoOpenCreate) return
    setEditingLesson(null)
    setFormTitle("")
    setFormDesc("")
    setFormHlsUrl("")
    setFormYoutubeId("")
    setFormUnit("عام")
    setFormDurationMin("30")
    setFormPreview(false)
    setShowAddDialog(true)
  }, [autoOpenCreate])

  const units = useMemo(() => {
    const u = [...new Set(lessons.map((l) => l.unit).filter(Boolean))]
    if (!u.includes("عام")) u.unshift("عام")
    return u
  }, [lessons])

  const openAdd = () => {
    setEditingLesson(null)
    setFormTitle("")
    setFormDesc("")
    setFormHlsUrl("")
    setFormYoutubeId("")
    setFormUnit("عام")
    setFormDurationMin("30")
    setFormPreview(false)
    setShowAddDialog(true)
  }

  const openEdit = (l: VideoLesson) => {
    setEditingLesson(l)
    setFormTitle(l.title)
    setFormDesc(l.description)
    setFormHlsUrl(l.hls_url ?? "")
    setFormYoutubeId(l.youtube_id ?? "")
    setFormUnit(l.unit)
    setFormDurationMin(String(Math.max(1, Math.round(l.duration / 60))))
    setFormPreview(l.is_preview)
    setShowAddDialog(true)
  }

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUnit = selectedUnit === "all" || lesson.unit === selectedUnit
    return matchesSearch && matchesUnit
  })

  const runHlsFolderUpload = async (list: File[]) => {
    const lessonId = editingLesson?.id
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
    if (!editingLesson?.id) {
      toast.error("احفظ الدرس أولاً ليُنشأ معرّف ثابت")
      return
    }
    await runHlsFolderUpload(Array.from(list))
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

  const saveDialog = async () => {
    const dm = parseInt(formDurationMin, 10)
    const durationSec = Number.isFinite(dm) ? dm * 60 : 0
    const keepOpen = enableR2FolderUpload && !formPreview

    setSaving(true)
    try {
      if (editingLesson) {
        await updateLessonMutation.mutateAsync({
          id: editingLesson.id,
          patch: {
            title: formTitle.trim(),
            description: formDesc,
            hls_url: formHlsUrl.trim() || null,
            youtube_id: formYoutubeId.trim() || null,
            unit: formUnit.trim() || "عام",
            duration: durationSec,
            is_preview: formPreview,
          },
        })
        toast.success("تم حفظ التعديلات")
      } else {
        const created = await createLessonMutation.mutateAsync({
          title: formTitle.trim(),
          description: formDesc,
          hls_url: formHlsUrl.trim() || null,
          youtube_id: formYoutubeId.trim() || null,
          unit: formUnit.trim() || "عام",
          duration: durationSec,
          is_preview: formPreview,
          is_published: true,
        })
        toast.success(
          keepOpen ? "تمت إضافة الدرس — يمكنك رفع مجلد HLS من الأسفل دون إغلاق النافذة" : "تمت إضافة الدرس"
        )
        if (keepOpen && created) {
          setEditingLesson(created)
        }
      }

      if (!keepOpen) {
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
          if (!open) {
            setShowAddDialog(false)
            setEditingLesson(null)
          }
        }}
      >
        <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "تعديل الدرس" : "إضافة درس جديد"}</DialogTitle>
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
              <label className="text-sm font-medium text-foreground block">
                رابط HLS (master.m3u8 على R2)
              </label>
              <Input
                placeholder="https://…/hls/{lesson}/…/master.m3u8"
                dir="ltr"
                value={formHlsUrl}
                onChange={(e) => setFormHlsUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                للدروس الكاملة: إما لصق الرابط العام لـ master.m3u8، أو رفع مجلد HLS كاملاً من المتصفح عندما يكون R2 مهيّأً.
              </p>
              {enableR2FolderUpload && editingLesson && !formPreview ?
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
                  <p className="text-sm font-medium text-foreground">رفع ملفات الفيديو (HLS)</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    اسحب مجلد الترميز هنا أو اختره — يجب أن يتضمّن <code className="rounded bg-muted px-1">master.m3u8</code> والجزئيات.
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
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    على R2 يجب السماح بطلبات PUT من أصل موقعك في إعدادات CORS.
                  </p>
                </div>
              : enableR2FolderUpload && !editingLesson && !formPreview ?
                <p className="text-xs text-muted-foreground">
                  احفظ الدرس أولاً ليُنشأ معرّف ثابت ثم ارجع لهذا الحوار أو أبقِ النافذة مفتوحة بعد الحفظ لرفع المجلد.
                </p>
              : null}
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
            <Button
              type="button"
              variant="outline"
              disabled={hlsBusy}
              onClick={() => {
                setShowAddDialog(false)
                setEditingLesson(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={saving || hlsBusy || !formTitle.trim()}
              onClick={() => void saveDialog()}
            >
              {editingLesson ? "حفظ" : "إضافة"}
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
