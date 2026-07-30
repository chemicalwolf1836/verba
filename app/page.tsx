'use client'

import Link from 'next/link'
import { CoursePicker } from '@/components/CoursePicker'
import { MasteryBar } from '@/components/MasteryBar'
import { RouteStrip } from '@/components/RouteStrip'
import { StationList } from '@/components/StationList'
import { StreakHeatmap } from '@/components/StreakHeatmap'
import { WeakWords } from '@/components/WeakWords'
import { useActiveCourse } from '@/lib/useProgress'

export default function Home() {
  const { course } = useActiveCourse()

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 xl:max-w-6xl">
      <CoursePicker />

      <header className="board">
        <span className="roundel on-board" style={{ ['--rd' as string]: 'var(--color-here)' }}>
          {course.code}
        </span>
        <span className="lab">{course.name}</span>
        <span className="nxt">Bound for · {course.target}</span>
      </header>

      <div>
        <h1 className="sig-label text-2xl font-bold tracking-tight">Verba</h1>
        {/* The strip previews the line; on xl the full station panel is on screen,
            so the preview would just repeat it. */}
        <div className="xl:hidden">
          <RouteStrip />
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-3">
          <Link
            href="/study"
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-4 text-center text-lg font-bold text-white active:scale-[0.99]"
          >
            Start studying <span aria-hidden>▸</span>
          </Link>

          <Link
            href="/shadow"
            className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5"
          >
            <span className="font-semibold">Shadowing practice</span>
            <span className="text-sm text-[var(--color-muted)]">listen · repeat ▸</span>
          </Link>

          <WeakWords />
        </div>

        <div className="space-y-3">
          <StreakHeatmap />
          <MasteryBar />
          {/* On xl the station panel is on screen, so this link would lead where the
              user already is. */}
          <Link
            href="/units"
            className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5 xl:hidden"
          >
            <span className="font-semibold">Browse the line</span>
            <span className="text-sm text-[var(--color-muted)]">{course.units.length} stations ▸</span>
          </Link>
        </div>

        {/* The line itself, promoted onto the dashboard where there is room for it.
            Hidden below xl - two columns are already full at that width. */}
        <section className="hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4 xl:block">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="sig-label text-xs text-[var(--color-muted)]">The line</span>
            <span className="text-sm text-[var(--color-muted)]">
              {course.units.length} stations
            </span>
          </div>
          {/* 24 stations would stretch the page well past the other columns. */}
          <div className="max-h-[32rem] overflow-y-auto pr-1">
            <StationList />
          </div>
        </section>
      </div>
    </main>
  )
}
