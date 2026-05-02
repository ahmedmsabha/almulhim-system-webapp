'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SubscriptionBadge } from '@/components/student/profile/subscription-badge'
import { TeacherContactButtons } from '@/components/student/teacher-contact-buttons'
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Shield,
  Download,
  AlertCircle,
  LogOut,
} from 'lucide-react'
import { signOutAction } from '@/actions/auth'
import type { Profile, StudentSubscriptionUiStatus, Subscription } from '@/types'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function subscriptionRemainingPercent(startIso: string, endIso: string): number {
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endIso).getTime()
  const nowMs = Date.now()
  const total = endMs - startMs
  if (total <= 0) return 0
  const remainingMs = Math.max(0, endMs - Math.max(nowMs, startMs))
  return Math.round(Math.min(100, Math.max(0, (remainingMs / total) * 100)))
}

export function StudentProfileView({
  profile,
  subscription,
  subscriptionStatus,
}: {
  profile: Profile
  subscription: Subscription | null
  subscriptionStatus: StudentSubscriptionUiStatus
}) {
  const subscriptionBadgeDisplay =
    subscription?.status === 'expiring_soon' ? 'expiring_soon' : subscriptionStatus

  const daysRemaining = subscription?.end_date ? getDaysRemaining(subscription.end_date) : 0
  const remainingPct =
    subscription ?
      subscriptionRemainingPercent(subscription.start_date, subscription.end_date)
    : 0
  const planName = subscription?.plan_name?.trim() || '—'

  return (
    <div className="space-y-10">
      <header>
        <h1 className="page-title-student">الملف الشخصي</h1>
        <p className="page-subtitle-student">بياناتك واشتراكك</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/70 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-bold">معلومات الحساب</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
              <Avatar className="size-24 rounded-3xl shadow-md ring-4 ring-muted/70">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl">{profile.full_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex gap-3">
                    <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <User className="size-5 shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">الاسم</p>
                      <p className="mt-1 text-base font-semibold">{profile.full_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Mail className="size-5 shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">البريد</p>
                      <p className="mt-1 break-all font-semibold leading-snug" dir="ltr">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Phone className="size-5 shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">الجوال</p>
                      <p className="mt-1 font-semibold tracking-wide" dir="ltr">
                        {profile.phone || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <GraduationCap className="size-5 shrink-0" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">الصف</p>
                      <p className="mt-1 text-base font-semibold">{profile.grade || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex-row items-start justify-between gap-2 border-b bg-muted/20">
            <CardTitle className="text-lg font-bold leading-tight">الاشتراك</CardTitle>
            <SubscriptionBadge status={subscriptionBadgeDisplay} />
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">الباقة</p>
              <p className="mt-1 text-lg font-bold">{planName}</p>
            </div>
            {subscription ?
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">البدء</p>
                  <p className="mt-1 font-medium">{formatDate(subscription.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الانتهاء</p>
                  <p className="mt-1 font-medium">{formatDate(subscription.end_date)}</p>
                </div>
              </div>
            : (
              <p className="text-sm text-muted-foreground">لا يوجد اشتراك مفعّل حالياً.</p>
            )}

            {subscription?.status === 'active' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">متبقي من المدة</span>
                  <span className="font-semibold tabular-nums">{daysRemaining} يومًا</span>
                </div>
                <Progress value={remainingPct} className="h-2.5 rounded-full bg-muted" />
              </div>
            )}
            {(subscription?.status === 'expiring_soon' ||
              subscription?.status === 'expired' ||
              subscriptionStatus === 'none') && (
              <TeacherContactButtons layout="stack" className="w-full pt-1" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/70 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Download className="size-5 text-muted-foreground" aria-hidden />
              المحتوى المحمّل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              لم تقم بتحميل أي محتوى على هذا الجهاز بعد.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/70 shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Shield className="size-5 text-muted-foreground" />
              الأمان والخصوصية
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-xl bg-muted/40 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-foreground">توضيح مختصر:</p>
                  <ul className="list-inside list-disc space-y-1.5 marker:text-muted-foreground">
                    <li>المحتوى لاستخدامك الشخصي داخل المنصّة فقط.</li>
                    <li>يُمنع تصوير الشاشة، التسجيل، أو مشاركة الروابط.</li>
                    <li>جميع الوصول مسجَّل وفق سياسات المعلِّم والمنصة.</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-10" />

      <div className="flex justify-center">
        <form action={signOutAction} className="w-full max-w-md">
          <Button
            variant="destructive"
            size="lg"
            className="min-h-11 w-full shadow-sm gap-2"
            type="submit"
          >
            <LogOut className="size-5 shrink-0" />
            تسجيل الخروج
          </Button>
        </form>
      </div>
    </div>
  )
}
