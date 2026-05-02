import { PDFCardSkeleton, Skeleton } from '@/components/shared/feedback/skeletons'

export default function MaterialsLoading() {
  return (
    <div className="space-y-6 py-1">
      <div className="space-y-2">
        <Skeleton className="h-9 max-w-[12rem] rounded-lg" />
        <Skeleton className="h-4 max-w-xl rounded-md" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full max-w-sm rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="size-11 rounded-lg" />
          <Skeleton className="size-11 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-4xl rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PDFCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
