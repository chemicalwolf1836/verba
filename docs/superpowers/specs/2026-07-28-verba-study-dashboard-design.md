# Verba Study Dashboard - Design

**Date:** 2026-07-28
**Status:** Approved for planning

## 1. Purpose

The home screen is currently three routing buttons, which reads as empty on a
desktop viewport. Turn it into a **study dashboard** that fills the space with
things that actually help a daily learner: a study streak, an at-a-glance
mastery view, the words that keep beating them, and a route map of their
progress. This is presentation and light aggregation over data the app already
records - no new stores, no network. Offline-first stays intact.

## 2. Scope

### In scope
- **Home (`/`)** becomes a two-column dashboard on desktop, single column on
  mobile (the "Balanced two-column" direction, Option A).
- **Units (`/units`)** becomes a **route map** - the 24 units as stations on a
  vertical line - replacing the current station-card list. Tapping an unlocked
  station drills it (reuses `UnitDrill`).
- **Streak heatmap** - a 13-week grid of daily study activity, with the current
  streak.
- **Words to shore up** - the ~8 weakest cards, with a one-tap focused drill.
- **Route mini-strip** on the home dashboard - a compact preview of the line.

### Out of scope (deliberately)
- Sound effects - a separate, self-contained follow-up spec (`lib/sfx.ts`, Web
  Audio synthesis, mute toggle, iOS-gesture-safe).
- A full-year contribution graph - 13 weeks was chosen to fit a dashboard
  column without horizontal scroll.
- Any change to the scheduler, progress model, or PWA layer beyond the one
  additive focus-mode hook described in 5.3.

## 3. Design direction

Option A, "Balanced two-column": actions on the left, stats on the right, even
weight. Chosen for a calm, understated utility over a stats-first or map-first
hero. Layout in section 6.

## 4. Data - all of it already exists

Nothing new is stored. The features read the current localStorage stores through
the existing hooks (`useProgress`, `useActivity`, `useActiveCourse`).

| Feature | Source (existing) |
|---|---|
| Streak + heatmap | `trainer.activity.v1` - `ActivityLog` = `Record<'YYYY-MM-DD', count>` |
| Mastery bar | `boxDistribution` / `masteredCount` (`lib/goals.ts`) |
| Pace line | `dailyRate` / `projectDays` (`lib/activity.ts`) |
| Weakest words | `CardProgress.box` / `lastSeen` over `unlockedCards` |
| Route map | `course.units`, `unlockedUnits`, `isLearned` per card |

**One data-model change:** bump `RETAIN_DAYS` in `lib/activity.ts` from `30` to
`98` (14 weeks - the 13-week heatmap plus a week of slack). This is
backward-compatible: retention only controls how aggressively old entries are
trimmed on write, so no migration and no key-version bump. The 7-day pace rate
is unaffected.

## 5. New pure logic (small, testable)

Each is a pure function - arguments in, values out, no I/O, no clock read (the
caller injects `now`). Colocated `.test.ts`, matching the existing convention.

### 5.1 `lib/activity.ts` additions
```ts
/** Consecutive days with >= 1 graded card, ending today or yesterday. */
export function studyStreak(log: ActivityLog, now: number): number

/** 7 x weeks cells for the heatmap, oldest-to-newest, aligned to week rows. */
export function heatmapCells(log: ActivityLog, now: number, weeks: number):
  { date: string; count: number; level: 0 | 1 | 2 | 3 }[]

export function totalStudyDays(log: ActivityLog): number
```
- **Streak** counts back from today; today not-yet-studied does *not* break it
  (the streak still shows yesterday's run until the day ends). A gap of one full
  day resets it to 0.
- **Levels** bucket the day's count: 0 = none, then three intensity steps
  (thresholds a tuning constant, e.g. 1-4 / 5-14 / 15+).

### 5.2 `lib/goals.ts` addition
```ts
/** The n weakest cards: box asc, then lastSeen asc (stalest first). Unseen
 *  cards (box 1, lastSeen 0) sort in naturally. */
export function weakestCards(cards: Card[], progress: ProgressMap, n: number): Card[]
```

### 5.3 Focus-mode drill (the "Drill these" mechanic)
The study page reads a `mode` search param (client-side; `useSearchParams` works
under static export). When `?mode=weak`, the session's pool is
`weakestCards(unlockedCards(course, progress), progress, N)` instead of the full
unlocked pool - the page re-derives the weak set, so no card ids travel in the
URL. Everything else about the session (reducer, grading, ring) is unchanged.
When the param is absent, behaviour is exactly as today.

## 6. Components and layout

### New components
- `StreakHeatmap` - the 13-week grid + streak header. Reads `useActivity()`.
- `RouteMap` - the vertical station line; `/units` renders this. Reads
  `useActiveCourse()` + `useProgress()`.
- `RouteStrip` - the compact home mini-strip (dots + segments, "you are here").
- `WeakWords` - the list + "Drill these" link to `/study?mode=weak`.
- `DashboardHome` composition lives in `app/page.tsx`.

`MasteryBar` (exists) and the pace line are reused as-is on the right column.

### Home layout (Option A)
```
DESKTOP                                        MOBILE (single column, priority order)
┌──────────────────────────────────────────┐   board
│ [board: BJT · Business Japanese · 400]    │   VERBA
│ VERBA                                      │   route mini-strip
│ ●━●━●━○━○  route mini-strip                │   Start studying (CTA)
├─────────────────────┬──────────────────────┤   streak heatmap
│ Start studying ▸    │ STREAK  5-day streak  │   mastery bar
│ (teal CTA)          │ ▪▪▫▪▪▪▫ ... 13 weeks  │   words to shore up + Drill
│ Shadowing ▸         │ MASTERY ██▓▒░ 31      │   shadowing
│ ── Words to shore ──│ ~9 weeks at pace      │
│ は wa · topic       │                       │
│ [ Drill these ▸ ]   │                       │
└─────────────────────┴──────────────────────┘
```
Two columns via CSS grid, collapsing to one below the `md` breakpoint. The
existing `min-height: 100dvh` + centered body keeps a short dashboard centered.

### Route map (`/units`)
The 24 units as stations down a vertical teal line, Rosen-zu style. Each station:
a roundel with the unit index, the theme, and `learned / total`. States:
**mastered** (filled roundel), **in-progress unlocked** (teal ring), **locked**
(dimmed, not tappable), with an **amber "you are here"** marker on the current
unit (lowest unfinished unlocked, from `currentUnitGoal`). Tapping an unlocked
station navigates to its existing drill route (`/units/<unitId>`). The lock rule
is the same `unlockedUnits` gate the app already enforces.

## 7. Constraints honored

- **Offline** - reads localStorage only; no network, no remote assets. Any SVG
  is inline.
- **Hydration-safe** - all reads go through the `useSyncExternalStore` hooks;
  nothing reads `localStorage` in a component body.
- **Static export** - `useSearchParams` for the drill mode is client-side and
  export-safe.
- **No em-dashes** in copy - spaced hyphens per the standing style rule.
- **Design tokens** - teal accent, amber "here", board, paper; reuse the
  existing `.board` / `.roundel` / `.sig-label` primitives.
- **Course-agnostic** - the route map and stats read the active course, so they
  work for any future course with no change.

## 8. Testing

Pure functions carry the coverage:
- `studyStreak` - empty log (0), a one-day gap resets, today-not-yet-studied
  keeps yesterday's run, a multi-day run counts correctly.
- `heatmapCells` - 13-week window length, alignment, level bucketing thresholds.
- `totalStudyDays` - distinct-day count.
- `weakestCards` - box-then-lastSeen ordering, ties, fewer-than-n, unseen cards
  first.

Components render against real store data (the existing harness pattern): the
weak-words empty state, the route map's locked-vs-unlocked rendering, and the
drill link target (`/study?mode=weak`).

## 9. Build order

1. Pure logic + tests: `studyStreak`, `heatmapCells`, `totalStudyDays`,
   `weakestCards`; bump `RETAIN_DAYS`.
2. Focus-mode drill: `/study?mode=weak` reads the weak pool.
3. `StreakHeatmap`, `WeakWords`, `RouteStrip` components.
4. `RouteMap` component; repoint `/units` to it.
5. `DashboardHome` - compose the two-column layout in `app/page.tsx`.
6. Verify offline + static export build; deploy.

## 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Streak/heatmap look empty for a brand-new user (no history) | Low | Honest empty state ("Study today to start a streak"); the grid still renders as an empty calendar |
| 13-week grid overflows a narrow mobile column | Low | Cells are `aspect-ratio: 1` in a 13-col grid that scales down; no fixed px width |
| Weakest-words list is empty once everything is learned | Low | Friendly "nothing to shore up" empty state |
| Route map with 24 stations is tall on `/units` | Low | It scrolls naturally; that is expected for a station browser |

## 11. Open items

None. Sound effects tracked as a separate follow-up spec.
