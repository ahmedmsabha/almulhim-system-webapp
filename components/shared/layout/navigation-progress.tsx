'use client'

import { usePathname } from 'next/navigation'

/**
 * Slim top bar animation on route change (NProgress-style).
 */
export function NavigationProgress() {
  const pathname = usePathname()

  return (
    <div
      key={pathname}
      className="navigation-progress-bar pointer-events-none fixed start-0 top-0 z-[100] h-[2px] w-full origin-inline-start bg-primary rtl:origin-inline-end"
      aria-hidden="true"
    />
  )
}
