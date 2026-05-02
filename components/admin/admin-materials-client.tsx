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
  Edit,
  Trash2,
  FileText,
  Lock,
  Unlock,
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
  adminCreatePdf,
  adminListPdfs,
  adminRemovePdf,
  adminUpdatePdf,
} from "@/actions/admin-materials"
import type { PDFMaterial } from "@/types"

const CATEGORIES: PDFMaterial["category"][] = [
  "شرح",
  "تمارين",
  "امتحانات",
  "حلول",
  "ملخصات",
]

export function AdminMaterialsClient({
  initialMaterials,
  autoOpenCreate = false,
}: {
  initialMaterials: PDFMaterial[]
  autoOpenCreate?: boolean
}) {
  const router = useRouter()
  const [materials, setMaterials] = useState(initialMaterials)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editing, setEditing] = useState<PDFMaterial | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formCategory, setFormCategory] = useState<PDFMaterial["category"]>("ملخصات")
  const [formSize, setFormSize] = useState("1000000")
  const [formPages, setFormPages] = useState("10")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMaterials(initialMaterials)
  }, [initialMaterials])

  useEffect(() => {
    if (!autoOpenCreate) return
    setEditing(null)
    setFormTitle("")
    setFormDesc("")
    setFormUrl("")
    setFormCategory("ملخصات")
    setFormSize("1000000")
    setFormPages("10")
    setShowAddDialog(true)
  }, [autoOpenCreate])

  const categoriesInUse = useMemo(() => {
    const u = [...new Set(materials.map((m) => m.category))]
    return u.length ? u : CATEGORIES
  }, [materials])

  const refreshFromServer = async () => {
    const res = await adminListPdfs()
    if (res.success) setMaterials(res.data)
    router.refresh()
  }

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === "all" || material.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const openAdd = () => {
    setEditing(null)
    setFormTitle("")
    setFormDesc("")
    setFormUrl("")
    setFormCategory("ملخصات")
    setFormSize("1000000")
    setFormPages("10")
    setShowAddDialog(true)
  }

  const openEdit = (m: PDFMaterial) => {
    setEditing(m)
    setFormTitle(m.title)
    setFormDesc(m.description ?? "")
    setFormUrl(m.file_url ?? "")
    setFormCategory(m.category)
    setFormSize(String(m.file_size))
    setFormPages(String(m.page_count))
    setShowAddDialog(true)
  }

  const togglePublish = async (id: string, isPublished: boolean) => {
    const res = await adminUpdatePdf(id, { is_published: !isPublished })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("تم تحديث حالة النشر")
    await refreshFromServer()
  }

  const deleteMaterial = async (id: string) => {
    const res = await adminRemovePdf(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("تم حذف الملف")
    await refreshFromServer()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const saveDialog = async () => {
    const fileSize = parseInt(formSize, 10)
    const pageCount = parseInt(formPages, 10)
    if (!Number.isFinite(fileSize) || !Number.isFinite(pageCount)) {
      toast.error("حجم الملف وعدد الصفحات يجب أن يكونا أرقاماً")
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const res = await adminUpdatePdf(editing.id, {
          title: formTitle.trim(),
          description: formDesc || null,
          category: formCategory,
          file_url: formUrl.trim() || null,
          file_size: fileSize,
          page_count: pageCount,
        })
        if (!res.success) {
          toast.error(res.error)
          return
        }
        toast.success("تم حفظ التعديلات")
      } else {
        const res = await adminCreatePdf({
          title: formTitle.trim(),
          description: formDesc || null,
          category: formCategory,
          file_url: formUrl.trim() || null,
          file_size: fileSize,
          page_count: pageCount,
          is_published: true,
        })
        if (!res.success) {
          toast.error(res.error)
          return
        }
        toast.success("تمت إضافة الملف")
      }
      setShowAddDialog(false)
      setEditing(null)
      await refreshFromServer()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة المواد التعليمية</h1>
          <p className="text-muted-foreground">إجمالي {materials.length} ملف</p>
        </div>
        <Button type="button" onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة ملف
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث عن ملف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                الكل
              </Button>
              {categoriesInUse.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredMaterials.map((material) => (
          <Card
            key={material.id}
            className="border-0 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-secondary/80">
                  <FileText className="h-6 w-6 text-secondary-foreground" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-foreground">
                        {material.title}
                        {material.is_published ?
                          <Unlock className="h-4 w-4 text-chart-2" />
                        : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {material.description}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => openEdit(material)}>
                          <Edit className="ml-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => void togglePublish(material.id, material.is_published)}
                        >
                          {material.is_published ?
                            <>
                              <Lock className="ml-2 h-4 w-4" />
                              إخفاء عن الطلاب
                            </>
                          : <>
                              <Unlock className="ml-2 h-4 w-4" />
                              نشر للطلاب
                            </>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => void deleteMaterial(material.id)}
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">{material.category}</span>
                    <span>{formatFileSize(material.file_size)}</span>
                    <span>{material.page_count} صفحة</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">لا يوجد ملفات مطابقة</p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showAddDialog || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditing(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الملف" : "إضافة ملف"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">العنوان</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">الوصف</label>
              <Textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">رابط الملف</label>
              <Input dir="ltr" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">التصنيف</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as PDFMaterial["category"])}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  الحجم (بايت)
                </label>
                <Input value={formSize} onChange={(e) => setFormSize(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">عدد الصفحات</label>
                <Input value={formPages} onChange={(e) => setFormPages(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setEditing(null)
              }}
            >
              إلغاء
            </Button>
            <Button type="button" disabled={saving || !formTitle.trim()} onClick={() => void saveDialog()}>
              {editing ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
