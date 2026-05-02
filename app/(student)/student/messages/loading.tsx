import { Skeleton } from '@/components/shared/feedback/skeletons'

export default function MessagesLoading() {
  return (
    <div className="space-y-6 py-1">
      <div className="space-y-2">
        <Skeleton className="h-9 max-w-[10rem] rounded-lg" />
        <Skeleton className="h-4 max-w-xs rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="min-h-[60vh] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="hidden min-h-[40vh] w-full rounded-xl lg:block" />
      </div>
    </div>
  )
}
