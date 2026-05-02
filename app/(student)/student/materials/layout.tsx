import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الملفات',
  description: 'ملخصات وتمارين وامتحانات PDF',
}

export default function MaterialsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
