"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import {
  adminCommitPdfFromStorage,
  adminRequestPdfSignedUpload,
} from "@/actions/admin-media-pdf"
import { AdminUploadOverlay } from "@/components/admin/admin-upload-overlay"
import { uploadMaterialsPdfViaSignedToken } from "@/lib/client/admin-upload-xhr"
import { PdfEmbedViewer } from "@/components/shared/media/pdf-embed-viewer"
import type { PDFMaterial } from "@/types"

function isPdfFile(f: File) {
  const n = f.name.toLowerCase()
  return f.type === "application/pdf" || n.endsWith(".pdf")
}

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
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [pdfUploadOverlay, setPdfUploadOverlay] = useState<{
    pct: number
    title: string
    subtitle?: string
  } | null>(null)
  const [pdfDropOver, setPdfDropOver] = useState(false)
  const [pdfBlobPreviewUrl, setPdfBlobPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    setMaterials(initialMaterials)
  }, [initialMaterials])

  useEffect(() => {
    if (!pendingPdfFile) {
      setPdfBlobPreviewUrl(null)
      return
    }
    const u = URL.createObjectURL(pendingPdfFile)
    setPdfBlobPreviewUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [pendingPdfFile])

  useEffect(() => {
    if (!autoOpenCreate) return
    setEditing(null)
    setFormTitle("")
    setFormDesc("")
    setFormUrl("")
    setFormCategory("ملخصات")
    setFormSize("1000000")
    setFormPages("10")
    setPendingPdfFile(null)
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

  const applyPdfFromFileList = (list: FileList | null) => {
    const first = list?.[0]
    if (!first) return
    if (!isPdfFile(first)) {
      toast.error("يُسمح بملف PDF فقط")
      return
    }
    setPendingPdfFile(first)
  }

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setPdfDropOver(false)
    applyPdfFromFileList(e.dataTransfer.files)
  }

  const httpPdfPreview =
    !pendingPdfFile && /^https?:\/\//i.test(formUrl.trim()) ? formUrl.trim() : null

  const openAdd = () => {
    setEditing(null)
    setFormTitle("")
    setFormDesc("")
    setFormUrl("")
    setFormCategory("ملخصات")
    setFormSize("1000000")
    setFormPages("10")
    setPendingPdfFile(null)
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
    setPendingPdfFile(null)
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
    if (!formTitle.trim()) {
      toast.error("أدخل عنواناً للملف")
      return
    }

    setSaving(true)
    try {
      if (pendingPdfFile) {
        setPdfUploadOverlay({
          pct: 5,
          title: "جاري تجهيز الرفع",
          subtitle: "طلب رابط الرفع الآمن من الخادم",
        })
        try {
          const sign = await adminRequestPdfSignedUpload()
          if (!sign.success) {
            toast.error(sign.error)
            return
          }

          setPdfUploadOverlay({
            pct: 12,
            title: "رفع ملف PDF",
            subtitle: pendingPdfFile.name,
          })

          await uploadMaterialsPdfViaSignedToken({
            bucket: "materials",
            storagePath: sign.data.path,
            token: sign.data.token,
            file: pendingPdfFile,
            upsert: true,
            onProgress: (p) => {
              setPdfUploadOverlay((prev) =>
                prev ?
                  {
                    ...prev,
                    pct: 12 + Math.round(p * 0.68),
                    subtitle: `${p}% من الملف على الشبكة`,
                  }
                : null
              )
            },
          })

          setPdfUploadOverlay({
            pct: 82,
            title: "إنهاء الحفظ",
            subtitle: "قراءة النسخة من التخزين وعدّ الصفحات…",
          })

          const commit = await adminCommitPdfFromStorage({
            storagePath: sign.data.path,
            title: formTitle.trim(),
            description: formDesc || null,
            category: formCategory,
            fileSizeBytes: pendingPdfFile.size,
            mode: editing ? "update" : "create",
            materialId: editing?.id,
          })

          if (!commit.success) {
            toast.error(commit.error)
            return
          }

          setPdfUploadOverlay({
            pct: 100,
            title: "اكتمل بنجاح",
            subtitle: "جاري تحديث القائمة",
          })
          await new Promise((r) => setTimeout(r, 420))

          toast.success(editing ? "تم تحديث الملف والرفع" : "تمت إضافة الملف والرفع إلى التخزين")
          setPendingPdfFile(null)
          if (pdfInputRef.current) pdfInputRef.current.value = ""
          setShowAddDialog(false)
          setEditing(null)
          await refreshFromServer()
          return
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "فشل الرفع")
          return
        } finally {
          setPdfUploadOverlay(null)
        }
      }

      const fileSize = parseInt(formSize, 10)
      const pageCount = parseInt(formPages, 10)
      if (!Number.isFinite(fileSize) || !Number.isFinite(pageCount)) {
        toast.error("حجم الملف وعدد الصفحات يجب أن يكونا أرقاماً")
        return
      }

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
            setPendingPdfFile(null)
            setPdfDropOver(false)
            if (pdfInputRef.current) pdfInputRef.current.value = ""
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
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
            <div
              onDragEnter={(ev) => {
                ev.preventDefault()
                setPdfDropOver(true)
              }}
              onDragLeave={() => setPdfDropOver(false)}
              onDragOver={(ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                setPdfDropOver(true)
              }}
              onDrop={handlePdfDrop}
              className={`space-y-2 rounded-lg border border-dashed p-3 transition-colors ${
                pdfDropOver ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <label className="block text-sm font-medium text-foreground">
                رفع PDF إلى Supabase Storage
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                يُنشئ الخادم رابطاً آمناً؛ يُفضَّل ضبط SUPABASE_SERVICE_ROLE_KEY في البيئة
                وحاوية materials عامة القراءة (انظر scripts/008-supabase-storage-materials.sql).
              </p>
              <p className="text-xs font-medium text-muted-foreground">اسحب ملف PDF هنا أو:</p>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => applyPdfFromFileList(e.target.files)}
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  اختيار ملف PDF
                </Button>
                {pendingPdfFile ?
                  <span className="text-xs text-muted-foreground truncate max-w-[220px]" dir="ltr">
                    {pendingPdfFile.name}
                  </span>
                : null}
              </div>
              {pendingPdfFile ?
                <p className="text-xs text-chart-2">
                  عند الحفظ سيتم الرفع ثم احتساب عدد الصفحات تلقائياً (الحقول أدناه تُستخدم لرابط يدوي فقط).
                </p>
              : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                رابط الملف (يدوي — اختياري)
              </label>
              <Input
                dir="ltr"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                disabled={!!pendingPdfFile}
              />
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
                <Input
                  value={formSize}
                  onChange={(e) => setFormSize(e.target.value)}
                  disabled={!!pendingPdfFile}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">عدد الصفحات</label>
                <Input
                  value={formPages}
                  onChange={(e) => setFormPages(e.target.value)}
                  disabled={!!pendingPdfFile}
                />
              </div>
            </div>
            {(pdfBlobPreviewUrl || httpPdfPreview) ?
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">معاينة للمعلّم</p>
                <PdfEmbedViewer
                  src={pdfBlobPreviewUrl ?? httpPdfPreview!}
                  title={formTitle || "معاينة"}
                  allowExternalTab
                  frameClassName="min-h-[38vh] sm:min-h-[44vh]"
                />
              </div>
            : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pdfUploadOverlay !== null}
              onClick={() => {
                setShowAddDialog(false)
                setEditing(null)
                setPendingPdfFile(null)
                if (pdfInputRef.current) pdfInputRef.current.value = ""
              }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={saving || pdfUploadOverlay !== null || !formTitle.trim()}
              onClick={() => void saveDialog()}
            >
              {pendingPdfFile ? (editing ? "رفع وتحديث" : "رفع وإضافة") : editing ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminUploadOverlay
        open={pdfUploadOverlay !== null}
        percent={pdfUploadOverlay?.pct ?? 0}
        title={pdfUploadOverlay?.title ?? ""}
        subtitle={pdfUploadOverlay?.subtitle}
      />
    </div>
  )
}
