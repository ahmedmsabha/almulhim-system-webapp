import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"
import { isTranscoderWorkerQueueConfigured } from "@/lib/server/transcoder-worker-config"
import { getR2BucketDisplayName } from "@/lib/storage/r2-hls-presign"

export const revalidate = 60

export default async function AdminLessonsPage() {
  const [, lessons] = await Promise.all([
    requireAdminLayoutContext(),
    listVideoLessonsForAdmin(),
  ])

  return (
    <AdminLessonsClient
      initialLessons={lessons}
      enableR2LessonUpload={true}
      r2PublicPlaybackReady={true}
      enableR2ServerMedia={true}
      enableServerVideoTranscode={false}
      enableTranscoderWorkerQueue={true}
      transcoderWorkerQueueConfigured={isTranscoderWorkerQueueConfigured()}
      r2BucketDisplayName={getR2BucketDisplayName()}
    />
  )
}
