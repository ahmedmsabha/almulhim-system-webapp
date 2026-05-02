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

const grades = [
  'الصف الأول الثانوي',
  'الصف الثاني الثانوي',
  'الصف الثالث الثانوي',
]

export function SubscribeForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    grade: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Implement actual form submission to Supabase
      // const supabase = createClient()
      // await supabase.from('subscription_requests').insert({
      //   student_name: formData.studentName,
      //   phone: formData.phone,
      //   grade: formData.grade,
      //   notes: formData.notes,
      // })

      // Simulate submission
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setIsSubmitted(true)
      toast.success('تم إرسال طلبك بنجاح!')
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">تم إرسال طلبك بنجاح!</h3>
          <p className="text-muted-foreground">
            سنتواصل معك قريباً على الرقم المسجل لإتمام عملية الاشتراك
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentName">اسم الطالب</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="studentName"
                placeholder="أدخل اسم الطالب الكامل"
                value={formData.studentName}
                onChange={(e) =>
                  setFormData({ ...formData, studentName: e.target.value })
                }
                className="pr-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف (واتساب)</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="01xxxxxxxxx"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
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
              onValueChange={(value) => setFormData({ ...formData, grade: value })}
              required
              disabled={isLoading}
            >
              <SelectTrigger id="grade">
                <SelectValue placeholder="اختر الصف الدراسي" />
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
            <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
            <Textarea
              id="notes"
              placeholder="أي ملاحظات أو استفسارات..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>جاري إرسال الطلب...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>إرسال طلب الاشتراك</span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
