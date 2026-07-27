'use client'

import Link from 'next/link'
import { CoursePicker } from '@/components/CoursePicker'
import { MasteryBar } from '@/components/MasteryBar'
import { useActiveCourse } from '@/lib/useProgress'

export default function Home() {
  const { course } = useActiveCourse()

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <CoursePicker />

      <header className="board">
        <span className="roundel on-board" style={{ ['--rd' as string]: 'var(--color-here)' }}>
          {course.code}
        </span>
        <span className="lab">{course.name}</span>
        <span className="nxt">Bound for · {course.target}</span>
      </header>

      <h1 className="sig-label text-2xl font-bold tracking-tight">Verba</h1>

      <MasteryBar />

      <Link
        href="/study"
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] py-4 text-center text-lg font-bold text-white active:scale-[0.99]"
      >
        Start studying <span aria-hidden>▸</span>
      </Link>

      <div className="grid grid-cols-1 gap-3">
        <Link
          href="/units"
          className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5"
        >
          <span className="font-semibold">Browse the line</span>
          <span className="text-sm text-[var(--color-muted)]">{course.units.length} stations ▸</span>
        </Link>

        <Link
          href="/shadow"
          className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5"
        >
          <span className="font-semibold">Shadowing practice</span>
          <span className="text-sm text-[var(--color-muted)]">listen · repeat ▸</span>
        </Link>
      </div>
    </main>
  )
}
