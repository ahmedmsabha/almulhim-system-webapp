import { dehydrate, HydrationBoundary } from "@tanstack/react-query"

import { AdminAnnouncementsClient } from "@/app/(admin)/admin/announcements/admin-announcements-client"
import { getSessionAccessToken } from "@/actions/auth"
import { getAnnouncements as fetchAnnouncementsDb } from "@/lib/db/queries/announcements"
import { queryKeys } from "@/lib/query-keys"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"
import { getServerQueryClient } from "@/lib/server/prefetch"

export default async function AnnouncementsPage() {
  await requireAdminLayoutContext()
  const queryClient = getServerQueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.adminAnnouncements(),
      queryFn: async () => {
        try {
          const token = await getSessionAccessToken()
          if (!token) {
            throw new Error("Unauthorized")
          }
          return await fetchAnnouncementsDb(token)
        } catch (e) {
          throw e instanceof Error ? e : new Error("prefetch announcements failed")
        }
      },
    })
  } catch {
    /* fallback: العميل يحمّل الإعلانات عبر الإجراء */
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminAnnouncementsClient />
    </HydrationBoundary>
  )
}
