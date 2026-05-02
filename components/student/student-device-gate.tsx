"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { syncStudentDeviceBinding } from "@/actions/device-binding"
import { getOrCreateDeviceToken } from "@/lib/client/device-token-storage"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"

export function StudentDeviceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const token = getOrCreateDeviceToken()
      const r = await syncStudentDeviceBinding(token)
      if (cancelled) return

      if (!r.success) {
        toast.error(r.error)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.replace("/login")
        return
      }

      setReady(true)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Spinner className="h-8 w-8" />
        <p className="text-sm">جاري التحقق من الجهاز…</p>
      </div>
    )
  }

  return children
}
