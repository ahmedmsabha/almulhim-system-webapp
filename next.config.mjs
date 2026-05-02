import path from 'node:path'
import { fileURLToPath } from 'node:url'
import withPWAInit from '@ducanh2912/next-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    /** لا تخزّن طلبات API — كان Stale للصفحات يؤثر على مسارات PDF ويعيد صفحة/ردّاً خاطئاً داخل iframe */
    {
      urlPattern: ({ url, request }) =>
        request.method === 'GET' && url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /supabase\.co/i,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/[^/]+\/.*\.(?:js|css|woff2)(?:\?.*)?$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: ({ url, request }) => {
        if (request.method !== 'GET') return false
        if (url.pathname.startsWith('/api/')) return false
        if (/supabase\.co/i.test(url.hostname)) return false
        if (/\.(?:js|css|woff2)(?:\?.*)?$/i.test(url.pathname)) return false
        return url.origin === self.location.origin
      },
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
  ],
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
