import { Skeleton } from "@/components/ui/skeleton"

export default function OfflineLoading() {
  return (
    <div className="container flex min-h-[30vh] flex-col items-center justify-center gap-4 py-12">
      <Skeleton className="h-8 w-64 rounded-md" />
      <Skeleton className="h-10 w-40 rounded-lg" />
    </div>
  )
}
