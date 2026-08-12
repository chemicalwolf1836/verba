'use client'

import { usePathname } from 'next/navigation'

/**
 * Route transition. A `template` rather than the layout on purpose: Next remounts
 * a template on navigation and keeps a layout mounted, so this is what lets an
 * enter animation run each time rather than once on first load.
 *
 * The explicit key is load-bearing. Next keys the template by *route param*, not
 * by path - see node_modules/next/dist/docs/.../template.md - and none of these
 * routes take a param, so moving between /, /units and /shadow left the key
 * unchanged, React reused the same div, and the animation never restarted.
 * Keying on the pathname forces a new element, which is what replays it.
 *
 * The animation is `rise`, the same keyframe the revealed answer uses. Screens
 * arriving the way answers do keeps one motion idea in the app instead of two.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="route-enter">
      {children}
    </div>
  )
}
