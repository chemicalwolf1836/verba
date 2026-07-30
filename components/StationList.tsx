'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type Unit } from '@/lib/courses'
import { currentUnitGoal } from '@/lib/goals'
import { isLearned, unlockedUnits } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

type Station = {
  unit: Unit
  learned: number
  total: number
  unlocked: boolean
  here: boolean
  mastered: boolean
}

/**
 * The stations of the line, as an ordered list. Shared by the /units page and the
 * dashboard's route panel so the two can never drift on what a station looks like
 * or which ones are locked. Carries no page chrome - the caller supplies that.
 */
export function StationList() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const [stations, setStations] = useState<Station[] | null>(null)

  useEffect(() => {
    const open = new Set(unlockedUnits(course, progress).map((u) => u.id))
    const hereId = currentUnitGoal(course, progress)?.unit.id
    setStations(
      [...course.units]
        .sort((a, b) => a.index - b.index)
        .map((unit) => {
          const cards = course.cards.filter((c) => c.unitId === unit.id)
          const learned = cards.filter((c) => isLearned(progress[c.id])).length
          return {
            unit,
            learned,
            total: cards.length,
            unlocked: open.has(unit.id),
            here: unit.id === hereId,
            mastered: cards.length > 0 && learned === cards.length,
          }
        }),
    )
  }, [course, progress])

  return (
    <ol className="space-y-1">
      {(stations ?? []).map((s) => {
        const body = (
          <div className="flex items-center gap-3 py-1.5">
            <span
              className={`roundel ${s.mastered ? 'text-white' : ''}`}
              style={{
                ['--rd' as string]: s.here ? 'var(--color-here)' : 'var(--color-accent)',
                background: s.mastered
                  ? 'var(--color-accent)'
                  : s.unlocked
                    ? 'var(--color-card)'
                    : 'transparent',
                opacity: s.unlocked ? 1 : 0.5,
              }}
            >
              {s.unit.index}
            </span>
            <span className={s.unlocked ? '' : 'text-[var(--color-muted)]'}>
              <span className="font-semibold">{s.unit.theme}</span>
              <span className="ml-2 text-xs text-[var(--color-muted)]">
                {s.unlocked ? `${s.learned} / ${s.total} learned` : 'Locked'}
                {s.here ? ' · you are here' : ''}
              </span>
            </span>
          </div>
        )
        return (
          <li key={s.unit.id}>
            {s.unlocked ? <Link href={`/units/${s.unit.id}`}>{body}</Link> : body}
          </li>
        )
      })}
    </ol>
  )
}
