import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './login-form'
import { Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BrandMark } from '@/components/brand/brand-lockup'
import { BRAND } from '@/lib/config'

import { getPublicSiteSnapshot } from '@/lib/server/public-site-snapshot'

export const metadata: Metadata = {
  title: 'تسجيل الدخول',
  description: `سجل دخولك للوصول لدروس وملفات ${BRAND.taglineAr}`,
}

export default async function LoginPage() {
  const { teacherDisplayName } = await getPublicSiteSnapshot()
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex flex-col items-center gap-2">
            <BrandMark size={56} />
            <span className="text-sm font-semibold text-primary">{BRAND.taglineAr}</span>
            <span className="text-xs text-muted-foreground">{teacherDisplayName}</span>
          </Link>
          <h1 className="mb-2 text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-muted-foreground">
            أدخل بيانات حسابك للوصول للمنصة
          </p>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            الوصول الكامل للدروس والملفات متاح للمشتركين فقط. إذا لم يكن لديك اشتراك،{' '}
            <Link href="/subscribe" className="font-medium text-primary hover:underline">
              اطلب الاشتراك الآن
            </Link>
          </AlertDescription>
        </Alert>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            سجّل الآن
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          تحتاج اشتراكاً؟{' '}
          <Link href="/subscribe" className="font-medium text-primary hover:underline">
            طلب الاشتراك
          </Link>
        </p>
      </div>
    </div>
  )
}
