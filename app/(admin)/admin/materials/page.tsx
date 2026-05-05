import { AdminMaterialsClient } from "@/components/admin/admin-materials-client"
import { getPublishedPdfsForAdmin } from "@/lib/db/queries/pdfs"

export const revalidate = 60

export default async function AdminMaterialsPage() {
  const materials = await getPublishedPdfsForAdmin()
  return <AdminMaterialsClient initialMaterials={materials} />
}
