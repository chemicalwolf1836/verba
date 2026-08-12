'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type Course, type Unit } from '@/lib/courses'
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

type Props = {
  /**
   * When given, an unlocked station calls this instead of navigating - which is
   * what turns the same list into the rail of a master-detail browser. Without
   * it the rows stay ordinary links, as the dashboard panel wants.
   */
  onSelect?: (unitId: string) => void
  selectedId?: string | null
  /** Explicit course, for a deep link whose unit belongs to a course other than
   *  the active one. Defaults to the active course. */
  course?: Course
}

/**
 * The stations of the line, as an ordered list. Shared by the line browser and the
 * dashboard's route panel so the two can never drift on what a station looks like
 * or which ones are locked. Carries no page chrome - the caller supplies that.
 */
export function StationList({ onSelect, selectedId, course: courseProp }: Props = {}) {
  const { course: activeCourse } = useActiveCourse()
  const course = courseProp ?? activeCourse
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

  const list = stations ?? []

  return (
    // No gap between rows: the route line is drawn per row, so the segments have to
    // meet for the line to read as continuous.
    <ol>
      {list.map((s, i) => {
        // The roundel is 30px wide, so its centre is 15px in - the line sits on that
        // axis and stops at the roundel's edge rather than running behind it, which
        // keeps it clean whether the station is filled or transparent.
        const rail = 'absolute left-[14px] w-0.5'
        const reached = (st: Station | undefined) =>
          st?.unlocked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]'

        const body = (
          <div
            className={`relative flex items-center gap-2.5 rounded-lg py-2 ${
              s.unit.id === selectedId ? 'bg-[var(--color-line)]/45' : ''
            }`}
          >
            {i > 0 && (
              <span aria-hidden className={`${rail} top-0 h-[calc(50%-15px)] ${reached(s)}`} />
            )}
            {i < list.length - 1 && (
              <span
                aria-hidden
                className={`${rail} bottom-0 top-[calc(50%+15px)] ${reached(list[i + 1])}`}
              />
            )}

            <span
              className={`roundel ${s.mastered ? 'text-white' : ''} ${
                s.unit.id === selectedId ? 'vt-station' : ''
              }`}
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

            <span
              className={`font-semibold ${s.unlocked ? '' : 'text-[var(--color-muted)]'}`}
            >
              {s.unit.theme}
            </span>
            <span aria-hidden className="h-3.5 w-px flex-none bg-[var(--color-line)]" />
            <span className="min-w-0 truncate text-xs text-[var(--color-muted)]">
              {s.unlocked ? `${s.learned} / ${s.total} learned` : 'Locked'}
              {s.here ? ' · you are here' : ''}
            </span>
          </div>
        )
        if (!s.unlocked) return <li key={s.unit.id}>{body}</li>
        return (
          <li key={s.unit.id}>
            {onSelect ? (
              <button
                onClick={() => onSelect(s.unit.id)}
                aria-current={s.unit.id === selectedId ? 'true' : undefined}
                data-unit={s.unit.id}
                className="w-full text-left"
              >
                {body}
              </button>
            ) : (
              <Link href={`/units/${s.unit.id}`} data-unit={s.unit.id}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}
