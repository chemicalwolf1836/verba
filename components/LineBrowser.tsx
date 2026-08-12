'use client'

import { useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { StationList } from '@/components/StationList'
import { BoxBars } from '@/components/WeakWords'
import { findUnit, type Course, type Unit } from '@/lib/courses'
import { currentUnitGoal } from '@/lib/goals'
import { unlockedUnits } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

type Props = {
  /** Deep link from /units/[unit]. Selects that station and, if it belongs to
   *  another course, browses that course rather than the active one. */
  initialUnitId?: string
}

/**
 * The line, as a rail plus a detail pane.
 *
 * On wide screens both are on screen at once and the pane follows the rail. On a
 * phone there is only room for one, so the rail hands over to the pane and a back
 * link brings it back. The split is done in CSS rather than by measuring the
 * viewport, so the static export hydrates identically at every width.
 */
export function LineBrowser({ initialUnitId }: Props) {
  const found = initialUnitId ? findUnit(initialUnitId) : undefined
  const { course: activeCourse } = useActiveCourse()
  const { progress } = useProgress()
  const [selected, setSelected] = useState<string | null>(initialUnitId ?? null)

  /**
   * Selecting a station is a state change, not a navigation, so the View
   * Transition is driven straight from here.
   *
   * flushSync is required: startViewTransition snapshots the DOM, runs the
   * callback, then snapshots again. React would batch a plain setState until
   * after the callback returned, so the second snapshot would be identical to
   * the first and nothing would animate.
   *
   * Where the API is missing this is an ordinary setState - the pane simply
   * changes, which is what happens today.
   */
  const go = (next: string | null) => {
    if (typeof document === 'undefined' || !document.startViewTransition) {
      setSelected(next)
      return
    }
    document.startViewTransition(() => flushSync(() => setSelected(next)))
  }

  // An id generateStaticParams never produced: render nothing rather than throw.
  if (initialUnitId && !found) return null
  const course = found?.course ?? activeCourse

  // With nothing picked, a wide screen still has a pane to fill - default it to
  // where the learner actually is on the line.
  const here = currentUnitGoal(course, progress)?.unit.id
  const ordered = [...course.units].sort((a, b) => a.index - b.index)
  const detailId = selected ?? here ?? ordered[0]?.id
  const detail = ordered.find((u) => u.id === detailId)

  const openCount = unlockedUnits(course, progress).length
  // Phrases carry no unitId, so they belong to no station - counting them would
  // overstate what this rail is describing.
  const wordCount = course.cards.filter((c) => c.unitId !== '').length

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6">
      {/* The rail grows the page rather than scrolling inside a fixed frame, so
          on a long course it runs well past the detail pane. That was tried the
          other way - both panes in one viewport-height frame - and reverted by
          preference: the page-scrolling version keeps the whole line reachable
          by ordinary scrolling. */}
      <div className="grid gap-0 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10">
        {/* ---- rail ---- */}
        <div className={`min-w-0 space-y-4 ${selected ? 'hidden lg:block' : ''}`}>
          <Link href="/" className="text-sm font-bold text-[var(--color-muted)] lg:hidden">
            ‹ Back
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">
              {course.units.length} {course.unitLabel.toLowerCase()}s
            </h1>
            <p className="text-sm text-[var(--color-muted)]">
              {openCount} open · {wordCount} words
            </p>
          </div>
          <StationList
            course={course}
            selectedId={detailId}
            onSelect={go}
          />
        </div>

        {/* ---- detail ---- */}
        <div
          className={`min-w-0 ${
            selected ? '' : 'hidden lg:block'
          } lg:border-l lg:border-[var(--color-line)] lg:pl-10`}
        >
          {detail && (
            <UnitDetail
              course={course}
              unit={detail}
              onBack={() => go(null)}
            />
          )}
        </div>
      </div>
    </main>
  )
}

function UnitDetail({
  course, unit, onBack,
}: {
  course: Course
  unit: Unit
  onBack: () => void
}) {
  const { progress } = useProgress()
  const unlocked = unlockedUnits(course, progress).some((u) => u.id === unit.id)
  const cards = course.cards.filter((c) => c.unitId === unit.id)

  return (
    <section className="space-y-4">
      <button onClick={onBack} className="text-sm font-bold text-[var(--color-muted)] lg:hidden">
        ‹ All {course.unitLabel.toLowerCase()}s
      </button>

      <div className="flex items-end gap-3.5">
        {/* The other half of the shared element. Below lg the rail is hidden
            while this is on screen, so exactly one element ever carries the
            name - two would make the transition throw. */}
        <span className="roundel vt-station shrink-0" aria-hidden>
          {unit.index}
        </span>
        <div className="min-w-0 space-y-1">
          <p className="sig-label text-[11px] text-[var(--color-muted)]">
            {course.unitLabel} {unit.index}
          </p>
          <h2 className="text-xl font-extrabold tracking-tight lg:text-2xl">{unit.theme}</h2>
        </div>
        {unlocked && cards.length > 0 && (
          <Link
            href={`/study?unit=${encodeURIComponent(unit.id)}`}
            className="ml-auto shrink-0 rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-bold text-white"
          >
            Drill these {cards.length}
          </Link>
        )}
      </div>

      {/* The gate that matters: a direct URL to a station further up the line must
          not hand over its words. Same unlockedUnits check the rail uses. */}
      {!unlocked ? (
        <p className="text-sm text-[var(--color-muted)]">
          Locked - finish the previous {course.unitLabel.toLowerCase()} first.
        </p>
      ) : (
        <>
          <ul>
            {cards.map((c) => (
              <li
                key={c.id}
                className="flex items-baseline gap-3.5 border-b border-[var(--color-line)]/60 py-2.5"
              >
                <span className="w-28 shrink-0 lg:w-36">
                  <span className="jp block leading-tight font-bold">{c.jp}</span>
                  <span className="jp block text-xs text-[var(--color-muted)]">{c.reading}</span>
                </span>
                <span className="min-w-0 flex-1 text-sm">{c.meaning}</span>
                <BoxBars box={progress[c.id]?.box ?? 1} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-muted)]">
            Bars show which Leitner box each word sits in.
          </p>
        </>
      )}
    </section>
  )
}
