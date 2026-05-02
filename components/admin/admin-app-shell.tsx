"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  Video,
  FileText,
  Megaphone,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ConnectionStatus } from "@/components/shared/layout/connection-status"
import { signOutAndClearAppCaches } from "@/lib/client/sign-out-client"
import type { Profile } from "@/types"

const adminNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "لوحة التحكم" },
  { href: "/admin/students", icon: Users, label: "إدارة الطلاب" },
  { href: "/admin/lessons", icon: Video, label: "إدارة الدروس" },
  { href: "/admin/materials", icon: FileText, label: "إدارة المواد" },
  { href: "/admin/announcements", icon: Megaphone, label: "الإعلانات" },
  { href: "/admin/messages", icon: MessageSquare, label: "الرسائل" },
  { href: "/admin/settings", icon: Settings, label: "الإعدادات" },
]

export function AdminAppShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initial = profile.full_name.trim()[0] ?? "ف"

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold text-primary">لوحة تحكم المعلم</h1>
        <div className="w-10" />
      </header>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-card border-l border-border transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">{initial}</span>
              </div>
              <div>
                <h2 className="font-bold text-foreground">{profile.full_name}</h2>
                <p className="text-xs text-muted-foreground">معلّم</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            <ConnectionStatus />
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => void signOutAndClearAppCaches()}
            >
              <LogOut className="h-5 w-5" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </aside>

      <main className="lg:mr-72 min-h-screen">
        <div className="pt-16 lg:pt-0">
          <header className="hidden lg:flex items-center justify-between p-6 border-b border-border bg-card">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-5 w-5 rotate-180" />
              </Link>
              <h1 className="text-2xl font-bold text-foreground">لوحة تحكم المعلم</h1>
            </div>
            <ConnectionStatus />
          </header>

          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
