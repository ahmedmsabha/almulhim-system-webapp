import { AdminAppShell } from "@/components/admin/admin-app-shell"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAdminLayoutContext()
  return <AdminAppShell profile={profile}>{children}</AdminAppShell>
}
