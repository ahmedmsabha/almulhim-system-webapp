import { MaterialsContent } from './materials-content'
import { getSubscriberPdfs } from '@/lib/db/queries/pdfs'
import { materialsWithPlaceholderStatus } from '@/lib/server/student-home-data'
import { requireStudentContentAccess } from '@/lib/server/layout-gates'

export default async function MaterialsPage() {
  const { accessToken } = await requireStudentContentAccess()

  const pdfs = await getSubscriberPdfs(accessToken)
  const materials = materialsWithPlaceholderStatus(pdfs)
  return <MaterialsContent initialMaterials={materials} />
}
