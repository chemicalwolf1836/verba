import type { MetadataRoute } from 'next'

// Required for `output: 'export'`: this Next version treats manifest.ts as a
// route handler that must opt into static rendering explicitly, or the build
// fails with "dynamic not configured on route" during static export.
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Verba',
    short_name: 'Verba',
    description: 'Offline-first vocabulary trainer for language exams. First course: BJT (Business Japanese).',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f3f0',
    theme_color: '#0a8ea0',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
