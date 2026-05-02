'use client'

import { createContext, useContext } from 'react'

import type { StudentSubscriptionUiStatus, Subscription } from '@/types'

export type StudentLayoutSubscriptionValue = {
  subscriptionStatus: StudentSubscriptionUiStatus
  subscription: Subscription | null
}

const StudentLayoutSubscriptionContext = createContext<
  StudentLayoutSubscriptionValue | undefined
>(undefined)

export function StudentLayoutSubscriptionProvider({
  value,
  children,
}: {
  value: StudentLayoutSubscriptionValue
  children: React.ReactNode
}) {
  return (
    <StudentLayoutSubscriptionContext.Provider value={value}>
      {children}
    </StudentLayoutSubscriptionContext.Provider>
  )
}

/** لاستخدام الدولة في مركبات العميل داخل مجموعة الطالب. الطبقات من الخادم تستعمل `requireStudentLayoutContext`. */
export function useStudentLayoutSubscription(): StudentLayoutSubscriptionValue {
  const v = useContext(StudentLayoutSubscriptionContext)
  if (!v) {
    throw new Error(
      'useStudentLayoutSubscription must be used under StudentLayoutSubscriptionProvider'
    )
  }
  return v
}
