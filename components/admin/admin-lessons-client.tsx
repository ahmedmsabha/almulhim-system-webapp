"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
import type { VideoLesson } from "@/types"

export function AdminLessonsClient({
  initialLessons,
  autoOpenCreate = false,
}: {
  initialLessons: VideoLesson[]
  autoOpenCreate?: boolean
}) {
  const router = useRouter()
  const [lessons, setLessons] = useState(initialLessons)
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

  useEffect(() => {
    setLessons(initialLessons)
  }, [initialLessons])

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

  const refreshFromServer = async () => {
    const res = await adminListVideos()
    if (res.success) setLessons(res.data)
    router.refresh()
  }

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUnit = selectedUnit === "all" || lesson.unit === selectedUnit
    return matchesSearch && matchesUnit
  })

  const toggleLessonAccess = async (id: string, isPreview: boolean) => {
    const res = await adminUpdateVideo(id, { is_preview: !isPreview })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("تم تحديث نوع الدرس")
    await refreshFromServer()
  }

  const deleteLesson = async (id: string) => {
    const res = await adminRemoveVideo(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("تم حذف الدرس")
    await refreshFromServer()
  }

  const saveDialog = async () => {
    const dm = parseInt(formDurationMin, 10)
    const durationSec = Number.isFinite(dm) ? dm * 60 : 0
    setSaving(true)
    try {
      if (editingLesson) {
        const res = await adminUpdateVideo(editingLesson.id, {
          title: formTitle.trim(),
          description: formDesc,
          hls_url: formHlsUrl.trim() || null,
          youtube_id: formYoutubeId.trim() || null,
          unit: formUnit.trim() || "عام",
          duration: durationSec,
          is_preview: formPreview,
        })
        if (!res.success) {
          toast.error(res.error)
          return
        }
        toast.success("تم حفظ التعديلات")
      } else {
        const res = await adminCreateVideo({
          title: formTitle.trim(),
          description: formDesc,
          hls_url: formHlsUrl.trim() || null,
          youtube_id: formYoutubeId.trim() || null,
          unit: formUnit.trim() || "عام",
          duration: durationSec,
          is_preview: formPreview,
          is_published: true,
        })
        if (!res.success) {
          toast.error(res.error)
          return
        }
        toast.success("تمت إضافة الدرس")
      }
      setShowAddDialog(false)
      setEditingLesson(null)
      await refreshFromServer()
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
                      onClick={() => void toggleLessonAccess(lesson.id, lesson.is_preview)}
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
                      onClick={() => void deleteLesson(lesson.id)}
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
        <DialogContent className="max-w-lg">
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
                placeholder="https://…/videos/{lesson}/master.m3u8"
                dir="ltr"
                value={formHlsUrl}
                onChange={(e) => setFormHlsUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                للدروس الكاملة: رابط قائمة الفيديو الرئيسية على Cloudflare R2.
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setEditingLesson(null)
              }}
            >
              إلغاء
            </Button>
            <Button type="button" disabled={saving || !formTitle.trim()} onClick={() => void saveDialog()}>
              {editingLesson ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
