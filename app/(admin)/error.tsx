"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AdminGroupError({
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
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold text-foreground">خطأ في لوحة التحكم</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        حدث خطأ أثناء عرض هذه الصفحة.
      </p>
      <Button type="button" variant="outline" onClick={() => reset()}>
        إعادة المحاولة
      </Button>
    </div>
  )
}
