'use client'

import { useEffect } from 'react'

export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is not fatal - the app still works online.
    })
  }, [])
  return null
}
