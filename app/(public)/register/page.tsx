import type { Metadata } from 'next'
import Link from 'next/link'

import { RegisterForm } from './register-form'
import { BrandMark } from '@/components/brand/brand-lockup'
import { BRAND } from '@/lib/config'

export const metadata: Metadata = {
  title: 'إنشاء حساب',
  description: `إنشاء حساب طالب جديد على ${BRAND.taglineAr}`,
}

export default function RegisterPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex flex-col items-center gap-2">
            <BrandMark size={56} />
            <span className="text-sm font-semibold text-primary">{BRAND.taglineAr}</span>
            <span className="text-xs text-muted-foreground">{BRAND.teacherAr}</span>
          </Link>
          <h1 className="mb-2 text-2xl font-bold">إنشاء حساب</h1>
          <p className="text-muted-foreground">
            إنشاء حساب مجاني كطالب. الاشتراك المدفوع أو التفعيل الكامل يكون لاحقاً بعد موافقة المعلِّم.
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  )
}
