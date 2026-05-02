'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { User, Phone, GraduationCap, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { submitSubscriptionLead } from '@/actions/subscribe-lead'

const PLAN_NONE = '__none__'

export function SubscribeForm({
  grades,
  planChoices,
}: {
  grades: string[]
  planChoices: { id: string; name: string }[]
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    grade: '',
    planId: PLAN_NONE,
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await submitSubscriptionLead({
        studentName: formData.studentName,
        phone: formData.phone,
        grade: formData.grade,
        planId: formData.planId === PLAN_NONE ? null : formData.planId,
        notes: formData.notes || null,
      })

      if (!res.success) {
        toast.error(res.error)
        return
      }

      setIsSubmitted(true)
      toast.success('تم إرسال طلبك — سيتابع المعلِّم التواصل معك.')
    } catch {
      toast.error('حدث خطأ أثناء الإرسال.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="border-chart-2/30 bg-muted/20">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-chart-2/15">
            <CheckCircle className="h-8 w-8 text-chart-2" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">تم استلام الطلب</h3>
          <p className="text-muted-foreground">
            راجع أيضاً التواصل المباشر (واتساب / تيليغرام) لتسريع الردّ إن أردت.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentName">اسم الطالب</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="studentName"
                placeholder="الاسم الكامل"
                value={formData.studentName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    studentName: e.target.value,
                  })
                }
                className="pr-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              رقم الهاتف تيليغرام
            </Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="00970/00972/59xxxxxxx"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value,
                  })
                }
                className="pr-10"
                required
                disabled={isLoading}
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">الصف الدراسي</Label>
            <Select
              value={formData.grade}
              onValueChange={(value) =>
                setFormData({ ...formData, grade: value })
              }
              required
              disabled={isLoading}
            >
              <SelectTrigger id="grade">
                <SelectValue placeholder="اختر الصف" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planInterest">
              الباقة التي تهتم بها (اختياري)
            </Label>
            <Select
              value={formData.planId}
              onValueChange={(value) =>
                setFormData({ ...formData, planId: value })
              }
              disabled={
                isLoading || planChoices.length === 0
              }
            >
              <SelectTrigger id="planInterest">
                <SelectValue
                  placeholder={
                    planChoices.length
                      ? 'اختر باقة'
                      : 'لا توجد باقات معروضة'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLAN_NONE}>
                  لم أقرّر بعد
                </SelectItem>
                {planChoices.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              placeholder="وقت مناسب للاتصال، استفسار عن الباقات..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              rows={3}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2 min-h-11"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال الطلب
              </>
            )}
          </Button>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <GraduationCap
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            الإرسال لا يفعّل الحساب تلقائياً؛ التفعيل يتم
            بعد تواصل المعلِّم وتأكيد الاشتراك.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
