/**
 * Romaji -> hiragana, for the live echo that sits beside the study input.
 *
 * This is a *mirror*, not a judge. Whether an answer is correct is decided by
 * `matchesAnswer` in lib/answer.ts, which folds spelling variants in the other
 * direction (kana -> romaji) and is the tested authority. All this has to do is
 * show the learner what their keystrokes are spelling, so an unfinished syllable
 * is dropped rather than guessed at.
 */

/** [romaji, kana]. Order here is irrelevant - TABLE sorts longest-first below. */
const PAIRS: [string, string][] = [
  // Digraphs first for readability; the sort is what actually guarantees that
  // 'kyo' wins over 'ki' rather than the array happening to be in the right order.
  ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'],
  ['sha', 'しゃ'], ['shu', 'しゅ'], ['sho', 'しょ'],
  ['sya', 'しゃ'], ['syu', 'しゅ'], ['syo', 'しょ'],
  ['cha', 'ちゃ'], ['chu', 'ちゅ'], ['cho', 'ちょ'],
  ['tya', 'ちゃ'], ['tyu', 'ちゅ'], ['tyo', 'ちょ'],
  ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
  ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'],
  ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
  ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'],
  ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
  ['ja', 'じゃ'], ['ju', 'じゅ'], ['jo', 'じょ'],
  ['jya', 'じゃ'], ['jyu', 'じゅ'], ['jyo', 'じょ'],
  ['zya', 'じゃ'], ['zyu', 'じゅ'], ['zyo', 'じょ'],
  ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
  ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],

  // Hepburn irregulars, plus the kunrei spellings a learner may type instead.
  // lib/answer.ts already treats these as equal when grading, so accepting both
  // here keeps the echo consistent with what will be marked right.
  ['shi', 'し'], ['si', 'し'],
  ['chi', 'ち'], ['ti', 'ち'],
  ['tsu', 'つ'], ['tu', 'つ'],
  ['fu', 'ふ'], ['hu', 'ふ'],
  ['ji', 'じ'], ['zi', 'じ'],

  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['wa', 'わ'], ['wo', 'を'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
  ['n', 'ん'],
]

/** Longest romaji first, so 'kyo' is never shadowed by 'ki'. */
const TABLE = [...PAIRS].sort((a, b) => b[0].length - a[0].length)

/** Consonants that double into a small tsu. 'n' is deliberately absent - a
 *  doubled 'n' is a syllabic ん, not a geminate, and is handled by N_RULE below. */
const SOKUON = 'kstpgbdjzcfhmr'

/** 'n' only stands alone as ん when nothing can follow it into a syllable, i.e.
 *  at the end of the input or before a consonant. Before a vowel or 'y' it opens
 *  な / に / にゃ instead, and the table handles it. */
const VOWEL_OR_Y = 'aeiouy'

export function toKana(input: string): string {
  let rest = input.toLowerCase().replace(/[^a-z]/g, '')
  let out = ''

  while (rest.length > 0) {
    // Exactly one letter is consumed here, matching how an IME behaves: 'onna'
    // is お + ん + な, not お + ん + あ. Consuming both n's would eat the な.
    if (rest[0] === 'n' && !VOWEL_OR_Y.includes(rest[1] ?? '')) {
      out += 'ん'
      rest = rest.slice(1)
      continue
    }
    // A doubled consonant is the small tsu: 'kko' -> っ then 'ko'. Only the first
    // letter is consumed, so the second one still spells its own syllable.
    if (rest.length > 1 && rest[0] === rest[1] && SOKUON.includes(rest[0])) {
      out += 'っ'
      rest = rest.slice(1)
      continue
    }
    const hit = TABLE.find(([romaji]) => rest.startsWith(romaji))
    if (hit) {
      out += hit[1]
      rest = rest.slice(hit[0].length)
      continue
    }
    // A lone consonant is a half-typed syllable ('k' on the way to 'ka'). It has
    // no kana yet, so drop it - the echo shows only what has actually been spelled.
    rest = rest.slice(1)
  }

  return out
}
