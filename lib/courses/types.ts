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
  /**
   * A memory hook - how the kanji or the shape of the word gives away its
   * meaning. Optional and deliberately sparse: a card without one simply omits
   * the panel, which is better than padding every row with a filler mnemonic.
   */
  hook?: string
  theme: string
  origin: Origin
}

export type Course = {
  id: string
  name: string
  /** Short badge shown in the station roundel, e.g. 'BJT', 'N2', 'HSK'. */
  code: string
  /** The goal this course rides toward - a score, level, or band. Rendered as
   *  the line's destination ("Bound for · 400" / "Bound for · N2"). Per test. */
  target: string
  /** Renders as "Week 5" or "Set 5" depending on the course. */
  unitLabel: string
  units: Unit[]
  cards: Card[]
}
