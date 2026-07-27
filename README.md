# Verba

An offline-first vocabulary trainer for language exams - audio-first recall,
Leitner spaced repetition, and a route-map progression, built to hold multiple
languages and tests. The first course is the BJT (Business Japanese Proficiency
Test), targeting the J2 band around a score of 400.

## How it works

- **Audio-first recall.** A word is spoken; you produce the reading and meaning from
  memory, then reveal and grade yourself. Typing is optional.
- **Leitner boxes.** Correct answers promote a card one box; a miss sends it back to
  box 1. Weak cards surface first.
- **No calendar.** Units unlock when 75% of the previous unit is learned, so the pace
  follows how much you actually study rather than a fixed schedule.
- **Goals you can see.** A unit unlock ring on the study screen counts down to the next
  unit; a course mastery bar on the home screen tracks every card from box 1 to box 5.
- **Fully offline.** Vocabulary is bundled into the app and audio uses the browser
  `SpeechSynthesis` API, so no network is needed once loaded.

## Development

    npm install
    npm run dev
    npm test

Built with Next.js (static export), React, TypeScript, and Tailwind. `npm run build`
produces a fully static `out/` directory.

## Data

192 vocabulary cards across 24 weekly units, plus 15 business phrases. Each card
carries an `origin` field: `prototype` for verified entries, `drafted` for entries
that still need review. There is no official BJT vocabulary list - the drafted entries
are pitched at the J2 band and should be reviewed before being trusted.

## Audio note

Japanese speech uses the device's built-in `ja-JP` voice. If none is installed the app
shows a warning, because it would otherwise read Japanese with an English voice. Voice
quality is best in Chrome, Edge, or Safari.
