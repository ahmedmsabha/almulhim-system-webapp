import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Play,
  FileText,
  Bell,
  Download,
  Shield,
  Clock,
  Users,
  CheckCircle,
  ArrowLeft,
  Smartphone,
} from 'lucide-react'
import { sampleLessons } from '@/lib/sample-data'
import { BRAND } from '@/lib/config'
import { BrandMark } from '@/components/brand/brand-lockup'

// Get preview lessons for the landing page
const previewLessons = sampleLessons.filter((lesson) => lesson.is_preview)

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} دقيقة`
}

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground md:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex flex-col items-center gap-3">
              <BrandMark size={88} className="ring-2 ring-primary-foreground/25 shadow-lg" />
              <p className="text-base font-semibold text-primary-foreground/95">{BRAND.taglineAr}</p>
              <p className="text-sm text-primary-foreground/85">{BRAND.teacherAr}</p>
            </div>
            <h1 className="mb-6 text-3xl font-bold leading-tight md:text-5xl text-balance">
              تعلم الفيزياء بأسلوب مبسط ومتميز
            </h1>
            <p className="mb-8 text-lg opacity-90 md:text-xl leading-relaxed text-pretty">
              منصة تعليمية متكاملة للثانوية العامة والتوجيهي مع {BRAND.teacherAr}. دروس مصورة عالية
              الجودة، ملخصات شاملة، وتمارين محلولة خطوة بخطوة.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
                <Link href="/subscribe">
                  <span>ابدأ الآن</span>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
              >
                <Link href="#preview">
                  <Play className="h-4 w-4" />
                  <span>شاهد درس مجاني</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="border-b bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            <div>
              <p className="text-3xl font-bold text-primary">+500</p>
              <p className="text-sm text-muted-foreground">طالب مشترك</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">+45</p>
              <p className="text-sm text-muted-foreground">درس مصور</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">+30</p>
              <p className="text-sm text-muted-foreground">ملف PDF</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">15</p>
              <p className="text-sm text-muted-foreground">سنة خبرة</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              كل ما تحتاجه للتفوق في الفيزياء
            </h2>
            <p className="text-muted-foreground">
              منصة متكاملة صممت خصيصاً لمساعدتك على فهم الفيزياء وتحقيق أعلى الدرجات
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">دروس مصورة عالية الجودة</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  فيديوهات شرح مفصلة لجميع وحدات المنهج مع أمثلة تطبيقية وحل مسائل متنوعة
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">ملخصات وتمارين PDF</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ملخصات شاملة وتمارين محلولة وامتحانات تجريبية قابلة للتحميل والطباعة
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">تحميل للمشاهدة بدون إنترنت</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  حمّل الدروس والملفات على جهازك وادرس في أي وقت حتى بدون اتصال بالإنترنت
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">إشعارات ومتابعة</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  تابع آخر الدروس والإعلانات وتواصل مع المدرس مباشرة عبر الرسائل
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">محتوى محمي وآمن</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  نظام حماية متقدم لضمان وصول المشتركين فقط للمحتوى الكامل
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">يعمل على جميع الأجهزة</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  تصميم متجاوب يعمل بسلاسة على الموبايل والتابلت والكمبيوتر
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Preview Lessons Section */}
      <section id="preview" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              جرّب قبل الاشتراك
            </h2>
            <p className="text-muted-foreground">
              شاهد دروس مجانية لتتعرف على أسلوب الشرح وجودة المحتوى
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {previewLessons.map((lesson) => (
              <Card key={lesson.id} className="overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  {lesson.thumbnail_url ? (
                    <img
                      src={lesson.thumbnail_url}
                      alt={lesson.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                    <div className="rounded-full bg-white/90 p-4">
                      <Play className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <span className="absolute right-2 top-2 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                    مجاني
                  </span>
                  <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                    {formatDuration(lesson.duration)}
                  </span>
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-2 font-semibold">{lesson.title}</h3>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {lesson.description}
                  </p>
                  <Button className="w-full" variant="outline">
                    <Play className="h-4 w-4" />
                    <span>مشاهدة الدرس</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="mb-4 text-muted-foreground">
              هل أعجبك المحتوى؟ اشترك الآن للوصول لجميع الدروس والملفات
            </p>
            <Button size="lg" asChild>
              <Link href="/subscribe">
                <span>طلب الاشتراك</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">كيف تبدأ؟</h2>
            <p className="text-muted-foreground">
              ثلاث خطوات بسيطة للانضمام للمنصة والبدء في التعلم
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mb-2 font-semibold">أرسل طلب اشتراك</h3>
              <p className="text-sm text-muted-foreground">
                املأ نموذج طلب الاشتراك ببياناتك الأساسية
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="mb-2 font-semibold">تواصل مع المدرس</h3>
              <p className="text-sm text-muted-foreground">
                سيتم التواصل معك لتفعيل الاشتراك وتحديد الباقة المناسبة
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="mb-2 font-semibold">ابدأ التعلم</h3>
              <p className="text-sm text-muted-foreground">
                سجل دخولك واستمتع بالوصول الكامل لجميع الدروس والملفات
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">الأسئلة الشائعة</h2>
            <p className="text-muted-foreground">إجابات على أكثر الأسئلة شيوعاً</p>
          </div>
          <div className="mx-auto max-w-2xl">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>ما هي باقات الاشتراك المتاحة؟</AccordionTrigger>
                <AccordionContent>
                  نوفر ثلاث باقات: الباقة الشهرية، باقة الترم (4 أشهر)، والباقة السنوية.
                  كل الباقات تمنحك وصولاً كاملاً لجميع الدروس والملفات. الباقات الأطول
                  توفر خصومات أكبر.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>هل يمكنني تحميل الدروس؟</AccordionTrigger>
                <AccordionContent>
                  نعم، يمكنك تحميل الدروس والملفات على جهازك للمشاهدة بدون اتصال
                  بالإنترنت. هذه الميزة مفيدة جداً للطلاب الذين يعانون من ضعف الإنترنت.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>كيف أتواصل مع المدرس؟</AccordionTrigger>
                <AccordionContent>
                  يمكنك التواصل مع المدرس عبر نظام الرسائل داخل المنصة، أو عبر واتساب
                  للاستفسارات العاجلة. المدرس متاح للرد من 9 صباحاً حتى 9 مساءً.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>ماذا يحدث عند انتهاء اشتراكي؟</AccordionTrigger>
                <AccordionContent>
                  عند انتهاء الاشتراك، ستحتفظ بالملفات المحملة على جهازك، لكن لن تتمكن
                  من الوصول للمحتوى الجديد أو مشاهدة الدروس عبر الإنترنت حتى تجدد
                  اشتراكك.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>هل المنصة متاحة على الموبايل؟</AccordionTrigger>
                <AccordionContent>
                  نعم، المنصة تعمل بشكل ممتاز على جميع الأجهزة: الموبايل، التابلت،
                  والكمبيوتر. التصميم متجاوب ويتكيف مع حجم شاشتك تلقائياً.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl">
            جاهز لبدء رحلة التفوق في الفيزياء؟
          </h2>
          <p className="mx-auto mb-8 max-w-xl opacity-90">
            انضم لأكثر من 500 طالب يحققون نتائج ممتازة مع {BRAND.taglineAr}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/subscribe">
                <span>طلب الاشتراك الآن</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/login">لديك حساب؟ سجل دخولك</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
