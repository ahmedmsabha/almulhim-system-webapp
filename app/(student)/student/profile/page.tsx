import type { Metadata } from 'next'

import { PushNotificationToggle } from '@/components/PushNotificationToggle'
import { StudentProfileView } from '@/components/student/student-profile-view'
import { requireStudentLayoutContext } from '@/lib/server/layout-gates'

export const metadata: Metadata = {
  title: 'الملف الشخصي',
  description: 'إدارة بياناتك والاشتراك',
}

export default async function ProfilePage() {
  const { profile, subscription, subscriptionStatus } =
    await requireStudentLayoutContext()

  return (
    <StudentProfileView
      profile={profile}
      subscription={subscription}
      subscriptionStatus={subscriptionStatus}
      notificationToggle={<PushNotificationToggle />}
    />
  )
}
