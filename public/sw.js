// Hand-written rather than next-pwa: that plugin lags Next releases, and a service
// worker you cannot read is not debuggable on a train with no signal.
const CACHE = 'bjt-trainer-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/study', '/units', '/shadow'])),
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
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          return res
        })
        .catch(() => caches.match('/'))
    }),
  )
})
