import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'منصة الفيزياء',
    short_name: 'الفيزياء',
    description: 'منصة فيزياء التوجيهي — فلسطين',
    start_url: '/student',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      { src: '/mulhim-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/mulhim-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/mulhim-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
