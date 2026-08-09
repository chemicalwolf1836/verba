/**
 * Tests for `public/sw.js`.
 *
 * Deliberately not colocated: everything in `public/` is copied verbatim into
 * `out/`, so a test file next to the worker would be published at /sw.test.ts.
 *
 * The worker is plain script-scope JS using service-worker globals, so it is
 * loaded here with `new Function` and handed fakes for `self`, `caches` and
 * `fetch`. The cache fake is a real store rather than a stub of individual
 * calls - the point is to exercise the strategy (what gets served, what gets
 * written), which assertions on call counts would miss entirely.
 *
 * Both bugs this file has shipped are pinned below:
 *   - registering in development (fixed in components/ServiceWorker.tsx)
 *   - serving cached HTML forever unless CACHE was bumped by hand, which gated
 *     two releases. See "prefers the network over a stale cached page".
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Resolved from the project root - under jsdom, import.meta.url is not a file: URL.
const SRC = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

/** Read the cache name out of the source so a future bump doesn't break these. */
const CACHE_NAME = /const CACHE = '([^']+)'/.exec(SRC)![1]

type Req = { url: string; method?: string; mode?: string }

const req = (url: string, over: Partial<Req> = {}): Req => ({ url, method: 'GET', ...over })
const page = (url: string) => req(url, { mode: 'navigate' })

const urlOf = (r: Req | string) => (typeof r === 'string' ? r : r.url)

const html = (body: string, status = 200) => new Response(body, { status })

/** Let the worker's un-awaited cache writes settle. `keep` deliberately does not
 *  block the response on the write, so tests must flush before asserting. */
const flush = () => new Promise((r) => setTimeout(r, 0))

function makeCaches(fetchImpl: (r: Req | string) => Promise<Response>) {
  const stores = new Map<string, Map<string, Response>>()
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)!
    return {
      async put(r: Req | string, res: Response) {
        store.set(urlOf(r), res)
      },
      async add(path: string) {
        const res = await fetchImpl(path)
        // Real Cache.add rejects on a non-ok response; install relies on that.
        if (!res.ok) throw new Error(`add failed: ${path}`)
        store.set(path, res)
      },
      async match(r: Req | string) {
        return store.get(urlOf(r))
      },
    }
  }
  return {
    open,
    async keys() {
      return [...stores.keys()]
    },
    async delete(name: string) {
      return stores.delete(name)
    },
    async match(r: Req | string) {
      for (const store of stores.values()) {
        const hit = store.get(urlOf(r))
        if (hit) return hit
      }
      return undefined
    },
    /** test-only view of what is actually stored */
    _paths(name = CACHE_NAME) {
      return [...(stores.get(name)?.keys() ?? [])].sort()
    },
    _seed(name: string, path: string, res: Response) {
      if (!stores.has(name)) stores.set(name, new Map())
      stores.get(name)!.set(path, res)
    },
  }
}

type Harness = ReturnType<typeof load>

function load(fetchImpl: (r: Req | string) => Promise<Response>) {
  const handlers: Record<string, (e: unknown) => void> = {}
  const self = {
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      handlers[type] = fn
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  }
  const caches = makeCaches(fetchImpl)
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', SRC)(self, caches, fetchImpl)
  return { handlers, self, caches, fetchImpl }
}

async function lifecycle(h: Harness, type: 'install' | 'activate') {
  let waited: Promise<unknown> = Promise.resolve()
  h.handlers[type]({ waitUntil: (p: Promise<unknown>) => (waited = p) })
  await waited
}

/** Hands back the promise the worker passed to respondWith, without awaiting it -
 *  needed for the timeout tests, which must advance the clock while it is pending. */
function respondTo(h: Harness, r: Req): Promise<Response> | undefined {
  let responded: Promise<Response> | undefined
  h.handlers.fetch({ request: r, respondWith: (p: Promise<Response>) => (responded = p) })
  return responded
}

async function request(h: Harness, r: Req) {
  return respondTo(h, r)
}

/** Serves anything except the paths listed as missing. */
const network = (missing: string[] = [], body = 'NETWORK') =>
  vi.fn(async (r: Req | string) =>
    missing.includes(urlOf(r)) ? html('nope', 404) : html(body),
  )

const offline = () => vi.fn(async () => Promise.reject(new Error('offline')))

describe('service worker - install', () => {
  it('precaches the offline shell', async () => {
    const h = load(network())
    await lifecycle(h, 'install')
    expect(h.caches._paths()).toEqual(['/', '/shadow', '/study', '/units'])
  })

  it('still installs when one shell path cannot be fetched', async () => {
    // addAll is atomic; the worker uses allSettled precisely so one bad path
    // cannot leave the app with no offline shell at all.
    const h = load(network(['/shadow']))
    await lifecycle(h, 'install')
    expect(h.caches._paths()).toEqual(['/', '/study', '/units'])
  })

  it('activates without waiting for existing tabs to close', async () => {
    const h = load(network())
    await lifecycle(h, 'install')
    expect(h.self.skipWaiting).toHaveBeenCalled()
  })
})

describe('service worker - activate', () => {
  it('deletes caches from previous versions and keeps the current one', async () => {
    const h = load(network())
    h.caches._seed('verba-v1', '/', html('ANCIENT'))
    h.caches._seed('verba-v2', '/', html('OLD'))
    await lifecycle(h, 'install')
    await lifecycle(h, 'activate')
    expect(await h.caches.keys()).toEqual([CACHE_NAME])
  })

  it('takes control of pages already open', async () => {
    const h = load(network())
    await lifecycle(h, 'activate')
    expect(h.self.clients.claim).toHaveBeenCalled()
  })
})

describe('service worker - navigations are network-first', () => {
  let h: Harness

  beforeEach(async () => {
    h = load(network())
    await lifecycle(h, 'install')
  })

  it('serves the network response when online', async () => {
    const res = await request(h, page('/units'))
    expect(await res!.text()).toBe('NETWORK')
  })

  it('prefers the network over a stale cached page', async () => {
    // THE REGRESSION TEST. This is the bug that shipped twice: the worker was
    // cache-first for everything, so an installed copy served the HTML it first
    // saw and never noticed a release unless CACHE was bumped by hand.
    h.caches._seed(CACHE_NAME, '/units', html('STALE'))
    const res = await request(h, page('/units'))
    // A response body can only be read once, so assert against a single read.
    const body = await res!.text()
    expect(body).toBe('NETWORK')
    expect(body).not.toBe('STALE')
  })

  it('updates the cached copy with what the network returned', async () => {
    h.caches._seed(CACHE_NAME, '/units', html('STALE'))
    await request(h, page('/units'))
    await flush()
    const cached = await h.caches.match('/units')
    expect(await cached!.text()).toBe('NETWORK')
  })

  it('falls back to the cached page when the network fails', async () => {
    // The whole point of the app: a train with no signal.
    const off = load(offline())
    off.caches._seed(CACHE_NAME, '/units', html('CACHED PAGE'))
    const res = await request(off, page('/units'))
    expect(await res!.text()).toBe('CACHED PAGE')
  })

  it('falls back to the cached root for a page it has never cached', async () => {
    const off = load(offline())
    off.caches._seed(CACHE_NAME, '/', html('SHELL'))
    const res = await request(off, page('/units/bjt-w07'))
    expect(await res!.text()).toBe('SHELL')
  })
})

describe('service worker - a slow network does not hang the page', () => {
  /** Read from the source so retuning the timeout doesn't break these. */
  const TIMEOUT = Number(/const NETWORK_TIMEOUT_MS = (\d+)/.exec(SRC)![1])

  /** A fetch that never settles - a tunnel, not an offline device. */
  const stalls = () => vi.fn(() => new Promise<Response>(() => {}))

  it('gives up on the network and serves the cached page', async () => {
    vi.useFakeTimers()
    try {
      const h = load(stalls())
      h.caches._seed(CACHE_NAME, '/units', html('CACHED PAGE'))
      const pending = respondTo(h, page('/units'))
      await vi.advanceTimersByTimeAsync(TIMEOUT)
      expect(await (await pending)!.text()).toBe('CACHED PAGE')
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits for the network rather than answering from cache too eagerly', async () => {
    // Before the timeout elapses the request is still outstanding - the cache
    // must not pre-empt a network that is merely a little slow.
    vi.useFakeTimers()
    try {
      const h = load(stalls())
      h.caches._seed(CACHE_NAME, '/units', html('CACHED PAGE'))
      const pending = respondTo(h, page('/units'))
      let settled = false
      void pending!.then(() => (settled = true))
      await vi.advanceTimersByTimeAsync(TIMEOUT - 1)
      expect(settled).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('still refreshes the cache when a slow response finally lands', async () => {
    // Otherwise a permanently slow connection would never see a new release -
    // the same staleness this strategy exists to remove, reached another way.
    vi.useFakeTimers()
    try {
      let land: (r: Response) => void = () => {}
      const late = vi.fn(() => new Promise<Response>((res) => (land = res)))
      const h = load(late)
      h.caches._seed(CACHE_NAME, '/units', html('CACHED PAGE'))
      const pending = respondTo(h, page('/units'))
      await vi.advanceTimersByTimeAsync(TIMEOUT)
      expect(await (await pending)!.text()).toBe('CACHED PAGE')

      land(html('LATE NETWORK'))
      await vi.advanceTimersByTimeAsync(0)
      const cached = await h.caches.match('/units')
      expect(await cached!.text()).toBe('LATE NETWORK')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not time out assets, which are cache-first anyway', async () => {
    vi.useFakeTimers()
    try {
      const h = load(stalls())
      const pending = respondTo(h, req('/_next/static/chunks/slow.js'))
      let settled = false
      void pending!.then(() => (settled = true))
      await vi.advanceTimersByTimeAsync(TIMEOUT * 2)
      expect(settled).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('service worker - assets are cache-first', () => {
  it('serves a cached asset without touching the network', async () => {
    const net = network()
    const h = load(net)
    h.caches._seed(CACHE_NAME, '/fonts/manrope-400.woff2', html('CACHED FONT'))
    const res = await request(h, req('/fonts/manrope-400.woff2'))
    expect(await res!.text()).toBe('CACHED FONT')
    expect(net).not.toHaveBeenCalled()
  })

  it('fetches and caches an asset it has not seen', async () => {
    const h = load(network())
    const res = await request(h, req('/_next/static/chunks/abc.js'))
    expect(await res!.text()).toBe('NETWORK')
    await flush()
    expect(h.caches._paths()).toContain('/_next/static/chunks/abc.js')
  })
})

describe('service worker - what it declines to do', () => {
  it('ignores non-GET requests entirely', async () => {
    const h = load(network())
    const responded = await request(h, req('/study', { method: 'POST' }))
    // No respondWith means the browser handles it normally.
    expect(responded).toBeUndefined()
  })

  it('never caches an unsuccessful response', async () => {
    // A cached 404 would otherwise be served until the next cache bump.
    const h = load(network(['/missing']))
    const res = await request(h, req('/missing'))
    expect(res!.status).toBe(404)
    await flush()
    expect(h.caches._paths()).not.toContain('/missing')
  })
})
