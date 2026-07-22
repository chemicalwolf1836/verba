<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BJT Trainer

An offline-first Japanese vocabulary trainer. Audio-first recall, Leitner-box
spaced repetition, 192 words across 24 weekly units. Static export, deployed to
Vercel.

Design spec: `docs/superpowers/specs/2026-07-22-bjt-trainer-design.md`
Implementation plan: `docs/superpowers/plans/2026-07-22-bjt-trainer.md`

## Hard constraints

These are not preferences. Breaking one breaks the product.

1. **Offline.** The app is studied on a train with no signal. No `fetch`, no
   network calls, no remote fonts, no remote images, ever. Vocabulary is
   imported as an ES module, never loaded. Audio is the browser
   `SpeechSynthesis` API - native OS text-to-speech, not audio files.
   In particular: **never use `next/font/google`**, it emits remote font refs.

2. **`output: 'export'`.** Set in `next.config.ts` so that any accidental
   server dependency becomes a build error rather than a runtime surprise on
   the train. Do not remove it to make something work - report the conflict.

3. **`lib/leitner.ts` must never import anything course-specific.** The
   scheduler sees `Card[]` and `ProgressMap` and nothing else. This is the test
   of whether the course abstraction actually holds; a second course (JLPT)
   should be one new file in `lib/courses/` plus one registry line.

4. **No ambient randomness or clock reads inside `lib/`.** `Math.random()` and
   `Date.now()` are forbidden in pure modules - callers inject `now: number`
   and any shuffling happens at the edge. This is what makes the scheduler
   testable without stubbing globals.

5. **Card ids are content-derived and course-prefixed** (`bjt-vocab-会議`),
   never positional. Progress is keyed by card id, so an id that shifts when a
   row is inserted silently re-points saved progress at the wrong word.

## Writing style

**Use a spaced hyphen ` - `, never an em-dash**, in all user-facing copy: UI
strings, headings, docs. Does not apply to code operators, CSS values, or
numeric ranges.

## Data

`lib/courses/bjt.ts` holds 192 vocabulary rows (8 per unit, 24 units) plus 15
business phrases. Each row carries an `origin` tag:

- `prototype` (66) - the owner's real dataset, carried from an earlier HTML prototype
- `drafted` (126) - drafted to fill the plan out to 8/unit, pitched at the J2
  band. **Unverified.** There is no official BJT word list; JETRO publishes
  none. Treat these as provisional and do not present them as authoritative.

`lib/courses/bjt.test.ts` guards the dataset's shape - 192 cards, 8 per unit,
unique ids, no empty fields. Run it after any data edit.

## Progress vocabulary

Two thresholds, deliberately distinct. Never conflate them, and never hand-roll
a box comparison in a component - use the exported predicates.

- **learned** = `box >= 2`, answered correctly at least once. Drives unit
  unlocking and pace projection.
- **mastered** = `box === 5`. Drives the course mastery bar headline only.

## Storage

Two `localStorage` keys, deliberately not course-prefixed, because card ids
already carry their course and one flat map holds every course:

- `trainer.progress.v1`
- `trainer.activity.v1`

`localStorage` does not exist during server render. Read it via
`useSyncExternalStore` with a server snapshot, never in a component body -
that is a hydration mismatch.

## Conventions

Single quotes, no semicolons, 2-space indent, `@/*` path alias to the project
root. Pure logic in `lib/*.ts` with a colocated `lib/*.test.ts`. React
components in `components/`. Matches `~/Documents/wander`.

## Commands

```
npm run dev     # dev server
npm run build   # static export to out/ - a real gate, not a formality
npm test        # vitest
```

Never run `npx vercel` or any deploy command without being asked. Deploys are
human-gated in this project.
