"use client"

import Image from "next/image"
import Link from "next/link"

import { BRAND } from "@/lib/config"
import { cn } from "@/lib/utils"

export function BrandMark({
  className,
  size = 40,
}: {
  className?: string
  /** عرض وارتفاع بالبكسل */
  size?: number
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-primary shadow-sm ring-1 ring-primary/15",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={BRAND.iconPath}
        alt=""
        fill
        className="object-cover"
        sizes={`${size}px`}
        priority={size >= 64}
      />
    </div>
  )
}

export function BrandLockup({
  href = "/",
  variant = "default",
  className,
  teacherDisplayName,
}: {
  href?: string
  variant?: "default" | "compact"
  className?: string
  /** إن وُجد يُحدَّد على الخادم من ملف شخصيّ المشرف في القاعدة */
  teacherDisplayName?: string
}) {
  const compact = variant === "compact"
  const teacherLine = teacherDisplayName ?? BRAND.teacherAr
  return (
    <Link
      href={href}
      className={cn("focus-ring flex min-h-11 min-w-0 items-center gap-3 rounded-lg sm:min-h-0", className)}
    >
      <BrandMark size={compact ? 36 : 40} />
      <div className="min-w-0 flex flex-col leading-tight">
        <span className={cn("font-bold text-primary", compact ? "text-base" : "text-lg")}>
          {BRAND.nameAr}
        </span>
        <span className="truncate text-xs text-muted-foreground">{BRAND.taglineAr}</span>
        {!compact ?
          <span className="mt-0.5 text-xs font-medium text-foreground/85">{teacherLine}</span>
        : null}
      </div>
    </Link>
  )
}
