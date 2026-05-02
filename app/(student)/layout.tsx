import { InstallPrompt } from '@/components/InstallPrompt'
import { IOSInstallBanner } from '@/components/IOSInstallBanner'
import { OfflineBanner } from '@/components/OfflineBanner'
import { StudentAppShell } from '@/components/student/student-app-shell'
import { StudentLayoutSubscriptionProvider } from '@/components/student/student-layout-provider'
import { requireStudentLayoutContext } from '@/lib/server/layout-gates'

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
        <InstallPrompt />
        <IOSInstallBanner />
        <OfflineBanner />
        {children}
      </StudentAppShell>
    </StudentLayoutSubscriptionProvider>
  )
}
