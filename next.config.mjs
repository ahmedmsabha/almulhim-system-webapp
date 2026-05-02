import path from 'node:path'
import { fileURLToPath } from 'node:url'
import withPWAInit from '@ducanh2912/next-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * تخزين وقت التشغيل يُمرَّر عبر workboxOptions وليس top-level — وإلا يُتجاهل.
 * extendDefaultRuntimeCaching + نفس cacheName يستبدل الافتراضي (NetworkFirst → SWR للصفحات).
 */
const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  /** يخزّن موارد التنقّل عبر next/link ويسرّع الزيارة الثانية */
  cacheOnFrontEndNav: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /supabase\.co/i,
        handler: 'NetworkOnly',
        method: 'GET',
      },
      {
        urlPattern: ({ sameOrigin, url: { pathname } }) =>
          !(!sameOrigin || pathname.startsWith('/api/auth/callback')) &&
          pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
        method: 'GET',
        options: {
          cacheName: 'apis',
        },
      },
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get('RSC') === '1' &&
          request.headers.get('Next-Router-Prefetch') === '1' &&
          sameOrigin &&
          !pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        method: 'GET',
        options: {
          cacheName: 'pages-rsc-prefetch',
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get('RSC') === '1' && sameOrigin && !pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        method: 'GET',
        options: {
          cacheName: 'pages-rsc',
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        urlPattern: ({ url: { pathname }, sameOrigin }) =>
          sameOrigin && !pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        method: 'GET',
        options: {
          cacheName: 'pages',
          expiration: { maxEntries: 96, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withPWA(nextConfig)
