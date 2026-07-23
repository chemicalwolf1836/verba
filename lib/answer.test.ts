import { describe, it, expect } from 'vitest'
import { matchesAnswer } from './answer'

const kaigi = { jp: '会議', reading: 'かいぎ' }
const wa = { jp: 'は', reading: 'wa' }
const houkoku = { jp: '報告する', reading: 'ほうこくする' }
const onegai = { jp: 'お願い', reading: 'onegai' }

describe('matchesAnswer', () => {
  it('rejects an empty answer', () => {
    expect(matchesAnswer('', kaigi)).toBe(false)
    expect(matchesAnswer('   ', kaigi)).toBe(false)
  })

  it('accepts the exact kana reading', () => {
    expect(matchesAnswer('かいぎ', kaigi)).toBe(true)
  })

  it('accepts the Japanese form itself', () => {
    expect(matchesAnswer('会議', kaigi)).toBe(true)
  })

  it('accepts romaji for a kana reading', () => {
    expect(matchesAnswer('kaigi', kaigi)).toBe(true)
  })

  it('ignores case and surrounding whitespace', () => {
    expect(matchesAnswer('  KAIGI ', kaigi)).toBe(true)
  })

  it('accepts both shi and si style romaji', () => {
    expect(matchesAnswer('shiryou', { jp: '資料', reading: 'しりょう' })).toBe(true)
    expect(matchesAnswer('siryou', { jp: '資料', reading: 'しりょう' })).toBe(true)
  })

  it('accepts tsu and tu, fu and hu, ji and zi', () => {
    expect(matchesAnswer('tsugou', { jp: '都合', reading: 'つごう' })).toBe(true)
    expect(matchesAnswer('tugou', { jp: '都合', reading: 'つごう' })).toBe(true)
    expect(matchesAnswer('fuzai', { jp: '不在', reading: 'ふざい' })).toBe(true)
    expect(matchesAnswer('huzai', { jp: '不在', reading: 'ふざい' })).toBe(true)
  })

  it('accepts long vowels written ou or oo', () => {
    expect(matchesAnswer('houkokusuru', houkoku)).toBe(true)
    expect(matchesAnswer('hookokusuru', houkoku)).toBe(true)
  })

  it('accepts n written as nn', () => {
    expect(matchesAnswer('kennmei', { jp: '件名', reading: 'けんめい' })).toBe(true)
  })

  it('matches a romaji reading directly for kana-only words', () => {
    expect(matchesAnswer('wa', wa)).toBe(true)
    expect(matchesAnswer('は', wa)).toBe(true)
  })

  it('accepts he as the reading for the particle he', () => {
    const he = { jp: 'へ', reading: 'e' }
    expect(matchesAnswer('e', he)).toBe(true)
    expect(matchesAnswer('へ', he)).toBe(true)
  })

  it('accepts both wo and o for the particle wo', () => {
    const wo = { jp: 'を', reading: 'o' }
    expect(matchesAnswer('o', wo)).toBe(true)
    expect(matchesAnswer('wo', wo)).toBe(true)
  })

  it('accepts long vowels written with a macron', () => {
    expect(matchesAnswer('hōkokusuru', houkoku)).toBe(true)
  })

  it('treats a literal hyphen as ordinary punctuation, not a long-vowel mark', () => {
    // A bare ASCII hyphen no longer folds to a long vowel - that rule wrongly
    // rewrote honorific o- prefixes (o-negai -> ounegai, no longer matching
    // onegai). It is stripped as plain punctuation instead, so this no longer
    // matches a genuine long vowel written as "ho-kokusuru".
    expect(matchesAnswer('ho-kokusuru', houkoku)).toBe(false)
  })

  it('accepts a hyphenated honorific o- prefix against the plain reading', () => {
    expect(matchesAnswer('onegai', onegai)).toBe(true)
    expect(matchesAnswer('o-negai', onegai)).toBe(true)
  })

  it('rejects a wrong answer', () => {
    expect(matchesAnswer('kaisha', kaigi)).toBe(false)
  })

  it('keeps genuinely different readings distinct across the long-vowel fold', () => {
    // "toru" (取る, short o) vs "tooru"/"touru" (通る, long o) share a prefix
    // and sit right next to the oo/ou fold - if that fold ever became
    // aggressive enough to also collapse the short form in, these would
    // wrongly match.
    const toru = { jp: '取る', reading: 'とる' }
    expect(matchesAnswer('tooru', toru)).toBe(false)
    expect(matchesAnswer('touru', toru)).toBe(false)
  })
})
