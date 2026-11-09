'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS, isActive } from '@/components/AppNav'

/**
 * Phone navigation: the desktop header's three destinations as a bottom tab bar,
 * where a thumb reaches them. Below lg only - at lg the header carries them.
 *
 * Absent during a sitting (study, shadowing). Those screens dock their own
 * controls to the bottom and leave by End, and a second row of buttons under
 * "I knew it" would be one more thing to mis-tap on a moving train.
 *
 * The bar is fixed, so it renders a spacer of the same height in the flow -
 * otherwise the last thing on every screen would sit underneath it.
 */
export function TabBar() {
  const pathname = usePathname()
  if (pathname === '/study' || pathname.startsWith('/shadow')) return null

  return (
    <>
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-paper)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-xl">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActive(href, pathname)
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                    active ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'
                  }`}
                >
                  <TabIcon href={href} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

/** One stroke weight in currentColor, drawn from the route-map idea: a platform
 *  marker for today, a line with stations, and a sound wave for shadowing. */
function TabIcon({ href }: { href: string }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    className: 'h-[22px] w-[22px]',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (href === '/') {
    return (
      <svg {...common}>
        <circle cx="12" cy="10" r="5.5" />
        <path d="M12 15.5V21M8.5 21h7" />
      </svg>
    )
  }
  if (href === '/units') {
    return (
      <svg {...common}>
        <path d="M3 12h18" />
        <circle cx="5" cy="12" r="2" fill="var(--color-paper)" />
        <circle cx="12" cy="12" r="2" fill="var(--color-paper)" />
        <circle cx="19" cy="12" r="2" fill="var(--color-paper)" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10.5v3" />
    </svg>
  )
}
