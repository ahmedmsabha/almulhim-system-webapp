import { AdminAppShell } from "@/components/admin/admin-app-shell"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"

/** حد Vercel Hobby: 300 ثانية كحد أقصى. خطط أعلى أو خادم خاص لمهام أطول (مثل ffmpeg). */
export const maxDuration = 300

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAdminLayoutContext()
  return <AdminAppShell profile={profile}>{children}</AdminAppShell>
}
