import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from "lucide-react"

import { SubscribeForm } from "./subscribe-form"
import { BrandMark } from "@/components/brand/brand-lockup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { APP_METADATA, BRAND, CURRENCY, PROGRAM } from "@/lib/config"
import { loadSubscribePageData } from "@/lib/server/subscribe-page-data"

export const metadata: Metadata = {
  title: "طلب الاشتراك والتواصل",
  description: APP_METADATA.description,
}

function formatPrice(n: number): string {
  const whole = Number.isInteger(n) ? String(Math.round(n)) : String(n)
  return `${whole} ${CURRENCY.symbol}`
}

export default async function SubscribePage() {
  const { plans, setting, whatsappHref, telegramHref } = await loadSubscribePageData()

  const planChoices = plans.map((p) => ({ id: p.id, name: p.name }))

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/12 via-transparent to-transparent" />
      <div className="container relative mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="mb-10 flex flex-col items-center text-center">
          <Link href="/" className="mb-6 inline-flex flex-col items-center gap-2 transition-opacity hover:opacity-90">
            <BrandMark size={56} />
            <span className="text-sm font-semibold text-primary">{BRAND.taglineAr}</span>
            <span className="text-xs text-muted-foreground">{BRAND.teacherAr}</span>
          </Link>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            التفعيل والاشتراك عبر التواصل مع المعلِّم
          </div>
          <h1 className="mb-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            اشتراك المنصّة — {PROGRAM.shortLabelAr}
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
            الباقات والأسعار للاطلاع؛ لا يوجد دفع تلقائي داخل الموقع. اختر ما يناسبك ثم تواصل عبر واتساب أو
            تيليغرام أو أرسل النموذج، وسيتم تفعيل حسابك بعد التأكيد.
          </p>
          {setting.subscribe_page_note_ar ?
            <p className="mt-4 max-w-2xl rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
              {setting.subscribe_page_note_ar}
            </p>
          : null}
        </div>

        {/* خطط من قاعدة البيانات */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-xl font-semibold">الباقات المتاحة</h2>
          </div>
          {plans.length === 0 ?
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                لم تُعرَّف خطط اشتراك نشطة بعد. تواصل مع الإدارة أو حدّث البيانات من لوحة المعلِّم.
              </CardContent>
            </Card>
          : <div className="grid gap-5 md:grid-cols-3">
              {plans.map((plan, index) => (
                <Card
                  key={plan.id}
                  className={
                    index === 1 ?
                      "relative border-primary shadow-md shadow-primary/10"
                    : "border-border/80 shadow-sm"
                  }
                >
                  {index === 1 ?
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      غالباً الأنسب لفصل دراسي
                    </div>
                  : null}
                  <CardHeader className="pb-2 text-center">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.description ?
                      <CardDescription className="text-pretty">{plan.description}</CardDescription>
                    : null}
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0 text-center">
                    <p className="text-3xl font-bold tabular-nums text-foreground">
                      {formatPrice(plan.price)}
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        · {plan.duration_days} يوماً
                      </span>
                    </p>
                    <Separator />
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      {[
                        "دروس فيزياء مرئية وفق المنهاج",
                        "ملفات PDF ومراجع",
                        "تفعيل الحساب بعد التأكيد مع المعلِّم",
                      ].map((line) => (
                        <li key={line} className="flex items-start justify-start gap-2 text-right md:justify-center">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-chart-2" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        </section>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              التواصل المباشر
              <ArrowRight className="h-4 w-4 rotate-180 text-muted-foreground" aria-hidden />
            </h2>
            <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card to-muted/30">
              <CardContent className="space-y-6 p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  أسهل طريقة للاشتراك: راسِل المعلِّم على واتساب أو تيليغرام، واذكر الصف والباقة التي تناسبك.
                </p>
                <div className="flex flex-wrap gap-3">
                  {whatsappHref ?
                    <Button className="min-h-11 gap-2" asChild>
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        واتساب
                      </a>
                    </Button>
                  : null}
                  {telegramHref ?
                    <Button variant="outline" className="min-h-11 gap-2" asChild>
                      <a href={telegramHref} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        تيليغرام
                      </a>
                    </Button>
                  : null}
                  {!whatsappHref && !telegramHref ?
                    <p className="text-sm text-muted-foreground">
                      لم يُضبط رابط التواصل بعد. يمكن تعبئة النموذج أو العودة لاحقاً بعد ضبط الروابط من إعدادات
                      الموقع أو المتغيرات العامة.
                    </p>
                  : null}
                </div>
                <Separator />
                <div>
                  <h3 className="mb-3 font-semibold text-foreground">خطوات مختصرة</h3>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "تواصل أو أرسل الطلب مع ذكر الصف والباقة.",
                      "يتم تأكيد البيانات وإتمام الدفع خارج المنصّة كما يتفق الطرفان.",
                      "بعد التفعيل من الإدارة، تستلم بيانات الدخول وتتابع الدروس.",
                    ].map((step, i) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">نموذج طلب (اختياري)</h2>
            <SubscribeForm grades={setting.grades} planChoices={planChoices} />
          </section>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
