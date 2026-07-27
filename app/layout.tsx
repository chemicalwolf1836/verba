import type { Metadata } from 'next'
import './globals.css'
import { ServiceWorker } from '@/components/ServiceWorker'

export const metadata: Metadata = {
  title: 'Verba',
  description: 'Offline-first vocabulary trainer for language exams. First course: BJT (Business Japanese).',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
