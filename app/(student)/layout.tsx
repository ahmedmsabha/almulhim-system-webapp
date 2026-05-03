import { StudentAppShell } from '@/components/student/student-app-shell'
import { StudentLayoutSubscriptionProvider } from '@/components/student/student-layout-provider'
import { requireStudentLayoutContext } from '@/lib/server/layout-gates'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const layoutContext = await requireStudentLayoutContext()

  return (
    <StudentLayoutSubscriptionProvider
      value={{
        subscriptionStatus: layoutContext.subscriptionStatus,
        subscription: layoutContext.subscription,
      }}
    >
      <StudentAppShell
        profile={layoutContext.profile}
        subscription={layoutContext.subscription}
        subscriptionStatus={layoutContext.subscriptionStatus}
      >
        {children}
      </StudentAppShell>
    </StudentLayoutSubscriptionProvider>
  )
}
