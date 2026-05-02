import { Skeleton } from "@/components/ui/skeleton"

export default function AdminSectionLoading() {
  return (
    <div className="space-y-6 py-1">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-4 max-w-xl rounded-md" />
      </div>
      <Skeleton className="min-h-[20rem] w-full rounded-xl" />
    </div>
  )
}
