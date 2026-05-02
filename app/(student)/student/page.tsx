import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LessonCard } from '@/components/student/lessons/lesson-card'
import { PDFCard } from '@/components/student/materials/pdf-card'
import { AnnouncementCard } from '@/components/student/announcements/announcement-card'
import { SubscriptionBadge } from '@/components/student/profile/subscription-badge'
import { TeacherContactButtons } from '@/components/student/teacher-contact-buttons'
import {
  PlayCircle,
  FileText,
  Bell,
  ArrowRight,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireStudentLayoutContext } from '@/lib/server/layout-gates'
import { loadStudentHomeData } from '@/lib/server/student-home-data'
import { BRAND } from '@/lib/config'

export const metadata: Metadata = {
  title: 'لوحة التحكم',
  description: `لوحة تحكم الطالب — ${BRAND.taglineAr}`,
}

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

export default async function StudentDashboard() {
  const { profile, subscription, subscriptionStatus } = await requireStudentLayoutContext()

  if (subscriptionStatus === 'none') {
    const studentFirstName = profile.full_name.split(' ')[0]
    return (
      <div className="flex min-h-[min(32rem,calc(100vh-9rem))] flex-col items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg border-primary/25 bg-gradient-to-br from-primary/[0.06] via-card to-background shadow-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-7" aria-hidden />
            </div>
            <CardTitle className="text-xl sm:text-2xl">حسابك جاهز ✓</CardTitle>
            <CardDescription className="text-base text-foreground/90">
              مرحباً {studentFirstName} — تواصل مع الأستاذ لتفعيل اشتراكك والوصول للدروس والملفات.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-8">
            <TeacherContactButtons layout="stack" className="w-full max-w-xs justify-stretch" />
            <p className="text-center text-sm text-muted-foreground">
              بعد تفعيل الاشتراك ستظهر لك لوحة التحكم والمحتوى تلقائياً.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) redirect('/login')

  const home = await loadStudentHomeData(session.access_token, subscription)
  const {
    lessonsWithProgress,
    materials,
    announcements,
    watchProgress,
  } = home

  const inProgressLessons = lessonsWithProgress.filter(
    (lesson) =>
      lesson.watch_progress &&
      lesson.watch_progress.progress > 0 &&
      !lesson.watch_progress.completed
  )

  const latestLessons = lessonsWithProgress.filter((l) => !l.is_preview).slice(0, 4)
  const latestMaterials = materials.slice(0, 3)
  const announcementsPreview = announcements.slice(0, 3)
  const completedLessons = watchProgress.filter((wp) => wp.completed).length
  const totalLessons = lessonsWithProgress.filter((l) => !l.is_preview).length
  const overallProgress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const daysRemaining = subscription?.end_date ? getDaysRemaining(subscription.end_date) : 0
  const studentFirstName = profile.full_name.split(' ')[0]

  const subscriptionHeroBadgeStatus =
    subscription?.status === 'expiring_soon' ? 'expiring_soon' : subscriptionStatus

  return (
    <div className="space-y-8">
      {subscriptionStatus === 'expired' && (
        <Card className="border-destructive/30 bg-destructive/[0.06] shadow-none">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">انتهى اشتراكك</p>
              <p className="mt-1 text-sm text-muted-foreground">
                تواصل مع الأستاذ لتجديد الاشتراك واستعادة الوصول الكامل للمحتوى.
              </p>
            </div>
            <TeacherContactButtons className="shrink-0 sm:justify-end" />
          </CardContent>
        </Card>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-accent/[0.04] px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div>
              <p className="page-title-student mb-1 text-xl sm:text-2xl">مرحباً، {studentFirstName}</p>
              <p className="page-subtitle-student mt-0 text-sm sm:text-[15px]">
                متابعة تعلُّمك اليوم • {profile.grade || '—'}
              </p>
            </div>
          </div>
          <SubscriptionBadge
            status={subscriptionHeroBadgeStatus}
            className="self-start sm:self-center"
          />
        </div>
      </div>

      {subscription?.status === 'expiring_soon' && subscription?.end_date && (
        <Card className="border-warning/35 bg-warning/[0.06] shadow-none">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15">
                <Clock className="size-5 text-warning" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-foreground">اشتراكك ينتهي قريباً</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  متبقي {daysRemaining} يومًا — تنتهي الصلاحية في {formatDate(subscription.end_date)}
                </p>
              </div>
            </div>
            <Button size="sm" asChild className="min-h-11 shrink-0 sm:min-h-9">
              <Link href="/student/profile">تجديد الاشتراك</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {inProgressLessons.length > 0 && (
        <section aria-labelledby="dash-continue-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 id="dash-continue-heading" className="text-xl font-bold tracking-tight text-foreground">
                متابعة المشاهدة
              </h2>
              <p className="mt-1 text-sm text-muted-foreground"> أكمل الدروس التي بدأتها </p>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-card/80 p-3 shadow-sm backdrop-blur-sm sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inProgressLessons.slice(0, 3).map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  variant="compact"
                  showDownload={false}
                  className="border border-border/50 shadow-none"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <Card className="border-border/50 bg-muted/20 shadow-none">
        <CardContent className="p-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <TrendingUp className="size-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">تقدمك الإجمالي</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{overallProgress}%</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <PlayCircle className="size-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="font-semibold tabular-nums text-foreground">{completedLessons}</span>
                    <span className="mx-1">من</span>
                    <span className="tabular-nums">{totalLessons}</span>
                    <span className="ms-1">درسًا</span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4 shrink-0 text-accent" aria-hidden />
                  <span>
                    <span className="font-semibold tabular-nums text-foreground">{materials.length}</span>
                    <span className="ms-1">ملف PDF</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
          <Progress value={overallProgress} className="mt-6 h-2.5 w-full shrink-0 rounded-full bg-muted sm:mt-4 sm:w-56 sm:self-center lg:w-72" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">أحدث الدروس</h2>
              <p className="mt-1 text-sm text-muted-foreground">دروس مضافة أو محدَّثة</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-primary hover:text-primary min-h-11 sm:min-h-9">
              <Link href="/student/lessons" className="inline-flex items-center gap-1.5 font-medium">
                <span>عرض الكل</span>
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {latestLessons.length > 0 ?
              latestLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
            : (
              <p className="text-sm text-muted-foreground">لا توجد دروس كاملة بعد — قد تظهر دروس معاينة فقط حتى يفعّل المدرس اشتراكك.</p>
            )}
          </div>
        </section>

        <aside className="space-y-5 lg:col-span-2">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <Bell className="size-5 text-muted-foreground" aria-hidden />
                    الإعلانات
                  </CardTitle>
                  <CardDescription className="mt-1">مواعيد وتحديثات مهمة</CardDescription>
                </div>
                <Button variant="link" size="sm" className="h-auto shrink-0 p-0 font-semibold" asChild>
                  <Link href="/student/announcements">عرض الكل</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {announcementsPreview.length > 0 ?
                announcementsPreview.map((announcement) => (
                  <AnnouncementCard key={announcement.id} announcement={announcement} variant="compact" />
                ))
              : (
                <p className="py-6 text-center text-sm text-muted-foreground">لا توجد إعلانات حالياً</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <FileText className="size-5 text-muted-foreground" aria-hidden />
                    ملفات سريعة
                  </CardTitle>
                  <CardDescription className="mt-1">ملخصات وتمارين</CardDescription>
                </div>
                <Button variant="link" size="sm" className="h-auto shrink-0 p-0 font-semibold" asChild>
                  <Link href="/student/materials">عرض الكل</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {latestMaterials.length > 0 ?
                latestMaterials.map((material) => (
                  <PDFCard key={material.id} material={material} variant="compact" showDownload={false} />
                ))
              : (
                <p className="py-6 text-center text-sm text-muted-foreground">لا توجد ملفات جديدة</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
