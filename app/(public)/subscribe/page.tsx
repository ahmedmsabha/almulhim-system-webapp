import type { Metadata } from 'next'
import Link from 'next/link'
import { SubscribeForm } from './subscribe-form'
import { CheckCircle, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { samplePlans } from '@/lib/sample-data'
import { APP_METADATA, BRAND, CURRENCY, PROGRAM } from '@/lib/config'
import { BrandMark } from '@/components/brand/brand-lockup'

export const metadata: Metadata = {
  title: 'طلب الاشتراك',
  description: APP_METADATA.description,
}

export default function SubscribePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <Link href="/" className="mb-4 inline-flex flex-col items-center gap-2">
            <BrandMark size={56} />
            <span className="text-sm font-semibold text-primary">{BRAND.taglineAr}</span>
            <span className="text-xs text-muted-foreground">{BRAND.teacherAr}</span>
          </Link>
          <h1 className="mb-2 text-2xl font-bold md:text-3xl">طلب الاشتراك</h1>
          <p className="text-muted-foreground">
            {PROGRAM.shortLabelAr} — اختر الباقة المناسبة وأرسل طلبك، سنتواصل معك قريباً
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {samplePlans.map((plan, index) => (
            <Card
              key={plan.id}
              className={
                index === 1
                  ? 'relative border-primary shadow-lg'
                  : ''
              }
            >
              {index === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  الأكثر شعبية
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground"> {CURRENCY.labelAr}</span>
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>جميع الدروس المصورة</span>
                  </li>
                  <li className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>جميع ملفات PDF</span>
                  </li>
                  <li className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>تحميل للمشاهدة بدون إنترنت</span>
                  </li>
                  <li className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>تواصل مباشر مع المدرس</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Subscribe Form */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">أرسل طلب الاشتراك</h2>
            <SubscribeForm />
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">أو تواصل معنا مباشرة</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-success/10">
                    <Phone className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">واتساب</h3>
                    <p className="mb-2 text-2xl font-bold text-primary" dir="ltr">
                      01012345678
                    </p>
                    <p className="text-sm text-muted-foreground">
                      تواصل معنا عبر واتساب للاستفسار عن الباقات وتفعيل الاشتراك
                    </p>
                  </div>
                </div>
                <hr className="my-6" />
                <div>
                  <h3 className="mb-3 font-semibold">خطوات التفعيل:</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        1
                      </span>
                      <span>أرسل طلب الاشتراك عبر النموذج أو واتساب</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        2
                      </span>
                      <span>سنتواصل معك لتأكيد البيانات وتحديد طريقة الدفع</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        3
                      </span>
                      <span>بعد الدفع، سيتم تفعيل حسابك وإرسال بيانات الدخول</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        4
                      </span>
                      <span>سجل دخولك وابدأ رحلة التعلم!</span>
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
