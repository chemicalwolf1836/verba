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

/**
 * How long to wait for the network before giving up on it and using the cache.
 *
 * Fully offline already fails instantly - there is no network stack to try. This
 * is for the case in between, which is the one this app actually lives in: a
 * tunnel, one bar, a captive portal. Without it, network-first turns a stale page
 * into a hanging one, which is worse.
 */
const NETWORK_TIMEOUT_MS = 3000

/** Store a copy without making the response wait on the write. */
function keep(request, response) {
  if (!response.ok) return response
  const copy = response.clone()
  caches.open(CACHE).then((cache) => cache.put(request, copy))
  return response
}

/**
 * The network, but it stops being worth waiting for after NETWORK_TIMEOUT_MS.
 *
 * A response that arrives after the timeout still refreshes the cache. That is
 * the part worth keeping: on a connection that is always slow, abandoning the
 * late response outright would mean the shell never updated - the same staleness
 * bug this strategy exists to remove, just arrived at from a different direction.
 */
function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS)
    fetch(request).then(
      (res) => {
        clearTimeout(timer)
        // keep() caches and hands the response back. If the timeout already won,
        // this resolve is ignored - but the cache write has still happened.
        resolve(keep(request, res))
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
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
      fromNetwork(event.request).catch(() =>
        caches.match(event.request).then((hit) => hit ?? caches.match('/')),
      ),
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
