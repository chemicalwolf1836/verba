'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CoursePicker } from '@/components/CoursePicker'
import { MasteryBar } from '@/components/MasteryBar'
import { RouteStrip } from '@/components/RouteStrip'
import { StationList } from '@/components/StationList'
import { StreakHeatmap } from '@/components/StreakHeatmap'
import { WeakWords } from '@/components/WeakWords'
import { SHADOW_LINES } from '@/lib/courses/shadow'
import { currentUnitGoal, isWeak } from '@/lib/goals'
import { unlockedCards, unlockedUnits } from '@/lib/leitner'
import { cardsFor, minutesFor } from '@/lib/session'
import { useActiveCourse, useProgress, useSession } from '@/lib/useProgress'

const Rule = () => <div aria-hidden className="h-px bg-[var(--color-line)]" />

/** Local time of day, in the learner's words rather than a clock. */
function greetingFor(hour: number): string {
  if (hour < 5) return 'Still up.'
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

export default function Home() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const { session } = useSession()
  const router = useRouter()

  // Anything derived from the clock settles after mount. The static export
  // renders the same markup on the server every time, so reading Date here
  // during render would be a hydration mismatch.
  const [today, setToday] = useState<{ greeting: string; weekday: string } | null>(null)
  useEffect(() => {
    const now = new Date()
    setToday({
      greeting: greetingFor(now.getHours()),
      weekday: now.toLocaleDateString(undefined, { weekday: 'long' }),
    })
  }, [])

  // S starts a session, matching the hint next to the button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 's' || e.key === 'S') router.push('/study')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  const pool = unlockedCards(course, progress)
  const weakCount = pool.filter((c) => isWeak(progress[c.id])).length
  const openCount = unlockedUnits(course, progress).length
  const goal = currentUnitGoal(course, progress)
  const due = cardsFor(session.length)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:max-w-6xl lg:px-6">
      <CoursePicker />

      {/* The gap is the space before the rule; the right column's own padding is
          the space after it, so the divider sits centred in the gutter. Same
          gap-10 / pl-10 pairing the line browser uses, so the two split-column
          screens are one decision applied twice rather than two treatments. */}
      <div className="grid items-start gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
        {/* ---- left: what to do right now ---- */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* The desktop header carries the wordmark; on a phone it lives here. */}
          <div className="lg:hidden">
            <h1 className="sig-label text-2xl font-medium tracking-[0.3em]">Verba</h1>
            {/* A platform rule under the name - the route-map idea stated with a
                line rather than a graphic. */}
            <div aria-hidden className="mt-2 h-0.5 w-20 rounded-full bg-[var(--color-ink)]" />
          </div>

          <header className="board">
            <span className="roundel on-board" style={{ ['--rd' as string]: 'var(--color-here)' }}>
              {course.code}
            </span>
            <span className="lab">{course.name}</span>
            <span className="nxt">Bound for · {course.target}</span>
          </header>

          <div className="space-y-2">
            <p className="sig-label text-[11px] text-[var(--color-muted)]">
              {today?.weekday ?? ' '}
            </p>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {today?.greeting ?? 'Welcome back.'}
              <br />
              {due} {due === 1 ? 'word is' : 'words are'} due.
            </h2>
            <p className="text-[var(--color-muted)]">
              Weakest first, then whatever has gone quiet.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-3.5">
              <Link
                href="/study"
                className="flex flex-1 items-center gap-3 rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-lg font-extrabold text-white active:scale-[0.99] lg:flex-none"
              >
                Start
                <span className="ml-auto text-sm font-bold text-white/80">
                  {due} words · {minutesFor(session.length)} min
                </span>
              </Link>
              <span className="hidden whitespace-nowrap text-sm text-[var(--color-muted)] lg:inline">
                or press S
              </span>
            </div>

            <div className="flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)]">
              <QuickLink href="/study?mode=weak" label="Drill weak words" meta={weakCount} divider />
              <QuickLink href="/shadow" label="Shadow phrases" meta={SHADOW_LINES.length} divider />
              <QuickLink
                href="/units"
                label="Browse the line"
                meta={`${course.units.length} ${course.unitLabel.toLowerCase()}s`}
              />
            </div>
          </div>

          <Rule />
          <WeakWords />
        </div>

        {/* ---- right: where the whole course stands ----
            self-stretch is what makes the rule full-height rather than
            content-height. Today the right column is already the taller of the
            two (the capped station list plus streak and mastery), so the two
            look identical - but without it the rule would quietly shorten to
            this column the moment the left side outgrew it. */}
        <div className="flex min-w-0 flex-col gap-5 lg:self-stretch lg:border-l lg:border-[var(--color-line)] lg:pl-10">
          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate text-sm font-bold">
                {goal
                  ? `${course.unitLabel} ${goal.unit.index} - ${goal.unit.theme}`
                  : 'Every station open'}
              </h2>
              {goal && (
                <span className="shrink-0 text-sm text-[var(--color-muted)]">
                  {goal.learned} of {goal.total} learned
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
              <span
                className="block h-full bg-[var(--color-accent)]"
                style={{ width: `${goal ? (goal.learned / goal.total) * 100 : 100}%` }}
              />
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              {goal === null
                ? 'The whole line is open - keep everything from slipping.'
                : goal.toUnlock > 0
                  ? `${goal.toUnlock} more and ${course.unitLabel} ${
                      goal.nextUnit?.index ?? goal.unit.index + 1
                    }${goal.nextUnit ? ` - ${goal.nextUnit.theme}` : ''} opens.`
                  : `${course.unitLabel} ${goal.unit.index} is open.`}
            </p>
          </section>

          <Rule />

          <section className="space-y-2">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-sm font-bold">Where you are on the line</h2>
              <span className="ml-auto text-sm text-[var(--color-muted)]">
                {openCount} / {course.units.length}
              </span>
            </div>
            <RouteStrip />
            {/* On lg the full station panel is on screen, so the preview above it
                is enough on smaller widths and this replaces it. */}
            <div className="hidden max-h-[26rem] overflow-y-auto pr-1 lg:block">
              <StationList />
            </div>
            <Link
              href="/units"
              className="inline-block pt-1 text-sm font-bold text-[var(--color-accent)]"
            >
              See all {course.units.length} {course.unitLabel.toLowerCase()}s ▸
            </Link>
          </section>

          <Rule />

          <StreakHeatmap />
          <MasteryBar />
        </div>
      </div>
    </main>
  )
}

function QuickLink({
  href, label, meta, divider,
}: {
  href: string
  label: string
  meta: string | number
  divider?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-4 py-3.5 text-sm font-bold ${
        divider ? 'border-b border-[var(--color-line)]' : ''
      }`}
    >
      {label}
      <span className="ml-auto text-sm font-semibold text-[var(--color-muted)]">{meta}</span>
    </Link>
  )
}
