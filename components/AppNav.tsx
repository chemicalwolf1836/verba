'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SoundToggle } from '@/components/SoundToggle'
import { useActiveCourse } from '@/lib/useProgress'

const LINKS = [
  { href: '/', label: 'Today' },
  { href: '/units', label: 'The line' },
  { href: '/shadow', label: 'Shadow' },
] as const

/**
 * Desktop-only platform header. Below lg the screens carry their own back links
 * and the home page shows the wordmark inline, so a persistent bar would only
 * eat vertical space on the phone this is mostly used on.
 */
export function AppNav() {
  const pathname = usePathname()
  const { course } = useActiveCourse()

  return (
    <header className="hidden border-b border-[var(--color-line)] lg:block">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-4">
        <Link href="/" className="sig-label text-[15px] font-extrabold tracking-[0.26em]">
          Verba
        </Link>
        <span aria-hidden className="h-5 w-px bg-[var(--color-line)]" />
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          <span className="truncate font-bold">{course.name}</span>
          <span aria-hidden className="text-[var(--color-line)]">→</span>
          <span className="text-[var(--color-muted)]">{course.target}</span>
        </span>

        {/* Only while studying. The chimes it governs are dispatched from the
            study screen and nowhere else, so carrying it across the whole app
            would put a dead control on two screens out of three. */}
        {pathname === '/study' && (
          <span className="ml-auto">
            <SoundToggle />
          </span>
        )}

        <nav
          className={`flex gap-5 text-sm font-bold ${pathname === '/study' ? 'ml-5' : 'ml-auto'}`}
        >
          {LINKS.map(({ href, label }) => {
            // '/' would prefix-match everything, so it is compared exactly.
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`border-b-2 pb-0.5 ${
                  active
                    ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                    : 'border-transparent text-[var(--color-muted)]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
