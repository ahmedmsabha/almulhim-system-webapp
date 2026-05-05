'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, FileText, Grid, List } from 'lucide-react'

import { getPdfs } from '@/actions/pdfs'
import { PDFCard } from '@/components/student/materials/pdf-card'
import { EmptyState } from '@/components/shared/feedback/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { queryKeys } from '@/lib/query-keys'
import { materialsWithPlaceholderStatus } from '@/lib/student-catalog-merge'
import type { MaterialWithStatus, PDFMaterial } from '@/types'

type CategoryFilter = 'all' | PDFMaterial['category']
type ViewMode = 'grid' | 'list'

const categories: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'شرح', label: 'شرح' },
  { value: 'تمارين', label: 'تمارين' },
  { value: 'امتحانات', label: 'امتحانات' },
  { value: 'حلول', label: 'حلول' },
  { value: 'ملخصات', label: 'ملخصات' },
]

export function MaterialsContent() {
  const { data: initialMaterials = [] } = useQuery({
    queryKey: queryKeys.studentMaterials(),
    queryFn: async (): Promise<MaterialWithStatus[]> => {
      try {
        const res = await getPdfs()
        if (!res.success) {
          throw new Error(res.error)
        }
        return materialsWithPlaceholderStatus(res.data)
      } catch (e) {
        throw e instanceof Error ? e : new Error('فشل تحميل الملفات')
      }
    },
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [downloadedOnly, setDownloadedOnly] = useState(false)

  const filteredMaterials = useMemo(() => {
    let materials = [...initialMaterials]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      materials = materials.filter(
        (material) =>
          material.title.toLowerCase().includes(query) ||
          material.description?.toLowerCase().includes(query)
      )
    }

    if (category !== 'all') {
      materials = materials.filter((material) => material.category === category)
    }

    if (downloadedOnly) {
      materials = materials.filter((m) => m.download_status === 'downloaded')
    }

    return materials
  }, [searchQuery, category, downloadedOnly, initialMaterials])

  const offlineEmpty =
    downloadedOnly && !searchQuery
      ? 'لم يتم تحميل ملفات PDF على هذا الجهاز. من صفحة أي ملف اضغط «تحميل» لقراءته دون اتصال.'
      : downloadedOnly && searchQuery
        ? 'لا توجد ملفات محمّلة تطابق البحث. جرّب كلمات أخرى أو عطِّل «محمّل فقط».'
        : null

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title-student">الملفات</h1>
        <p className="page-subtitle-student">ملخصات وتمارين وامتحانات بتنسيق PDF</p>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث عن ملف بالعنوان…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 border-border/70 pe-11 shadow-sm sm:h-11"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end xl:justify-start">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-2">
              <Switch
                id="downloaded-toggle"
                checked={downloadedOnly}
                onCheckedChange={setDownloadedOnly}
                className="data-[state=checked]:bg-success"
              />
              <Label htmlFor="downloaded-toggle" className="cursor-pointer text-sm leading-snug">
                المحمّل فقط{' '}
                <span className="block text-[11px] text-muted-foreground sm:inline">
                  متاح بدون إنترنت
                </span>
              </Label>
            </div>
            <div className="flex rounded-xl border border-border/50 bg-muted/30 p-1">
              <Button
                type="button"
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                aria-pressed={viewMode === 'grid'}
                aria-label="عرض شبكي"
                className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="size-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                aria-pressed={viewMode === 'list'}
                aria-label="عرض قائمة"
                className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                onClick={() => setViewMode('list')}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs
          value={category}
          onValueChange={(value) => setCategory(value as CategoryFilter)}
          className="w-full overflow-x-auto"
        >
          <TabsList className="tabs-pills scrollbar-thin mx-1 inline-flex w-max max-w-none min-w-0 shrink-0 items-center justify-start p-1.5 rtl:justify-start">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="shrink-0">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filteredMaterials.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={offlineEmpty ? 'لا ملفات محمّلة' : 'لا توجد ملفات'}
          description={
            offlineEmpty ??
            (searchQuery
              ? 'لم نعثر على ملف مطابق؛ جرّب كلمات أخرى أو صفِّح الفئة «الكل».'
              : 'لا توجد ملفات في هذه الفئة حالياً.')
          }
          variant="card"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMaterials.map((material) => (
            <PDFCard key={material.id} material={material} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMaterials.map((material) => (
            <PDFCard key={material.id} material={material} variant="list" />
          ))}
        </div>
      )}
    </div>
  )
}
