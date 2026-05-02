"use client"

import { WifiOff, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-muted mx-auto flex items-center justify-center mb-6">
          <WifiOff className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          لا يوجد اتصال بالإنترنت
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          يبدو أنك غير متصل بالإنترنت حالياً. تحقق من اتصالك وحاول مرة أخرى.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              الصفحة الرئيسية
            </Link>
          </Button>
        </div>

        {/* Offline Features */}
        <div className="mt-12 p-6 bg-muted/50 rounded-2xl text-right">
          <h2 className="font-semibold text-foreground mb-3">
            المحتوى المتاح بدون إنترنت:
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />
              الدروس التي قمت بتحميلها مسبقاً
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />
              الملفات والملخصات المحفوظة
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />
              الإعلانات المحفوظة مؤخراً
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
