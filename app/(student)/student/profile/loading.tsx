import { Skeleton } from '@/components/shared/feedback/skeletons'

export default function ProfileLoading() {
  return (
    <div className="space-y-6 py-1">
      <div className="space-y-2">
        <Skeleton className="h-9 max-w-[12rem] rounded-lg" />
        <Skeleton className="h-4 max-w-sm rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="min-h-[18rem] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="min-h-[18rem] w-full rounded-xl" />
        <Skeleton className="min-h-[16rem] w-full rounded-xl lg:col-span-3" />
      </div>
    </div>
  )
}
