import { AnnouncementCardSkeleton, Skeleton } from '@/components/shared/feedback/skeletons'

export default function AnnouncementsLoading() {
  return (
    <div className="space-y-6 py-1">
      <div className="space-y-2">
        <Skeleton className="h-9 max-w-[12rem] rounded-lg" />
        <Skeleton className="h-4 max-w-md rounded-md" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <AnnouncementCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
