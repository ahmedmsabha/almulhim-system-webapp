import type { Metadata } from 'next'
import Link from 'next/link'

import { VerifyEmailForm } from './verify-form'
import { BrandMark } from '@/components/brand/brand-lockup'
import { BRAND } from '@/lib/config'

export const metadata: Metadata = {
  title: 'تأكيد البريد',
  description: `أكّد بريدك عبر الرابط في الرسالة أو برمز التحقق إن وُجد — ${BRAND.taglineAr}`,
}

type PageProps = {
  searchParams?: Promise<{ email?: string }>
}

export default async function VerifyPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  const emailFromQuery = resolved?.email?.trim() ?? ''

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex flex-col items-center gap-2">
            <BrandMark size={56} />
            <span className="text-sm font-semibold text-primary">{BRAND.taglineAr}</span>
          </Link>
          <h1 className="mb-2 text-2xl font-bold">تأكيد البريد الإلكتروني</h1>
          <p className="text-muted-foreground">
            افتح رسالة التأكيد واضغط الرابط أولاً. حقل الرمز يُستخدم فقط إذا ظهر لك في البريد رقم من 6 أرقام.
          </p>
        </div>

        <VerifyEmailForm emailFromQuery={emailFromQuery} />
      </div>
    </div>
  )
}
