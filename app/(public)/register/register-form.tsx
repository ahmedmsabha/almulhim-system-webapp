'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { toast } from 'sonner'

import { signUpAction } from '@/actions/authActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BRAND } from '@/lib/config'
import { RegisterSchema } from '@/lib/validators/register'

export function RegisterForm() {
  const router = useRouter()
  const [tab, setTab] = useState('email')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  })
  const [phoneDraft, setPhoneDraft] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = RegisterSchema.safeParse(formData)
    if (!parsed.success) {
      toast.error('تحقق من الاسم والبريد وكلمة المرور (8 أحرف على الأقل).')
      return
    }

    setIsLoading(true)
    try {
      const result = await signUpAction(parsed.data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        'تحقق من بريدك واضغط رابط تأكيد الحساب في الرسالة. إذا وصلك رمز من 6 أرقام يمكنك إدخاله هنا أيضاً.'
      )
      router.push(`/verify?email=${encodeURIComponent(parsed.data.email.trim())}`)
    } catch {
      toast.error('تعذّر إنشاء الحساب. حاول مجدداً.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={tab} onValueChange={setTab} dir="rtl" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="email" className="min-h-10 text-sm">
              بالبريد الإلكتروني
            </TabsTrigger>
            <TabsTrigger value="phone" className="min-h-10 text-sm">
              برقم الهاتف
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">الاسم الكامل</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="full_name"
                    type="text"
                    autoComplete="name"
                    placeholder="الاسم كما يظهر للمعلِّم"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="pr-10"
                    required
                    minLength={2}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pr-10"
                    required
                    disabled={isLoading}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="8 أحرف على الأقل"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                    disabled={isLoading}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ?
                      <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                    <span className="sr-only">
                      {showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    </span>
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ?
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>جاري إنشاء الحساب…</span>
                  </>
                : 'إنشاء حساب'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="phone" className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-placeholder">رقم الجوال</Label>
              <Input
                id="phone-placeholder"
                type="tel"
                inputMode="tel"
                placeholder="+970 5xx xxx xxx"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                dir="ltr"
              />
            </div>
            <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-center text-sm text-muted-foreground">
              سيتوفر التسجيل برقم الهاتف قريباً
            </p>
            <Button type="button" className="w-full" disabled>
              تسجيل بالهاتف
            </Button>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          مسجّل مسبقاً؟{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          بإنشاء حساب تقبل شروط استخدام منصّة {BRAND.taglineAr}.
        </p>
      </CardContent>
    </Card>
  )
}
