import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"
import { isR2BrowserUploadConfigured, isR2Configured } from "@/lib/storage/r2-hls-presign"
import { isLessonVideoTranscodeAvailable } from "@/lib/video/transcode-lesson-hls"

export const revalidate = 60

export default async function AdminLessonsPage() {
  const [, lessons] = await Promise.all([
    requireAdminLayoutContext(),
    listVideoLessonsForAdmin(),
  ])

  return (
    <AdminLessonsClient
      initialLessons={lessons}
      enableR2LessonUpload={isR2Configured()}
      r2PublicPlaybackReady={isR2BrowserUploadConfigured()}
      enableR2ServerMedia={isR2Configured()}
      enableVideoTranscode={isLessonVideoTranscodeAvailable()}
    />
  )
}
