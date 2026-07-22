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
