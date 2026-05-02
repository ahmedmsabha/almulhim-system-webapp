/** Arabic relative timestamps for RTL UI (avoid adding logic to lib). */
export function formatRelativeArabic(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (Number.isNaN(diffSeconds)) return ''

  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

  if (diffSeconds < 45) return 'الآن'
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute')
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return rtf.format(-diffDays, 'day')
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return rtf.format(-diffWeeks, 'week')
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return rtf.format(-diffMonths, 'month')
  const diffYears = Math.floor(diffDays / 365)
  return rtf.format(-diffYears, 'year')
}

export function getMonthStickyLabel(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
}
