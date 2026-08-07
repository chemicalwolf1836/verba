import { describe, it, expect } from 'vitest'
import { toKana } from './kana'

describe('toKana', () => {
  it('returns nothing for empty input', () => {
    expect(toKana('')).toBe('')
  })

  it('transliterates plain syllables', () => {
    expect(toKana('kaigi')).toBe('かいぎ')
    expect(toKana('onegai')).toBe('おねがい')
  })

  it('prefers the longest romaji spelling over a shorter prefix', () => {
    // 'kyo' must win over 'ki', and 'sho' over 'shi'.
    expect(toKana('kyou')).toBe('きょう')
    expect(toKana('shokuji')).toBe('しょくじ')
  })

  it('handles the multi-letter Hepburn irregulars', () => {
    expect(toKana('mitsumori')).toBe('みつもり')
    expect(toKana('uchiawase')).toBe('うちあわせ')
  })

  it('accepts kunrei spellings as well as Hepburn', () => {
    // lib/answer.ts grades these as equal, so the echo must not contradict it.
    expect(toKana('situmon')).toBe(toKana('shitsumon'))
    expect(toKana('tizu')).toBe(toKana('chizu'))
    expect(toKana('huku')).toBe(toKana('fuku'))
  })

  it('turns a doubled consonant into a small tsu', () => {
    expect(toKana('kitte')).toBe('きって')
    expect(toKana('shucchou')).toBe('しゅっちょう')
  })

  it('reads a bare n before a consonant as ん', () => {
    expect(toKana('kanji')).toBe('かんじ')
    expect(toKana('zangyou')).toBe('ざんぎょう')
    expect(toKana('ringisho')).toBe('りんぎしょ')
    expect(toKana('shitsumon')).toBe('しつもん')
  })

  it('consumes only one n of a doubled pair, like an IME', () => {
    // 'onna' is お + ん + な. Eating both n's would swallow the な.
    expect(toKana('onna')).toBe('おんな')
    expect(toKana('konnichiwa')).toBe('こんにちわ')
    expect(toKana('sannin')).toBe('さんにん')
  })

  it('still reads n plus a vowel or y as its own syllable', () => {
    expect(toKana('nani')).toBe('なに')
    expect(toKana('nyuusha')).toBe('にゅうしゃ')
  })

  it('drops a half-typed syllable rather than guessing', () => {
    // Mid-keystroke: 'k' has no kana yet, so the echo shows only かい.
    expect(toKana('kaik')).toBe('かい')
    expect(toKana('k')).toBe('')
  })

  it('grows one syllable at a time as the learner types', () => {
    const steps = ['k', 'ka', 'kai', 'kaig', 'kaigi']
    expect(steps.map(toKana)).toEqual(['', 'か', 'かい', 'かい', 'かいぎ'])
  })

  it('ignores case, spaces, and punctuation', () => {
    expect(toKana('KAIGI')).toBe('かいぎ')
    expect(toKana('kai gi')).toBe('かいぎ')
    expect(toKana('o-negai')).toBe('おねがい')
  })
})
