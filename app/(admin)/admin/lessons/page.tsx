import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"
import { isR2BrowserUploadConfigured } from "@/lib/storage/r2-hls-presign"

export const revalidate = 60

export default async function AdminLessonsPage() {
  const lessons = await listVideoLessonsForAdmin()
  return (
    <AdminLessonsClient
      initialLessons={lessons}
      enableR2FolderUpload={isR2BrowserUploadConfigured()}
    />
  )
}
