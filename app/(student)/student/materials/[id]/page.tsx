import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StudentMaterialPdfDetailHeader } from '@/components/student/materials/student-material-pdf-detail-header'
import { StudentProtectedPdfViewer } from '@/components/student/materials/student-protected-pdf-viewer'
import { AlertCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'
import { getPdfMaterialById, getSubscriberPdfs } from '@/lib/db/queries/pdfs'
import { materialsWithPlaceholderStatus } from '@/lib/server/student-home-data'

interface MaterialPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  const { id } = await params
  const material = await getPdfMaterialById(id)

  if (!material) {
    return { title: 'ملف غير موجود' }
  }

  return {
    title: material.title,
    description: material.description || `${material.category} - ${material.page_count} صفحة`,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { id } = await params
  await requireStudentContentAccess()
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) notFound()

  const pdfs = await getSubscriberPdfs(session.access_token)
  const withStatus = materialsWithPlaceholderStatus(pdfs)
  const material = withStatus.find((m) => m.id === id)
  if (!material) notFound()

  const isExpired = false

  return (
    <div className="space-y-4">
      <StudentMaterialPdfDetailHeader
        materialId={material.id}
        title={material.title}
        subtitle={`${material.page_count} صفحة · ${formatFileSize(material.file_size)}`}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="relative lg:col-span-3">
          <Card className="min-h-[70vh]">
            <CardContent className="flex h-full flex-col p-4 sm:p-6">
              {isExpired ? (
                <div className="flex w-full items-center justify-center p-4 sm:p-8">
                  <Card className="max-w-md border-destructive/30 text-center shadow-md">
                    <CardContent className="space-y-4 p-8">
                      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="size-7 text-destructive" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight">انتهى اشتراكك</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          جدّد اشتراكك للوصول إلى هذا الملف والبقية من المقرر.
                        </p>
                      </div>
                      <Button asChild className="min-h-11 w-full max-w-xs">
                        <Link href="/student/profile">تجديد الاشتراك</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : material.file_url ? (
                <StudentProtectedPdfViewer materialId={material.id} title={material.title} />
              ) : (
                <div className="flex h-[60vh] w-full flex-col items-center justify-center rounded-lg bg-muted/50">
                  <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
                  <p className="text-muted-foreground">لا يوجد رابط ملف لهذه المادة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-20">
            <CardContent className="space-y-3 p-4">
              <h3 className="font-semibold">عن الملف</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">التصنيف</dt>
                  <dd className="text-left font-medium">{material.category}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">الصفحات</dt>
                  <dd className="tabular-nums font-medium">{material.page_count}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">الحجم</dt>
                  <dd className="tabular-nums font-medium">{formatFileSize(material.file_size)}</dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-muted-foreground">
                التنقّل بين الصفحات من شريط أدوات PDF داخل الإطار. لا يُعرَض رابط علني لتخزين الملفات.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-muted bg-muted/30">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">ملاحظة</p>
            <p>
              هذا المحتوى مخصص للمشتركين فقط. يُرجى عدم مشاركة الملفات أو طباعتها وتوزيعها.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
