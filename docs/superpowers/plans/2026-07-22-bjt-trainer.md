# BJT Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-capable Japanese vocabulary trainer for BJT study, deployed to Vercel, generalising to other courses such as JLPT.

**Architecture:** A fully static Next.js App Router site. Vocabulary is compiled into the bundle; progress lives in `localStorage`. All scheduling logic is pure functions in `lib/` with colocated Vitest tests, importing nothing course-specific. Audio uses the browser `SpeechSynthesis` API so it works with no network.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, TypeScript 5 (strict), Tailwind v4, Vitest + jsdom, Vercel.

**Spec:** `docs/superpowers/specs/2026-07-22-bjt-trainer-design.md`

## Global Constraints

- **Offline is a hard constraint.** No `fetch`, no network calls, no remote fonts, no remote images anywhere in the app. Vocabulary is imported, never loaded.
- **`output: 'export'`** in `next.config.ts`. This makes any server dependency a build error.
- **No em-dashes in user-facing copy.** Write a spaced hyphen ` - ` instead. Applies to all UI strings, headings, and docs. Does not apply to code operators or numeric ranges.
- **`lib/leitner.ts` must never import anything BJT-specific.** It sees `Card[]`, `ProgressMap`, `Course` and nothing else. This is a review gate, verifiable with `grep`.
- **No ambient randomness or clock reads in `lib/`.** `Math.random()` and `Date.now()` are forbidden inside pure modules; callers inject `now: number`. This keeps tests deterministic.
- **Code style, matching `~/Documents/wander`:** single quotes, no semicolons, 2-space indent, `@/*` path alias to the project root.
- **Two progress thresholds, never conflated:** `learned` is `box >= 2`; `mastered` is `box === 5`. Only `lib/leitner.ts` compares boxes directly.
- **Storage keys are not course-prefixed:** `trainer.progress.v1`, `trainer.activity.v1`.

---

## File Structure

| File | Responsibility |
|---|---|
| `next.config.ts` | Static export, Turbopack root pin, React Compiler |
| `vitest.config.ts` | jsdom environment, `@` alias |
| `lib/courses/types.ts` | `Card`, `Unit`, `Course`, `Deck`, `Origin` - no logic |
| `lib/courses/bjt.ts` | The BJT course: 192 vocab cards, 15 phrases, 24 units |
| `lib/courses/index.ts` | Course registry and lookup |
| `lib/leitner.ts` | Boxes, grading, unlocking, queue selection. Pure. Course-agnostic. |
| `lib/goals.ts` | Ring and bar arithmetic derived from `leitner` predicates |
| `lib/progress.ts` | `localStorage` load/save/subscribe for `ProgressMap` |
| `lib/activity.ts` | Rolling daily counts, 7-day rate, completion projection |
| `lib/answer.ts` | Kana/romaji answer matching |
| `lib/speech.ts` | `SpeechSynthesis` wrapper, voice detection |
| `lib/useProgress.ts` | React binding over `progress.ts` via `useSyncExternalStore` |
| `app/study/page.tsx` | Endless session runner, session reducer |
| `components/*` | Presentational only - no storage access, no scheduling logic |

---

## Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: nothing
- Produces: a running dev server, a passing `npm test`, and a passing `npm run build`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bjt-trainer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "babel-plugin-react-compiler": "1.0.0",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes with no `ERR!` lines; `node_modules/` exists.

- [ ] **Step 3: Read the Next 16 docs before writing app code**

Run: `ls node_modules/next/dist/docs/`

Both existing projects carry an `AGENTS.md` warning that this Next version differs from model training data. Skim the App Router and `output: 'export'` pages before Step 4. Do not skip this - if `output: 'export'` has moved or changed shape in 16.2, Step 4 is wrong and the build will fail in a confusing way.

- [ ] **Step 4: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export. Nothing may depend on a server at runtime - this turns the
  // offline constraint into a build error rather than a discipline to remember.
  output: 'export',
  reactCompiler: true,
  // Pin the project root. Without this, Turbopack walks up and finds an unrelated
  // package-lock.json in the home directory, then guesses the wrong workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
}

export default nextConfig
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Create `postcss.config.mjs`**

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

- [ ] **Step 7: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    // jsdom gives us window + localStorage for the storage-backed modules
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
```

- [ ] **Step 8: Create `app/globals.css`**

Fonts are declared as system stacks. Do not use `next/font/google` - it fetches at build time and the resulting CSS references remote font files, which breaks the offline constraint.

```css
@import "tailwindcss";

@theme {
  --color-paper: #f4efe6;
  --color-card: #fbf8f1;
  --color-ink: #1a1714;
  --color-line: #ddd4c3;
  --color-muted: #8a8170;
  --color-accent: #b5421f;
  --color-green: #3d6b4a;
  --font-sans: ui-sans-serif, system-ui, "Hiragino Sans", "Yu Gothic", sans-serif;
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

- [ ] **Step 9: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BJT Trainer',
  description: 'Offline Japanese vocabulary trainer for the BJT',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
```

- [ ] **Step 10: Create `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">BJT Trainer</h1>
    </main>
  )
}
```

- [ ] **Step 11: Verify the build passes**

Run: `npm run build`
Expected: build succeeds and prints a static export summary. An `out/` directory exists.

If it fails with an `output: 'export'` error naming a dynamic feature, that feature is out of scope - remove it rather than removing the export setting.

- [ ] **Step 12: Verify the test runner works**

Run: `npm test`
Expected: `No test files found` and exit code 0. This confirms Vitest resolves its config before any tests exist.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next 16 project with static export and vitest"
```

---

## Task 2: Speech wrapper and a hardcoded card with working audio

Delivers the earliest real proof: a card on screen that speaks Japanese offline. Do this before the data layer so audio problems surface on a real device immediately, not after a week of logic work.

**Files:**
- Create: `lib/speech.ts`, `app/study/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type SpeechStatus = 'ready' | 'no-japanese-voice' | 'unsupported'`
  - `speechStatus(): SpeechStatus`
  - `speak(text: string, opts?: { rate?: number }): void`
  - `cancel(): void`
  - `onVoicesChanged(fn: () => void): () => void`

- [ ] **Step 1: Create `lib/speech.ts`**

```ts
export type SpeechStatus = 'ready' | 'no-japanese-voice' | 'unsupported'

const isJapanese = (v: SpeechSynthesisVoice) =>
  typeof v.lang === 'string' && v.lang.toLowerCase().replace('_', '-').startsWith('ja')

function japaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  return window.speechSynthesis.getVoices().find(isJapanese) ?? null
}

export function speechStatus(): SpeechStatus {
  if (typeof window === 'undefined' || !window.speechSynthesis) return 'unsupported'
  // getVoices() returns [] on first call in Chrome - voices load asynchronously.
  // Callers must re-check after onVoicesChanged fires before trusting this.
  return japaneseVoice() ? 'ready' : 'no-japanese-voice'
}

export function onVoicesChanged(fn: () => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {}
  const synth = window.speechSynthesis
  synth.addEventListener('voiceschanged', fn)
  return () => synth.removeEventListener('voiceschanged', fn)
}

export function cancel(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

export function speak(text: string, opts?: { rate?: number }): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  // Cancel first, or rapid taps queue utterances and the user hears several cards
  // in sequence.
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = opts?.rate ?? 0.85
  const voice = japaneseVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}
```

- [ ] **Step 2: Create `app/study/page.tsx` with one hardcoded card**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { speak, speechStatus, onVoicesChanged, type SpeechStatus } from '@/lib/speech'

const CARD = {
  jp: '会議',
  reading: 'かいぎ',
  meaning: 'meeting',
  exampleJp: '会議は十時に始まります',
  exampleEn: 'The meeting begins at ten',
}

export default function StudyPage() {
  const [status, setStatus] = useState<SpeechStatus>('unsupported')
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setStatus(speechStatus())
    return onVoicesChanged(() => setStatus(speechStatus()))
  }, [])

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {status === 'no-japanese-voice' && (
        <p className="mb-4 rounded-lg bg-orange-100 p-3 text-sm text-orange-900">
          No Japanese voice is installed on this device, so audio will be read with an
          English voice. Add a Japanese voice in your system settings.
        </p>
      )}

      <button
        onClick={() => speak(CARD.jp)}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-3xl text-white"
        aria-label="Play audio"
      >
        ▶
      </button>

      {revealed ? (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-4xl font-bold">{CARD.jp}</p>
          <p className="mt-1 text-[var(--color-muted)]">{CARD.reading}</p>
          <p className="mt-2 text-lg">{CARD.meaning}</p>
          <p className="mt-4 border-t border-dashed border-[var(--color-line)] pt-4">
            {CARD.exampleJp}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{CARD.exampleEn}</p>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          Reveal
        </button>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Link it from the home page**

Replace `app/page.tsx` with:

```tsx
import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">BJT Trainer</h1>
      <Link
        href="/study"
        className="mt-6 block rounded-lg bg-[var(--color-ink)] py-3 text-center font-bold text-[var(--color-card)]"
      >
        Start studying
      </Link>
    </main>
  )
}
```

- [ ] **Step 4: Verify audio on a real device**

Run: `npm run dev`

Open `/study` and tap the play button. Expected: you hear 会議 spoken in Japanese.

This is a manual gate, and it must be checked on the phone you actually study on, not only on the desktop. If the warning banner appears, install a Japanese voice before continuing - the rest of the app assumes audio works.

- [ ] **Step 5: Verify the build still passes**

Run: `npm run build`
Expected: succeeds. `'use client'` and static export coexist correctly.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add speech wrapper and hardcoded card with working audio"
```

---

## Task 3: Course model and vocabulary migration

`lib/vocabulary.ts` was written before the course model existed. It uses `week: number | null` and IDs like `vocab-会議`. This task migrates it without changing any row data.

**Files:**
- Create: `lib/courses/types.ts`, `lib/courses/index.ts`, `lib/courses/bjt.test.ts`
- Modify: `lib/vocabulary.ts` → move to `lib/courses/bjt.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Card = { id, courseId, unitId, deck, jp, reading, meaning, exampleJp?, exampleEn?, theme, origin }`
  - `type Unit = { id: string; index: number; theme: string }`
  - `type Course = { id: string; name: string; unitLabel: string; units: Unit[]; cards: Card[] }`
  - `BJT_COURSE: Course`
  - `getCourse(id: string): Course | undefined`
  - `COURSES: Course[]`

- [ ] **Step 1: Create `lib/courses/types.ts`**

```ts
export type Deck = 'vocab' | 'phrase'
export type Origin = 'prototype' | 'drafted'

export type Unit = {
  id: string
  index: number
  theme: string
}

export type Card = {
  /** Course-prefixed and content-derived, e.g. 'bjt-vocab-会議'. Never positional. */
  id: string
  courseId: string
  /** Empty string for cards outside the unit plan, such as phrases. */
  unitId: string
  deck: Deck
  jp: string
  reading: string
  meaning: string
  exampleJp?: string
  exampleEn?: string
  theme: string
  origin: Origin
}

export type Course = {
  id: string
  name: string
  /** Renders as "Week 5" or "Set 5" depending on the course. */
  unitLabel: string
  units: Unit[]
  cards: Card[]
}
```

- [ ] **Step 2: Move the data file**

```bash
git mv lib/vocabulary.ts lib/courses/bjt.ts
```

- [ ] **Step 3: Rewrite the exports at the bottom of `lib/courses/bjt.ts`**

Leave `VOCAB_ROWS` and `PHRASE_ROWS` and the file header comment exactly as they are. Delete the old `Card`/`Deck`/`Origin` type declarations and everything from `const expand` to the end of the file, replacing it with:

```ts
import type { Card, Course, Origin, Unit } from './types'

const COURSE_ID = 'bjt'

const expand = (o: 'p' | 'd'): Origin => (o === 'p' ? 'prototype' : 'drafted')

const unitIdFor = (week: number) => `w${String(week).padStart(2, '0')}`

const VOCAB_CARDS: Card[] = VOCAB_ROWS.map(
  ([jp, reading, meaning, exampleJp, exampleEn, week, theme, origin]) => ({
    id: `${COURSE_ID}-vocab-${jp}`,
    courseId: COURSE_ID,
    unitId: unitIdFor(week),
    deck: 'vocab' as const,
    jp,
    reading,
    meaning,
    exampleJp,
    exampleEn,
    theme,
    origin: expand(origin),
  }),
)

const PHRASE_CARDS: Card[] = PHRASE_ROWS.map(([jp, reading, meaning, origin]) => ({
  id: `${COURSE_ID}-phrase-${jp}`,
  courseId: COURSE_ID,
  unitId: '',
  deck: 'phrase' as const,
  jp,
  reading,
  meaning,
  theme: 'Business phrases',
  origin: expand(origin),
}))

const UNITS: Unit[] = Array.from({ length: 24 }, (_, i) => {
  const week = i + 1
  const id = unitIdFor(week)
  return { id, index: week, theme: VOCAB_CARDS.find((c) => c.unitId === id)?.theme ?? '' }
})

export const BJT_COURSE: Course = {
  id: COURSE_ID,
  name: 'BJT - Business Japanese',
  unitLabel: 'Week',
  units: UNITS,
  cards: [...VOCAB_CARDS, ...PHRASE_CARDS],
}
```

Note the type-only import must sit at the top of the file, not mid-file. Move it up with the other imports when you edit.

- [ ] **Step 4: Create `lib/courses/index.ts`**

```ts
import { BJT_COURSE } from './bjt'
import type { Course } from './types'

export const COURSES: Course[] = [BJT_COURSE]

export const DEFAULT_COURSE_ID = 'bjt'

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

export * from './types'
```

- [ ] **Step 5: Write the failing integrity test**

Create `lib/courses/bjt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { BJT_COURSE } from './bjt'

const vocab = BJT_COURSE.cards.filter((c) => c.deck === 'vocab')
const phrases = BJT_COURSE.cards.filter((c) => c.deck === 'phrase')

describe('BJT course dataset', () => {
  it('has 192 vocabulary cards and 15 phrases', () => {
    expect(vocab).toHaveLength(192)
    expect(phrases).toHaveLength(15)
  })

  it('has 24 units with exactly 8 vocabulary cards each', () => {
    expect(BJT_COURSE.units).toHaveLength(24)
    for (const unit of BJT_COURSE.units) {
      expect(vocab.filter((c) => c.unitId === unit.id)).toHaveLength(8)
    }
  })

  it('gives every unit a single theme matching its cards', () => {
    for (const unit of BJT_COURSE.units) {
      const themes = new Set(vocab.filter((c) => c.unitId === unit.id).map((c) => c.theme))
      expect(themes.size).toBe(1)
      expect(themes.has(unit.theme)).toBe(true)
    }
  })

  it('has unique, course-prefixed ids', () => {
    const ids = BJT_COURSE.cards.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('bjt-'))).toBe(true)
  })

  it('has no empty required fields', () => {
    for (const c of BJT_COURSE.cards) {
      expect(c.jp.trim()).not.toBe('')
      expect(c.reading.trim()).not.toBe('')
      expect(c.meaning.trim()).not.toBe('')
    }
  })

  it('gives every vocabulary card an example sentence and phrases none', () => {
    expect(vocab.every((c) => Boolean(c.exampleJp && c.exampleEn))).toBe(true)
    expect(phrases.every((c) => c.exampleJp === undefined)).toBe(true)
  })

  it('tracks provenance: 66 from the prototype, 126 drafted', () => {
    expect(vocab.filter((c) => c.origin === 'prototype')).toHaveLength(66)
    expect(vocab.filter((c) => c.origin === 'drafted')).toHaveLength(126)
  })
})
```

- [ ] **Step 6: Run the test**

Run: `npx vitest run lib/courses/bjt.test.ts`
Expected: PASS, 7 tests. If "has 24 units with exactly 8 cards each" fails, the `unitIdFor` padding in Step 3 does not match the `unitId` used in `UNITS` - check both use `w01`-style ids.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: migrate vocabulary to the course model with integrity tests"
```

---

## Task 4: Leitner boxes and progress predicates

**Files:**
- Create: `lib/leitner.ts`, `lib/leitner.test.ts`

**Interfaces:**
- Consumes: `Card`, `Course`, `Unit` from `@/lib/courses`
- Produces:
  - `type Box = 1 | 2 | 3 | 4 | 5`
  - `type CardProgress = { box: Box; seen: number; correct: number; lastSeen: number }`
  - `type ProgressMap = Record<string, CardProgress>`
  - `TUNING = { NEW_CARD_INTERVAL: 5, MIN_GAP: 8, UNLOCK_THRESHOLD: 0.75 }`
  - `isLearned(p?: CardProgress): boolean`
  - `isMastered(p?: CardProgress): boolean`
  - `grade(prev: CardProgress | undefined, correct: boolean, now: number): CardProgress`

- [ ] **Step 1: Write the failing test**

Create `lib/leitner.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { grade, isLearned, isMastered, type CardProgress } from './leitner'

const NOW = 1_700_000_000_000

const at = (box: CardProgress['box']): CardProgress => ({
  box,
  seen: 1,
  correct: 0,
  lastSeen: 0,
})

describe('isLearned', () => {
  it('treats a missing record as box 1, which is not learned', () => {
    expect(isLearned(undefined)).toBe(false)
    expect(isLearned(at(1))).toBe(false)
  })

  it('is true from box 2 upward', () => {
    expect(isLearned(at(2))).toBe(true)
    expect(isLearned(at(5))).toBe(true)
  })
})

describe('isMastered', () => {
  it('is true only in box 5', () => {
    expect(isMastered(undefined)).toBe(false)
    expect(isMastered(at(4))).toBe(false)
    expect(isMastered(at(5))).toBe(true)
  })
})

describe('grade', () => {
  it('starts an unseen card in box 2 when answered correctly', () => {
    const p = grade(undefined, true, NOW)
    expect(p).toEqual({ box: 2, seen: 1, correct: 1, lastSeen: NOW })
  })

  it('starts an unseen card in box 1 when missed', () => {
    const p = grade(undefined, false, NOW)
    expect(p).toEqual({ box: 1, seen: 1, correct: 0, lastSeen: NOW })
  })

  it('promotes one box at a time and caps at 5', () => {
    expect(grade(at(3), true, NOW).box).toBe(4)
    expect(grade(at(5), true, NOW).box).toBe(5)
  })

  it('resets to box 1 on a miss, not one box down', () => {
    expect(grade(at(5), false, NOW).box).toBe(1)
  })

  it('increments counters and stamps lastSeen', () => {
    const prev: CardProgress = { box: 2, seen: 3, correct: 2, lastSeen: 1 }
    expect(grade(prev, true, NOW)).toEqual({ box: 3, seen: 4, correct: 3, lastSeen: NOW })
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run lib/leitner.test.ts`
Expected: FAIL - cannot resolve `./leitner`.

- [ ] **Step 3: Create `lib/leitner.ts`**

```ts
import type { Card, Course, Unit } from '@/lib/courses'

export type Box = 1 | 2 | 3 | 4 | 5

export type CardProgress = {
  box: Box
  seen: number
  correct: number
  /** Epoch ms. Injected by the caller - this module never reads the clock. */
  lastSeen: number
}

export type ProgressMap = Record<string, CardProgress>

/**
 * Chosen defaults with no empirical basis. Revisit after roughly a week of real
 * study - see section 15 of the design spec.
 */
export const TUNING = {
  /** Every Nth queue position prefers an unseen card. */
  NEW_CARD_INTERVAL: 5,
  /** Do not repeat a card within this many positions. */
  MIN_GAP: 8,
  /** Fraction of a unit that must be learned before the next unlocks. */
  UNLOCK_THRESHOLD: 0.75,
} as const

const boxOf = (p?: CardProgress): Box => p?.box ?? 1

export const isLearned = (p?: CardProgress): boolean => boxOf(p) >= 2
export const isMastered = (p?: CardProgress): boolean => boxOf(p) === 5

export function grade(
  prev: CardProgress | undefined,
  correct: boolean,
  now: number,
): CardProgress {
  const current = boxOf(prev)
  // A miss goes straight back to box 1, not one box down. Partial credit for a
  // word you just failed is how cards drift upward without being known.
  const box = (correct ? Math.min(current + 1, 5) : 1) as Box
  return {
    box,
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    lastSeen: now,
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/leitner.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Verify the course-agnostic constraint**

Run: `grep -nE "bjt|BJT|会議|week|Week" lib/leitner.ts`
Expected: no matches. If any appear, course-specific knowledge has leaked into the scheduler and must be moved to the caller.

- [ ] **Step 6: Commit**

```bash
git add lib/leitner.ts lib/leitner.test.ts
git commit -m "feat: add Leitner boxes, grading, and progress predicates"
```

---

## Task 5: Unit unlocking and the interleaved queue

The heart of the endless session. Without interleaving, every unseen card outranks every review and a long session marches through all 192 new words before a single repetition.

**Files:**
- Modify: `lib/leitner.ts`, `lib/leitner.test.ts`

**Interfaces:**
- Consumes: Task 4 exports
- Produces:
  - `unlockPoint(unitCardCount: number): number`
  - `unlockedUnits(course: Course, progress: ProgressMap): Unit[]`
  - `unlockedCards(course: Course, progress: ProgressMap): Card[]`
  - `nextCard(pool: Card[], progress: ProgressMap, history: string[]): Card | null`

- [ ] **Step 1: Write the failing test**

Append to `lib/leitner.test.ts`:

```ts
import { nextCard, unlockPoint, unlockedUnits, unlockedCards, TUNING } from './leitner'
import type { Card, Course } from '@/lib/courses'

const card = (id: string, unitId: string): Card => ({
  id,
  courseId: 'test',
  unitId,
  deck: 'vocab',
  jp: id,
  reading: id,
  meaning: id,
  theme: 't',
  origin: 'drafted',
})

const course: Course = {
  id: 'test',
  name: 'Test',
  unitLabel: 'Unit',
  units: [
    { id: 'u1', index: 1, theme: 't' },
    { id: 'u2', index: 2, theme: 't' },
    { id: 'u3', index: 3, theme: 't' },
  ],
  cards: [
    ...Array.from({ length: 4 }, (_, i) => card(`a${i}`, 'u1')),
    ...Array.from({ length: 4 }, (_, i) => card(`b${i}`, 'u2')),
    ...Array.from({ length: 4 }, (_, i) => card(`c${i}`, 'u3')),
  ],
}

const learned = (ids: string[]): Record<string, CardProgress> =>
  Object.fromEntries(ids.map((id) => [id, { box: 2 as const, seen: 1, correct: 1, lastSeen: 1 }]))

describe('unlockPoint', () => {
  it('rounds up to 75% of the unit', () => {
    expect(unlockPoint(8)).toBe(6)
    expect(unlockPoint(4)).toBe(3)
    expect(unlockPoint(1)).toBe(1)
  })
})

describe('unlockedUnits', () => {
  it('unlocks only the first unit with no progress', () => {
    expect(unlockedUnits(course, {}).map((u) => u.id)).toEqual(['u1'])
  })

  it('unlocks the next unit once the threshold is met, not the whole unit', () => {
    // 3 of 4 is exactly the 75% threshold
    expect(unlockedUnits(course, learned(['a0', 'a1', 'a2'])).map((u) => u.id)).toEqual([
      'u1',
      'u2',
    ])
  })

  it('does not unlock past a unit that has not met the threshold', () => {
    const p = learned(['a0', 'a1', 'a2', 'a3', 'b0'])
    expect(unlockedUnits(course, p).map((u) => u.id)).toEqual(['u1', 'u2'])
  })
})

describe('unlockedCards', () => {
  it('includes cards with no unit, such as phrases, from the start', () => {
    const withPhrase: Course = {
      ...course,
      cards: [...course.cards, card('p0', '')],
    }
    expect(unlockedCards(withPhrase, {}).map((c) => c.id)).toContain('p0')
  })
})

describe('nextCard', () => {
  const pool = course.cards.filter((c) => c.unitId === 'u1')

  it('returns null when the pool is empty', () => {
    expect(nextCard([], {}, [])).toBeNull()
  })

  it('serves an unseen card at position 0', () => {
    expect(nextCard(pool, {}, [])?.id).toBe('a0')
  })

  it('prefers the weakest review card at a non-new position', () => {
    // history length 1 is not a multiple of NEW_CARD_INTERVAL, so a review is due
    const p: Record<string, CardProgress> = {
      a0: { box: 4, seen: 2, correct: 2, lastSeen: 10 },
      a1: { box: 1, seen: 2, correct: 0, lastSeen: 20 },
      a2: { box: 2, seen: 2, correct: 1, lastSeen: 5 },
      a3: { box: 3, seen: 2, correct: 1, lastSeen: 1 },
    }
    expect(nextCard(pool, p, ['x'])?.id).toBe('a1')
  })

  it('breaks ties within a box by staleness, oldest first', () => {
    const p: Record<string, CardProgress> = {
      a0: { box: 2, seen: 1, correct: 1, lastSeen: 50 },
      a1: { box: 2, seen: 1, correct: 1, lastSeen: 10 },
      a2: { box: 2, seen: 1, correct: 1, lastSeen: 30 },
      a3: { box: 2, seen: 1, correct: 1, lastSeen: 20 },
    }
    expect(nextCard(pool, p, ['x'])?.id).toBe('a1')
  })

  it('avoids repeating a card seen within MIN_GAP positions', () => {
    const p: Record<string, CardProgress> = {
      a0: { box: 1, seen: 1, correct: 0, lastSeen: 1 },
      a1: { box: 2, seen: 1, correct: 1, lastSeen: 1 },
      a2: { box: 3, seen: 1, correct: 1, lastSeen: 1 },
      a3: { box: 4, seen: 1, correct: 1, lastSeen: 1 },
    }
    // a0 is the weakest but was just shown
    expect(nextCard(pool, p, ['x', 'a0'])?.id).toBe('a1')
  })

  it('ignores MIN_GAP when nothing else is available', () => {
    const single = [card('solo', 'u1')]
    const p: Record<string, CardProgress> = {
      solo: { box: 2, seen: 1, correct: 1, lastSeen: 1 },
    }
    expect(nextCard(single, p, ['solo'])?.id).toBe('solo')
  })

  it('interleaves a new card every NEW_CARD_INTERVAL positions', () => {
    const p: Record<string, CardProgress> = {
      a0: { box: 2, seen: 1, correct: 1, lastSeen: 1 },
      a1: { box: 2, seen: 1, correct: 1, lastSeen: 2 },
    }
    // a2 and a3 are unseen; position 5 is a multiple of NEW_CARD_INTERVAL
    const history = ['q', 'r', 's', 't', 'u']
    expect(history.length % TUNING.NEW_CARD_INTERVAL).toBe(0)
    expect(nextCard(pool, p, history)?.id).toBe('a2')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run lib/leitner.test.ts`
Expected: FAIL - `unlockPoint` is not exported.

- [ ] **Step 3: Append the implementation to `lib/leitner.ts`**

```ts
/** Cards needed in a unit before the next one opens. Rounds up. */
export function unlockPoint(unitCardCount: number): number {
  return Math.ceil(unitCardCount * TUNING.UNLOCK_THRESHOLD)
}

function learnedInUnit(course: Course, unit: Unit, progress: ProgressMap): number {
  return course.cards.filter((c) => c.unitId === unit.id && isLearned(progress[c.id])).length
}

/**
 * Units unlock by demonstrated mastery, never by calendar date. This is what makes
 * pace emergent: study heavily and units open in days, lightly and they open in weeks.
 */
export function unlockedUnits(course: Course, progress: ProgressMap): Unit[] {
  const ordered = [...course.units].sort((a, b) => a.index - b.index)
  const out: Unit[] = []
  for (const unit of ordered) {
    out.push(unit)
    const total = course.cards.filter((c) => c.unitId === unit.id).length
    if (learnedInUnit(course, unit, progress) < unlockPoint(total)) break
  }
  return out
}

export function unlockedCards(course: Course, progress: ProgressMap): Card[] {
  const open = new Set(unlockedUnits(course, progress).map((u) => u.id))
  // Cards with no unit - phrases - are available from the start.
  return course.cards.filter((c) => c.unitId === '' || open.has(c.unitId))
}

/**
 * Lazy queue. Deterministic given its arguments, so tests never stub Math.random.
 * `history` is the ids already shown this session, oldest first.
 */
export function nextCard(
  pool: Card[],
  progress: ProgressMap,
  history: string[],
): Card | null {
  if (pool.length === 0) return null

  const recent = new Set(history.slice(-TUNING.MIN_GAP))
  const unseen = pool.filter((c) => (progress[c.id]?.seen ?? 0) === 0)
  const seen = pool.filter((c) => (progress[c.id]?.seen ?? 0) > 0)

  const wantsNew = history.length % TUNING.NEW_CARD_INTERVAL === 0
  if (wantsNew && unseen.length > 0) return unseen[0]

  const byWeakest = [...seen].sort((a, b) => {
    const pa = progress[a.id]
    const pb = progress[b.id]
    const boxDiff = (pa?.box ?? 1) - (pb?.box ?? 1)
    if (boxDiff !== 0) return boxDiff
    return (pa?.lastSeen ?? 0) - (pb?.lastSeen ?? 0)
  })

  const fresh = byWeakest.find((c) => !recent.has(c.id))
  if (fresh) return fresh
  if (unseen.length > 0) return unseen[0]
  // Everything is recent - MIN_GAP yields rather than stalling the session.
  return byWeakest[0] ?? null
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/leitner.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Re-verify the course-agnostic constraint**

Run: `grep -nE "bjt|BJT|会議" lib/leitner.ts`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add lib/leitner.ts lib/leitner.test.ts
git commit -m "feat: add mastery-gated unlocking and interleaved card queue"
```

---

## Task 6: Progress persistence

**Files:**
- Create: `lib/progress.ts`, `lib/progress.test.ts`

**Interfaces:**
- Consumes: `ProgressMap` from `@/lib/leitner`
- Produces:
  - `PROGRESS_KEY = 'trainer.progress.v1'`
  - `loadProgress(): ProgressMap`
  - `saveProgress(next: ProgressMap): void`
  - `subscribeProgress(fn: () => void): () => void`

- [ ] **Step 1: Write the failing test**

Create `lib/progress.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { PROGRESS_KEY, loadProgress, saveProgress } from './progress'
import type { ProgressMap } from './leitner'

const sample: ProgressMap = {
  'bjt-vocab-会議': { box: 3, seen: 4, correct: 3, lastSeen: 1_700_000_000_000 },
}

describe('progress storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty map when nothing is stored', () => {
    expect(loadProgress()).toEqual({})
  })

  it('round-trips a progress map', () => {
    saveProgress(sample)
    expect(loadProgress()).toEqual(sample)
  })

  it('returns an empty map rather than throwing on corrupt JSON', () => {
    localStorage.setItem(PROGRESS_KEY, '{not json')
    expect(loadProgress()).toEqual({})
  })

  it('discards a stored value that is not an object', () => {
    localStorage.setItem(PROGRESS_KEY, '"a string"')
    expect(loadProgress()).toEqual({})
  })

  it('drops entries whose shape is wrong rather than trusting them', () => {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ good: sample['bjt-vocab-会議'], bad: { box: 9 } }),
    )
    const loaded = loadProgress()
    expect(Object.keys(loaded)).toEqual(['good'])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run lib/progress.test.ts`
Expected: FAIL - cannot resolve `./progress`.

- [ ] **Step 3: Create `lib/progress.ts`**

```ts
import type { CardProgress, ProgressMap } from './leitner'

export const PROGRESS_KEY = 'trainer.progress.v1'

/**
 * Deliberately not course-prefixed. Card ids already carry their course, so one flat
 * map holds every course; a 'bjt.' key would force a second store when JLPT is added.
 */

const listeners = new Set<() => void>()

function isCardProgress(v: unknown): v is CardProgress {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.box === 'number' &&
    p.box >= 1 &&
    p.box <= 5 &&
    typeof p.seen === 'number' &&
    typeof p.correct === 'number' &&
    typeof p.lastSeen === 'number'
  )
}

export function loadProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: ProgressMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      // Drop malformed entries rather than failing the whole load - a single bad
      // record should not wipe months of study.
      if (isCardProgress(value)) out[id] = value
    }
    return out
  } catch {
    return {}
  }
}

export function saveProgress(next: ProgressMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
  } catch {
    // Quota or private-mode failure. The session continues in memory.
  }
  listeners.forEach((fn) => fn())
}

export function subscribeProgress(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROGRESS_KEY) fn()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/progress.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/progress.ts lib/progress.test.ts
git commit -m "feat: add localStorage progress persistence with defensive loading"
```

---

## Task 7: Activity log and pace projection

**Files:**
- Create: `lib/activity.ts`, `lib/activity.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `ACTIVITY_KEY = 'trainer.activity.v1'`
  - `type ActivityLog = Record<string, number>`
  - `dayKey(now: number): string`
  - `loadActivity(): ActivityLog`
  - `recordGrade(now: number): void`
  - `dailyRate(log: ActivityLog, now: number): number`
  - `projectDays(remaining: number, rate: number): number | null`

- [ ] **Step 1: Write the failing test**

Create `lib/activity.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  ACTIVITY_KEY,
  dayKey,
  dailyRate,
  loadActivity,
  projectDays,
  recordGrade,
} from './activity'

const NOW = Date.UTC(2026, 6, 22, 12, 0, 0)
const DAY = 86_400_000

describe('dayKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(dayKey(NOW)).toBe('2026-07-22')
  })
})

describe('recordGrade', () => {
  beforeEach(() => localStorage.clear())

  it('counts grades per day', () => {
    recordGrade(NOW)
    recordGrade(NOW)
    recordGrade(NOW - DAY)
    expect(loadActivity()).toEqual({ '2026-07-22': 2, '2026-07-21': 1 })
  })

  it('drops entries older than 30 days', () => {
    recordGrade(NOW - 40 * DAY)
    recordGrade(NOW)
    expect(Object.keys(loadActivity())).toEqual(['2026-07-22'])
  })

  it('recovers from corrupt storage', () => {
    localStorage.setItem(ACTIVITY_KEY, 'nonsense')
    recordGrade(NOW)
    expect(loadActivity()).toEqual({ '2026-07-22': 1 })
  })
})

describe('dailyRate', () => {
  it('averages the last 7 days including empty ones', () => {
    const log = { '2026-07-22': 14, '2026-07-21': 7 }
    expect(dailyRate(log, NOW)).toBe(3)
  })

  it('is 0 with no activity', () => {
    expect(dailyRate({}, NOW)).toBe(0)
  })

  it('ignores days outside the window', () => {
    const log = { '2026-07-01': 700 }
    expect(dailyRate(log, NOW)).toBe(0)
  })
})

describe('projectDays', () => {
  it('returns null at a zero rate rather than Infinity', () => {
    expect(projectDays(100, 0)).toBeNull()
  })

  it('returns null when nothing is left', () => {
    expect(projectDays(0, 5)).toBeNull()
  })

  it('rounds up to whole days', () => {
    expect(projectDays(10, 3)).toBe(4)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run lib/activity.test.ts`
Expected: FAIL - cannot resolve `./activity`.

- [ ] **Step 3: Create `lib/activity.ts`**

```ts
export const ACTIVITY_KEY = 'trainer.activity.v1'

export type ActivityLog = Record<string, number>

const DAY = 86_400_000
const WINDOW_DAYS = 7
const RETAIN_DAYS = 30

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

export function loadActivity(): ActivityLog {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: ActivityLog = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

export function recordGrade(now: number): void {
  if (typeof window === 'undefined') return
  const log = loadActivity()
  const key = dayKey(now)
  log[key] = (log[key] ?? 0) + 1
  const cutoff = dayKey(now - RETAIN_DAYS * DAY)
  const trimmed: ActivityLog = {}
  for (const [k, v] of Object.entries(log)) {
    if (k >= cutoff) trimmed[k] = v
  }
  try {
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed))
  } catch {
    // Quota failure is not worth interrupting a study session for.
  }
}

/** Cards graded per day over the trailing week, counting days with no study as zero. */
export function dailyRate(log: ActivityLog, now: number): number {
  let total = 0
  for (let i = 0; i < WINDOW_DAYS; i++) {
    total += log[dayKey(now - i * DAY)] ?? 0
  }
  return total / WINDOW_DAYS
}

/**
 * Days to finish at the current rate, or null when no honest estimate exists.
 * Showing "Infinity weeks" to someone returning after a break is hostile.
 */
export function projectDays(remaining: number, rate: number): number | null {
  if (rate <= 0 || remaining <= 0) return null
  return Math.ceil(remaining / rate)
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/activity.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/activity.ts lib/activity.test.ts
git commit -m "feat: add rolling activity log and honest pace projection"
```

---

## Task 8: Goal arithmetic for the ring and bar

**Files:**
- Create: `lib/goals.ts`, `lib/goals.test.ts`

**Interfaces:**
- Consumes: `isLearned`, `isMastered`, `unlockPoint`, `unlockedUnits`, `ProgressMap` from `@/lib/leitner`; `Course`, `Unit` from `@/lib/courses`
- Produces:
  - `type UnitGoal = { unit: Unit; learned: number; total: number; unlockAt: number; toUnlock: number; nextUnit: Unit | null }`
  - `currentUnitGoal(course: Course, progress: ProgressMap): UnitGoal | null`
  - `type BoxDistribution = [number, number, number, number, number]`
  - `boxDistribution(cards: Card[], progress: ProgressMap): BoxDistribution`
  - `masteredCount(cards: Card[], progress: ProgressMap): number`
  - `notLearnedCount(cards: Card[], progress: ProgressMap): number`

- [ ] **Step 1: Write the failing test**

Create `lib/goals.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { boxDistribution, currentUnitGoal, masteredCount, notLearnedCount } from './goals'
import type { CardProgress, ProgressMap } from './leitner'
import type { Card, Course } from '@/lib/courses'

const card = (id: string, unitId: string): Card => ({
  id,
  courseId: 'test',
  unitId,
  deck: 'vocab',
  jp: id,
  reading: id,
  meaning: id,
  theme: 't',
  origin: 'drafted',
})

const course: Course = {
  id: 'test',
  name: 'Test',
  unitLabel: 'Unit',
  units: [
    { id: 'u1', index: 1, theme: 'One' },
    { id: 'u2', index: 2, theme: 'Two' },
  ],
  cards: [
    ...Array.from({ length: 4 }, (_, i) => card(`a${i}`, 'u1')),
    ...Array.from({ length: 4 }, (_, i) => card(`b${i}`, 'u2')),
  ],
}

const box = (n: CardProgress['box']): CardProgress => ({
  box: n,
  seen: 1,
  correct: 1,
  lastSeen: 1,
})

const learned = (ids: string[]): ProgressMap =>
  Object.fromEntries(ids.map((id) => [id, box(2)]))

describe('currentUnitGoal', () => {
  it('targets the first unit with no progress', () => {
    const g = currentUnitGoal(course, {})
    expect(g?.unit.id).toBe('u1')
    expect(g?.learned).toBe(0)
    expect(g?.total).toBe(4)
    expect(g?.unlockAt).toBe(3)
    expect(g?.toUnlock).toBe(3)
    expect(g?.nextUnit?.id).toBe('u2')
  })

  it('counts down against the unlock point, not the unit total', () => {
    // 2 of 4 learned, threshold is 3 - so 1 more, never 2
    expect(currentUnitGoal(course, learned(['a0', 'a1']))?.toUnlock).toBe(1)
  })

  it('reports 0 remaining once the threshold is met', () => {
    const g = currentUnitGoal(course, learned(['a0', 'a1', 'a2']))
    expect(g?.unit.id).toBe('u2')
    expect(g?.toUnlock).toBe(3)
  })

  it('returns null when every unit has met its threshold', () => {
    expect(currentUnitGoal(course, learned(['a0', 'a1', 'a2', 'b0', 'b1', 'b2']))).toBeNull()
  })

  it('has no next unit on the final unit', () => {
    const g = currentUnitGoal(course, learned(['a0', 'a1', 'a2']))
    expect(g?.nextUnit).toBeNull()
  })
})

describe('boxDistribution', () => {
  it('counts every card, treating missing records as box 1', () => {
    const p: ProgressMap = { a0: box(5), a1: box(3), a2: box(3) }
    const d = boxDistribution(course.cards, p)
    expect(d).toEqual([5, 0, 2, 0, 1])
    expect(d.reduce((a, b) => a + b, 0)).toBe(course.cards.length)
  })
})

describe('masteredCount and notLearnedCount', () => {
  it('counts box 5 as mastered and box 1 as not learned', () => {
    const p: ProgressMap = { a0: box(5), a1: box(5), a2: box(2) }
    expect(masteredCount(course.cards, p)).toBe(2)
    expect(notLearnedCount(course.cards, p)).toBe(5)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run lib/goals.test.ts`
Expected: FAIL - cannot resolve `./goals`.

- [ ] **Step 3: Create `lib/goals.ts`**

```ts
import type { Card, Course, Unit } from '@/lib/courses'
import { isLearned, isMastered, unlockPoint, type ProgressMap } from './leitner'

export type UnitGoal = {
  unit: Unit
  learned: number
  total: number
  /** Cards needed before the next unit opens. */
  unlockAt: number
  /** Cards still needed, counted against unlockAt - never against total. */
  toUnlock: number
  nextUnit: Unit | null
}

/**
 * The goal the ring tracks: the lowest-index unlocked unit that has not yet met its
 * threshold. Deliberately not "the unit of the card on screen" - in a mixed session
 * most cards are reviews from earlier units, and a ring that followed them would jump
 * around and read as noise.
 */
export function currentUnitGoal(course: Course, progress: ProgressMap): UnitGoal | null {
  const ordered = [...course.units].sort((a, b) => a.index - b.index)
  for (let i = 0; i < ordered.length; i++) {
    const unit = ordered[i]
    const cards = course.cards.filter((c) => c.unitId === unit.id)
    const learned = cards.filter((c) => isLearned(progress[c.id])).length
    const unlockAt = unlockPoint(cards.length)
    if (learned < unlockAt) {
      return {
        unit,
        learned,
        total: cards.length,
        unlockAt,
        toUnlock: unlockAt - learned,
        nextUnit: ordered[i + 1] ?? null,
      }
    }
  }
  return null
}

export type BoxDistribution = [number, number, number, number, number]

export function boxDistribution(cards: Card[], progress: ProgressMap): BoxDistribution {
  const out: BoxDistribution = [0, 0, 0, 0, 0]
  for (const c of cards) {
    const box = progress[c.id]?.box ?? 1
    out[box - 1] += 1
  }
  return out
}

export function masteredCount(cards: Card[], progress: ProgressMap): number {
  return cards.filter((c) => isMastered(progress[c.id])).length
}

export function notLearnedCount(cards: Card[], progress: ProgressMap): number {
  return cards.filter((c) => !isLearned(progress[c.id])).length
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/goals.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/goals.ts lib/goals.test.ts
git commit -m "feat: add unit ring and mastery bar arithmetic"
```

---

## Task 9: Answer matching

**Files:**
- Create: `lib/answer.ts`, `lib/answer.test.ts`

**Interfaces:**
- Consumes: `Card` from `@/lib/courses`
- Produces: `matchesAnswer(typed: string, card: Pick<Card, 'jp' | 'reading'>): boolean`

- [ ] **Step 1: Write the failing test**

Create `lib/answer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchesAnswer } from './answer'

const kaigi = { jp: '会議', reading: 'かいぎ' }
const wa = { jp: 'は', reading: 'wa' }
const houkoku = { jp: '報告する', reading: 'ほうこくする' }

describe('matchesAnswer', () => {
  it('rejects an empty answer', () => {
    expect(matchesAnswer('', kaigi)).toBe(false)
    expect(matchesAnswer('   ', kaigi)).toBe(false)
  })

  it('accepts the exact kana reading', () => {
    expect(matchesAnswer('かいぎ', kaigi)).toBe(true)
  })

  it('accepts the Japanese form itself', () => {
    expect(matchesAnswer('会議', kaigi)).toBe(true)
  })

  it('accepts romaji for a kana reading', () => {
    expect(matchesAnswer('kaigi', kaigi)).toBe(true)
  })

  it('ignores case and surrounding whitespace', () => {
    expect(matchesAnswer('  KAIGI ', kaigi)).toBe(true)
  })

  it('accepts both shi and si style romaji', () => {
    expect(matchesAnswer('shiryou', { jp: '資料', reading: 'しりょう' })).toBe(true)
    expect(matchesAnswer('siryou', { jp: '資料', reading: 'しりょう' })).toBe(true)
  })

  it('accepts tsu and tu, fu and hu, ji and zi', () => {
    expect(matchesAnswer('tsugou', { jp: '都合', reading: 'つごう' })).toBe(true)
    expect(matchesAnswer('tugou', { jp: '都合', reading: 'つごう' })).toBe(true)
    expect(matchesAnswer('fuzai', { jp: '不在', reading: 'ふざい' })).toBe(true)
    expect(matchesAnswer('huzai', { jp: '不在', reading: 'ふざい' })).toBe(true)
  })

  it('accepts long vowels written ou or oo', () => {
    expect(matchesAnswer('houkokusuru', houkoku)).toBe(true)
    expect(matchesAnswer('hookokusuru', houkoku)).toBe(true)
  })

  it('accepts n written as nn', () => {
    expect(matchesAnswer('kennmei', { jp: '件名', reading: 'けんめい' })).toBe(true)
  })

  it('matches a romaji reading directly for kana-only words', () => {
    expect(matchesAnswer('wa', wa)).toBe(true)
    expect(matchesAnswer('は', wa)).toBe(true)
  })

  it('rejects a wrong answer', () => {
    expect(matchesAnswer('kaisha', kaigi)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run lib/answer.test.ts`
Expected: FAIL - cannot resolve `./answer`.

- [ ] **Step 3: Create `lib/answer.ts`**

```ts
import type { Card } from '@/lib/courses'

const DIGRAPHS: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
}

const KANA: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ー: '-', '、': '', '。': '',
}

function toRomaji(kana: string): string {
  let out = ''
  for (let i = 0; i < kana.length; i++) {
    const pair = kana.slice(i, i + 2)
    if (DIGRAPHS[pair]) {
      out += DIGRAPHS[pair]
      i += 1
      continue
    }
    if (kana[i] === 'っ') {
      // Small tsu doubles the next consonant.
      const next = DIGRAPHS[kana.slice(i + 1, i + 3)] ?? KANA[kana[i + 1]] ?? ''
      if (next) out += next[0]
      continue
    }
    out += KANA[kana[i]] ?? kana[i]
  }
  return out
}

/**
 * Collapses the romaji spellings a learner might reasonably type into one canonical
 * form, so shi/si, tsu/tu, fu/hu, ji/zi, ou/oo and n/nn all compare equal.
 */
function canonical(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[ー\-']/g, '')
    .replace(/shi/g, 'si')
    .replace(/chi/g, 'ti')
    .replace(/tsu/g, 'tu')
    .replace(/fu/g, 'hu')
    .replace(/ji/g, 'zi')
    .replace(/ja/g, 'zya')
    .replace(/ju/g, 'zyu')
    .replace(/jo/g, 'zyo')
    .replace(/nn/g, 'n')
    .replace(/oo/g, 'ou')
    .replace(/uu/g, 'u')
    .replace(/ei/g, 'e')
}

export function matchesAnswer(
  typed: string,
  card: Pick<Card, 'jp' | 'reading'>,
): boolean {
  const input = typed.trim()
  if (input === '') return false

  const candidates = [card.reading, card.jp, toRomaji(card.reading)]
  const target = canonical(input)
  return candidates.some((c) => canonical(c) === target)
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/answer.test.ts`
Expected: PASS, 11 tests.

If the long-vowel or `ei` rules over-collapse and a "rejects a wrong answer" case starts passing incorrectly, tighten the rule that caused it rather than deleting the test. Over-matching is the failure mode to guard against - a checker that accepts everything is worse than none.

- [ ] **Step 5: Commit**

```bash
git add lib/answer.ts lib/answer.test.ts
git commit -m "feat: add kana and romaji answer matching"
```

---

## Task 10: React binding for progress

**Files:**
- Create: `lib/useProgress.ts`

**Interfaces:**
- Consumes: `loadProgress`, `saveProgress`, `subscribeProgress` from `@/lib/progress`; `grade`, `ProgressMap` from `@/lib/leitner`; `recordGrade` from `@/lib/activity`
- Produces: `useProgress(): { progress: ProgressMap; gradeCard: (cardId: string, correct: boolean) => void }`

- [ ] **Step 1: Create `lib/useProgress.ts`**

```ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { recordGrade } from './activity'
import { grade, type ProgressMap } from './leitner'
import { loadProgress, saveProgress, subscribeProgress } from './progress'

const EMPTY: ProgressMap = {}

let cache: ProgressMap | null = null

function getSnapshot(): ProgressMap {
  // useSyncExternalStore compares snapshots by reference, so loadProgress cannot be
  // called directly - a fresh object every render would loop forever.
  if (cache === null) cache = loadProgress()
  return cache
}

/** localStorage does not exist during the server render. */
function getServerSnapshot(): ProgressMap {
  return EMPTY
}

export function useProgress() {
  const progress = useSyncExternalStore(
    (onChange) =>
      subscribeProgress(() => {
        cache = loadProgress()
        onChange()
      }),
    getSnapshot,
    getServerSnapshot,
  )

  const gradeCard = useCallback((cardId: string, correct: boolean) => {
    const now = Date.now()
    const current = cache ?? loadProgress()
    const next: ProgressMap = { ...current, [cardId]: grade(current[cardId], correct, now) }
    cache = next
    saveProgress(next)
    recordGrade(now)
  }, [])

  return { progress, gradeCard }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/useProgress.ts
git commit -m "feat: bind progress store to React via useSyncExternalStore"
```

---

## Task 11: The study session

Replaces the hardcoded card from Task 2 with the real endless session.

**Files:**
- Create: `components/CardStage.tsx`, `components/VoiceWarning.tsx`
- Modify: `app/study/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 3-10
- Produces: a working endless session at `/study`

- [ ] **Step 1: Create `components/VoiceWarning.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { onVoicesChanged, speechStatus, type SpeechStatus } from '@/lib/speech'

export function VoiceWarning() {
  const [status, setStatus] = useState<SpeechStatus | null>(null)

  useEffect(() => {
    setStatus(speechStatus())
    return onVoicesChanged(() => setStatus(speechStatus()))
  }, [])

  if (status === null || status === 'ready') return null

  return (
    <p className="mb-4 rounded-lg bg-orange-100 p-3 text-sm text-orange-900">
      {status === 'unsupported'
        ? 'This browser has no speech support, so cards are text only.'
        : 'No Japanese voice is installed, so audio uses an English voice and will sound wrong. Add a Japanese voice in your device settings.'}
    </p>
  )
}
```

- [ ] **Step 2: Create `components/CardStage.tsx`**

```tsx
'use client'

import type { Card } from '@/lib/courses'
import { speak } from '@/lib/speech'

type Props = {
  card: Card
  phase: 'introduce' | 'prompt' | 'revealed'
  typed: string
  onType: (v: string) => void
  onReveal: () => void
  onGrade: (correct: boolean) => void
  onContinue: () => void
  matched: boolean
}

export function CardStage({
  card, phase, typed, onType, onReveal, onGrade, onContinue, matched,
}: Props) {
  const showText = phase !== 'prompt'

  return (
    <section>
      {phase === 'introduce' && (
        <p className="mb-3 text-center text-xs uppercase tracking-widest text-[var(--color-muted)]">
          New word
        </p>
      )}

      <button
        onClick={() => speak(card.jp)}
        aria-label="Play audio"
        className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-3xl text-white active:scale-95"
      >
        ▶
      </button>

      <div className="mb-5 flex justify-center gap-2">
        <button
          onClick={() => speak(card.jp, { rate: 0.85 })}
          className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm"
        >
          Normal
        </button>
        <button
          onClick={() => speak(card.jp, { rate: 0.5 })}
          className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm"
        >
          Slow
        </button>
      </div>

      {showText ? (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center">
          <p className="text-4xl font-bold">{card.jp}</p>
          <p className="mt-1 text-[var(--color-muted)]">{card.reading}</p>
          <p className="mt-2 text-lg">{card.meaning}</p>
          {card.exampleJp && (
            <div className="mt-4 border-t border-dashed border-[var(--color-line)] pt-4">
              <p className="flex items-center justify-center gap-2">
                {card.exampleJp}
                <button
                  onClick={() => speak(card.exampleJp!, { rate: 0.8 })}
                  aria-label="Play example"
                  className="text-[var(--color-accent)]"
                >
                  ♪
                </button>
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{card.exampleEn}</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-2 text-center text-sm text-[var(--color-muted)]">
            Say it aloud, then reveal. Typing is optional.
          </p>
          <input
            value={typed}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onReveal()}
            placeholder="reading in kana or romaji..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-lg"
          />
        </div>
      )}

      {phase === 'introduce' && (
        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          Got it - quiz me on this later
        </button>
      )}

      {phase === 'prompt' && (
        <button
          onClick={onReveal}
          className="mt-4 w-full rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          Reveal
        </button>
      )}

      {phase === 'revealed' && (
        <>
          {typed.trim() !== '' && (
            <p
              className={`mt-4 text-center text-sm font-bold ${
                matched ? 'text-[var(--color-green)]' : 'text-[var(--color-accent)]'
              }`}
            >
              {matched ? '✓ Your answer matches' : `You typed: ${typed}`}
            </p>
          )}
          <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
            Say it aloud two or three times, then grade yourself honestly.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onGrade(false)}
              className="flex-1 rounded-lg bg-orange-100 py-3 font-bold text-orange-900"
            >
              Missed it
            </button>
            <button
              onClick={() => onGrade(true)}
              className="flex-1 rounded-lg bg-green-100 py-3 font-bold text-green-900"
            >
              Got it
            </button>
          </div>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Replace `app/study/page.tsx`**

```tsx
'use client'

import { useMemo, useReducer } from 'react'
import Link from 'next/link'
import { CardStage } from '@/components/CardStage'
import { VoiceWarning } from '@/components/VoiceWarning'
import { matchesAnswer } from '@/lib/answer'
import { getCourse, DEFAULT_COURSE_ID, type Card } from '@/lib/courses'
import { nextCard, unlockedCards } from '@/lib/leitner'
import { useProgress } from '@/lib/useProgress'

type Phase = 'introduce' | 'prompt' | 'revealed'

type State = {
  phase: Phase
  typed: string
  history: string[]
  /**
   * Cards already introduced this session. Introducing is not grading, so `seen`
   * stays 0 - without this list the same new card would re-introduce itself every
   * time the queue served it, and never become a real prompt.
   */
  introduced: string[]
  tally: { studied: number; got: number; missed: number }
}

type Action =
  | { type: 'reveal' }
  | { type: 'type'; value: string }
  | { type: 'graded'; correct: boolean; cardId: string }
  | { type: 'continue'; cardId: string }

const initial: State = {
  phase: 'prompt',
  typed: '',
  history: [],
  introduced: [],
  tally: { studied: 0, got: 0, missed: 0 },
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'type':
      return { ...state, typed: action.value }
    case 'reveal':
      return { ...state, phase: 'revealed' }
    case 'continue':
      // An introduced card is not graded - it re-enters the queue as a real prompt.
      return {
        ...state,
        phase: 'prompt',
        typed: '',
        history: [...state.history, action.cardId],
        introduced: [...state.introduced, action.cardId],
      }
    case 'graded':
      return {
        ...state,
        phase: 'prompt',
        typed: '',
        history: [...state.history, action.cardId],
        tally: {
          studied: state.tally.studied + 1,
          got: state.tally.got + (action.correct ? 1 : 0),
          missed: state.tally.missed + (action.correct ? 0 : 1),
        },
      }
  }
}

export default function StudyPage() {
  const course = getCourse(DEFAULT_COURSE_ID)!
  const { progress, gradeCard } = useProgress()
  const [state, dispatch] = useReducer(reducer, initial)

  const pool = useMemo(() => unlockedCards(course, progress), [course, progress])
  const card: Card | null = useMemo(
    () => nextCard(pool, progress, state.history),
    [pool, progress, state.history],
  )

  const isNew =
    card !== null &&
    (progress[card.id]?.seen ?? 0) === 0 &&
    !state.introduced.includes(card.id)
  const phase: Phase = isNew && state.phase !== 'revealed' ? 'introduce' : state.phase

  if (!card) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-lg">Nothing to study right now.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Back home
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          {state.tally.studied} studied · {state.tally.got} got
        </span>
        <Link href="/" className="underline">
          Finish
        </Link>
      </header>

      <VoiceWarning />

      <CardStage
        card={card}
        phase={phase}
        typed={state.typed}
        matched={matchesAnswer(state.typed, card)}
        onType={(value) => dispatch({ type: 'type', value })}
        onReveal={() => dispatch({ type: 'reveal' })}
        onContinue={() => dispatch({ type: 'continue', cardId: card.id })}
        onGrade={(correct) => {
          gradeCard(card.id, correct)
          dispatch({ type: 'graded', correct, cardId: card.id })
        }}
      />
    </main>
  )
}
```

- [ ] **Step 4: Verify types and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Manual check**

Run: `npm run dev`, open `/study`.

Expected: a new word appears in introduce state with text visible; tapping continue advances; later cards appear as blind audio prompts; grading persists across a page reload.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add endless study session with introduce, reveal, and grading"
```

---

## Task 12: Unit unlock ring

**Files:**
- Create: `components/UnitUnlockRing.tsx`
- Modify: `app/study/page.tsx`

**Interfaces:**
- Consumes: `currentUnitGoal`, `UnitGoal` from `@/lib/goals`
- Produces: `<UnitUnlockRing goal={goal} unitLabel={string} />`

- [ ] **Step 1: Create `components/UnitUnlockRing.tsx`**

```tsx
import type { UnitGoal } from '@/lib/goals'

export function UnitUnlockRing({
  goal,
  unitLabel,
}: {
  goal: UnitGoal
  unitLabel: string
}) {
  const pips = Array.from({ length: goal.total }, (_, i) => i < goal.learned)

  // Counted against the unlock point, never the unit total. At 5 of 8 with a
  // threshold of 6 this reads "1 more", not "3 more" - otherwise the goal looks
  // further away than it is, which defeats the purpose of showing it.
  const caption =
    goal.toUnlock > 0 && goal.nextUnit
      ? `${goal.toUnlock} more to unlock ${unitLabel} ${goal.nextUnit.index}`
      : `${goal.total - goal.learned} words left in ${unitLabel} ${goal.unit.index}`

  return (
    <div className="mb-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <p className="text-sm font-bold">
        {unitLabel} {goal.unit.index} - {goal.unit.theme}
      </p>
      <div className="mt-2 flex items-center gap-1" aria-hidden>
        {pips.map((filled, i) => (
          <span
            key={i}
            className={`h-2 w-full rounded-full ${
              filled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]'
            } ${i + 1 === goal.unlockAt ? 'ring-2 ring-[var(--color-ink)]' : ''}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {goal.learned} of {goal.total} learned · {caption}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Render it in `app/study/page.tsx`**

Add the imports:

```tsx
import { UnitUnlockRing } from '@/components/UnitUnlockRing'
import { currentUnitGoal } from '@/lib/goals'
```

Add inside the component, after the `pool` memo:

```tsx
const goal = useMemo(() => currentUnitGoal(course, progress), [course, progress])
```

And render it directly above `<VoiceWarning />`:

```tsx
{goal && <UnitUnlockRing goal={goal} unitLabel={course.unitLabel} />}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

Then `npm run dev` and grade several cards correctly. Expected: pips fill, and the caption counts down toward the notch rather than toward the unit total.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add unit unlock ring to the study session"
```

---

## Task 13: Home screen with the mastery bar

**Files:**
- Create: `components/MasteryBar.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `boxDistribution`, `masteredCount`, `notLearnedCount` from `@/lib/goals`; `dailyRate`, `loadActivity`, `projectDays` from `@/lib/activity`
- Produces: `<MasteryBar />`

- [ ] **Step 1: Create `components/MasteryBar.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { dailyRate, loadActivity, projectDays } from '@/lib/activity'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import { boxDistribution, masteredCount, notLearnedCount } from '@/lib/goals'
import { useProgress } from '@/lib/useProgress'

const SHADES = [
  'bg-[var(--color-line)]',
  'bg-amber-300',
  'bg-amber-500',
  'bg-[var(--color-accent)]',
  'bg-[var(--color-green)]',
]

export function MasteryBar() {
  const course = getCourse(DEFAULT_COURSE_ID)!
  const { progress } = useProgress()
  const [projection, setProjection] = useState<number | null>(null)

  const dist = boxDistribution(course.cards, progress)
  const mastered = masteredCount(course.cards, progress)
  const total = course.cards.length
  const pct = Math.round((mastered / total) * 100)

  useEffect(() => {
    // Reads localStorage and the clock, so it must run after mount to avoid a
    // hydration mismatch.
    const remaining = notLearnedCount(course.cards, progress)
    setProjection(projectDays(remaining, dailyRate(loadActivity(), Date.now())))
  }, [course.cards, progress])

  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-4">
      <p className="text-sm font-bold">Course progress - {course.name}</p>

      <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden>
        {[4, 3, 2, 1, 0].map((box) => (
          <span
            key={box}
            className={SHADES[box]}
            style={{ width: `${(dist[box] / total) * 100}%` }}
          />
        ))}
      </div>

      <p className="mt-3 text-sm">
        {mastered} of {total} words mastered - {pct}%
      </p>
      {projection !== null && (
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          About {Math.ceil(projection / 7)} weeks at your recent pace
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
import Link from 'next/link'
import { MasteryBar } from '@/components/MasteryBar'

export default function Home() {
  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          BJT - Target 400
        </p>
        <h1 className="text-3xl font-bold">Vocabulary Trainer</h1>
      </header>

      <MasteryBar />

      <Link
        href="/study"
        className="block rounded-lg bg-[var(--color-ink)] py-4 text-center font-bold text-[var(--color-card)]"
      >
        Start studying
      </Link>

      <Link
        href="/units"
        className="block rounded-lg border border-[var(--color-line)] py-3 text-center"
      >
        Browse weeks
      </Link>
    </main>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed. The `/units` link 404s until Task 14 - that is expected.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add home screen with course mastery bar and pace projection"
```

---

## Task 14: Unit browser and per-unit drill

**Files:**
- Create: `app/units/page.tsx`, `app/units/[unit]/page.tsx`, `components/UnitCard.tsx`

**Interfaces:**
- Consumes: `unlockedUnits`, `isLearned` from `@/lib/leitner`; `getCourse` from `@/lib/courses`
- Produces: browsable unit list and a single-unit drill

- [ ] **Step 1: Create `components/UnitCard.tsx`**

```tsx
import Link from 'next/link'
import type { Unit } from '@/lib/courses'

export function UnitCard({
  unit,
  unitLabel,
  learned,
  total,
  locked,
}: {
  unit: Unit
  unitLabel: string
  learned: number
  total: number
  locked: boolean
}) {
  const body = (
    <div
      className={`rounded-xl border border-[var(--color-line)] p-4 ${
        locked ? 'opacity-50' : 'bg-[var(--color-card)]'
      }`}
    >
      <p className="text-sm font-bold">
        {unitLabel} {unit.index} - {unit.theme}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {locked ? 'Locked - finish the previous week first' : `${learned} of ${total} learned`}
      </p>
    </div>
  )

  return locked ? body : <Link href={`/units/${unit.id}`}>{body}</Link>
}
```

- [ ] **Step 2: Create `app/units/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { UnitCard } from '@/components/UnitCard'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'
import { isLearned, unlockedUnits } from '@/lib/leitner'
import { useProgress } from '@/lib/useProgress'

export default function UnitsPage() {
  const course = getCourse(DEFAULT_COURSE_ID)!
  const { progress } = useProgress()
  const open = new Set(unlockedUnits(course, progress).map((u) => u.id))

  return (
    <main className="mx-auto max-w-lg space-y-3 px-4 py-8">
      <Link href="/" className="text-sm underline">
        Back
      </Link>
      <h1 className="text-2xl font-bold">Weeks</h1>
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
```

- [ ] **Step 3: Create `app/units/[unit]/page.tsx`**

Static export requires every dynamic route to be enumerated at build time. The page is a server component that generates params and renders a client child.

```tsx
import Link from 'next/link'
import { getCourse, DEFAULT_COURSE_ID } from '@/lib/courses'

export function generateStaticParams() {
  const course = getCourse(DEFAULT_COURSE_ID)!
  return course.units.map((u) => ({ unit: u.id }))
}

export default async function UnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit: unitId } = await params
  const course = getCourse(DEFAULT_COURSE_ID)!
  const unit = course.units.find((u) => u.id === unitId)
  if (!unit) return null
  const cards = course.cards.filter((c) => c.unitId === unitId)

  return (
    <main className="mx-auto max-w-lg space-y-3 px-4 py-8">
      <Link href="/units" className="text-sm underline">
        Back to weeks
      </Link>
      <h1 className="text-2xl font-bold">
        {course.unitLabel} {unit.index} - {unit.theme}
      </h1>
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
    </main>
  )
}
```

Note `params` is a Promise in this Next version. If the docs read in Task 1 Step 3 say otherwise, follow the docs.

- [ ] **Step 4: Verify the static export enumerates all 24 unit routes**

Run: `npm run build && ls out/units/`
Expected: directories `w01` through `w24`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add unit browser and per-unit drill"
```

---

## Task 15: Deploy to Vercel

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: a passing build
- Produces: a live URL

- [ ] **Step 1: Run the full check**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all three pass. Do not deploy on a red test run.

- [ ] **Step 2: Create `README.md`**

```markdown
# BJT Trainer

Offline-capable Japanese vocabulary trainer for the BJT (Business Japanese
Proficiency Test), targeting the J2 band around a score of 400.

## How it works

- **Audio-first recall.** A word is spoken; you produce the reading and meaning from
  memory, then reveal and grade yourself. Typing is optional.
- **Leitner boxes.** Correct answers promote a card one box; a miss sends it back to
  box 1. Weak cards surface first.
- **No calendar.** Units unlock when 75% of the previous unit is learned, so the pace
  follows how much you actually study rather than a fixed schedule.
- **Fully offline.** Vocabulary is bundled into the app and audio uses the browser
  `SpeechSynthesis` API, so no network is needed once loaded.

## Development

    npm install
    npm run dev
    npm test

## Data

192 vocabulary cards across 24 weekly units, plus 15 business phrases. Each card
carries an `origin` field: `prototype` for verified entries, `drafted` for entries
that still need review. There is no official BJT vocabulary list.
```

- [ ] **Step 3: Deploy**

Run: `npx vercel --prod`

Follow the prompts to link a new project. Expected: a production URL is printed.

- [ ] **Step 4: Verify offline behaviour on the deployed URL**

Load the URL on your phone, then enable airplane mode and reload.

Expected at this stage: the page fails to load, because the PWA layer is Task 17. Cards already studied remain in `localStorage`. Confirm audio works with no network once the page is open.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: add README and deploy to Vercel"
```

---

## Task 16: Shadowing mode

**Files:**
- Create: `lib/courses/shadow.ts`, `lib/shadow.ts`, `lib/shadow.test.ts`, `app/shadow/page.tsx`

**Interfaces:**
- Consumes: `speak`, `cancel` from `@/lib/speech`
- Produces:
  - `type ShadowLine = { id: string; jp: string; reading: string; en: string }`
  - `SHADOW_LINES: ShadowLine[]`
  - `estimateDuration(text: string, rate: number): number`

- [ ] **Step 1: Create `lib/courses/shadow.ts`**

Copy the 12 sentences from the `SHADOW` array in `~/Downloads/BJT_Listening_Trainer.html` (lines 496-509), converting each `[jp, reading, en]` tuple into an object with a stable id:

```ts
export type ShadowLine = {
  id: string
  jp: string
  reading: string
  en: string
}

const ROWS: [string, string, string][] = [
  [
    'お世話になっております。田中商事の山田です。',
    'おせわになっております。たなかしょうじのやまだです。',
    'Thank you for your support. This is Yamada from Tanaka Trading.',
  ],
  // ...the remaining 11 rows, copied verbatim from the prototype
]

export const SHADOW_LINES: ShadowLine[] = ROWS.map(([jp, reading, en], i) => ({
  id: `shadow-${String(i + 1).padStart(2, '0')}`,
  jp,
  reading,
  en,
}))
```

- [ ] **Step 2: Write the failing test**

Create `lib/shadow.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { estimateDuration } from './shadow'
import { SHADOW_LINES } from './courses/shadow'

describe('SHADOW_LINES', () => {
  it('has 12 lines with unique ids and no empty fields', () => {
    expect(SHADOW_LINES).toHaveLength(12)
    expect(new Set(SHADOW_LINES.map((l) => l.id)).size).toBe(12)
    for (const l of SHADOW_LINES) {
      expect(l.jp.trim()).not.toBe('')
      expect(l.reading.trim()).not.toBe('')
      expect(l.en.trim()).not.toBe('')
    }
  })
})

describe('estimateDuration', () => {
  it('scales with length', () => {
    expect(estimateDuration('ああああああああああ', 1)).toBeGreaterThan(
      estimateDuration('ああ', 1),
    )
  })

  it('takes longer at a slower rate', () => {
    const text = 'お世話になっております'
    expect(estimateDuration(text, 0.5)).toBeGreaterThan(estimateDuration(text, 1))
  })

  it('never returns less than the floor', () => {
    expect(estimateDuration('あ', 2)).toBe(1400)
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx vitest run lib/shadow.test.ts`
Expected: FAIL - cannot resolve `./shadow`.

- [ ] **Step 4: Create `lib/shadow.ts`**

```ts
/**
 * Rough speaking time in ms. SpeechSynthesis exposes no duration before speaking,
 * so the beat timer estimates from character count - about 165ms per character at
 * rate 1.0, with a floor so very short lines still get a usable beat.
 */
export function estimateDuration(text: string, rate: number): number {
  return Math.max(1400, (text.length * 165) / rate)
}

/** The speak phase gets more time than the listen phase - repeating is slower. */
export const SPEAK_MULTIPLIER = 1.45
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run lib/shadow.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Create `app/shadow/page.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SHADOW_LINES } from '@/lib/courses/shadow'
import { estimateDuration, SPEAK_MULTIPLIER } from '@/lib/shadow'
import { cancel, speak } from '@/lib/speech'

type Phase = 'idle' | 'listen' | 'speak'

export default function ShadowPage() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [rate, setRate] = useState(0.85)
  const [showText, setShowText] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const line = SHADOW_LINES[index]

  useEffect(() => {
    // Cancel any in-flight speech and timer when the component unmounts or the
    // cycle stops, or a paused session keeps talking in the background.
    return () => {
      if (timer.current) clearTimeout(timer.current)
      cancel()
    }
  }, [])

  useEffect(() => {
    if (!running) return

    const listenMs = estimateDuration(line.jp, rate)
    setPhase('listen')
    speak(line.jp, { rate })

    timer.current = setTimeout(() => {
      setPhase('speak')
      timer.current = setTimeout(() => {
        if (index + 1 >= SHADOW_LINES.length) {
          setRunning(false)
          setPhase('idle')
        } else {
          setIndex((i) => i + 1)
        }
      }, listenMs * SPEAK_MULTIPLIER)
    }, listenMs + 250)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [running, index, rate, line.jp])

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="flex justify-between text-sm text-[var(--color-muted)]">
        <span>
          Sentence {index + 1} / {SHADOW_LINES.length}
        </span>
        <Link href="/" className="underline" onClick={() => cancel()}>
          Finish
        </Link>
      </div>

      <p className="text-center text-sm font-bold">
        {phase === 'listen'
          ? 'Listen carefully...'
          : phase === 'speak'
            ? 'Your turn - repeat it aloud'
            : 'Press start when ready'}
      </p>

      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] p-6 text-center">
        <p className={`text-xl font-bold ${showText ? '' : 'blur-md select-none'}`}>
          {line.jp}
        </p>
        {showText && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">{line.reading}</p>
        )}
        <p className="mt-3 border-t border-dashed border-[var(--color-line)] pt-3 text-sm text-[var(--color-muted)]">
          {line.en}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (running) {
              setRunning(false)
              setPhase('idle')
              cancel()
            } else {
              setRunning(true)
            }
          }}
          className="flex-1 rounded-lg bg-[var(--color-ink)] py-3 font-bold text-[var(--color-card)]"
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => speak(line.jp, { rate })}
          className="flex-1 rounded-lg border border-[var(--color-line)] py-3"
        >
          Replay
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {([0.6, 0.85, 1] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRate(r)}
            className={`rounded-full border px-3 py-1 text-xs ${
              rate === r
                ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-card)]'
                : 'border-[var(--color-line)]'
            }`}
          >
            {r === 0.6 ? 'Slow' : r === 0.85 ? 'Normal' : 'Native'}
          </button>
        ))}
        <button
          onClick={() => setShowText((v) => !v)}
          className={`rounded-full border px-3 py-1 text-xs ${
            showText
              ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-card)]'
              : 'border-[var(--color-line)]'
          }`}
        >
          {showText ? 'Text: on' : 'Text: off'}
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Add the link to `app/page.tsx`**

Below the "Browse weeks" link:

```tsx
<Link
  href="/shadow"
  className="block rounded-lg border border-[var(--color-line)] py-3 text-center"
>
  Shadowing practice
</Link>
```

- [ ] **Step 8: Verify**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass.

Then `npm run dev`, open `/shadow`, press Start. Expected: a sentence plays, a pause follows for repeating, then it advances. Pressing Pause stops audio immediately.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add shadowing mode with timed listen and repeat beats"
```

---

## Task 17: PWA and offline caching

**Files:**
- Create: `app/manifest.ts`, `public/sw.js`, `components/ServiceWorker.tsx`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: a complete static build
- Produces: an installable app that loads with no network

- [ ] **Step 1: Create the icons**

Any 192x192 and 512x512 PNG will do. Generate them locally - do not fetch from a CDN.

Run:

```bash
npx --yes @squoosh/cli --help >/dev/null 2>&1 || true
```

If you have no image tooling, create solid-colour placeholders with any local editor and save as `public/icon-192.png` and `public/icon-512.png`. Replace them with real artwork later.

- [ ] **Step 2: Create `app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BJT Trainer',
    short_name: 'BJT',
    description: 'Offline Japanese vocabulary trainer for the BJT',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4efe6',
    theme_color: '#b5421f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

- [ ] **Step 3: Create `public/sw.js`**

```js
// Hand-written rather than next-pwa: that plugin lags Next releases, and a service
// worker you cannot read is not debuggable on a train with no signal.
const CACHE = 'bjt-trainer-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/study', '/units', '/shadow'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit
      return fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          return res
        })
        .catch(() => caches.match('/'))
    }),
  )
})
```

- [ ] **Step 4: Create `components/ServiceWorker.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is not fatal - the app still works online.
    })
  }, [])
  return null
}
```

- [ ] **Step 5: Mount it in `app/layout.tsx`**

Add the import and render it inside `<body>`:

```tsx
import { ServiceWorker } from '@/components/ServiceWorker'
```

```tsx
<body className="min-h-screen">
  {children}
  <ServiceWorker />
</body>
```

- [ ] **Step 6: Verify the build emits the manifest and worker**

Run: `npm run build && ls out/sw.js out/manifest.webmanifest`
Expected: both files exist.

- [ ] **Step 7: Deploy and verify offline**

Run: `npx vercel --prod`

Then on your phone: load the URL, wait a few seconds, enable airplane mode, and reload.

Expected: the app loads, cards appear, and audio speaks. This is the acceptance test for the entire offline constraint.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest and offline service worker"
```

---

## Self-review notes

**Spec coverage.** Every numbered spec section maps to a task: §4 stack → Task 1; §5 data model → Task 3; §6 progress and predicates → Tasks 4 and 6; §6.1 thresholds → Task 4; §7.1 Leitner → Task 4; §7.2 endless queue → Task 5; §7.3 unlocking → Task 5; §7.4 pace → Task 7; §8.1 routes → Tasks 11-14; §8.2 state → Tasks 10-11; §8.3 goal UI → Tasks 8, 12, 13; §8.4 answer matching → Task 9; §9 audio → Task 2; §10 PWA → Task 17; §11 testing → tests colocated in each task; §12 build order → task order.

**Known deviation.** The spec's build order puts the data layer before the UI. This plan moves the speech wrapper and a hardcoded card to Task 2, ahead of the data work, so audio problems surface on a real device on day one rather than after a week of pure logic. Everything else follows the spec order.

**Deferred by design.** The weak-words list from the spec's §15 discussion is not planned. Build it only if real sessions show a need.
