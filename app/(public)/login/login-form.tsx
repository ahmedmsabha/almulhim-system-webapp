'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { resolvePostLoginDestination } from '@/actions/auth'
import { syncStudentDeviceBinding } from '@/actions/device-binding'
import { getOrCreateDeviceToken } from '@/lib/client/device-token-storage'

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })

      if (error) {
        toast.error(error.message || 'فشل تسجيل الدخول.')
        return
      }

      const dest = await resolvePostLoginDestination()
      if (!dest.success) {
        toast.error(dest.error)
        return
      }

      if (dest.data === '/student') {
        const device = await syncStudentDeviceBinding(getOrCreateDeviceToken())
        if (!device.success) {
          await supabase.auth.signOut()
          toast.error(device.error)
          return
        }
      }

      toast.success('تم تسجيل الدخول بنجاح')
      router.refresh()
      router.push(dest.data)
    } catch {
      toast.error('فشل تسجيل الدخول. تأكد من البريد وكلمة المرور.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pr-10"
                required
                disabled={isLoading}
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">كلمة المرور</Label>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={() => toast.info('تواصل مع المدرس لاستعادة كلمة المرور')}
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                </span>
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
