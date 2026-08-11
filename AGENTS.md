<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Verba

An offline-first vocabulary trainer for language exams. Audio-first recall,
Leitner-box spaced repetition, a route-map progression, built to hold multiple
courses (see "Multiple courses" below). Static export, deployed to Vercel. The
first shipped course is the BJT (Business Japanese): 192 words across 24 weekly
units.

Design spec: `docs/superpowers/specs/2026-07-22-bjt-trainer-design.md`
Implementation plan: `docs/superpowers/plans/2026-07-22-bjt-trainer.md`

## Hard constraints

These are not preferences. Breaking one breaks the product.

1. **Offline.** The app is studied on a train with no signal. No `fetch`, no
   network calls, no remote fonts, no remote images, ever. Vocabulary is
   imported as an ES module, never loaded. Audio is the browser
   `SpeechSynthesis` API - native OS text-to-speech, not audio files.
   In particular: **never use `next/font/google`**, it emits remote font refs.

   The one deliberate exception is inside `public/sw.js`, which is the caching
   layer rather than app code: **navigations are network-first**, falling back to
   the cached shell when the fetch fails. Do not "restore" this to cache-first.
   It was cache-first, and an installed copy then served the HTML it first saw
   and never noticed a release - twice. Offline is unaffected either way, because
   with no signal the fetch rejects at once and the cache answers. Hashed assets
   stay cache-first; their URLs change with their contents, so they cannot go
   stale.

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

Cards may also carry an optional `hook` - a memory aid. It is deliberately
sparse (a side map in `lib/courses/bjt.ts`, keyed by headword); a card without
one omits the "Remember it" panel rather than showing filler.

`lib/courses/bjt.test.ts` guards the dataset's shape - 192 cards, 8 per unit,
unique ids, no empty fields. Run it after any data edit.

## Pace vs scheduling

Two separate concerns, deliberately in separate modules. `lib/leitner.ts`
decides *which* card is most worth showing. `lib/session.ts` decides *how many*
the learner is in the mood for today - length, whether new cards and/or reviews
are in the queue, and whether typing is on. Pace never reaches into spaced
repetition.

The study screen **freezes the session pool** at the moment it starts, storing
card ids. It has to: both the toggles and the length cap read progress, and
progress changes on every grade, so a live pool would drop a card the instant it
was answered correctly and move the finish line mid-session. The freeze reads
`loadProgress()` directly rather than the render snapshot, which during
hydration is still the empty server one.

`?mode=weak` and `?unit=<id>` are already-scoped choices and skip the setup step.

## Progress vocabulary

Two thresholds, deliberately distinct. Never conflate them, and never hand-roll
a box comparison in a component - use the exported predicates.

- **learned** = `box >= 2`, answered correctly at least once. Drives unit
  unlocking and pace projection.
- **mastered** = `box === 5`. Drives the course mastery bar headline only.
- **weak** = `box < 4` (`isWeak` in `lib/goals.ts`). Drives the Slipping list and
  the weak drill. A third threshold on purpose - "words to shore up" must mean
  cards that still need work, not just the bottom of the pile.

## Storage

Five `localStorage` keys. Progress and activity are deliberately not
course-prefixed, because card ids already carry their course and one flat map
holds every course's progress at once:

- `trainer.progress.v1`
- `trainer.activity.v1`
- `trainer.course` - which course the user is studying (the active-course store)
- `trainer.session.v1` - the session setup (length, queue toggles, answer mode)
- `trainer.sound.v1` - sound on/off

`localStorage` does not exist during server render. Read it via
`useSyncExternalStore` with a server snapshot, never in a component body -
that is a hydration mismatch.

## Multiple courses

The app is built to hold more than one course (language or test). `lib/courses`
is a registry: `COURSES` is an array, `getCourse` / `findUnit` / `allUnits` look
across it. To add a course, add a `Course` data file and one entry to `COURSES` -
the scheduler, goals, routes, and PWA are all course-agnostic and need no change.

- **Unit ids are course-prefixed** (`bjt-w01`), like card ids, so two courses
  never collide on `/units/[unit]`. `unitIdFor` in each course file owns this.
- **The active course** is read through `useActiveCourse()` on the home, study,
  and unit-list screens. The line browser instead derives its course from the URL
  (`findUnit(unitId)`) when opened on a station, so a link to any course's unit
  resolves correctly.
- **`CoursePicker` renders nothing while only one course is registered** - it
  appears automatically once a second course exists.

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

## Deploying

**Pushing does not deploy.** The Vercel project has no linked Git repository -
`vercel project inspect verbaapp` reports no repo, and a push to `main` leaves
the newest deployment untouched. Production only moves when someone runs:

```
npx vercel --prod
```

This was recorded the other way round for a while, on the strength of a
deployment that happened to appear near a push. Do not restate it without
checking: push, then run `npx vercel ls` and confirm a new deployment actually
appeared. Timestamps near a push are not evidence - a manual deploy moments
earlier looks identical.

So the two steps are separate, and each needs asking for:

- `git push` publishes the code and changes nothing a user sees.
- `npx vercel --prod` is the deploy. Never run it unasked, and never before
  `npm test`, `npx tsc --noEmit` and `npm run build` all pass.

Work on a branch when the change is not ready to be shared.
