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
      {/* Fixed height, not min-h-9: the box is border-box and py-4 already fills
          32px of it, so a 36px minimum did nothing. The toggle is 36px tall, so
          without this the bar grows 57 -> 71px on entering a session and the whole
          page below it jumps. */}
      <div className="mx-auto flex min-h-[68px] w-full max-w-6xl items-center gap-4 px-6 py-4">
        <Link href="/" className="sig-label text-[15px] font-extrabold tracking-[0.26em]">
          Verba
        </Link>
        <span aria-hidden className="h-5 w-px bg-[var(--color-line)]" />
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          <span className="truncate font-bold">{course.name}</span>
          <span aria-hidden className="text-[var(--color-line)]">→</span>
          <span className="text-[var(--color-muted)]">{course.target}</span>
        </span>

        <nav className="ml-auto flex gap-5 text-sm font-bold">
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

        {/* Only while studying. The chimes it governs are dispatched from the
            study screen and nowhere else, so carrying it across the whole app
            would put a dead control on two screens out of three. Sits after the
            links so the three destinations stay flush as one group. */}
        {pathname === '/study' && (
          <span className="ml-2 flex items-center gap-6">
            {/* The same hairline that separates the wordmark from the course, so
                the toggle reads as its own thing rather than a fourth link. */}
            <span aria-hidden className="h-5 w-px bg-[var(--color-line)]" />
            <SoundToggle />
          </span>
        )}
      </div>
    </header>
  )
}
