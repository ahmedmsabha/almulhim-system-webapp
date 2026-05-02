import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الدروس',
  description: 'جميع دروس الفيزياء المتاحة',
}

export default function LessonsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
