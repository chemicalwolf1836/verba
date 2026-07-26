import type { Metadata } from 'next'
import './globals.css'
import { ServiceWorker } from '@/components/ServiceWorker'

export const metadata: Metadata = {
  title: 'BJT Trainer',
  description: 'Offline Japanese vocabulary trainer for the BJT',
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
