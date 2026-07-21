# BJT Trainer - Design

**Date:** 2026-07-22
**Status:** Approved for planning

## 1. Purpose

A Japanese vocabulary trainer for daily personal study, deployed publicly as a portfolio
piece. It replaces an existing single-file HTML prototype
(`~/Downloads/BJT_Listening_Trainer.html`) with a real, maintainable project.

The immediate goal is the BJT (Business Japanese Proficiency Test), targeting a score of
400 - the J2 band. The app must generalise to other curricula, JLPT in particular,
without rework.

## 2. Hard constraints

1. **Works fully offline.** Study happens on a train with no signal.
   - Vocabulary is bundled into the JS bundle. Never fetched.
   - Audio uses the browser `SpeechSynthesis` API, not audio files. Zero network.
   - The PWA layer is built last, but nothing may depend on the network before then.
2. **No invented vocabulary presented as authoritative.** Data drafted by Claude is
   tagged as such and is auditable. See section 5.
3. **Mobile-first, one-handed.** The primary device is a phone on a moving train.

## 3. Scope

### In scope for v1

- Vocabulary cards - audio-first recall, reveal, self-grade
- Business phrases deck - same mechanic, no example sentence
- Unit browser - the 24 BJT weeks, per-unit progress, drill a single unit
- Leitner-box progress tracking, persisted locally
- Endless sessions with no fixed length
- Shadowing mode - timed listen-then-repeat (stage 7, after first deploy)
- Installable PWA with offline caching (stage 8, last)

### Explicitly out of scope

- User accounts, sync, or any server-side state
- A second course. The seams for JLPT are designed now; **no JLPT content is built.**
- Full SM-2 / Anki-grade scheduling with calendar due dates
- Handwriting, stroke order, or kanji production practice

## 4. Stack

Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4, Vitest, deployed to Vercel.

This mirrors `~/Documents/wander` and `~/Documents/neon-kissa-v2` so tooling stays
consistent across the portfolio. The original brief guessed React + Vite; inspection of
the existing projects showed Next.js throughout, and consistency won.

`next.config.ts` sets **`output: 'export'`**. Vercel serves either, but static export makes
"nothing may depend on a server" a build error rather than a discipline to remember. The
offline constraint becomes enforced by the toolchain.

Conventions follow `wander`: root-level `app/`, `lib/`, `components/`, with pure logic in
`lib/*.ts` and colocated `lib/*.test.ts`.

> Note: both existing Next projects carry an `AGENTS.md` warning that Next 16 differs from
> model training data. Read `node_modules/next/dist/docs/` before writing app code.

## 5. Data model

### 5.1 Course - the modularity seam

`week` is BJT-specific; JLPT has levels and sets. The concept generalises to a **unit**
with a per-course label.

```ts
export type Course = {
  id: string;          // 'bjt' | 'jlpt-n3'
  name: string;        // 'BJT - Business Japanese'
  unitLabel: string;   // 'Week' -> renders "Week 5"; JLPT would use 'Set'
  units: Unit[];
  decks: DeckDef[];
};

export type Unit = { id: string; index: number; theme: string };
```

`lib/courses/bjt.ts` is the only implementation. `lib/courses/index.ts` is the registry.
Adding JLPT is one new file plus one registry line.

**The abstraction is correct if and only if `lib/leitner.ts` never imports anything
BJT-specific.** The scheduler sees `Card[]` and `ProgressMap` and nothing else. This is a
review criterion, not an aspiration.

### 5.2 Card

```ts
export type Card = {
  id: string;          // 'bjt-vocab-会議' - course-prefixed, content-derived
  courseId: string;
  unitId: string;
  deck: 'vocab' | 'phrase';
  jp: string;
  reading: string;
  meaning: string;
  exampleJp?: string;  // absent on phrase cards
  exampleEn?: string;
  theme: string;
  origin: 'prototype' | 'drafted';
};
```

**IDs are content-derived, never positional.** The prototype stored cards as positional
arrays. Keying progress by index means inserting a word silently re-points every saved
record at a different card. Course-prefixing additionally lets one flat `ProgressMap` hold
multiple courses without collision - "reset JLPT progress" becomes a prefix filter.

Shadowing sentences are a separate type. They are never graded and have no meaning or
example, so forcing them into `Card` would mean permanently-empty optional fields:

```ts
export type ShadowLine = { id: string; jp: string; reading: string; en: string };
```

### 5.3 The dataset - status

`lib/vocabulary.ts` currently holds **192 vocabulary cards, 8 per week across 24 weeks**,
plus 15 phrases. Verified: no duplicate IDs, no empty required fields, exactly 8 per week,
one theme per week.

> **Migration required.** That file was written before the course model in 5.1 existed. It
> currently uses `week: number | null` and IDs of the form `vocab-会議`, with no `courseId`
> or `unitId`. Build step 3 must migrate it to the `Card` shape above: IDs become
> `bjt-vocab-会議`, `week` becomes `unitId`, and the `WEEKS` export becomes the `units`
> array on the BJT course. The row data itself does not change.

**Provenance is tracked in the `origin` field and this matters:**

| origin | count | meaning |
|---|---|---|
| `prototype` | 66 | The user's own data, carried from the HTML prototype verbatim |
| `drafted` | 126 | Drafted by Claude to fill the plan to 8/week |

**There is no official BJT vocabulary list.** JETRO does not publish one - BJT assesses
practical business communication, not a fixed word set. The 126 drafted entries are a
judgment call pitched at the J2 band (400-529) within the existing weekly themes. They are
**unverified** and must be reviewed before being trusted. The `origin` field exists so that
review is a filter, not an archaeology exercise. It can be deleted once verification is
complete.

Two defects in the original data were found and fixed:

1. `いらっしゃる` had reading `irasshyaru`. Correct romaji is `irassharu`. With the typed
   input enabled this would have marked correct answers wrong permanently.
2. Readings mixed romaji and kana with no stated rule. Now an explicit convention:
   **reading is kana for any word containing kanji; words already written purely in kana
   carry romaji**, because a kana reading of a kana word teaches nothing.

That convention is a requirement leaking into data, and it obligates section 8.4.

## 6. Progress model

```ts
export type CardProgress = {
  box: 1 | 2 | 3 | 4 | 5;   // Leitner box
  seen: number;
  correct: number;
  lastSeen: number;          // epoch ms
};
export type ProgressMap = Record<string, CardProgress>;  // keyed by Card.id
```

Stored as JSON at `localStorage['trainer.progress.v1']`.

The key is deliberately **not** course-prefixed. Card IDs already carry their course
(`bjt-vocab-会議`), so one flat map holds every course; a `bjt.` key would contradict that
and force a second store the moment JLPT is added.

**localStorage over IndexedDB:** ~200 records is far below the 5 MB budget, and
localStorage is synchronous, so first render already knows progress - no loading flash on
a card. IndexedDB would be correct if this grew to thousands of cards with full review
history. The `v1` suffix is deliberate: a schema change migrates rather than corrupts.

### 6.1 Two thresholds, two words

The UI reports progress at two different strengths. They must never be conflated, and both
are exported as named predicates from `lib/leitner.ts` so no component ever hand-rolls a
box comparison:

| Term | Rule | Used by |
|---|---|---|
| **Learned** | `box >= 2` - answered correctly at least once | Unit unlocking (7.3), pace projection (7.4), unit ring (8.4) |
| **Mastered** | `box === 5` - survived four correct answers | Course mastery bar headline (8.4) |

```ts
export const isLearned  = (p?: CardProgress) => (p?.box ?? 1) >= 2;
export const isMastered = (p?: CardProgress) => p?.box === 5;
```

A card with no progress record is treated as box 1, so `isLearned(undefined)` is `false`
without any caller needing a null check.

A second key, `localStorage['trainer.activity.v1']`, holds a rolling 30-day log for pace
projection (section 7.4):

```ts
export type ActivityLog = Record<string, number>;  // 'YYYY-MM-DD' -> cards graded
```

## 7. Scheduling

### 7.1 Leitner rules

Pure functions in `lib/leitner.ts`. No React, no storage, no clock reads except via an
injected `now`.

- Unseen card: box 1
- Graded correct: `box = min(box + 1, 5)`
- Graded wrong: `box = 1` (straight back, not decremented)

Chosen over SM-2 because the brief asked for simple spaced-repetition-style ordering, and
because deterministic box arithmetic is trivially unit-testable and easy to explain.

### 7.2 Endless sessions

There is **no session length and no pace preset.** The user studies until they choose to
stop. This is the honest response to "depending on my mood."

This creates a problem that must be solved rather than configured around. Ordering purely
by `(box asc, lastSeen asc)` puts every unseen card (box 1, `lastSeen` 0) ahead of every
review. An endless session would therefore march through all 192 new words before a single
repetition - the opposite of what spaced repetition is for.

**Resolution: lazy interleaved queue.** `lib/leitner.ts` exposes:

```ts
export function nextCard(
  unlocked: Card[], progress: ProgressMap, sessionHistory: string[], now: number
): Card | null;
```

Rules, in order:

1. Every `NEW_CARD_INTERVAL`-th position (default 5), prefer an unseen card from the
   lowest-index unlocked unit, if one exists.
2. Otherwise draw from the review pool, sorted `(box asc, lastSeen asc)`.
3. Never return a card seen within the last `MIN_GAP` positions (default 8) of
   `sessionHistory`, unless nothing else is available.
4. Return `null` only when the unlocked pool is empty.

Constants live in one exported object so they are tunable without hunting.

### 7.3 Mastery-gated unlocking

Units unlock by demonstrated mastery, not by calendar date:

> Unit `n + 1` unlocks when at least `UNLOCK_THRESHOLD` (default 75%) of unit `n`'s cards
> have reached box 2 or higher - that is, have been answered correctly at least once.

This is what makes pace emergent. Study heavily and units unlock in days; study lightly and
they unlock in weeks. **The 24-week schedule becomes a consequence of behaviour rather than
a deadline imposed on it.** Nothing can ever report the user as "behind."

### 7.4 Pace projection

Home screen shows a projection derived from actual recent throughput, not a fixed plan:

```
rate      = sum(last 7 days of ActivityLog) / 7        // cards graded per day
remaining = count of ALL cards in the course, locked or not, where !isLearned(p)
estimate  = remaining / rate                           // days to finish the course
```

Rendered as "about 9 weeks at your recent pace." Suppressed entirely when `rate` is 0 -
showing "Infinity weeks" to someone returning after a break is hostile.

## 8. Application structure

### 8.1 Routes

```
app/
  layout.tsx
  page.tsx                 # home: start studying, overall progress, pace projection
  study/page.tsx           # endless session runner (client)
  units/page.tsx           # 24-week browser with per-unit progress
  units/[unit]/page.tsx    # drill one unit (generateStaticParams over the course units)
  shadow/page.tsx          # stage 7
  manifest.ts              # stage 8
lib/
  courses/index.ts         # registry
  courses/bjt.ts           # the one course
  vocabulary.ts    + .test.ts   # DONE - dataset + integrity tests
  leitner.ts       + .test.ts   # boxes, queue, unlocking - pure
  progress.ts      + .test.ts   # localStorage read/write/migrate
  activity.ts      + .test.ts   # rolling daily log, pace projection
  answer.ts        + .test.ts   # kana/romaji answer matching
  speech.ts                     # SpeechSynthesis wrapper
  useProgress.ts                # React binding
components/
  CardStage.tsx  GradeButtons.tsx  PlayButton.tsx
  SessionCounters.tsx  UnitCard.tsx  VoiceWarning.tsx
  UnitUnlockRing.tsx  UnlockToast.tsx  MasteryBar.tsx    # section 8.3
```

The active course defaults to `bjt` and is held in app state. A course picker appears on
home only when the registry holds more than one course, so adding JLPT later needs no route
restructuring.

### 8.2 State organisation

Three tiers, never mixed:

| Tier | Lives in | Lifetime |
|---|---|---|
| Course + vocabulary | imported ES module | compile-time, immutable |
| Progress + activity | `localStorage` | permanent |
| Session | `useReducer` in `/study` | discarded on navigate |

Session state is a state machine, not a bag of booleans:

```ts
type Phase = 'introduce' | 'prompt' | 'revealed';

type SessionState = {
  current: Card | null;
  phase: Phase;
  typed: string;
  history: string[];                              // card ids, for the MIN_GAP rule
  tally: { studied: number; got: number; missed: number };
};

type SessionAction =
  | { type: 'reveal' }
  | { type: 'grade'; correct: boolean }
  | { type: 'type'; value: string }
  | { type: 'advance'; card: Card | null };
```

The prototype tracked `checked`, `input`, `idx`, `got`, `missed` as separate fields and
each transition had to remember to reset the right subset - miss one and the next card
renders already-revealed. A single reducer makes illegal transitions unrepresentable.

**First exposure:** a card with `seen === 0` enters in the `introduce` phase - Japanese
text, reading, meaning and audio all visible, one tap to continue. It becomes a blind audio
prompt only on later encounters. Without this, audio-first mode quizzes the user on words
they have never met.

**Session UI:** because sessions are endless there is no "card 3 of 15" rail. The header
carries a running tally and a persistent Finish button. The end screen summarises what was
actually done and never implies a target was missed.

### 8.3 Goal and progress UI

Endless sessions remove the finish line, and a session with no finish line has no goal.
The two goal surfaces below restore one **without** reintroducing a fixed session length or
a calendar deadline: both are derived purely from mastery, so neither can ever report the
user as behind.

A daily-target ring with a streak was considered and **rejected**. It is the only proposed
goal mechanic capable of producing a "you missed it" state, which is the failure mode this
whole schedule model exists to avoid.

#### Unit unlock ring - the near horizon

Lives in the study screen header, visible on every card.

```
  Week 5 - Kanji: work

  ●●●●●○○○   5 of 8 learned
  ▲ unlock at 6

  1 more to unlock Week 6
```

- One pip per card in the current unit; filled when `isLearned`
- A notch marks the unlock point - `ceil(UNLOCK_THRESHOLD * unit.cards.length)`, so 6 of 8
  at the default 75%
- The countdown text is computed against **the threshold, not the unit total**. At 5 of 8
  learned it reads "1 more to unlock Week 6", never "3 more". Getting this wrong makes the
  goal look further away than it is, which defeats the purpose.
- Once the threshold is passed, the text switches to the remaining unit total
  ("2 words left in Week 5") so the pips stay meaningful
- Crossing the threshold shows a one-shot unlock confirmation naming the next unit and its
  theme. This is the session's reward beat - the moment an endless session earns a stop.

"Current unit" means the lowest-index unlocked unit that is not yet past its threshold. In
a mixed session the ring tracks that unit even when the card on screen is a review drawn
from an earlier one; the ring is a goal indicator, not a description of the current card.

#### Course mastery bar - the 400 horizon

Lives on the home screen.

```
  Course progress - BJT 400

  ████████████▓▓▓▓▓▓▒▒▒▒░░░░░░░░░░░░░░
  box5=31  box4=24  box3=18  box2=22  box1=97

  31 of 192 mastered - 16%
  About 9 weeks at your recent pace
```

- A single stacked bar over all cards in the course, segmented by Leitner box
- Headline counts `isMastered` (box 5), matching 6.1
- Pace line from 7.4, suppressed entirely when the 7-day rate is zero
- Segment order is fixed box 5 → box 1 so the bar visibly fills left to right over weeks

Both surfaces are pure reads over `ProgressMap`. Neither adds persisted state, and neither
requires a settings screen.

### 8.4 Answer matching

Because the typed input is optional but supported, and because readings are kana for kanji
words but romaji for kana words (section 5.3), `lib/answer.ts` must accept either form for
the same card. It normalises whitespace and case, and handles:

- は as `wa`, へ as `e`, を as `wo`/`o` when acting as particles
- し as `shi` or `si`, つ as `tsu` or `tu`, ふ as `fu` or `hu`, じ as `ji` or `zi`
- long vowels written `ou`/`oo`/`ō`/`o-`
- ん as `n` or `nn`
- Match against `reading`, against `jp`, and against a romaji transliteration of `reading`

Grading remains the user's own call. A match is shown as confirmation; it never overrides
the self-grade.

## 9. Audio

`lib/speech.ts` wraps `SpeechSynthesis`:

```ts
export function speak(text: string, opts?: { rate?: number }): void;
export function cancel(): void;
export function speechStatus(): 'ready' | 'no-japanese-voice' | 'unsupported';
```

Four failure modes it must absorb:

1. **`getVoices()` returns `[]` on first call** in Chrome - voices load asynchronously.
   Must subscribe to `voiceschanged`. The prototype already handles this correctly.
2. **No `ja-JP` voice installed.** The browser then reads 会議 with an English voice,
   producing noise and actively teaching wrong pronunciation. `speechStatus()` detects this
   and the UI shows a persistent banner. Common on iOS unless the Japanese keyboard or
   voice has been added. **This is the single largest usability risk in the project.**
3. **iOS requires a user gesture.** The prototype auto-plays via `setTimeout(speak, 350)`;
   timers break the gesture chain and iOS may block it. Autoplay is best-effort only; the
   play button is always the guaranteed path.
4. **`cancel()` before every `speak()`**, or rapid taps queue utterances and the user hears
   several cards in sequence.

Offline behaviour is free here: `SpeechSynthesis` is native OS text-to-speech. No files, no
network, nothing for a service worker to cache. The voice must be installed on-device, but
that is a one-time setup, not a runtime dependency.

## 10. Offline and PWA - stage 8

- `app/manifest.ts` using the Next metadata convention, icons in `public/`
- A hand-written service worker in `public/sw.js`, cache-first on the app shell,
  registered from a small client component

`next-pwa` is rejected: it lags Next releases, and the project's own `AGENTS.md` warns that
Next 16 breaks training-data assumptions. A short service worker that can be read in full
beats a plugin that cannot be debugged without signal.

Because vocabulary is compiled into the bundle, caching the JS caches the data. Progress
already works offline via localStorage regardless of the service worker; the SW only makes
the app itself loadable without a connection.

## 11. Testing

Vitest, colocated, mirroring `wander`.

| File | Covers |
|---|---|
| `vocabulary.test.ts` | 192 cards, 8 per unit, unique IDs, no empty fields, one theme per unit |
| `leitner.test.ts` | Box promotion and reset, weak-first ordering, `NEW_CARD_INTERVAL` interleaving, `MIN_GAP` repeat avoidance, unlock threshold |
| `progress.test.ts` | Round-trip, absent key, corrupt JSON, version migration |
| `activity.test.ts` | Rolling window, 7-day rate, zero-rate suppression |
| `answer.test.ts` | Every romaji variant in section 8.4 |
| `goals.test.ts` | `isLearned` / `isMastered` boundaries, unlock-point rounding, countdown text against the threshold not the unit total, box-distribution totals summing to the card count |

`vocabulary.test.ts` is the one that earns its keep when the real 192 are pasted in and a
row is malformed.

Randomness is injected, never ambient. `nextCard` is deterministic given its arguments, so
no test stubs `Math.random`.

## 12. Build order

1. Scaffold Next 16 + TS + Tailwind v4 to `wander` conventions
2. `lib/speech.ts` and one hardcoded card rendering with working audio
3. Course model, real data wired in, `leitner.ts` + `progress.ts` + `activity.ts` with tests
4. Study flow: introduce -> prompt -> reveal -> grade, endless queue, unit unlock ring
5. Home with course mastery bar and pace projection, unit browser, unit drill
6. **Deploy to Vercel - a live URL exists from this point on**
7. Shadowing mode
8. PWA and installability

## 13. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Device has no `ja-JP` voice - app teaches wrong pronunciation | High | `speechStatus()` detection plus a persistent, non-dismissible banner |
| The 126 drafted words contain errors | High | `origin` tagging; review before trusting; user's real data supersedes |
| iOS blocks autoplay, flow feels broken | Medium | Autoplay best-effort; play button always present |
| Unlock threshold tuned wrong - units gate too early or too late | Medium | Single exported constant; adjustable after real use |
| Endless sessions feel directionless without a finish line | Medium | Unit unlock ring plus course mastery bar (8.3). This risk was raised during design and addressed before build; both surfaces are mastery-derived so neither can report the user as behind |
| Unit ring is demotivating when a unit is nearly done and reviews dominate | Low | Ring tracks the lowest unfinished unlocked unit, not the on-screen card; countdown is computed against the unlock threshold, not the unit total |
| `output: 'export'` blocks a future server feature | Low | No server feature is in scope; reversible in one config line |

## 14. Decisions log

| Decision | Chosen | Rejected |
|---|---|---|
| Framework | Next.js 16, matching the portfolio | React + Vite (brief's original guess) |
| Card prompt | Audio first, recall reading and meaning | Text-first, English-first |
| Recall input | Speak and self-grade, typing optional | Typing required |
| Scheduling | Leitner, five boxes | SM-2 with due dates, weighted random |
| Session length | Endless, user stops | Fixed 15, presets, slider |
| Schedule model | Derived from mastery and throughput | Fixed 24-week calendar |
| Goal UI | Unit unlock ring + course mastery bar | Daily target ring with streak, session tally alone |
| Progress vocabulary | `learned` (box >= 2) and `mastered` (box 5) as distinct terms | One overloaded word for both |
| Storage | `localStorage`, versioned key | IndexedDB, server sync |
| Modularity | Course registry, seams only | Building JLPT content now |
| Service worker | Hand-written | `next-pwa` |

## 15. Open items

- The user intends to paste their real 192-word dataset. When that arrives it replaces the
  126 `drafted` entries. `vocabulary.test.ts` guards the shape.
- `UNLOCK_THRESHOLD`, `NEW_CARD_INTERVAL` and `MIN_GAP` have chosen defaults but no
  empirical basis. Revisit after roughly a week of real study.
