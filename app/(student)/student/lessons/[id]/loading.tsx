import { Skeleton } from '@/components/shared/feedback/skeletons'

export default function LessonDetailLoading() {
  return (
    <div className="space-y-6 py-1">
      <Skeleton className="h-5 w-32 rounded-md" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-24 rounded-xl lg:h-20" />
          <Skeleton className="min-h-[12rem] w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="min-h-[14rem] w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
