import { AdminStudentsClient } from "@/components/admin/admin-students-client"
import { listStudentsWithSubscriptions } from "@/lib/db/queries/students"
import type { DemoStudent } from "@/types"

function mapRow(
  r: Awaited<ReturnType<typeof listStudentsWithSubscriptions>>[number]
): DemoStudent {
  const sub = r.subscriptions[0]
  const active = sub && (sub.status === "active" || sub.status === "expiring_soon")
  return {
    id: r.id,
    name: r.full_name,
    email: r.email,
    phone: r.phone,
    isActive: true,
    subscriptionType: active ? "premium" : "monthly",
    subscriptionEndDate: sub?.end_date ?? null,
    createdAt: r.created_at,
    hasDeviceBinding: r.hasDeviceBinding ?? false,
  }
}

export default async function StudentsPage() {
  const rows = await listStudentsWithSubscriptions()
  return <AdminStudentsClient initialStudents={rows.map(mapRow)} />
}
