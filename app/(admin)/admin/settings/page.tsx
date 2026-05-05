import { AdminSettingsClient } from "@/components/admin/admin-settings-client"
import { getAppSetting } from "@/lib/db/queries/site-settings"
import { listSubscriptionPlansAdmin } from "@/lib/db/queries/subscription-plans-admin"
import { requireAdminLayoutContext } from "@/lib/server/layout-gates"

export default async function SettingsPage() {
  const [{ profile }, plans, appSetting] = await Promise.all([
    requireAdminLayoutContext(),
    listSubscriptionPlansAdmin(),
    getAppSetting(),
  ])

  return (
    <AdminSettingsClient
      key={`${profile.updated_at}-${appSetting.updated_at}-${plans.map((p) => p.updated_at).join(",")}`}
      initialProfile={profile}
      initialPlans={plans}
      initialAppSetting={appSetting}
    />
  )
}
