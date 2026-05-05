import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

import { MaterialsContent } from './materials-content'
import { getSubscriberPdfs } from '@/lib/db/queries/pdfs'
import { queryKeys } from '@/lib/query-keys'
import { getServerQueryClient } from '@/lib/server/prefetch'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'
import { materialsWithPlaceholderStatus } from '@/lib/student-catalog-merge'

export const revalidate = 60

export default async function MaterialsPage() {
  const { accessToken } = await requireStudentContentAccess()
  const queryClient = getServerQueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.studentMaterials(),
      queryFn: async () => {
        try {
          const pdfs = await getSubscriberPdfs(accessToken)
          return materialsWithPlaceholderStatus(pdfs)
        } catch (e) {
          throw e instanceof Error ? e : new Error('prefetch materials failed')
        }
      },
    })
  } catch {
    /* fallback إلى استعلام العميل */
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MaterialsContent />
    </HydrationBoundary>
  )
}
