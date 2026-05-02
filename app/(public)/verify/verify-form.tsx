'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

import { verifyOtpAction } from '@/actions/authActions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { VerifyOtpSchema } from '@/lib/validators/register'

function isNextRedirectBoundaryError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    String((error as { digest: string }).digest).startsWith('NEXT_REDIRECT')
  )
}

type VerifyFormProps = {
  emailFromQuery: string
}

export function VerifyEmailForm({ emailFromQuery }: VerifyFormProps) {
  const [email, setEmail] = useState(emailFromQuery)
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setEmail(emailFromQuery)
  }, [emailFromQuery])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    const parsed = VerifyOtpSchema.safeParse({ email: trimmedEmail, token: token.trim() })
    if (!parsed.success) {
      toast.error('أدخل بريداً صالحاً والرمز المكوّن من 6 أرقام المرسل إلى بريدك.')
      return
    }

    setIsLoading(true)
    try {
      const result = await verifyOtpAction(parsed.data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
    } catch (e) {
      if (isNextRedirectBoundaryError(e)) {
        return
      }
      toast.error('تعذّر التحقق من الرمز.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <Alert className="border-primary/20 bg-primary/5">
          <Mail className="text-primary" aria-hidden />
          <AlertTitle className="text-foreground">استخدم الرابط في البريد أولاً</AlertTitle>
          <AlertDescription>
            رسائل Supabase الافتراضية ترسل زراً أو رابط تأكيداً وليس رمزاً من الأرقام. بعد الضغط على الرابط يُفعَّل
            حسابك تلقائياً ويُفتح لك الدخول إلى المنصّة.
          </AlertDescription>
        </Alert>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-card px-2 text-muted-foreground">أو إذا وصلك رمز من 6 أرقام</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-email">البريد الإلكتروني</Label>
            <Input
              id="verify-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!emailFromQuery || isLoading}
              required
              dir="ltr"
              className={emailFromQuery ? 'bg-muted/50' : undefined}
            />
            {emailFromQuery ?
              <p className="text-xs text-muted-foreground">
                لتغيير البريد،{' '}
                <Link href="/register" className="text-primary hover:underline">
                  ارجع إلى التسجيل
                </Link>
              </p>
            : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otp">رمز التحقق (6 أرقام) — إن وُجد في الرسالة</Label>
            <Input
              id="otp"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="••••••"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              disabled={isLoading}
              dir="ltr"
              className="text-center font-mono text-lg tracking-[0.35em]"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ?
              <>
                <Spinner className="h-4 w-4" />
                <span>جاري التحقق…</span>
              </>
            : (
              'تأكيد والدخول'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          لم يعمل الرابط أو لم يصلك شيء؟ راجع مجلد الرسائل غير المرغوبة، وتأكّد في لوحة Supabase أن عنوان موقعك مضاف ضمن{' '}
          <span className="whitespace-nowrap">Redirect URLs</span>. يمكنك أيضاً{' '}
          <Link href="/login" className="text-primary hover:underline">
            تجربة تسجيل الدخول
          </Link>{' '}
          إن كان حسابك أصبح مفعّلاً.
        </p>
      </CardContent>
    </Card>
  )
}
