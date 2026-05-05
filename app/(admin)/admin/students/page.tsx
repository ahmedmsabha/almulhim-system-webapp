import { AdminStudentsClient } from "@/components/admin/admin-students-client"
import { listStudentsWithSubscriptions } from "@/lib/db/queries/students"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"
import { getSubscriptionPlans } from "@/lib/supabase/queries"

import { mapProfileRowToDemoStudent } from "./map-demo-student"

export default async function StudentsPage() {
  const [, rows, plans] = await Promise.all([
    requireAdminLayoutContext(),
    listStudentsWithSubscriptions(),
    getSubscriptionPlans(),
  ])

  return (
    <AdminStudentsClient
      initialStudents={rows.map(mapProfileRowToDemoStudent)}
      subscriptionPlans={plans}
    />
  )
}
