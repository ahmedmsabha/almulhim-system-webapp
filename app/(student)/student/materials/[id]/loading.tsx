import { Skeleton } from '@/components/shared/feedback/skeletons'

export default function MaterialDetailLoading() {
  return (
    <div className="space-y-4 py-1">
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-4">
        <Skeleton className="lg:col-span-3 aspect-[3/4] min-h-[50vh] w-full rounded-xl" />
        <Skeleton className="hidden min-h-[50vh] w-full rounded-xl lg:block" />
      </div>
    </div>
  )
}
