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
