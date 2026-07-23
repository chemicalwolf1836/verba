import type { Card } from '@/lib/courses'

const DIGRAPHS: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
}

const KANA: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ー: '-', '、': '', '。': '',
}

function toRomaji(kana: string): string {
  let out = ''
  for (let i = 0; i < kana.length; i++) {
    const pair = kana.slice(i, i + 2)
    if (DIGRAPHS[pair]) {
      out += DIGRAPHS[pair]
      i += 1
      continue
    }
    if (kana[i] === 'っ') {
      // Small tsu doubles the next consonant.
      const next = DIGRAPHS[kana.slice(i + 1, i + 3)] ?? KANA[kana[i + 1]] ?? ''
      if (next) out += next[0]
      continue
    }
    out += KANA[kana[i]] ?? kana[i]
  }
  return out
}

/**
 * Collapses the romaji spellings a learner might reasonably type into one canonical
 * form, so shi/si, tsu/tu, fu/hu, ji/zi, ou/oo and n/nn all compare equal.
 */
function canonical(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    // Macron and trailing-hyphen long-o notation, folded to the same 'ou' spelling
    // used elsewhere before the generic hyphen strip below discards the mark.
    .replace(/ō/g, 'ou')
    .replace(/o-/g, 'ou')
    .replace(/[ー\-']/g, '')
    .replace(/shi/g, 'si')
    .replace(/chi/g, 'ti')
    .replace(/tsu/g, 'tu')
    .replace(/fu/g, 'hu')
    .replace(/ji/g, 'zi')
    .replace(/ja/g, 'zya')
    .replace(/ju/g, 'zyu')
    .replace(/jo/g, 'zyo')
    .replace(/nn/g, 'n')
    .replace(/oo/g, 'ou')
    .replace(/uu/g, 'u')
    .replace(/ei/g, 'e')
    // を as a particle is written 'wo' or 'o' depending on convention; fold to one form.
    .replace(/wo/g, 'o')
}

export function matchesAnswer(
  typed: string,
  card: Pick<Card, 'jp' | 'reading'>,
): boolean {
  const input = typed.trim()
  if (input === '') return false

  const candidates = [card.reading, card.jp, toRomaji(card.reading)]
  const target = canonical(input)
  return candidates.some((c) => canonical(c) === target)
}
