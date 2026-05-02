'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ConnectionStatusBanner, ConnectionStatusIndicator } from '@/components/shared/layout/connection-status'
import { SubscriptionBadge } from '@/components/student/profile/subscription-badge'
import { NavigationProgress } from '@/components/shared/layout/navigation-progress'
import { BrandLockup } from '@/components/brand/brand-lockup'
import {
  Home,
  PlayCircle,
  FileText,
  Bell,
  MessageSquare,
  User,
  Menu,
  LogOut,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOutAndClearAppCaches } from '@/lib/client/sign-out-client'
import type { Profile, Subscription, StudentSubscriptionUiStatus } from '@/types'

const navItems = [
  { href: '/student', label: 'الرئيسية', icon: Home },
  { href: '/student/lessons', label: 'الدروس', icon: PlayCircle },
  { href: '/student/materials', label: 'الملفات', icon: FileText },
  { href: '/student/announcements', label: 'الإعلانات', icon: Bell },
  { href: '/student/messages', label: 'الرسائل', icon: MessageSquare },
]

function LogoutSubmitButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        startTransition(async () => {
          await signOutAndClearAppCaches()
        })
      }}
    >
      <LogOut className="size-5 shrink-0" />
      <span>تسجيل الخروج</span>
    </button>
  )
}

export function StudentAppShell({
  profile,
  subscription,
  subscriptionStatus,
  children,
}: {
  profile: Profile
  subscription: Subscription | null
  subscriptionStatus: StudentSubscriptionUiStatus
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const initial = profile.full_name.trim()[0] ?? '?'
  const firstName = profile.full_name.split(' ')[0] ?? profile.full_name

  const subscriptionBadgeStatus =
    subscription?.status === 'expiring_soon' ? 'expiring_soon' : subscriptionStatus

  return (
    <div data-student-app className="min-h-screen bg-background">
      <NavigationProgress />
      <div className="sticky top-0 z-40 w-full">
        <ConnectionStatusBanner />
        <header className="border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
          <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:h-16">
            <div className="flex min-w-0 items-center gap-4 lg:gap-6">
              <BrandLockup href="/student" variant="compact" className="min-h-11 sm:min-h-0" />

              <nav
                className="hidden items-center gap-1 lg:flex"
                role="navigation"
                aria-label="التنقل الرئيسي"
              >
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    pathname === item.href || (item.href !== '/student' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:min-h-9',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ConnectionStatusIndicator className="hidden md:flex" />

              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" aria-label="فتح القائمة" className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-[min(320px,100vw)] flex-col p-0 sm:w-[300px]">
                  <SheetHeader className="sr-only">
                    <SheetTitle>قائمة التنقل</SheetTitle>
                  </SheetHeader>
                  <div className="flex h-full flex-col">
                    <div className="border-b border-border/60 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12 ring-2 ring-primary/10">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">{profile.full_name}</p>
                          <p className="truncate text-sm text-muted-foreground">{profile.grade || '—'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <SubscriptionBadge status={subscriptionBadgeStatus} size="sm" />
                        <ConnectionStatusIndicator />
                      </div>
                    </div>

                    <nav className="flex flex-1 flex-col overflow-y-auto p-3 scrollbar-thin">
                      <div className="space-y-1">
                        {navItems.map((item) => {
                          const Icon = item.icon
                          const isActive =
                            pathname === item.href ||
                            (item.href !== '/student' && pathname.startsWith(item.href))
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                'focus-ring flex touch-target items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                              )}
                            >
                              <Icon className="size-5 shrink-0" />
                              <span className="min-w-0 flex-1">{item.label}</span>
                              {isActive && (
                                <ChevronLeft className="ms-auto size-4 shrink-0 rtl:rotate-180" aria-hidden />
                              )}
                            </Link>
                          )
                        })}
                      </div>

                      <div className="my-4 h-px bg-border/60" />

                      <div className="space-y-1">
                        <Link
                          href="/student/profile"
                          className="focus-ring flex touch-target items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <User className="size-5 shrink-0" />
                          <span>الملف الشخصي</span>
                        </Link>
                      </div>
                    </nav>

                    <div className="border-t border-border/60 p-3">
                      <LogoutSubmitButton className="focus-ring flex w-full touch-target items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10" />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="focus-ring gap-2 px-2 hover:bg-muted/80 min-h-11 sm:min-h-9 min-w-[44px]"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[7rem] truncate text-sm font-medium lg:block">
                      {firstName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1.5">
                      <p className="font-semibold text-foreground">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {profile.email}
                      </p>
                      <SubscriptionBadge
                        status={subscriptionBadgeStatus}
                        size="sm"
                        className="mt-1 w-fit"
                      />
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="focus:bg-accent">
                    <Link href="/student/profile" className="cursor-pointer gap-2.5">
                      <User className="size-4" />
                      <span>الملف الشخصي</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer p-0 focus:bg-destructive/10">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive"
                      onClick={() => void signOutAndClearAppCaches()}
                    >
                      <LogOut className="size-4" />
                      تسجيل الخروج
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      </div>
      <main className="student-ui container mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}
