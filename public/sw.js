// Hand-written rather than next-pwa: that plugin lags Next releases, and a service
// worker you cannot read is not debuggable on a train with no signal.
//
// Bumping this clears everything an installed copy has cached. It is no longer the
// thing standing between a release and the user - see the navigation strategy below -
// but bump it when the precache list or the caching rules themselves change.
const CACHE = 'verba-v3'

/** The offline shell. Each is fetched independently at install. */
const SHELL = ['/', '/study', '/units', '/shadow']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Attempt each precache path independently - addAll is atomic and one
      // unresolvable path (eg. a clean URL a non-Vercel host can't resolve)
      // would sink the whole install, leaving the app with no offline shell at all.
      Promise.allSettled(SHELL.map((path) => cache.add(path))),
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

/** Store a copy without making the response wait on the write. */
function keep(request, response) {
  if (!response.ok) return response
  const copy = response.clone()
  caches.open(CACHE).then((cache) => cache.put(request, copy))
  return response
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // HTML is network-first: ask the network, fall back to cache when it fails.
  //
  // This used to be cache-first like everything else, which meant an installed
  // copy served the HTML it first saw and never noticed a new release - the cache
  // key was the only way through, and relying on a human to bump it failed the
  // very next deploy. Freshness should not depend on remembering something.
  //
  // Offline is unaffected: with no signal the fetch rejects immediately and the
  // cached shell answers, which is the case this app exists for.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => keep(event.request, res))
        .catch(() => caches.match(event.request).then((hit) => hit ?? caches.match('/'))),
    )
    return
  }

  // Everything else - hashed chunks, fonts, icons - is cache-first. Their URLs
  // change when their content does, so a cached copy can never be stale.
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit
      return fetch(event.request)
        .then((res) => keep(event.request, res))
        .catch(() => caches.match('/'))
    }),
  )
})
