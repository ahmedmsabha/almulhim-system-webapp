import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MaterialDownloadControl } from '@/components/shared/media/material-download-control'
import { DownloadBadge } from '@/components/shared/media/download-button'
import {
  ArrowRight,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  FileText,
  CheckCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireStudentLayoutContext } from '@/lib/server/layout-gates'
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
  const { subscriptionStatus } = await requireStudentLayoutContext()
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) notFound()

  const pdfs = await getSubscriberPdfs(session.access_token)
  const withStatus = materialsWithPlaceholderStatus(pdfs)
  const material = withStatus.find((m) => m.id === id)
  if (!material) notFound()

  const isDownloaded = material.download_status === 'downloaded'
  const isExpired = subscriptionStatus === 'expired' || subscriptionStatus === 'none'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3">
          <Link
            href="/student/materials"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            <span className="hidden sm:inline">العودة</span>
          </Link>
          <span className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium line-clamp-1">{material.title}</span>
          </div>
          {material.download_status && (
            <DownloadBadge status={material.download_status} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="تكبير">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="تصغير">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="h-5 w-px bg-border" />
          <Button variant="ghost" size="icon" title="الصفحة السابقة">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            1 / {material.page_count}
          </span>
          <Button variant="ghost" size="icon" title="الصفحة التالية">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="h-5 w-px bg-border hidden sm:block" />
          <MaterialDownloadControl
            materialId={material.id}
            status={material.download_status || 'not_downloaded'}
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="relative lg:col-span-3">
          <Card className="min-h-[70vh]">
            <CardContent className="flex h-full items-center justify-center p-6">
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
              ) : isDownloaded ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="mb-2 font-semibold">الملف متاح بدون إنترنت</h3>
                  <p className="text-sm text-muted-foreground">
                    هذا الملف محمّل على جهازك ويمكنك قراءته في أي وقت
                  </p>
                  <div className="mt-8 flex h-[50vh] w-full items-center justify-center rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">
                      عارض PDF — {material.page_count} صفحة
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-[60vh] w-full flex-col items-center justify-center rounded-lg bg-muted/50">
                  <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    عارض PDF — {material.page_count} صفحة
                  </p>
                  {material.file_url ?
                    <p className="mt-3 max-w-prose break-all text-xs text-muted-foreground" dir="ltr">
                      {material.file_url}
                    </p>
                  : null}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatFileSize(material.file_size)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-20">
            <CardContent className="p-4">
              <h3 className="mb-4 font-semibold">الصفحات</h3>
              <div className="scrollbar-thin max-h-[60vh] space-y-2 overflow-y-auto">
                {Array.from({ length: Math.min(material.page_count, 10) }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`w-full rounded border p-2 text-sm transition-colors hover:bg-muted ${
                      index === 0 ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="mb-1 aspect-[3/4] rounded bg-muted" />
                    <span className="text-muted-foreground">صفحة {index + 1}</span>
                  </button>
                ))}
                {material.page_count > 10 && (
                  <p className="text-center text-xs text-muted-foreground">
                    و {material.page_count - 10} صفحة أخرى...
                  </p>
                )}
              </div>
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
