import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { APPLE_SPLASH_LINKS } from '@/lib/apple-splash-links.generated'
import { APP_METADATA, BRAND } from '@/lib/config'
import { InstallPrompt } from '@/components/InstallPrompt'
import { IOSInstallBanner } from '@/components/IOSInstallBanner'
import { MacSafariInstallBanner } from '@/components/MacSafariInstallBanner'
import { OfflineBanner } from '@/components/OfflineBanner'
import { PwaReloadOnServiceWorkerUpdate } from '@/components/PwaReloadOnServiceWorkerUpdate'
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
      { url: '/mulhim-icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/mulhim-icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/mulhim-icon.png',
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
        <link rel="apple-touch-icon" href="/mulhim-icon.png" />
        {APPLE_SPLASH_LINKS.map((entry) => (
          <link
            key={entry.href}
            rel="apple-touch-startup-image"
            href={entry.href}
            media={entry.media}
          />
        ))}
        <link rel="apple-touch-startup-image" href="/splash/iphone-1290x2796.png" />
      </head>
      <body className={`${ibmPlexArabic.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}>
        <InstallPrompt />
        <IOSInstallBanner />
        <MacSafariInstallBanner />
        <OfflineBanner />
        <PwaReloadOnServiceWorkerUpdate />
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
