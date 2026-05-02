"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function StudentGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold text-foreground">تعذر تحميل هذه الصفحة</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        حدث خطأ غير متوقع. يمكنك المحاولة مرة أخرى.
      </p>
      <Button type="button" onClick={() => reset()}>
        إعادة المحاولة
      </Button>
    </div>
  )
}
