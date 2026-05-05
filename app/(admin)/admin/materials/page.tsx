import { AdminMaterialsClient } from "@/components/admin/admin-materials-client"
import { getPublishedPdfsForAdmin } from "@/lib/db/queries/pdfs"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"

export const revalidate = 60

export default async function AdminMaterialsPage() {
  const [, materials] = await Promise.all([
    requireAdminLayoutContext(),
    getPublishedPdfsForAdmin(),
  ])

  return <AdminMaterialsClient initialMaterials={materials} />
}
