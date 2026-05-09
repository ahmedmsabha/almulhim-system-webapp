import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"
import { isR2BrowserUploadConfigured, isR2Configured } from "@/lib/storage/r2-hls-presign"
import { isLessonVideoTranscodeAvailable } from "@/lib/video/transcode-lesson-hls"

export default async function AdminLessonNewPage() {
  const lessons = await listVideoLessonsForAdmin()
  return (
    <AdminLessonsClient
      initialLessons={lessons}
      autoOpenCreate
      enableR2LessonUpload={isR2Configured()}
      r2PublicPlaybackReady={isR2BrowserUploadConfigured()}
      enableR2ServerMedia={isR2Configured()}
      enableVideoTranscode={isLessonVideoTranscodeAvailable()}
    />
  )
}
