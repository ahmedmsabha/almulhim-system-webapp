import { Skeleton } from "@/components/ui/skeleton"

export default function PublicSectionLoading() {
  return (
    <div className="container flex min-h-[40vh] flex-col items-center justify-center gap-6 py-12">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-32 w-full max-w-lg rounded-xl" />
    </div>
  )
}
