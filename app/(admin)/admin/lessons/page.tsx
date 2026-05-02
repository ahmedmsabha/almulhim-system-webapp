import { AdminLessonsClient } from "@/components/admin/admin-lessons-client"
import { listVideoLessonsForAdmin } from "@/lib/db/queries/videos"

export default async function AdminLessonsPage() {
  const lessons = await listVideoLessonsForAdmin()
  return <AdminLessonsClient initialLessons={lessons} />
}
