# Verba Sound Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add warm, offline, synthesized sound effects to the study loop (correct / incorrect / reveal / unlock) with an on-by-default mute toggle.

**Architecture:** A tiny mute-preference store (`lib/sound.ts`, mirrors `lib/progress.ts`), a guarded Web Audio synth (`lib/sfx.ts`, untested like `lib/speech.ts`), a `useSfxMuted()` hook, a `SoundToggle` speaker button on the study header, and four call sites wired into the study session (grade, reveal, and an unlock-detection effect).

**Tech Stack:** Web Audio API (oscillators + gain envelopes), React 19, TypeScript, Next.js 16 static export, Vitest with the repo's hand-rolled render harness.

## Global Constraints

- **Offline:** no fetched audio; sounds are synthesized. No network anywhere.
- **iOS gesture rule:** the `AudioContext` is created and resumed lazily inside `playSfx`, which only ever runs from a user tap (grade/reveal) or an effect that follows one (unlock).
- **Never throw from audio:** a failure in `playSfx` must be swallowed - a study session must not break over a blip.
- **Sound is on by default**, muteable, persisted at `trainer.sound.v1` (`'on'` | `'off'`). The miss sound is soft and low, never punishing.
- **Hydration-safe:** the mute hook uses `useSyncExternalStore`; no `localStorage` read in a render body beyond the hook's snapshot.
- **Style:** single quotes, no semicolons, 2-space indent, `@/*` alias. No em-dashes in copy - spaced hyphen ` - `.

---

### Task 1: The mute-preference store

**Files:**
- Create: `lib/sound.ts`
- Test: `lib/sound.test.ts`

**Interfaces:**
- Produces:
  - `SOUND_KEY = 'trainer.sound.v1'`
  - `loadMuted(): boolean` - true = muted; default false (sound on)
  - `setMuted(muted: boolean): void`
  - `subscribeSound(fn: () => void): () => void`

- [ ] **Step 1: Write the failing tests**

Create `lib/sound.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SOUND_KEY, loadMuted, setMuted, subscribeSound } from './sound'

beforeEach(() => {
  localStorage.clear()
})

describe('loadMuted', () => {
  it('defaults to not muted (sound on) when nothing is stored', () => {
    expect(loadMuted()).toBe(false)
  })

  it('returns true only when the stored value is exactly "off"', () => {
    localStorage.setItem(SOUND_KEY, 'off')
    expect(loadMuted()).toBe(true)
  })

  it('degrades to not muted for a missing or unrecognised value', () => {
    localStorage.setItem(SOUND_KEY, 'garbage')
    expect(loadMuted()).toBe(false)
  })
})

describe('setMuted', () => {
  it('persists the state and notifies subscribers', () => {
    let notified = 0
    const unsub = subscribeSound(() => {
      notified++
    })
    setMuted(true)
    expect(localStorage.getItem(SOUND_KEY)).toBe('off')
    expect(loadMuted()).toBe(true)
    setMuted(false)
    expect(localStorage.getItem(SOUND_KEY)).toBe('on')
    expect(notified).toBe(2)
    unsub()
  })

  it('does not throw or notify when the write fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    let notified = 0
    const unsub = subscribeSound(() => {
      notified++
    })
    expect(() => setMuted(true)).not.toThrow()
    expect(notified).toBe(0)
    unsub()
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/sound.test.ts`
Expected: FAIL - cannot resolve `./sound`.

- [ ] **Step 3: Implement the store**

Create `lib/sound.ts`:

```ts
/** App-wide sound on/off preference. Not course-prefixed - it is one setting. */
export const SOUND_KEY = 'trainer.sound.v1'

const listeners = new Set<() => void>()

/** true = muted. Default false (sound on). Stored as 'on' | 'off'. */
export function loadMuted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'off'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on')
    // Notify only after a successful write, matching the other stores.
    listeners.forEach((fn) => fn())
  } catch {
    // Quota or private-mode failure - the session continues; do not notify.
  }
}

export function subscribeSound(fn: () => void): () => void {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === SOUND_KEY) fn()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/sound.test.ts`
Expected: PASS (all four).

- [ ] **Step 5: Commit**

```bash
git add lib/sound.ts lib/sound.test.ts
git commit -m "feat: sound on/off preference store"
```

---

### Task 2: The Web Audio synth and the mute hook

**Files:**
- Create: `lib/sfx.ts`
- Modify: `lib/useProgress.ts` (add the `useSfxMuted` hook)

**Interfaces:**
- Consumes: `loadMuted`, `subscribeSound` from `@/lib/sound` (Task 1).
- Produces:
  - `playSfx(name: 'correct' | 'incorrect' | 'reveal' | 'unlock'): void` (from `lib/sfx.ts`)
  - `useSfxMuted(): boolean` (from `lib/useProgress.ts`)

Note: `lib/sfx.ts` is not unit-tested - jsdom has no `AudioContext`, and it is a thin, guarded, feature-detected wrapper (the same treatment as `lib/speech.ts`). Its gate is `tsc --noEmit` plus the full suite staying green (it is a guarded no-op under jsdom) plus the static-export build. The `useSfxMuted` hook is exercised by the `SoundToggle` test in Task 3.

- [ ] **Step 1: Implement the synth**

Create `lib/sfx.ts`:

```ts
import { loadMuted } from './sound'

type SfxName = 'correct' | 'incorrect' | 'reveal' | 'unlock'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

// One marimba-ish note: fast attack, short exponential decay. Triangle waves read
// as warm/wooden rather than the harsh buzz of a square wave.
function tone(c: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'triangle'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g).connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

// Warm, quiet, station-melody-flavoured. Frequencies/durations are tuning values -
// adjust after listening. correct = rising G5->C6; incorrect = low soft G3;
// reveal = a light high tick; unlock = a C-E-G arrival arpeggio.
const VOICES: Record<SfxName, (c: AudioContext, t: number) => void> = {
  correct: (c, t) => {
    tone(c, 784, t, 0.12, 0.14)
    tone(c, 1047, t + 0.09, 0.16, 0.14)
  },
  incorrect: (c, t) => {
    tone(c, 196, t, 0.22, 0.09)
  },
  reveal: (c, t) => {
    tone(c, 1175, t, 0.06, 0.06)
  },
  unlock: (c, t) => {
    tone(c, 523, t, 0.12, 0.13)
    tone(c, 659, t + 0.08, 0.12, 0.13)
    tone(c, 784, t + 0.16, 0.2, 0.13)
  },
}

/** Play a short synthesized effect. No-op when muted, unsupported, or server-side.
 *  Never throws - a study session must not break over a blip. */
export function playSfx(name: SfxName): void {
  if (loadMuted()) return
  const c = audio()
  if (!c) return
  try {
    // iOS starts the context suspended; resume it inside the triggering gesture.
    if (c.state === 'suspended') void c.resume()
    VOICES[name](c, c.currentTime)
  } catch {
    // Swallow any Web Audio failure.
  }
}
```

- [ ] **Step 2: Add the mute hook to `lib/useProgress.ts`**

Add the import alongside the existing imports at the top of `lib/useProgress.ts`:

```ts
import { loadMuted, subscribeSound } from './sound'
```

Append this hook to `lib/useProgress.ts`:

```ts
/**
 * Whether sound is muted, reactive to the toggle. Server/first-client snapshot is
 * `true` (muted) so the static export renders a stable icon before the store read
 * settles after mount - same hydration-safe shape as the other hooks here.
 */
export function useSfxMuted(): boolean {
  return useSyncExternalStore(subscribeSound, loadMuted, () => true)
}
```

- [ ] **Step 3: Verify it compiles and nothing regresses**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: PASS - the full suite is unaffected (`lib/sfx.ts` is a guarded no-op under jsdom; the hook is not yet consumed).

- [ ] **Step 4: Commit**

```bash
git add lib/sfx.ts lib/useProgress.ts
git commit -m "feat: Web Audio sfx synth and useSfxMuted hook"
```

---

### Task 3: The sound toggle button

**Files:**
- Create: `components/SoundToggle.tsx`
- Test: `components/SoundToggle.test.tsx`

**Interfaces:**
- Consumes: `setMuted` from `@/lib/sound` (Task 1); `useSfxMuted` from `@/lib/useProgress` (Task 2).
- Produces: `<SoundToggle />` named export.

- [ ] **Step 1: Write the failing test**

Create `components/SoundToggle.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { SOUND_KEY } from '@/lib/sound'

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

describe('SoundToggle', () => {
  it('starts unmuted (sound on) and mutes on click', async () => {
    const { SoundToggle } = await import('./SoundToggle')
    const { container, unmount } = render(<SoundToggle />)
    await act(async () => {})

    const btn = container.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('Mute sounds')

    await act(async () => {
      btn.click()
    })

    expect(localStorage.getItem(SOUND_KEY)).toBe('off')
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe('Unmute sounds')
    unmount()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/SoundToggle.test.tsx`
Expected: FAIL - cannot resolve `./SoundToggle`.

- [ ] **Step 3: Implement the component**

Create `components/SoundToggle.tsx`:

```tsx
'use client'

import { setMuted } from '@/lib/sound'
import { useSfxMuted } from '@/lib/useProgress'

export function SoundToggle() {
  const muted = useSfxMuted()
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="text-base leading-none text-[var(--color-muted)]"
    >
      <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/SoundToggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/SoundToggle.tsx components/SoundToggle.test.tsx
git commit -m "feat: SoundToggle mute button"
```

---

### Task 4: Wire the sounds into the study session

**Files:**
- Modify: `app/study/page.tsx`

**Interfaces:**
- Consumes: `playSfx` from `@/lib/sfx` (Task 2); `SoundToggle` from `@/components/SoundToggle` (Task 3); `unlockedUnits` from `@/lib/leitner`.
- Produces: no new exports. Sounds fire on grade / reveal / unit-unlock; the toggle sits in the study header.

Note: the audio calls are guarded no-ops under jsdom, so the existing `app/study/page.test.tsx` (reducer/derive tests) stays green unchanged. This task's gate is those tests plus the static-export build.

- [ ] **Step 1: Add the imports**

In `app/study/page.tsx`, extend the React import to include `useEffect` and `useRef`:

```ts
import { Suspense, useEffect, useMemo, useReducer, useRef } from 'react'
```

Add these imports alongside the existing ones:

```ts
import { SoundToggle } from '@/components/SoundToggle'
import { playSfx } from '@/lib/sfx'
```

Extend the leitner import to include `unlockedUnits` (keep whatever it already imports):

```ts
import { nextCard, unlockedUnits, type ProgressMap } from '@/lib/leitner'
```

- [ ] **Step 2: Add the unlock-detection effect**

Inside `StudySession`, after the existing `const goal = useMemo(...)` line, add:

```ts
  const unlockedCount = useMemo(() => unlockedUnits(course, progress).length, [course, progress])
  const prevUnlocked = useRef(unlockedCount)
  useEffect(() => {
    // Plays only when a grade opens a new station. On mount the ref already equals
    // the current count, so nothing fires spuriously.
    if (unlockedCount > prevUnlocked.current) playSfx('unlock')
    prevUnlocked.current = unlockedCount
  }, [unlockedCount])
```

- [ ] **Step 3: Play sounds on reveal and grade**

In the `CardStage` props, change `onReveal` and `onGrade` to fire sounds:

```tsx
        onReveal={() => {
          playSfx('reveal')
          dispatch({ type: 'reveal', isNew })
        }}
        onContinue={() => dispatch({ type: 'continue', cardId: card.id })}
        onGrade={(correct) => {
          playSfx(correct ? 'correct' : 'incorrect')
          gradeCard(card.id, correct)
          dispatch({ type: 'graded', correct, cardId: card.id })
        }}
```

- [ ] **Step 4: Mount the toggle in the study header**

In the study header, replace the bare `Finish` link so a `SoundToggle` sits beside it on the right. Change the header's right side from just the `<Link>...Finish...</Link>` to:

```tsx
        <div className="flex items-center gap-3">
          <SoundToggle />
          <Link
            href="/"
            className="sig-label rounded-full border border-[var(--color-line)] px-3 py-1 text-[11px]"
            onClick={(e) => {
              // Zero cards studied: Finish just navigates home like a plain link -
              // no fake "session complete" screen for a session that never happened.
              if (state.tally.studied === 0) return
              e.preventDefault()
              dispatch({ type: 'finish' })
            }}
          >
            Finish
          </Link>
        </div>
```

(The header remains `<header className="mb-4 flex items-center justify-between ...">` with the tally span on the left and this group on the right.)

- [ ] **Step 5: Verify tests and the static export build**

Run: `npx vitest run app/study/page.test.tsx`
Expected: PASS - the pure-function tests are unaffected.

Run: `npm test`
Expected: PASS - full suite green.

Run: `npm run build`
Expected: SUCCESS - `/study` prerendered, all routes emitted.

- [ ] **Step 6: Commit**

```bash
git add app/study/page.tsx
git commit -m "feat: play sounds on reveal, grade, and unit unlock; add toggle"
```

---

## Notes for the executor

- **`playSfx` is a guarded no-op under jsdom** (no `AudioContext`), so it never interferes with tests - do not mock it.
- **The unlock effect compares counts across renders via a `useRef`**; do not reset the ref on every render, and keep the mount value equal to the current count so it never fires on first paint.
- **Do not add sounds to button taps across the app** - only the four study events in this plan (grade, reveal, unlock). More would grate.
- **Tuning values in `lib/sfx.ts`** (frequencies, durations, gains) are starting points; leaving them as written is fine for this plan.
