/**
 * Full-sentence shadowing set - carried over verbatim from the SHADOW array in
 * BJT_Listening_Trainer.html. Used only by /shadow; not part of the Leitner
 * course model (no boxes, no grading).
 */

export type ShadowLine = {
  id: string
  jp: string
  reading: string
  en: string
}

const ROWS: [string, string, string][] = [
  [
    'お世話になっております。田中商事の山田です。',
    'おせわになっております。たなかしょうじのやまだです。',
    'Thank you for your support. This is Yamada from Tanaka Trading.',
  ],
  [
    '本日はお忙しい中、お時間をいただきありがとうございます。',
    'ほんじつはおいそがしいなか、おじかんをいただきありがとうございます。',
    'Thank you for taking the time today despite your busy schedule.',
  ],
  [
    '申し訳ありませんが、もう一度おっしゃっていただけますか。',
    'もうしわけありませんが、もういちどおっしゃっていただけますか。',
    'I am sorry, but could you please say that again?',
  ],
  [
    'この件につきまして、社内で確認してからご連絡いたします。',
    'このけんにつきまして、しゃないでかくにんしてからごれんらくいたします。',
    'Regarding this matter, I will contact you after confirming internally.',
  ],
  [
    '会議の資料を添付いたしましたので、ご確認をお願いいたします。',
    'かいぎのしりょうをてんぷいたしましたので、ごかくにんをおねがいいたします。',
    'I have attached the meeting materials, so please confirm them.',
  ],
  [
    '納期につきましては、来週の金曜日を予定しております。',
    'のうきにつきましては、らいしゅうのきんようびをよていしております。',
    'Regarding the delivery date, we are planning for next Friday.',
  ],
  [
    '恐れ入りますが、担当の者に代わりますので少々お待ちください。',
    'おそれいりますが、たんとうのものにかわりますのでしょうしょうおまちください。',
    'Excuse me, I will transfer you to the person in charge, so please wait a moment.',
  ],
  [
    'ご提案いただいた内容について、前向きに検討させていただきます。',
    'ごていあんいただいたないようについて、まえむきにけんとうさせていただきます。',
    'We will positively consider the content of your proposal.',
  ],
  [
    '先月と比べて、売上が約十五パーセント増加いたしました。',
    'せんげつとくらべて、うりあげがやくじゅうごパーセントぞうかいたしました。',
    'Compared to last month, sales increased by approximately fifteen percent.',
  ],
  [
    'ご不明な点がございましたら、お気軽にお問い合わせください。',
    'ごふめいなてんがございましたら、おきがるにおといあわせください。',
    'If you have any questions, please feel free to contact us.',
  ],
  [
    '申し訳ございませんが、その日は別の予定が入っております。',
    'もうしわけございませんが、そのひはべつのよていがはいっております。',
    'I am sorry, but I have another appointment on that day.',
  ],
  [
    '今後ともどうぞよろしくお願い申し上げます。',
    'こんごともどうぞよろしくおねがいもうしあげます。',
    'I look forward to your continued support.',
  ],
]

export const SHADOW_LINES: ShadowLine[] = ROWS.map(([jp, reading, en], i) => ({
  id: `shadow-${String(i + 1).padStart(2, '0')}`,
  jp,
  reading,
  en,
}))
