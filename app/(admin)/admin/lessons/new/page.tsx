import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"
import { isTranscoderWorkerQueueConfigured } from "@/lib/server/transcoder-worker-config"
import { getR2BucketDisplayName } from "@/lib/storage/r2-hls-presign"

export default async function AdminLessonNewPage() {
  const lessons = await listVideoLessonsForAdmin()
  return (
    <AdminLessonsClient
      initialLessons={lessons}
      autoOpenCreate
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
