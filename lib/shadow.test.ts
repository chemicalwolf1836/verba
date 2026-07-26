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
