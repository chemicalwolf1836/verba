'use client'

import Link from 'next/link'
import { StationList } from '@/components/StationList'
import { useActiveCourse } from '@/lib/useProgress'

/** The /units page: page chrome around the shared station list. */
export function RouteMap() {
  const { course } = useActiveCourse()

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/" className="sig-label text-xs text-[var(--color-muted)]">
        ◂ Back
      </Link>
      <div className="board mb-5 mt-3">
        <span className="lab">The line</span>
        <span className="nxt">{course.units.length} stations</span>
      </div>
      <StationList />
    </main>
  )
}
