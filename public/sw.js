// Hand-written rather than next-pwa: that plugin lags Next releases, and a service
// worker you cannot read is not debuggable on a train with no signal.
const CACHE = 'bjt-trainer-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Attempt each precache path independently - addAll is atomic and one
      // unresolvable path (eg. a clean URL a non-Vercel host can't resolve)
      // would sink the whole install, leaving the app with no offline shell at all.
      Promise.allSettled(['/', '/study', '/units', '/shadow'].map((path) => cache.add(path))),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit
      return fetch(event.request)
        .then((res) => {
          // Only cache successful responses - an error response (404/500) cached
          // here would otherwise be served from cache until the cache version bumps.
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          }
          return res
        })
        .catch(() => caches.match('/'))
    }),
  )
})
