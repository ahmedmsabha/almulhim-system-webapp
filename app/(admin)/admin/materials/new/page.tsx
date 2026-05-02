import { AdminMaterialsClient } from "@/components/admin/admin-materials-client"
import { getPublishedPdfsForAdmin } from "@/lib/db/queries/pdfs"

export default async function AdminMaterialNewPage() {
  const materials = await getPublishedPdfsForAdmin()
  return <AdminMaterialsClient initialMaterials={materials} autoOpenCreate />
}
