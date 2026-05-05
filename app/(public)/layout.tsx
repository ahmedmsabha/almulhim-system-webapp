import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { BrandLockup } from '@/components/brand/brand-lockup'
import { BRAND } from '@/lib/config'
import type { MergedTeacherContact } from '@/lib/db/queries/site-settings'
import { getPublicSiteSnapshot } from '@/lib/server/public-site-snapshot'

/** الصفحات العامة — إعادة توليد كل ساعة لتقليل ضغط قاعدة البيانات مع بيانات حديثة كافية */
export const revalidate = 3600

function Header({ teacherDisplayName }: { teacherDisplayName: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <BrandLockup teacherDisplayName={teacherDisplayName} />

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            المميزات
          </Link>
          <Link
            href="/#preview"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            دروس مجانية
          </Link>
          <Link
            href="/#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            الأسئلة الشائعة
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" asChild>
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
          <Button asChild>
            <Link href="/subscribe">طلب الاشتراك</Link>
          </Button>
        </div>

        {/* Mobile: بدون Radix لتفادي تعارض الترطيب (hydration) */}
        <details className="relative z-50 md:hidden">
          <summary
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted [&::-webkit-details-marker]:hidden"
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </summary>
          <div
            className="absolute end-0 top-full z-50 mt-2 flex w-[min(280px,calc(100vw-2rem))] flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-lg"
            role="navigation"
            aria-label="قائمة الجوال"
          >
            <div className="flex flex-col gap-1 border-b border-border pb-3">
              <Link
                href="/#features"
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                المميزات
              </Link>
              <Link
                href="/#preview"
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                دروس مجانية
              </Link>
              <Link
                href="/#faq"
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                الأسئلة الشائعة
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild className="w-full">
                <Link href="/subscribe">طلب الاشتراك</Link>
              </Button>
            </div>
          </div>
        </details>
      </div>
    </header>
  )
}

function Footer({
  teacherDisplayName,
  teacherEmail,
  contact,
}: {
  teacherDisplayName: string
  teacherEmail: string | null
  contact: MergedTeacherContact
}) {
  const hasContact =
    Boolean(contact.telegramUrl) || Boolean(contact.whatsappUrl) || Boolean(teacherEmail)

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <BrandLockup variant="compact" teacherDisplayName={teacherDisplayName} />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {BRAND.taglineAr} — منصة تعليمية للمرحلة الثانوية والتوجيهي مع {teacherDisplayName}. شرح
              مبسّط وتمارين محلولة وامتحانات تجريبية.
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-semibold">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#features" className="hover:text-foreground">
                  مميزات المنصة
                </Link>
              </li>
              <li>
                <Link href="/#preview" className="hover:text-foreground">
                  دروس تجريبية
                </Link>
              </li>
              <li>
                <Link href="/subscribe" className="hover:text-foreground">
                  طلب الاشتراك
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  تسجيل الدخول
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-semibold">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {contact.whatsappUrl ?
                <li>
                  <a
                    href={contact.whatsappUrl}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    واتساب
                  </a>
                </li>
              : null}
              {contact.telegramUrl ?
                <li>
                  <a
                    href={contact.telegramUrl}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    تيليغرام
                  </a>
                </li>
              : null}
              {teacherEmail ?
                <li>
                  <a href={`mailto:${teacherEmail}`} className="text-primary hover:underline">
                    البريد: {teacherEmail}
                  </a>
                </li>
              : null}
              {!hasContact ?
                <li>
                  <Link href="/subscribe" className="text-primary hover:underline">
                    تواصل مع المعلِّم عبر صفحة طلب الاشتراك أو من داخل المنصة بعد التسجيل
                  </Link>
                </li>
              : null}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} {BRAND.nameAr} — {BRAND.taglineAr}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const snapshot = await getPublicSiteSnapshot()

  return (
    <div className="flex min-h-screen flex-col">
      <Header teacherDisplayName={snapshot.teacherDisplayName} />
      <main className="flex-1">{children}</main>
      <Footer
        teacherDisplayName={snapshot.teacherDisplayName}
        teacherEmail={snapshot.teacherEmail}
        contact={snapshot.contact}
      />
    </div>
  )
}
