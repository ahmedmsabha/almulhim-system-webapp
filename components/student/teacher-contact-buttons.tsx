'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TEACHER_CONTACT } from '@/lib/config'
import { cn } from '@/lib/utils'

/** أزرار تيليغرام وواتساب للتواصل مع المعلِّم للتفعيل أو التجديد. */
export function TeacherContactButtons({
  className,
  layout = 'row',
}: {
  className?: string
  layout?: 'row' | 'stack'
}) {
  const { telegramUrl, whatsappUrl } = TEACHER_CONTACT

  return (
    <div
      className={cn(
        'flex flex-wrap gap-3',
        layout === 'stack' && 'flex-col',
        className
      )}
    >
      {telegramUrl ?
        <Button variant="outline" className="min-h-11 gap-2 gap-x-3" asChild>
          <Link href={telegramUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            تيليغرام
          </Link>
        </Button>
      : null}
      {whatsappUrl ?
        <Button className="min-h-11 gap-2 gap-x-3" asChild>
          <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            واتساب
          </Link>
        </Button>
      : null}
      {!telegramUrl && !whatsappUrl ?
        <Button variant="secondary" className="min-h-11" asChild>
          <Link href="/subscribe">طلب اشتراك / تفعيل</Link>
        </Button>
      : null}
    </div>
  )
}
