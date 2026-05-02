"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PublicGroupError({
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
      <h2 className="text-lg font-semibold text-foreground">حدث خطأ</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        لم نتمكن من إكمال الطلب. يمكنك المحاولة أو العودة للرئيسية.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          إعادة المحاولة
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">الرئيسية</Link>
        </Button>
      </div>
    </div>
  )
}
