"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function RootError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-foreground">حدث خطأ في التطبيق</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        يرجى تحديث الصفحة أو المحاولة لاحقاً.
      </p>
      <Button type="button" onClick={() => reset()}>
        إعادة المحاولة
      </Button>
    </div>
  )
}
