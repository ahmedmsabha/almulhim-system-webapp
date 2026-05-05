'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, PlayCircle, Download } from 'lucide-react'

import { getStudentLessonsMergedAction } from '@/actions/student-catalog'
import { LessonCard } from '@/components/student/lessons/lesson-card'
import { EmptyState } from '@/components/shared/feedback/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { queryKeys } from '@/lib/query-keys'
import type { LessonWithProgress } from '@/types'

type FilterType = 'all' | 'new' | 'incomplete' | 'downloaded'

export function LessonsContent() {
  const { data: initialLessons = [] } = useQuery({
    queryKey: queryKeys.studentLessons(),
    queryFn: async (): Promise<LessonWithProgress[]> => {
      try {
        const res = await getStudentLessonsMergedAction()
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error('فشل تحميل الدروس')
      }
    },
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredLessons = useMemo(() => {
    let lessons = [...initialLessons]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      lessons = lessons.filter(
        (lesson) =>
          lesson.title.toLowerCase().includes(query) ||
          lesson.description.toLowerCase().includes(query) ||
          lesson.unit.toLowerCase().includes(query)
      )
    }

    switch (filter) {
      case 'new':
        lessons = lessons.filter(
          (lesson) => !lesson.watch_progress || lesson.watch_progress.progress === 0
        )
        break
      case 'incomplete':
        lessons = lessons.filter(
          (lesson) =>
            lesson.watch_progress &&
            lesson.watch_progress.progress > 0 &&
            !lesson.watch_progress.completed
        )
        break
      case 'downloaded':
        lessons = lessons.filter((lesson) => lesson.download_status === 'downloaded')
        break
    }

    return lessons
  }, [searchQuery, filter, initialLessons])

  const lessonsByUnit = useMemo(() => {
    const grouped: Record<string, typeof filteredLessons> = {}
    filteredLessons.forEach((lesson) => {
      if (!grouped[lesson.unit]) {
        grouped[lesson.unit] = []
      }
      grouped[lesson.unit].push(lesson)
    })
    return grouped
  }, [filteredLessons])

  const emptyDescription =
    searchQuery.trim() !== ''
      ? 'جرِّب كلمات أخرى أو امسح البحث لمشاهدة كل الدروس.'
      : filter === 'downloaded'
        ? 'لم تحمَّل أي درس على هذا الجهاز بعد. افتح أي درس واضغط «تحميل» لمشاهدته بدون إنترنت.'
        : 'لا توجد دروس ضمن المرشّح الذي اخترته.'

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title-student">الدروس</h1>
        <p className="page-subtitle-student">جميع دروس الفيزياء المتاحة لك</p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث عن درس، وحدة، أو موضوع…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="peer min-h-11 border-border/70 pe-11 ps-3 text-base shadow-sm sm:h-11 sm:text-sm"
          />
        </div>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
          className="w-full lg:max-w-2xl"
        >
          <TabsList className="tabs-pills mx-0 ms-0 mt-2 w-full justify-start lg:mt-0 rtl:justify-start">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="new">جديد</TabsTrigger>
            <TabsTrigger value="incomplete">غير مكتمل</TabsTrigger>
            <TabsTrigger value="downloaded">محمّل</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredLessons.length === 0 ? (
        <EmptyState
          icon={filter === 'downloaded' ? Download : PlayCircle}
          title={
            filter === 'downloaded' ? 'لا توجد دروس محمّلة' : searchQuery.trim() !== '' ? 'لا نتائج للبحث' : 'لا توجد دروس'
          }
          description={emptyDescription}
          variant="card"
          action={
            filter === 'downloaded' ? (
              <Button asChild className="min-h-11 sm:min-h-10">
                <Link href="/student/lessons">تصفح الدروس</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-10">
          {Object.entries(lessonsByUnit).map(([unit, lessons]) => (
            <div key={unit}>
              <h2 className="mb-4 border-b border-border/50 pb-2 text-xl font-bold text-foreground">
                {unit}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lessons.map((lessonItem) => (
                  <LessonCard key={lessonItem.id} lesson={lessonItem} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
