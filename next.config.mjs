import path from 'node:path'
import { fileURLToPath } from 'node:url'
import withPWAInit from '@ducanh2912/next-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * أصول مسموح تنفيذ Server Actions منها — على Vercel غالباً يطابق المضيف `x-forwarded-host`.
 * عند استخدام نطاق مخصص: ضع `NEXT_PUBLIC_SITE_URL=https://your-domain.com` في Vercel.
 */
function serverActionAllowedOrigins() {
  const hosts = new Set(['localhost:3000', '127.0.0.1:3000', '*.vercel.app'])
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const h = vercel.replace(/^https?:\/\//, '').split('/')[0]?.toLowerCase()
    if (h) hosts.add(h)
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (site) {
    try {
      const h = new URL(site).host.toLowerCase()
      if (h) hosts.add(h)
    } catch {
      /* ignore */
    }
  }
  return [...hosts]
}

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
  /** يخزّن المزيد من السكربتات/الأنماط عند التنقّل — يزيد الكاش لضعف الشبكة (وزن تنزيل أعلى قليلاً) */
  aggressiveFrontEndNavCaching: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      /**
       * لوحة المعلم: لا تخزين في SW — بعد كل نشر تتبدّل معرّفات Server Actions؛ الكاش القديم يُظهر
       * الخطأ "Server Action was not found". الطالب يبقى مع StaleWhileRevalidate أدناه.
       */
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get('RSC') === '1' &&
          request.headers.get('Next-Router-Prefetch') === '1' &&
          sameOrigin &&
          pathname.startsWith('/admin'),
        handler: 'NetworkOnly',
        method: 'GET',
      },
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get('RSC') === '1' && sameOrigin && pathname.startsWith('/admin'),
        handler: 'NetworkOnly',
        method: 'GET',
      },
      {
        urlPattern: ({ url: { pathname }, sameOrigin }) =>
          sameOrigin && pathname.startsWith('/admin'),
        handler: 'NetworkOnly',
        method: 'GET',
      },
      /**
       * الصفحة الرئيسية وطلب الاشتراك والدخول: كانت قواعد `pages` / `pages-rsc` تخزّن StaleWhileRevalidate
       * حتى أسبيع — يظهر اسم المعلِّم وأرقام قديمة رغم تحديث القاعدة. لا نخزّن هذه المسارات في SW.
       */
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.method === 'GET' &&
          sameOrigin &&
          !pathname.startsWith('/api/') &&
          (pathname === '/' ||
            pathname.startsWith('/subscribe') ||
            pathname.startsWith('/login') ||
            pathname.startsWith('/register')),
        handler: 'NetworkOnly',
        method: 'GET',
      },
      /** لوحة الطالب: شبكة أولاً وكاش قصير فقط لتفادي عرض اشتراك/تواصل قديم من SW */
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.method === 'GET' &&
          sameOrigin &&
          !pathname.startsWith('/api/') &&
          pathname.startsWith('/student'),
        handler: 'NetworkFirst',
        method: 'GET',
        options: {
          cacheName: 'student-nav-dynamic',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 120, maxAgeSeconds: 5 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      /**
       * إن بقي CacheFirst لحزم JS فإن Server Actions القديمة تبقى بعد النشر فيُرفض المعرّف على الخادم.
       * NetworkFirst يجلب آخر البناء عند توفر الشبكة، مع احتياط من الكاش عند الانقطاع.
       */
      {
        urlPattern: /\/_next\/static\/.+\.js$/i,
        handler: 'NetworkFirst',
        method: 'GET',
        options: {
          cacheName: 'next-static-js-assets',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: /supabase\.co/i,
        handler: 'NetworkOnly',
        method: 'GET',
      },
      /** GET للـ API: عرض من الكاش فوراً ثم تحديث في الخلفية (مناسب لمسارات مثل PDF). لا يُخزّن إلا رد 200. */
      {
        urlPattern: ({ sameOrigin, url: { pathname } }) =>
          !(!sameOrigin || pathname.startsWith('/api/auth/callback')) &&
          pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        method: 'GET',
        options: {
          cacheName: 'apis',
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 14 },
          cacheableResponse: {
            statuses: [200],
          },
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
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
        },
      },
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get('RSC') === '1' && sameOrigin && !pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        method: 'GET',
        options: {
          cacheName: 'pages-rsc',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
        },
      },
      {
        urlPattern: ({ url: { pathname }, sameOrigin }) =>
          sameOrigin && !pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        method: 'GET',
        options: {
          cacheName: 'pages',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
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
  experimental: {
    serverActions: {
      /** رفع PDF + ميتاداتا؛ الافتراضي 1MB قد يقطع طلبات الإجراء على الإنتاج */
      bodySizeLimit: '12mb',
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withPWA(nextConfig)
