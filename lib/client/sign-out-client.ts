'use client'

import { signOutAction } from '@/actions/auth'

/** كاش يحتوي مخرجات RSC ووثائق التنقل وطلبات API — مرتبط بجلسة المستخدم الحالي */
const USER_SCOPED_CACHE_NAMES = [
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
  'apis',
  'next-data',
  'start-url',
] as const

export async function clearUserScopedRuntimeCaches(): Promise<void> {
  if (typeof caches === 'undefined') return
  await Promise.all(
    USER_SCOPED_CACHE_NAMES.map((name) => caches.delete(name).catch(() => undefined))
  )
}

/** يمسح كاش PWA ثم يسجّل الخروج حتى لا تبقى بيانات طالب على الجهاز المشترك */
export async function signOutAndClearAppCaches(): Promise<void> {
  await clearUserScopedRuntimeCaches()
  try {
    await signOutAction()
  } finally {
    window.location.assign('/public/login')
  }
}
