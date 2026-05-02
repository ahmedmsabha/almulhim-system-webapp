import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { APP_METADATA, BRAND } from '@/lib/config'
import './globals.css'

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${BRAND.taglineAr} | ${BRAND.teacherAr}`,
    template: `%s | ${BRAND.nameAr}`,
  },
  description: APP_METADATA.description,
  keywords: ['فيزياء', 'المُلهم', 'التوجيهي', 'فلسطين', 'صف 12', 'شرح فيزياء', 'دروس فيزياء', 'تعليم'],
  authors: [{ name: BRAND.teacherAr }],
  creator: BRAND.nameAr,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'منصة الفيزياء',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="bg-background">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icons/splash.png" />
      </head>
      <body className={`${ibmPlexArabic.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}>
        {children}
        <Toaster 
          position="top-center" 
          dir="rtl"
          toastOptions={{
            classNames: {
              toast: 'font-sans',
            },
          }}
        />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
