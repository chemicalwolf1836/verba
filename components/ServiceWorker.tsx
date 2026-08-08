'use client'

import { useEffect } from 'react'

/**
 * Registers the offline shell - in production only.
 *
 * sw.js is cache-first with skipWaiting + clients.claim, which is exactly right
 * on a train and exactly wrong on a dev server: it serves a previous build's
 * HTML and chunks back to the page, Next's HMR sees assets it did not produce,
 * and the tab reload-loops. So in development we not only skip registration, we
 * actively tear down any worker a previous production visit left behind on the
 * same origin - otherwise localhost stays broken until it is cleared by hand.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {})
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is not fatal - the app still works online.
    })
  }, [])
  return null
}
