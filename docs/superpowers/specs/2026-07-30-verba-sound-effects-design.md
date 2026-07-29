# Verba Sound Effects - Design

**Date:** 2026-07-30
**Status:** Approved for planning

## 1. Purpose

Give the study loop warm audio feedback - a small reward for getting a card right,
a gentle note for a miss, a tick on reveal, and an arrival chime when a unit
unlocks. Sounds are synthesized in the browser (no audio files), so they work
fully offline, and they nod to Japanese station departure melodies to reinforce
the transit identity.

## 2. Constraints

- **Offline:** no fetched audio. Sounds are generated with the Web Audio API
  (oscillators + gain envelopes). Nothing to cache, nothing to fetch.
- **iOS gesture rule:** an `AudioContext` can only start inside a user gesture.
  All primary triggers (grade, reveal) fire from a tap, so the context is created
  and resumed lazily on the first `playSfx`. The unlock chime plays from an effect
  that only ever runs after a grade tap, so the context is already live by then.
- **No surprise noise:** sound is on by default but muteable, and the miss sound
  is soft and low - never punishing.
- **Style:** single quotes, no semicolons, 2-space indent, `@/*` alias. No
  em-dashes in copy.

## 3. Sound palette - warm chimes

Marimba/xylophone-like tones (sine or triangle oscillators with a fast attack and
a short exponential decay), tuned to feel calm rather than gamey:

| Name | Character | Rough synthesis |
|---|---|---|
| `correct` | pleasant rising two-note chime | two short triangle tones, ascending (e.g. E6 then A6), ~90 ms each |
| `incorrect` | soft, low, non-punitive | one low sine tone with a gentle decay (~180 ms), quiet |
| `reveal` | a light tick | one very short soft tone (~60 ms) |
| `unlock` | a short arrival arpeggio | three ascending triangle tones in quick succession (a station-jingle nod) |

Exact frequencies, durations, and gain levels are tuning constants in `lib/sfx.ts`
and can be adjusted after listening; the plan fixes concrete starting values.

## 4. Architecture

Two small modules plus a toggle and the wiring. Audio and preference are kept
separate so the preference is testable and the audio stays a thin, guarded
wrapper (the same split as `speech.ts` vs. its callers).

### 4.1 `lib/sound.ts` - the mute preference (testable)
```ts
export const SOUND_KEY = 'trainer.sound.v1'   // 'on' | 'off', default 'on'
export function loadMuted(): boolean          // true = muted; default false (on)
export function setMuted(muted: boolean): void // persists + notifies
export function subscribeSound(fn: () => void): () => void
```
Defensive read (corrupt/missing -> default on), `typeof window` guarded, notifies
listeners only after a successful write - mirroring `lib/progress.ts` / the other
stores. Not course-prefixed (it is an app-wide preference).

### 4.2 `lib/sfx.ts` - the synth (not unit-tested; Web Audio has no jsdom impl)
```ts
export function playSfx(name: 'correct' | 'incorrect' | 'reveal' | 'unlock'): void
```
- Returns immediately if `typeof window === 'undefined'`, if Web Audio is
  unsupported, or if `loadMuted()` is true.
- Lazily creates a single module-level `AudioContext` on first use (handles the
  `webkitAudioContext` prefix); calls `ctx.resume()` (iOS wakes a suspended
  context inside the triggering gesture).
- Synthesizes the named sound from oscillator + gain nodes with a short envelope;
  never throws (any failure is swallowed - a study session must not break over a
  blip).

### 4.3 `useSfxMuted()` hook (in `lib/useProgress.ts`)
`useSyncExternalStore(subscribeSound, loadMuted, () => true)` - returns whether
sound is muted, reactive for the toggle. Server snapshot returns muted=true so the
static export renders the "muted" icon first and settles after mount (no
hydration mismatch, same pattern as the other hooks).

### 4.4 `components/SoundToggle.tsx`
A small speaker-icon button (`🔊` when on, `🔇` when muted) in the study screen
header. `aria-label` reflects state ("Mute sounds" / "Unmute sounds"). Reads
`useSfxMuted()`, calls `setMuted(!muted)` on click.

### 4.5 Wiring in `app/study/page.tsx`
- `onGrade(correct)` -> `playSfx(correct ? 'correct' : 'incorrect')` alongside the
  existing `gradeCard` + dispatch.
- `onReveal` -> `playSfx('reveal')` alongside the existing dispatch.
- **Unlock detection:** an effect watches the unlocked-unit count
  (`unlockedUnits(course, progress).length`). When it increases from the previous
  render, `playSfx('unlock')`. A `useRef` holds the previous count; on mount the
  ref starts at the current count so nothing fires spuriously. This decouples the
  chime from the specific grade and needs no new event plumbing.
- Add `<SoundToggle />` to the study header row.

## 5. Testing

- `lib/sound.test.ts`: default is unmuted; `setMuted(true)` persists and a
  subscriber is notified; a corrupt/missing value degrades to unmuted; a write
  failure does not throw and does not notify (mirrors `lib/progress.test.ts`).
- `components/SoundToggle.test.tsx`: renders a button; clicking it flips the
  stored value and the `aria-label` (real store, hand-rolled harness).
- `lib/sfx.ts` is not unit-tested - jsdom has no `AudioContext`, and it is a thin,
  guarded, feature-detected wrapper, exactly as `lib/speech.ts` is left untested.
  Its safety (no throw when unsupported, muted-skips-play) is covered by code
  inspection and the mute store's tests.
- The study-page wiring is verified by the existing study tests staying green plus
  the static-export build; the audio calls themselves are guarded no-ops under
  jsdom.

## 6. Build order

1. `lib/sound.ts` + tests (the mute store).
2. `lib/sfx.ts` (the synth) + `useSfxMuted()` hook.
3. `components/SoundToggle.tsx` + test.
4. Wire the study page (grade/reveal/unlock) + mount the toggle; verify build.

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Sounds feel gamey or annoying on repeat | Medium | Warm, quiet, short envelopes; miss sound is soft; easy mute; tuning constants adjustable after listening |
| `correct` and `unlock` overlap on a threshold-crossing grade | Low | Both are short; a correct chime plus an arrival arpeggio reads as a combined reward. Revisit only if muddy in practice |
| Autoplay/gesture policy blocks the context | Low | Context is created/resumed inside the triggering tap; unlock plays only after such a tap |

## 8. Out of scope
- Button-tap clicks across the whole app (too much; would grate).
- A full settings screen - a single study-header toggle is enough for one preference.
- Volume control - mute on/off only for v1.
