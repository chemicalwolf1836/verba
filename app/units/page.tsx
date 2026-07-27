'use client'

import Link from 'next/link'
import { UnitCard } from '@/components/UnitCard'
import { isLearned, unlockedUnits } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

export default function UnitsPage() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const open = new Set(unlockedUnits(course, progress).map((u) => u.id))

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/" className="sig-label text-xs text-[var(--color-muted)]">
        ◂ Back
      </Link>
      <div className="board mb-5 mt-3">
        <span className="lab">The line</span>
        <span className="nxt">{course.units.length} stations</span>
      </div>
      {course.units.map((unit) => {
        const cards = course.cards.filter((c) => c.unitId === unit.id)
        return (
          <UnitCard
            key={unit.id}
            unit={unit}
            unitLabel={course.unitLabel}
            learned={cards.filter((c) => isLearned(progress[c.id])).length}
            total={cards.length}
            locked={!open.has(unit.id)}
          />
        )
      })}
    </main>
  )
}
