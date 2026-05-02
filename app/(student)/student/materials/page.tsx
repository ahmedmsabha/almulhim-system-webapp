import { redirect } from 'next/navigation'

import { MaterialsContent } from './materials-content'
import { createClient } from '@/lib/supabase/server'
import { getSubscriberPdfs } from '@/lib/db/queries/pdfs'
import { materialsWithPlaceholderStatus } from '@/lib/server/student-home-data'

export default async function MaterialsPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) redirect('/login')

  const pdfs = await getSubscriberPdfs(session.access_token)
  const materials = materialsWithPlaceholderStatus(pdfs)
  return <MaterialsContent initialMaterials={materials} />
}
