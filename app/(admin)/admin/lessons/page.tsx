import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"
import { isR2BrowserUploadConfigured } from "@/lib/storage/r2-hls-presign"

export const revalidate = 60

export default async function AdminLessonsPage() {
  const [, lessons] = await Promise.all([
    requireAdminLayoutContext(),
    listVideoLessonsForAdmin(),
  ])

  return (
    <AdminLessonsClient
      initialLessons={lessons}
      enableR2FolderUpload={isR2BrowserUploadConfigured()}
    />
  )
}
