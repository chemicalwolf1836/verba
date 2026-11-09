import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppNav } from '@/components/AppNav'
import { ServiceWorker } from '@/components/ServiceWorker'
import { TabBar } from '@/components/TabBar'

export const metadata: Metadata = {
  title: 'Verba',
  description: 'Offline-first vocabulary trainer for language exams. First course: BJT (Business Japanese).',
  // iOS ignores the manifest icons for Add to Home Screen and needs this link,
  // pointing at an opaque square - it renders any transparency as black.
  icons: { apple: '/apple-touch-icon.png' },
}

// `cover` lets the page run under the iPhone home indicator, so the docked
// study controls and the tab bar can pad themselves with the safe-area inset
// rather than leaving a dead strip of background beneath them.
export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppNav />
        {children}
        <TabBar />
        <ServiceWorker />
      </body>
    </html>
  )
}
