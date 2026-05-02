import { LessonCardSkeleton } from '@/components/shared/feedback/skeletons'
import { Skeleton } from '@/components/shared/feedback/skeletons'

export default function LessonsLoading() {
  return (
    <div className="space-y-6 py-1">
      <div className="space-y-2">
        <Skeleton className="h-9 max-w-[12rem] rounded-lg" />
        <Skeleton className="h-4 max-w-xl rounded-md" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full max-w-sm rounded-lg" />
        <Skeleton className="h-10 w-full rounded-full sm:max-w-xl" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g}>
            <Skeleton className="mb-6 h-7 w-[75%] max-w-[12rem] rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LessonCardSkeleton key={`${g}-${i}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
