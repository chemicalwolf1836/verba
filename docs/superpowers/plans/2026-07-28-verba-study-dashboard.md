# Verba Study Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Verba home into a two-column study dashboard (streak heatmap, mastery, weakest-words drill) and make `/units` a route map, using only data the app already stores.

**Architecture:** Add four pure functions over the existing `activity`/`goals` data, one focus-mode hook on the study session, and five presentational components. Everything reads localStorage through the existing `useSyncExternalStore` hooks; no new stores, no network.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Tailwind v4, Vitest. Existing hand-rolled render harness for component tests (`createRoot` + `act`, as in `components/MasteryBar.test.tsx`).

## Global Constraints

- **Offline is a hard constraint.** No `fetch`, no network, no remote assets. Reads go through `useProgress` / `useActivity` / `useActiveCourse` only.
- **No ambient clock reads in `lib/`.** Pure functions take `now: number`; the caller (a client component) supplies `Date.now()`.
- **Hydration-safe.** Never read `localStorage` or `Date.now()` in a component render body. Time-dependent views are computed in `useEffect` and held in state, so the server/first-client render is stable (the `MasteryBar` pattern).
- **Static export must build.** `useSearchParams` must sit inside a `<Suspense>` boundary or the export build fails.
- **No em-dashes in user-facing copy.** Use a spaced hyphen ` - `.
- **Design tokens:** teal `--color-accent`, amber `--color-here`, `--color-board`, `--color-paper`, `--color-card`, `--color-line`, `--color-muted`. Reuse `.board` / `.roundel` / `.sig-label` / `.seg` primitives from `app/globals.css`.
- **Code style:** single quotes, no semicolons, 2-space indent, `@/*` alias.
- **Shared constants:** heatmap `WEEKS = 13`; weakest-words `WEAK_COUNT = 8`; activity `RETAIN_DAYS = 98`.

---

### Task 1: Streak and heatmap pure functions

**Files:**
- Modify: `lib/activity.ts` (add three functions; bump `RETAIN_DAYS`)
- Test: `lib/activity.test.ts` (existing file - append)

**Interfaces:**
- Consumes: existing `ActivityLog = Record<string, number>`, `dayKey(now)`, `DAY`.
- Produces:
  - `studyStreak(log: ActivityLog, now: number): number`
  - `heatmapCells(log: ActivityLog, now: number, weeks: number): HeatCell[]` where `HeatCell = { date: string; count: number; level: 0 | 1 | 2 | 3 }`
  - `totalStudyDays(log: ActivityLog): number`

- [ ] **Step 1: Write the failing tests**

Append to `lib/activity.test.ts`:

```ts
import { studyStreak, heatmapCells, totalStudyDays } from './activity'

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0)
const D = 86_400_000
const key = (n: number) => new Date(n).toISOString().slice(0, 10)

describe('studyStreak', () => {
  it('is 0 for an empty log', () => {
    expect(studyStreak({}, NOW)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const log = { [key(NOW)]: 3, [key(NOW - D)]: 1, [key(NOW - 2 * D)]: 5 }
    expect(studyStreak(log, NOW)).toBe(3)
  })

  it('keeps yesterday\'s run alive when today is not yet studied', () => {
    const log = { [key(NOW - D)]: 2, [key(NOW - 2 * D)]: 2 }
    expect(studyStreak(log, NOW)).toBe(2)
  })

  it('resets after a full missed day', () => {
    const log = { [key(NOW)]: 1, [key(NOW - 2 * D)]: 9 }
    expect(studyStreak(log, NOW)).toBe(1)
  })
})

describe('heatmapCells', () => {
  it('returns weeks*7 cells, oldest first, last cell is today', () => {
    const cells = heatmapCells({}, NOW, 13)
    expect(cells).toHaveLength(91)
    expect(cells[90].date).toBe(key(NOW))
    expect(cells[0].date).toBe(key(NOW - 90 * D))
  })

  it('buckets counts into levels 0-3', () => {
    const log = { [key(NOW)]: 0, [key(NOW - D)]: 2, [key(NOW - 2 * D)]: 9, [key(NOW - 3 * D)]: 40 }
    const byDate = Object.fromEntries(heatmapCells(log, NOW, 13).map((c) => [c.date, c.level]))
    expect(byDate[key(NOW)]).toBe(0)
    expect(byDate[key(NOW - D)]).toBe(1)
    expect(byDate[key(NOW - 2 * D)]).toBe(2)
    expect(byDate[key(NOW - 3 * D)]).toBe(3)
  })
})

describe('totalStudyDays', () => {
  it('counts distinct days with any activity', () => {
    expect(totalStudyDays({ a: 3, b: 0, c: 1 })).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/activity.test.ts`
Expected: FAIL - `studyStreak`, `heatmapCells`, `totalStudyDays` are not exported.

- [ ] **Step 3: Implement the functions and bump retention**

In `lib/activity.ts`, change the retention constant:

```ts
const RETAIN_DAYS = 98
```

Append to `lib/activity.ts`:

```ts
export type HeatCell = { date: string; count: number; level: 0 | 1 | 2 | 3 }

/** Level 1/2/3 lower bounds for the heatmap intensity buckets. */
export const HEAT_LEVELS = [1, 5, 15] as const

function heatLevel(count: number): 0 | 1 | 2 | 3 {
  if (count < HEAT_LEVELS[0]) return 0
  if (count < HEAT_LEVELS[1]) return 1
  if (count < HEAT_LEVELS[2]) return 2
  return 3
}

/**
 * Consecutive days with at least one graded card, ending today or yesterday.
 * Today not-yet-studied does not break a live run - it only breaks after a full
 * missed day, so the streak still reads while today is in progress.
 */
export function studyStreak(log: ActivityLog, now: number): number {
  let streak = 0
  let cursor = (log[dayKey(now)] ?? 0) > 0 ? now : now - DAY
  while ((log[dayKey(cursor)] ?? 0) > 0) {
    streak += 1
    cursor -= DAY
  }
  return streak
}

/**
 * weeks*7 cells ending today, oldest first, so a 7-row grid reads left-to-right
 * by week. The last cell is always today.
 */
export function heatmapCells(log: ActivityLog, now: number, weeks: number): HeatCell[] {
  const days = weeks * 7
  const cells: HeatCell[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(now - i * DAY)
    const count = log[date] ?? 0
    cells.push({ date, count, level: heatLevel(count) })
  }
  return cells
}

export function totalStudyDays(log: ActivityLog): number {
  return Object.values(log).filter((n) => n > 0).length
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/activity.test.ts`
Expected: PASS (all new tests plus the existing activity tests).

- [ ] **Step 5: Commit**

```bash
git add lib/activity.ts lib/activity.test.ts
git commit -m "feat: streak, heatmap, and total-days over the activity log"
```

---

### Task 2: Weakest-cards selection and the drill pool

**Files:**
- Modify: `lib/goals.ts` (add two functions and a constant)
- Test: `lib/goals.test.ts` (existing file - append)

**Interfaces:**
- Consumes: `Card`, `Course` from `@/lib/courses`; `ProgressMap`, `unlockedCards` from `./leitner`.
- Produces:
  - `WEAK_COUNT = 8`
  - `weakestCards(cards: Card[], progress: ProgressMap, n: number): Card[]`
  - `drillPool(course: Course, progress: ProgressMap, mode: string | null): Card[]`

- [ ] **Step 1: Write the failing tests**

Append to `lib/goals.test.ts` (reuse the file's existing `card(...)` helper and synthetic course; if the file builds a course fixture, mirror it - each card needs `id`, `courseId`, `unitId`, `deck`, `jp`, `reading`, `meaning`, `theme`, `origin`):

```ts
import { weakestCards, drillPool, WEAK_COUNT } from './goals'
import type { CardProgress, ProgressMap } from './leitner'

const box = (n: CardProgress['box'], lastSeen = 0): CardProgress => ({
  box: n,
  seen: 1,
  correct: 0,
  lastSeen,
})

describe('weakestCards', () => {
  it('orders by box ascending, then by lastSeen ascending', () => {
    const cards = [
      { id: 'c-strong' } as never,
      { id: 'c-weak-stale' } as never,
      { id: 'c-weak-fresh' } as never,
    ]
    const progress: ProgressMap = {
      'c-strong': box(5, 100),
      'c-weak-stale': box(1, 10),
      'c-weak-fresh': box(1, 99),
    }
    const out = weakestCards(cards, progress, 3).map((c) => c.id)
    expect(out).toEqual(['c-weak-stale', 'c-weak-fresh', 'c-strong'])
  })

  it('treats an unseen card as box 1 and takes at most n', () => {
    const cards = [{ id: 'a' } as never, { id: 'b' } as never, { id: 'c' } as never]
    expect(weakestCards(cards, {}, 2)).toHaveLength(2)
  })
})

describe('drillPool', () => {
  it('returns the full unlocked pool when mode is null', () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    expect(drillPool(course, {}, null).length).toBeGreaterThan(WEAK_COUNT)
  })

  it('returns at most WEAK_COUNT weakest cards when mode is "weak"', () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    expect(drillPool(course, {}, 'weak')).toHaveLength(WEAK_COUNT)
  })
})
```

Add the imports the drill tests need at the top of the appended block if not already present:

```ts
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/goals.test.ts`
Expected: FAIL - `weakestCards`, `drillPool`, `WEAK_COUNT` are not exported.

- [ ] **Step 3: Implement**

In `lib/goals.ts`, extend the leitner import to include `unlockedCards`:

```ts
import { isLearned, isMastered, unlockPoint, unlockedCards, type ProgressMap } from './leitner'
```

Append to `lib/goals.ts`:

```ts
/** How many weak cards the dashboard lists and the focused drill runs on. */
export const WEAK_COUNT = 8

/** The n weakest cards: box ascending, then lastSeen ascending (stalest first).
 *  An unseen card sorts in as box 1, lastSeen 0. */
export function weakestCards(cards: Card[], progress: ProgressMap, n: number): Card[] {
  return [...cards]
    .sort((a, b) => {
      const pa = progress[a.id]
      const pb = progress[b.id]
      const boxDiff = (pa?.box ?? 1) - (pb?.box ?? 1)
      if (boxDiff !== 0) return boxDiff
      return (pa?.lastSeen ?? 0) - (pb?.lastSeen ?? 0)
    })
    .slice(0, n)
}

/** The pool a study session draws from. `mode === 'weak'` focuses it on the
 *  weakest cards; any other value is the full unlocked pool (today's behaviour). */
export function drillPool(course: Course, progress: ProgressMap, mode: string | null): Card[] {
  const pool = unlockedCards(course, progress)
  return mode === 'weak' ? weakestCards(pool, progress, WEAK_COUNT) : pool
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/goals.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/goals.ts lib/goals.test.ts
git commit -m "feat: weakestCards selection and the focused drill pool"
```

---

### Task 3: Focus-mode drill on the study session

**Files:**
- Modify: `app/study/page.tsx` (wrap in Suspense, read `?mode=weak`, use `drillPool`)

**Interfaces:**
- Consumes: `drillPool` from `@/lib/goals` (Task 2); `useSearchParams` from `next/navigation`.
- Produces: no new exports. `/study?mode=weak` drills the weakest cards; `/study` is unchanged.

Note: the selection correctness is covered by `drillPool`'s tests in Task 2. This task's risk is the static-export integration (the `Suspense` boundary around `useSearchParams`), so its gate is the export build plus the existing study tests staying green.

- [ ] **Step 1: Rename the page component and add the Suspense wrapper**

In `app/study/page.tsx`:

1. Change the React import to include `Suspense`:

```ts
import { Suspense, useMemo, useReducer } from 'react'
```

2. Add the navigation import and the goals import; drop the now-unused `unlockedCards`:

```ts
import { useSearchParams } from 'next/navigation'
import { drillPool } from '@/lib/goals'
import { nextCard, type ProgressMap } from '@/lib/leitner'
```

3. Rename the current `export default function StudyPage()` to `function StudySession()` (keep its entire body).

4. Inside `StudySession`, replace the pool memo:

```ts
const mode = useSearchParams().get('mode')
const pool = useMemo(() => drillPool(course, progress, mode), [course, progress, mode])
```

5. Add the new default export at the bottom of the file:

```ts
export default function StudyPage() {
  // useSearchParams must sit under a Suspense boundary for the static export build.
  return (
    <Suspense fallback={null}>
      <StudySession />
    </Suspense>
  )
}
```

- [ ] **Step 2: Run the existing study tests**

Run: `npx vitest run app/study/page.test.tsx`
Expected: PASS - the reducer and phase tests are unaffected (they import the exported pure functions, not the default component).

- [ ] **Step 3: Verify the static export build succeeds**

Run: `npm run build`
Expected: SUCCESS, `/study` prerendered, no "useSearchParams should be wrapped in a suspense boundary" error.

- [ ] **Step 4: Commit**

```bash
git add app/study/page.tsx
git commit -m "feat: focused weak-card drill via /study?mode=weak"
```

---

### Task 4: StreakHeatmap component

**Files:**
- Create: `components/StreakHeatmap.tsx`
- Test: `components/StreakHeatmap.test.tsx`

**Interfaces:**
- Consumes: `useActivity` from `@/lib/useProgress`; `studyStreak`, `heatmapCells`, `totalStudyDays`, `HeatCell` from `@/lib/activity` (Task 1).
- Produces: `<StreakHeatmap />` (default-less named export).

- [ ] **Step 1: Write the failing test**

Create `components/StreakHeatmap.test.tsx` (mirror `components/MasteryBar.test.tsx`'s harness and `vi.resetModules()` setup):

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(node))
  return { container, unmount: () => act(() => root.unmount()) }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('StreakHeatmap', () => {
  it('renders 91 day cells', async () => {
    const { StreakHeatmap } = await import('./StreakHeatmap')
    const { container, unmount } = render(<StreakHeatmap />)
    await act(async () => {})
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(91)
    unmount()
  })

  it('shows a streak from real activity written today and yesterday', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    localStorage.setItem('trainer.activity.v1', JSON.stringify({ [today]: 3, [yesterday]: 2 }))

    const { StreakHeatmap } = await import('./StreakHeatmap')
    const { container, unmount } = render(<StreakHeatmap />)
    await act(async () => {})
    expect(container.textContent).toContain('2-day streak')
    unmount()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/StreakHeatmap.test.tsx`
Expected: FAIL - cannot resolve `./StreakHeatmap`.

- [ ] **Step 3: Implement the component**

Create `components/StreakHeatmap.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { heatmapCells, studyStreak, totalStudyDays, type HeatCell } from '@/lib/activity'
import { useActivity } from '@/lib/useProgress'

const WEEKS = 13

// Stable server/first-client render: 91 empty cells, no clock read. The real
// view is computed post-mount so static-export hydration never mismatches.
const EMPTY_CELLS: HeatCell[] = Array.from({ length: WEEKS * 7 }, () => ({
  date: '',
  count: 0,
  level: 0,
}))

const FILL = ['bg-[var(--color-line)]', 'bg-[#bfe4e8]', 'bg-[#6cc3cc]', 'bg-[var(--color-accent)]']

export function StreakHeatmap() {
  const log = useActivity()
  const [view, setView] = useState<{ streak: number; total: number; cells: HeatCell[] } | null>(
    null,
  )

  useEffect(() => {
    const now = Date.now()
    setView({
      streak: studyStreak(log, now),
      total: totalStudyDays(log),
      cells: heatmapCells(log, now, WEEKS),
    })
  }, [log])

  const cells = view?.cells ?? EMPTY_CELLS

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <div className="flex items-baseline justify-between">
        <span className="sig-label text-xs text-[var(--color-muted)]">Streak</span>
        <span className="text-sm text-[var(--color-muted)]">
          {view ? `${view.total} days studied` : ''}
        </span>
      </div>
      <p className="mt-1 text-lg font-bold">
        {view && view.streak > 0 ? `${view.streak}-day streak` : 'Study today to start a streak'}
      </p>
      <div
        className="mt-3 grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 12px)' }}
      >
        {cells.map((c, i) => (
          <span
            key={c.date || i}
            data-cell
            title={c.date ? `${c.date}: ${c.count}` : undefined}
            className={`w-3 rounded-[2px] ${FILL[c.level]}`}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/StreakHeatmap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/StreakHeatmap.tsx components/StreakHeatmap.test.tsx
git commit -m "feat: StreakHeatmap component"
```

---

### Task 5: WeakWords component

**Files:**
- Create: `components/WeakWords.tsx`
- Test: `components/WeakWords.test.tsx`

**Interfaces:**
- Consumes: `useActiveCourse`, `useProgress` from `@/lib/useProgress`; `weakestCards`, `WEAK_COUNT` from `@/lib/goals` (Task 2); `unlockedCards` from `@/lib/leitner`.
- Produces: `<WeakWords />` named export. Renders a list and a `Link` to `/study?mode=weak`; empty state when nothing is weak.

- [ ] **Step 1: Write the failing test**

Create `components/WeakWords.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'

function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(node))
  return { container, unmount: () => act(() => root.unmount()) }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('WeakWords', () => {
  it('links its drill button to the weak study mode', async () => {
    const { WeakWords } = await import('./WeakWords')
    const { container, unmount } = render(<WeakWords />)
    await act(async () => {})
    const link = container.querySelector('a[href="/study?mode=weak"]')
    expect(link).not.toBeNull()
    unmount()
  })

  it('lists weak cards from the active course (week 1 is always unlocked)', async () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const first = course.cards.find((c) => c.unitId === 'bjt-w01')!
    const { WeakWords } = await import('./WeakWords')
    const { container, unmount } = render(<WeakWords />)
    await act(async () => {})
    expect(container.textContent).toContain(first.jp)
    unmount()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/WeakWords.test.tsx`
Expected: FAIL - cannot resolve `./WeakWords`.

- [ ] **Step 3: Implement the component**

Create `components/WeakWords.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type Card } from '@/lib/courses'
import { WEAK_COUNT, weakestCards } from '@/lib/goals'
import { unlockedCards } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

export function WeakWords() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const [cards, setCards] = useState<Card[] | null>(null)

  useEffect(() => {
    setCards(weakestCards(unlockedCards(course, progress), progress, WEAK_COUNT))
  }, [course, progress])

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <div className="sig-label text-xs text-[var(--color-muted)]">Words to shore up</div>
      {cards && cards.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Nothing to shore up right now - keep studying.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {(cards ?? []).map((c) => (
            <li key={c.id} className="flex items-baseline gap-2 text-sm">
              <span className="jp min-w-6 font-bold">{c.jp}</span>
              <span className="text-[var(--color-muted)]">{c.reading}</span>
              <span className="truncate">{c.meaning}</span>
            </li>
          ))}
        </ul>
      )}
      {(!cards || cards.length > 0) && (
        <Link
          href="/study?mode=weak"
          className="mt-3 block rounded-lg bg-[var(--color-accent-deep)] py-2 text-center text-sm font-bold text-white"
        >
          Drill these ▸
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/WeakWords.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/WeakWords.tsx components/WeakWords.test.tsx
git commit -m "feat: WeakWords component with focused-drill link"
```

---

### Task 6: RouteMap and RouteStrip; repoint /units

**Files:**
- Create: `components/RouteMap.tsx`
- Create: `components/RouteStrip.tsx`
- Modify: `app/units/page.tsx` (render `RouteMap`)
- Test: `components/RouteMap.test.tsx`

**Interfaces:**
- Consumes: `useActiveCourse`, `useProgress`; `unlockedUnits`, `isLearned` from `@/lib/leitner`; `currentUnitGoal` from `@/lib/goals`.
- Produces: `<RouteMap />` and `<RouteStrip />` named exports.

- [ ] **Step 1: Write the failing test**

Create `components/RouteMap.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'

function render(node: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(node))
  return { container, unmount: () => act(() => root.unmount()) }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('RouteMap', () => {
  it('renders every unit as a station, linking only unlocked ones', async () => {
    const course = getCourse(DEFAULT_COURSE_ID)!
    const { RouteMap } = await import('./RouteMap')
    const { container, unmount } = render(<RouteMap />)
    await act(async () => {})
    // With empty progress only week 1 is unlocked -> exactly one drill link.
    const links = container.querySelectorAll('a[href^="/units/"]')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe(`/units/${course.units[0].id}`)
    // All 24 unit themes still render (locked ones are shown, just not links).
    expect(container.textContent).toContain(course.units[0].theme)
    expect(container.textContent).toContain(course.units[23].theme)
    unmount()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/RouteMap.test.tsx`
Expected: FAIL - cannot resolve `./RouteMap`.

- [ ] **Step 3: Implement RouteMap**

Create `components/RouteMap.tsx`:

```tsx
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

export function RouteMap() {
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
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/" className="sig-label text-xs text-[var(--color-muted)]">
        ◂ Back
      </Link>
      <div className="board mb-5 mt-3">
        <span className="lab">The line</span>
        <span className="nxt">{course.units.length} stations</span>
      </div>
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
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/RouteMap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Repoint the units page and add RouteStrip**

Replace `app/units/page.tsx` entirely with:

```tsx
'use client'

import { RouteMap } from '@/components/RouteMap'

export default function UnitsPage() {
  return <RouteMap />
}
```

Create `components/RouteStrip.tsx` (the compact home preview):

```tsx
'use client'

import { useEffect, useState } from 'react'
import { currentUnitGoal } from '@/lib/goals'
import { unlockedUnits } from '@/lib/leitner'
import { useActiveCourse, useProgress } from '@/lib/useProgress'

export function RouteStrip() {
  const { course } = useActiveCourse()
  const { progress } = useProgress()
  const [state, setState] = useState<{ openCount: number; hereIndex: number } | null>(null)

  useEffect(() => {
    const open = unlockedUnits(course, progress)
    const here = currentUnitGoal(course, progress)?.unit.index ?? open.length
    setState({ openCount: open.length, hereIndex: here })
  }, [course, progress])

  const units = [...course.units].sort((a, b) => a.index - b.index)
  const here = state?.hereIndex ?? 0
  const open = state?.openCount ?? 0

  return (
    <div className="mt-2 flex items-center gap-[3px]" aria-hidden="true">
      {units.map((u, i) => {
        const dot =
          u.index === here
            ? 'bg-[var(--color-here)]'
            : u.index < here
              ? 'bg-[var(--color-accent)]'
              : 'bg-[var(--color-line)]'
        return (
          <span key={u.id} className="flex flex-1 items-center gap-[3px]">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {i < units.length - 1 && (
              <span
                className={`seg flex-1 ${u.index < open ? '' : 'pending'}`}
              />
            )}
          </span>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Run the units tests and build**

Run: `npx vitest run components/RouteMap.test.tsx app/units/page.test.tsx`
Expected: the RouteMap test passes. If `app/units/page.test.tsx` asserts the old card-list markup, update those assertions to the RouteMap output (station links to `/units/<id>`, themes present) - do not delete coverage, re-point it.

Run: `npm run build`
Expected: SUCCESS, `/units` and every `/units/<id>` still emitted.

- [ ] **Step 7: Commit**

```bash
git add components/RouteMap.tsx components/RouteStrip.tsx app/units/page.tsx components/RouteMap.test.tsx app/units/page.test.tsx
git commit -m "feat: route map replaces the units list; add home route strip"
```

---

### Task 7: Compose the two-column dashboard home

**Files:**
- Modify: `app/page.tsx` (compose the dashboard)

**Interfaces:**
- Consumes: `StreakHeatmap` (Task 4), `WeakWords` (Task 5), `RouteStrip` (Task 6), existing `MasteryBar`, `useActiveCourse`.
- Produces: the dashboard home. No new exports.

- [ ] **Step 1: Rewrite the home page**

Replace `app/page.tsx` entirely with:

```tsx
'use client'

import Link from 'next/link'
import { CoursePicker } from '@/components/CoursePicker'
import { MasteryBar } from '@/components/MasteryBar'
import { RouteStrip } from '@/components/RouteStrip'
import { StreakHeatmap } from '@/components/StreakHeatmap'
import { WeakWords } from '@/components/WeakWords'
import { useActiveCourse } from '@/lib/useProgress'

export default function Home() {
  const { course } = useActiveCourse()

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
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
        <RouteStrip />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
          <Link
            href="/units"
            className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5"
          >
            <span className="font-semibold">Browse the line</span>
            <span className="text-sm text-[var(--color-muted)]">{course.units.length} stations ▸</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS - all existing and new tests green.

- [ ] **Step 3: Verify the static export build**

Run: `npm run build`
Expected: SUCCESS - `/`, `/study`, `/units`, `/units/<id>`, `/shadow`, `/manifest.webmanifest` all emitted.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: two-column study dashboard home"
```

---

### Task 8: Verify offline and hand off the deploy

**Files:** none (verification only)

- [ ] **Step 1: Confirm no network or ambient-clock regressions**

Run: `grep -rnE "fetch\(|https?://" app components lib --include=*.tsx --include=*.ts | grep -v ".test."`
Expected: no new runtime network calls (matches on comments/hrefs to first-party routes are fine).

Run: `grep -rn "Date.now()" lib --include=*.ts | grep -v ".test."`
Expected: no matches in `lib/` (clock reads live only in components).

- [ ] **Step 2: Full check gate**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all three pass.

- [ ] **Step 3: Hand off the deploy (human-gated)**

Do not deploy from an agent. Report that the branch is ready and give the human the command:

```bash
cd /Users/test/Documents/bjt-trainer && export VERCEL_CLI_UPDATE_NOTIFIER=0 && npx vercel --prod --yes
```

After deploy, the human verifies `https://verba-lang.vercel.app` shows the dashboard and that airplane-mode reload still loads (PWA).

---

## Notes for the executor

- **Hydration pattern is mandatory** for `StreakHeatmap`, `WeakWords`, `RouteMap`, `RouteStrip`: compute the time/localStorage-dependent view in `useEffect` and hold it in `useState`, rendering a stable placeholder first. This mirrors `MasteryBar` and is why the static export never hydration-mismatches.
- **Unit ids are course-prefixed** (`bjt-w01`), so `/units/<id>` links and `generateStaticParams` already line up - do not strip the prefix.
- **`app/units/page.test.tsx` and `app/study/page.test.tsx` already exist**; re-point any assertions that break, never delete coverage.
