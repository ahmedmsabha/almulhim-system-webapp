import { AdminAppShell } from "@/components/admin/admin-app-shell"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"

/** يسمح لإجراءات التحويل الطويلة (ffmpeg) على الاستضافة التي تدعمها (مثل Vercel Pro أو خادم خاص). */
export const maxDuration = 600

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAdminLayoutContext()
  return <AdminAppShell profile={profile}>{children}</AdminAppShell>
}
