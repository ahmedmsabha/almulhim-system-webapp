import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"
import { isR2BrowserUploadConfigured } from "@/lib/storage/r2-hls-presign"

export default async function AdminLessonNewPage() {
  const lessons = await listVideoLessonsForAdmin()
  return (
    <AdminLessonsClient
      initialLessons={lessons}
      autoOpenCreate
      enableR2FolderUpload={isR2BrowserUploadConfigured()}
    />
  )
}
