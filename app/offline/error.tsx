"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function OfflinePageError({
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
      <h2 className="text-lg font-semibold">تعذر عرض صفحة وضع عدم الاتصال</h2>
      <Button type="button" variant="outline" onClick={() => reset()}>
        إعادة المحاولة
      </Button>
    </div>
  )
}
