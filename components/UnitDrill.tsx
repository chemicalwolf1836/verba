'use client'

import Link from 'next/link'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import { unlockedUnits } from '@/lib/leitner'
import { useProgress } from '@/lib/useProgress'

/**
 * Client half of the per-unit drill. The server parent (app/units/[unit]/page.tsx)
 * only supplies the unit id from generateStaticParams - progress lives in
 * localStorage, so whether the unit is locked can only be known here, after
 * useProgress has a real snapshot. This is what stops a direct URL visit to a
 * locked unit's static page from ever showing its cards.
 */
export function UnitDrill({ unitId }: { unitId: string }) {
  const course = getCourse(DEFAULT_COURSE_ID)!
  const unit = course.units.find((u) => u.id === unitId)
  const { progress } = useProgress()

  if (!unit) return null

  const locked = !unlockedUnits(course, progress).some((u) => u.id === unitId)
  const cards = course.cards.filter((c) => c.unitId === unitId)

  return (
    <main className="mx-auto max-w-lg space-y-3 px-4 py-8">
      <Link href="/units" className="text-sm underline">
        Back to {course.unitLabel.toLowerCase()}s
      </Link>
      <h1 className="text-2xl font-bold">
        {course.unitLabel} {unit.index} - {unit.theme}
      </h1>
      {locked ? (
        <p className="text-sm text-[var(--color-muted)]">
          Locked - finish the previous {course.unitLabel.toLowerCase()} first.
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-card)] p-3"
            >
              <p className="text-lg font-bold">{c.jp}</p>
              <p className="text-sm text-[var(--color-muted)]">{c.reading}</p>
              <p className="text-sm">{c.meaning}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
