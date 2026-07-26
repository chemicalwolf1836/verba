/**
 * BJT vocabulary dataset - 192 words across the 24-week study plan (8 per week).
 *
 * ORIGIN TAGS
 *   'prototype' - the 66 entries carried over verbatim from BJT_Listening_Trainer.html.
 *                 These are the user's own dataset.
 *   'drafted'   - the 126 entries drafted by Claude to fill the 24-week plan out to
 *                 8 words per week, pitched at the J2 band (BJT 400-529). These are
 *                 NOT from an official source - JETRO publishes no BJT word list.
 *                 Review them, then replace or promote to 'prototype' as you verify.
 *
 * READING CONVENTION
 *   `reading` is kana for any word containing kanji. For words already written purely
 *   in kana (particles, conjunctions, kana-only keigo verbs) a kana "reading" would be
 *   identical to the word itself and teach nothing, so those carry romaji instead.
 *   Answer-matching must therefore accept either form - see lib/leitner answer checking.
 */

import type { Card, Course, Origin, Unit } from './types'

/** [jp, reading, meaning, exampleJp, exampleEn, week, theme, origin] */
type Row = [string, string, string, string, string, number, string, 'p' | 'd'];

const VOCAB_ROWS: Row[] = [
  // ---- Week 1 - Particles ----
  ['は', 'wa', 'topic marker particle', '私は会社員です', 'I am a company employee', 1, 'Particles', 'p'],
  ['を', 'wo', 'object marker particle', '報告書を書きます', 'I write a report', 1, 'Particles', 'p'],
  ['に', 'ni', 'direction / location marker', '会議に参加します', 'I attend the meeting', 1, 'Particles', 'p'],
  ['が', 'ga', 'subject marker particle', '田中さんが担当します', 'Tanaka is in charge', 1, 'Particles', 'd'],
  ['で', 'de', 'place of action / by means of', '会議室で話します', 'We talk in the meeting room', 1, 'Particles', 'd'],
  ['と', 'to', 'and / together with', '部長と相談します', 'I consult with the department manager', 1, 'Particles', 'd'],
  ['から', 'kara', 'from / because', '九時から始めます', 'We start from nine', 1, 'Particles', 'd'],
  ['まで', 'made', 'until / as far as', '五時まで働きます', 'I work until five', 1, 'Particles', 'd'],

  // ---- Week 2 - Verb forms ----
  ['送る', 'おくる', 'to send', 'メールを送ります', 'I send an email', 2, 'Verb forms', 'p'],
  ['確認する', 'かくにんする', 'to confirm / check', '内容を確認してください', 'Please confirm the contents', 2, 'Verb forms', 'p'],
  ['報告する', 'ほうこくする', 'to report', '進捗を報告します', 'I will report on the progress', 2, 'Verb forms', 'p'],
  ['提出する', 'ていしゅつする', 'to submit', 'レポートを提出しました', 'I submitted the report', 2, 'Verb forms', 'p'],
  ['受け取る', 'うけとる', 'to receive', '資料を受け取りました', 'I received the materials', 2, 'Verb forms', 'd'],
  ['連絡する', 'れんらくする', 'to contact / get in touch', '後で連絡します', 'I will contact you later', 2, 'Verb forms', 'd'],
  ['説明する', 'せつめいする', 'to explain', '内容を説明します', 'I explain the contents', 2, 'Verb forms', 'd'],
  ['準備する', 'じゅんびする', 'to prepare', '会議の準備をします', 'I prepare for the meeting', 2, 'Verb forms', 'd'],

  // ---- Week 3 - Adjectives ----
  ['丁寧な', 'ていねいな', 'polite / careful', '丁寧な言葉を使います', 'I use polite language', 3, 'Adjectives', 'p'],
  ['適切な', 'てきせつな', 'appropriate / suitable', '適切な表現を選びます', 'I choose appropriate expressions', 3, 'Adjectives', 'p'],
  ['重要な', 'じゅうような', 'important', '重要な情報を共有します', 'I share important information', 3, 'Adjectives', 'p'],
  ['迅速な', 'じんそくな', 'prompt / swift', '迅速な対応をお願いします', 'Please respond promptly', 3, 'Adjectives', 'd'],
  ['詳しい', 'くわしい', 'detailed / well-informed', '詳しい説明をお願いします', 'Please give a detailed explanation', 3, 'Adjectives', 'd'],
  ['明確な', 'めいかくな', 'clear / definite', '明確な回答をいただきました', 'I received a clear answer', 3, 'Adjectives', 'd'],
  ['慎重な', 'しんちょうな', 'cautious / careful', '慎重な判断が必要です', 'Careful judgment is necessary', 3, 'Adjectives', 'd'],
  ['有効な', 'ゆうこうな', 'valid / effective', 'この契約は来年まで有効です', 'This contract is valid until next year', 3, 'Adjectives', 'd'],

  // ---- Week 4 - Conjunctions ----
  ['しかし', 'shikashi', 'however / but', '計画は良いです。しかし費用が高い', 'The plan is good. However costs are high', 4, 'Conjunctions', 'p'],
  ['したがって', 'shitagatte', 'therefore', '期限が過ぎた。したがって無効です', 'The deadline passed. Therefore it is invalid', 4, 'Conjunctions', 'p'],
  ['つまり', 'tsumari', 'in other words', 'つまり計画を変更します', 'In other words, we change the plan', 4, 'Conjunctions', 'p'],
  ['ただし', 'tadashi', 'however / provided that', '参加できます。ただし予約が必要です', 'You can attend. However a reservation is required', 4, 'Conjunctions', 'd'],
  ['なお', 'nao', 'furthermore / please note', 'なお、詳細は添付をご覧ください', 'Furthermore, please see the attachment for details', 4, 'Conjunctions', 'd'],
  ['また', 'mata', 'also / in addition', 'また、費用も検討します', 'Also, we will consider the cost', 4, 'Conjunctions', 'd'],
  ['そのため', 'sonotame', 'for that reason', '遅れています。そのため納期を延ばします', 'We are behind. For that reason we extend the deadline', 4, 'Conjunctions', 'd'],
  ['一方', 'いっぽう', 'on the other hand', '売上は伸びた。一方、費用も増えた', 'Sales grew. On the other hand, costs also rose', 4, 'Conjunctions', 'd'],

  // ---- Week 5 - Kanji: work ----
  ['会議', 'かいぎ', 'meeting', '会議は十時に始まります', 'The meeting begins at ten', 5, 'Kanji: work', 'p'],
  ['資料', 'しりょう', 'materials / documents', '会議の資料を配ります', 'I distribute the meeting materials', 5, 'Kanji: work', 'p'],
  ['担当', 'たんとう', 'person in charge', 'このプロジェクトの担当です', 'I am in charge of this project', 5, 'Kanji: work', 'p'],
  ['期限', 'きげん', 'deadline', '期限は来週の金曜日です', 'The deadline is next Friday', 5, 'Kanji: work', 'p'],
  ['出張', 'しゅっちょう', 'business trip', '来週大阪に出張します', 'I go on a business trip to Osaka next week', 5, 'Kanji: work', 'd'],
  ['部署', 'ぶしょ', 'department / division', '部署を異動しました', 'I transferred departments', 5, 'Kanji: work', 'd'],
  ['残業', 'ざんぎょう', 'overtime', '今日は残業します', 'I will work overtime today', 5, 'Kanji: work', 'd'],
  ['会場', 'かいじょう', 'venue', '会場を予約しました', 'I reserved the venue', 5, 'Kanji: work', 'd'],

  // ---- Week 6 - Kanji: transactions ----
  ['契約', 'けいやく', 'contract', '契約書にサインします', 'I sign the contract', 6, 'Kanji: transactions', 'p'],
  ['交渉', 'こうしょう', 'negotiation', '価格交渉をします', 'I negotiate the price', 6, 'Kanji: transactions', 'p'],
  ['見積もり', 'みつもり', 'estimate / quote', '見積もりを出してください', 'Please give me a quote', 6, 'Kanji: transactions', 'p'],
  ['請求書', 'せいきゅうしょ', 'invoice', '請求書を確認してください', 'Please check the invoice', 6, 'Kanji: transactions', 'p'],
  ['納品', 'のうひん', 'delivery of goods', '納品は月末です', 'Delivery is at the end of the month', 6, 'Kanji: transactions', 'd'],
  ['支払い', 'しはらい', 'payment', '支払いは翌月末です', 'Payment is at the end of the following month', 6, 'Kanji: transactions', 'd'],
  ['発注', 'はっちゅう', 'placing an order', '部品を発注します', 'I place an order for parts', 6, 'Kanji: transactions', 'd'],
  ['値引き', 'ねびき', 'discount / price reduction', '値引きをお願いできますか', 'Could you offer a discount?', 6, 'Kanji: transactions', 'd'],

  // ---- Week 7 - Work vocab ----
  ['業務', 'ぎょうむ', 'business operations', '業務の効率を上げます', 'I improve work efficiency', 7, 'Work vocab', 'p'],
  ['改善', 'かいぜん', 'improvement', 'システムを改善しました', 'I improved the system', 7, 'Work vocab', 'p'],
  ['目標', 'もくひょう', 'goal / target', '今月の目標を達成しました', "I achieved this month's target", 7, 'Work vocab', 'p'],
  ['効率', 'こうりつ', 'efficiency', '効率を上げる方法を考えます', 'I think of ways to raise efficiency', 7, 'Work vocab', 'd'],
  ['進捗', 'しんちょく', 'progress', '進捗を共有します', 'I share the progress', 7, 'Work vocab', 'd'],
  ['課題', 'かだい', 'issue / task to solve', '課題を整理します', 'I organize the issues', 7, 'Work vocab', 'd'],
  ['方針', 'ほうしん', 'policy / direction', '会社の方針に従います', 'I follow the company policy', 7, 'Work vocab', 'd'],
  ['成果', 'せいか', 'result / outcome', '成果を報告します', 'I report the results', 7, 'Work vocab', 'd'],

  // ---- Week 8 - Listening ----
  ['要点', 'ようてん', 'main point', '要点をメモします', 'I take notes on the main points', 8, 'Listening', 'p'],
  ['状況', 'じょうきょう', 'situation', '現在の状況を報告します', 'I report on the current situation', 8, 'Listening', 'p'],
  ['対応', 'たいおう', 'response / handling', '問題に対応します', 'I will handle the problem', 8, 'Listening', 'p'],
  ['内容', 'ないよう', 'content', '内容を確認しました', 'I confirmed the content', 8, 'Listening', 'd'],
  ['詳細', 'しょうさい', 'details', '詳細は後で説明します', 'I will explain the details later', 8, 'Listening', 'd'],
  ['指示', 'しじ', 'instruction', '上司の指示に従います', "I follow my superior's instructions", 8, 'Listening', 'd'],
  ['確認', 'かくにん', 'confirmation', '確認が取れました', 'Confirmation was obtained', 8, 'Listening', 'd'],
  ['質問', 'しつもん', 'question', '質問はありますか', 'Do you have any questions?', 8, 'Listening', 'd'],

  // ---- Week 9 - Keigo: polite ----
  ['いらっしゃる', 'irassharu', 'to be / come / go (honorific)', '社長はいらっしゃいますか', 'Is the president available?', 9, 'Keigo: polite', 'p'],
  ['おっしゃる', 'ossharu', 'to say (honorific)', '何とおっしゃいましたか', 'What did you say?', 9, 'Keigo: polite', 'p'],
  ['ご存じ', 'ごぞんじ', 'to know (honorific)', 'この件をご存じですか', 'Are you aware of this matter?', 9, 'Keigo: polite', 'd'],
  ['召し上がる', 'めしあがる', 'to eat / drink (honorific)', 'どうぞ召し上がってください', 'Please help yourself', 9, 'Keigo: polite', 'd'],
  ['くださる', 'kudasaru', 'to give (honorific)', '部長が資料をくださいました', 'The manager gave me the materials', 9, 'Keigo: polite', 'd'],
  ['お越しになる', 'おこしになる', 'to come (honorific)', '本日はお越しくださりありがとうございます', 'Thank you for coming today', 9, 'Keigo: polite', 'd'],
  ['ご利用になる', 'ごりようになる', 'to use (honorific)', 'こちらをご利用になれます', 'You may use this', 9, 'Keigo: polite', 'd'],
  ['お読みになる', 'およみになる', 'to read (honorific)', '資料をお読みになりましたか', 'Have you read the materials?', 9, 'Keigo: polite', 'd'],

  // ---- Week 10 - Keigo: honorific ----
  ['なさる', 'nasaru', 'to do (honorific)', 'どのようになさいますか', 'How would you like to proceed?', 10, 'Keigo: honorific', 'p'],
  ['ご覧になる', 'ごらんになる', 'to see / look at (honorific)', '資料をご覧になりましたか', 'Have you reviewed the materials?', 10, 'Keigo: honorific', 'p'],
  ['お帰りになる', 'おかえりになる', 'to go home (honorific)', '社長はもうお帰りになりました', 'The president has already left', 10, 'Keigo: honorific', 'd'],
  ['ご出席になる', 'ごしゅっせきになる', 'to attend (honorific)', '会議にご出席になりますか', 'Will you attend the meeting?', 10, 'Keigo: honorific', 'd'],
  ['お使いになる', 'おつかいになる', 'to use (honorific)', 'このシステムをお使いになりますか', 'Will you use this system?', 10, 'Keigo: honorific', 'd'],
  ['お聞きになる', 'おききになる', 'to hear / ask (honorific)', 'その件をお聞きになりましたか', 'Did you hear about that matter?', 10, 'Keigo: honorific', 'd'],
  ['ご確認になる', 'ごかくにんになる', 'to confirm (honorific)', '内容をご確認になりましたか', 'Have you confirmed the contents?', 10, 'Keigo: honorific', 'd'],
  ['お決めになる', 'おきめになる', 'to decide (honorific)', 'お決めになりましたらご連絡ください', 'Please contact us once you have decided', 10, 'Keigo: honorific', 'd'],

  // ---- Week 11 - Keigo: humble ----
  ['申す', 'もうす', 'to say (humble)', '田中と申します', 'My name is Tanaka', 11, 'Keigo: humble', 'p'],
  ['伺う', 'うかがう', 'to visit / ask (humble)', '明日、御社に伺います', 'I will visit your company tomorrow', 11, 'Keigo: humble', 'p'],
  ['拝見する', 'はいけんする', 'to see / look at (humble)', '資料を拝見しました', 'I have reviewed the materials', 11, 'Keigo: humble', 'p'],
  ['いたす', 'itasu', 'to do (humble)', '私がいたします', 'I will do it', 11, 'Keigo: humble', 'd'],
  ['参る', 'まいる', 'to go / come (humble)', 'すぐに参ります', 'I will come right away', 11, 'Keigo: humble', 'd'],
  ['存じる', 'ぞんじる', 'to know / think (humble)', 'その件は存じております', 'I am aware of that matter', 11, 'Keigo: humble', 'd'],
  ['承る', 'うけたまわる', 'to receive / be told (humble)', 'ご注文を承ります', 'I will take your order', 11, 'Keigo: humble', 'd'],
  ['お目にかかる', 'おめにかかる', 'to meet (humble)', 'お目にかかれて光栄です', 'It is an honor to meet you', 11, 'Keigo: humble', 'd'],

  // ---- Week 12 - Business email ----
  ['件名', 'けんめい', 'subject line', '件名は明確に書きます', 'I write the subject line clearly', 12, 'Business email', 'p'],
  ['添付', 'てんぷ', 'attachment', '資料を添付します', 'I attach the materials', 12, 'Business email', 'p'],
  ['返信', 'へんしん', 'reply', 'メールに返信します', 'I reply to the email', 12, 'Business email', 'p'],
  ['宛先', 'あてさき', 'recipient / address', '宛先を確認してください', 'Please check the recipient', 12, 'Business email', 'd'],
  ['転送', 'てんそう', 'forwarding', 'メールを転送します', 'I forward the email', 12, 'Business email', 'd'],
  ['署名', 'しょめい', 'signature', '署名を追加しました', 'I added a signature', 12, 'Business email', 'd'],
  ['送信', 'そうしん', 'sending / transmission', '昨日メールを送信しました', 'I sent the email yesterday', 12, 'Business email', 'd'],
  ['本文', 'ほんぶん', 'body text', '本文は簡潔に書きます', 'I write the body concisely', 12, 'Business email', 'd'],

  // ---- Week 13 - Presentations ----
  ['結論', 'けつろん', 'conclusion', '結論をお伝えします', 'I will convey the conclusion', 13, 'Presentations', 'p'],
  ['根拠', 'こんきょ', 'evidence / grounds', '根拠を示します', 'I will show the evidence', 13, 'Presentations', 'p'],
  ['概要', 'がいよう', 'overview / outline', '概要をご説明します', 'I will explain the overview', 13, 'Presentations', 'd'],
  ['図表', 'ずひょう', 'charts and figures', '図表をご覧ください', 'Please look at the charts', 13, 'Presentations', 'd'],
  ['補足', 'ほそく', 'supplement / addition', '補足させていただきます', 'Allow me to add something', 13, 'Presentations', 'd'],
  ['提案', 'ていあん', 'proposal', '新しい提案をします', 'I make a new proposal', 13, 'Presentations', 'd'],
  ['質疑応答', 'しつぎおうとう', 'question and answer session', '質疑応答の時間を取ります', 'We will take time for questions', 13, 'Presentations', 'd'],
  ['強調する', 'きょうちょうする', 'to emphasize', '重要な点を強調します', 'I emphasize the important points', 13, 'Presentations', 'd'],

  // ---- Week 14 - Negotiation ----
  ['合意', 'ごうい', 'agreement', '合意に達しました', 'We have reached an agreement', 14, 'Negotiation', 'p'],
  ['条件', 'じょうけん', 'conditions / terms', '条件を確認します', 'I confirm the conditions', 14, 'Negotiation', 'p'],
  ['断る', 'ことわる', 'to decline / refuse', '丁寧に断ります', 'I decline politely', 14, 'Negotiation', 'p'],
  ['譲歩', 'じょうほ', 'concession', '少し譲歩しました', 'We made a small concession', 14, 'Negotiation', 'd'],
  ['妥協', 'だきょう', 'compromise', '妥協点を探します', 'We look for a compromise', 14, 'Negotiation', 'd'],
  ['相談する', 'そうだんする', 'to consult', '上司に相談します', 'I consult my superior', 14, 'Negotiation', 'd'],
  ['承諾する', 'しょうだくする', 'to consent / accept', '条件を承諾しました', 'We accepted the conditions', 14, 'Negotiation', 'd'],
  ['前提', 'ぜんてい', 'premise / precondition', '前提条件を確認します', 'I confirm the preconditions', 14, 'Negotiation', 'd'],

  // ---- Week 15 - Office structure ----
  ['本社', 'ほんしゃ', 'head office', '本社は東京にあります', 'The head office is in Tokyo', 15, 'Office structure', 'p'],
  ['上司', 'じょうし', 'superior / boss', '上司に報告します', 'I report to my superior', 15, 'Office structure', 'p'],
  ['役職', 'やくしょく', 'job title / position', '役職を教えてください', 'Please tell me your title', 15, 'Office structure', 'p'],
  ['支社', 'ししゃ', 'branch office', '大阪支社に勤めています', 'I work at the Osaka branch', 15, 'Office structure', 'd'],
  ['部長', 'ぶちょう', 'department manager', '部長に確認します', 'I check with the department manager', 15, 'Office structure', 'd'],
  ['課長', 'かちょう', 'section chief', '課長が説明します', 'The section chief will explain', 15, 'Office structure', 'd'],
  ['同僚', 'どうりょう', 'colleague', '同僚と協力します', 'I cooperate with my colleagues', 15, 'Office structure', 'd'],
  ['部下', 'ぶか', 'subordinate', '部下を指導します', 'I guide my subordinates', 15, 'Office structure', 'd'],

  // ---- Week 16 - Documents ----
  ['報告書', 'ほうこくしょ', 'report document', '月次報告書を提出します', 'I submit the monthly report', 16, 'Documents', 'p'],
  ['申請書', 'しんせいしょ', 'application form', '申請書に記入します', 'I fill in the application form', 16, 'Documents', 'p'],
  ['議事録', 'ぎじろく', 'meeting minutes', '議事録を作成します', 'I prepare the meeting minutes', 16, 'Documents', 'd'],
  ['稟議書', 'りんぎしょ', 'written request for approval', '稟議書を回します', 'I circulate the approval document', 16, 'Documents', 'd'],
  ['企画書', 'きかくしょ', 'proposal document', '企画書を提出しました', 'I submitted the proposal document', 16, 'Documents', 'd'],
  ['契約書', 'けいやくしょ', 'written contract', '契約書を交わします', 'We exchange contracts', 16, 'Documents', 'd'],
  ['領収書', 'りょうしゅうしょ', 'receipt', '領収書をお願いします', 'Please give me a receipt', 16, 'Documents', 'd'],
  ['名刺', 'めいし', 'business card', '名刺を交換します', 'We exchange business cards', 16, 'Documents', 'd'],

  // ---- Week 17 - Part 1 listening ----
  ['予約', 'よやく', 'reservation / appointment', '十二時に予約があります', 'I have a reservation at twelve', 17, 'Part 1 listening', 'p'],
  ['変更', 'へんこう', 'change / modification', 'スケジュールを変更します', 'I will change the schedule', 17, 'Part 1 listening', 'p'],
  ['手配', 'てはい', 'arrangement', '会場を手配します', 'I will arrange the venue', 17, 'Part 1 listening', 'p'],
  ['日程', 'にってい', 'schedule / itinerary', '日程を調整します', 'I adjust the schedule', 17, 'Part 1 listening', 'd'],
  ['都合', 'つごう', 'convenience / availability', 'ご都合はいかがですか', 'How is your availability?', 17, 'Part 1 listening', 'd'],
  ['延期', 'えんき', 'postponement', '会議を延期します', 'We postpone the meeting', 17, 'Part 1 listening', 'd'],
  ['中止', 'ちゅうし', 'cancellation', '出張が中止になりました', 'The business trip was cancelled', 17, 'Part 1 listening', 'd'],
  ['確保する', 'かくほする', 'to secure', '席を確保します', 'I secure the seats', 17, 'Part 1 listening', 'd'],

  // ---- Week 18 - Part 1 listening ----
  ['打ち合わせ', 'うちあわせ', 'briefing / meeting', '打ち合わせをしましょう', 'Let us have a meeting', 18, 'Part 1 listening', 'p'],
  ['伝言', 'でんごん', 'message to pass on', '伝言をお預かりします', 'I will take a message', 18, 'Part 1 listening', 'p'],
  ['折り返し', 'おりかえし', 'calling back', '折り返しお電話します', 'I will call you back', 18, 'Part 1 listening', 'd'],
  ['内線', 'ないせん', 'phone extension', '内線番号を教えてください', 'Please tell me the extension number', 18, 'Part 1 listening', 'd'],
  ['不在', 'ふざい', 'absence / being out', '担当者は不在です', 'The person in charge is out', 18, 'Part 1 listening', 'd'],
  ['取り次ぐ', 'とりつぐ', 'to connect / pass on a call', '担当者にお取り次ぎします', 'I will connect you with the person in charge', 18, 'Part 1 listening', 'd'],
  ['訪問', 'ほうもん', 'visit', '明日お客様を訪問します', 'I will visit the client tomorrow', 18, 'Part 1 listening', 'd'],
  ['受付', 'うけつけ', 'reception desk', '受付でお待ちください', 'Please wait at reception', 18, 'Part 1 listening', 'd'],

  // ---- Week 19 - Part 2 ----
  ['増加', 'ぞうか', 'increase', '売上が増加しました', 'Sales have increased', 19, 'Part 2', 'p'],
  ['減少', 'げんしょう', 'decrease', 'コストが減少しました', 'Costs have decreased', 19, 'Part 2', 'p'],
  ['傾向', 'けいこう', 'trend / tendency', '最近の傾向を分析します', 'I analyze recent trends', 19, 'Part 2', 'p'],
  ['売上', 'うりあげ', 'sales / revenue', '売上が伸びました', 'Sales grew', 19, 'Part 2', 'd'],
  ['利益', 'りえき', 'profit', '利益が改善しました', 'Profits improved', 19, 'Part 2', 'd'],
  ['費用', 'ひよう', 'cost / expense', '費用を抑えます', 'We keep costs down', 19, 'Part 2', 'd'],
  ['割合', 'わりあい', 'ratio / proportion', '割合を計算します', 'I calculate the proportion', 19, 'Part 2', 'd'],
  ['推移', 'すいい', 'change over time / transition', '三年間の推移を示します', 'I show the trend over three years', 19, 'Part 2', 'd'],

  // ---- Week 20 - Part 2 ----
  ['四半期', 'しはんき', 'quarter (fiscal)', '第二四半期の結果です', 'These are second quarter results', 20, 'Part 2', 'p'],
  ['実績', 'じっせき', 'actual results / track record', '昨年の実績を確認します', "I check last year's results", 20, 'Part 2', 'p'],
  ['予算', 'よさん', 'budget', '予算を見直します', 'We review the budget', 20, 'Part 2', 'd'],
  ['前年比', 'ぜんねんひ', 'year-on-year comparison', '前年比十パーセント増です', 'It is up ten percent year on year', 20, 'Part 2', 'd'],
  ['達成', 'たっせい', 'achievement', '目標を達成しました', 'We achieved the target', 20, 'Part 2', 'd'],
  ['見込み', 'みこみ', 'outlook / prospect', '今期の見込みを報告します', "I report this term's outlook", 20, 'Part 2', 'd'],
  ['上半期', 'かみはんき', 'first half of the fiscal year', '上半期の結果です', 'These are the first-half results', 20, 'Part 2', 'd'],
  ['統計', 'とうけい', 'statistics', '統計を分析します', 'I analyze the statistics', 20, 'Part 2', 'd'],

  // ---- Week 21 - Part 3 vocab ----
  ['把握する', 'はあくする', 'to grasp fully', '状況を把握しています', 'I have grasped the situation', 21, 'Part 3 vocab', 'p'],
  ['検討する', 'けんとうする', 'to examine / consider', '提案を検討します', 'I will examine the proposal', 21, 'Part 3 vocab', 'p'],
  ['削減する', 'さくげんする', 'to reduce / cut', 'コストを削減します', 'I reduce costs', 21, 'Part 3 vocab', 'p'],
  ['実施する', 'じっしする', 'to implement / carry out', '新制度を実施します', 'We implement the new system', 21, 'Part 3 vocab', 'd'],
  ['促進する', 'そくしんする', 'to promote / accelerate', '販売を促進します', 'We promote sales', 21, 'Part 3 vocab', 'd'],
  ['見直す', 'みなおす', 'to review / reconsider', '計画を見直します', 'We review the plan', 21, 'Part 3 vocab', 'd'],
  ['導入する', 'どうにゅうする', 'to introduce / adopt', '新しいツールを導入します', 'We introduce a new tool', 21, 'Part 3 vocab', 'd'],
  ['徹底する', 'てっていする', 'to ensure thoroughly', '安全管理を徹底します', 'We ensure thorough safety management', 21, 'Part 3 vocab', 'd'],

  // ---- Week 22 - Part 3 reading ----
  ['文脈', 'ぶんみゃく', 'context', '文脈から意味を読み取ります', 'I infer meaning from context', 22, 'Part 3 reading', 'p'],
  ['要旨', 'ようし', 'gist / main point', '文章の要旨を把握します', 'I grasp the gist of the passage', 22, 'Part 3 reading', 'p'],
  ['段落', 'だんらく', 'paragraph', '段落ごとに要点をつかみます', 'I grasp the main point of each paragraph', 22, 'Part 3 reading', 'd'],
  ['主張', 'しゅちょう', 'assertion / claim', '筆者の主張を読み取ります', "I read the author's assertion", 22, 'Part 3 reading', 'd'],
  ['具体例', 'ぐたいれい', 'concrete example', '具体例を挙げます', 'I give a concrete example', 22, 'Part 3 reading', 'd'],
  ['対比', 'たいひ', 'contrast', '二つの案を対比します', 'I contrast the two proposals', 22, 'Part 3 reading', 'd'],
  ['要約', 'ようやく', 'summary', '内容を要約します', 'I summarize the contents', 22, 'Part 3 reading', 'd'],
  ['推測する', 'すいそくする', 'to infer / guess', '文脈から推測します', 'I infer from the context', 22, 'Part 3 reading', 'd'],

  // ---- Week 23 - Mock tests ----
  ['模擬試験', 'もぎしけん', 'mock exam', '模擬試験を受けます', 'I take a mock exam', 23, 'Mock tests', 'p'],
  ['弱点', 'じゃくてん', 'weak point', '弱点を克服します', 'I overcome my weak points', 23, 'Mock tests', 'p'],
  ['得点', 'とくてん', 'score / points earned', '得点が上がりました', 'My score improved', 23, 'Mock tests', 'd'],
  ['時間配分', 'じかんはいぶん', 'time allocation', '時間配分に気をつけます', 'I pay attention to time allocation', 23, 'Mock tests', 'd'],
  ['出題', 'しゅつだい', 'setting of exam questions', 'よく出題される表現です', 'It is a frequently tested expression', 23, 'Mock tests', 'd'],
  ['正答率', 'せいとうりつ', 'accuracy rate', '正答率を確認します', 'I check my accuracy rate', 23, 'Mock tests', 'd'],
  ['苦手', 'にがて', 'weak at / not good at', '聴解が苦手です', 'I am weak at listening', 23, 'Mock tests', 'd'],
  ['対策', 'たいさく', 'countermeasure / preparation', '弱点の対策を立てます', 'I make a plan for my weak points', 23, 'Mock tests', 'd'],

  // ---- Week 24 - Final review ----
  ['復習', 'ふくしゅう', 'review', '毎日復習をします', 'I review every day', 24, 'Final review', 'p'],
  ['自信', 'じしん', 'confidence', '自信を持って試験に臨みます', 'I take the exam with confidence', 24, 'Final review', 'p'],
  ['総まとめ', 'そうまとめ', 'overall summary / wrap-up', '総まとめをします', 'I do an overall review', 24, 'Final review', 'd'],
  ['本番', 'ほんばん', 'the real thing / the actual exam', '本番に備えます', 'I prepare for the real exam', 24, 'Final review', 'd'],
  ['集中する', 'しゅうちゅうする', 'to concentrate', '試験に集中します', 'I concentrate on the exam', 24, 'Final review', 'd'],
  ['体調', 'たいちょう', 'physical condition', '体調を整えます', 'I get my condition in order', 24, 'Final review', 'd'],
  ['継続', 'けいぞく', 'continuation / keeping at it', '継続が力になります', 'Continuing is what builds strength', 24, 'Final review', 'd'],
  ['合格', 'ごうかく', 'passing an exam', '合格を目指します', 'I aim to pass', 24, 'Final review', 'd'],
];

/** [jp, reading, meaning, origin] - keigo and workplace set-phrases, not week-scoped. */
type PhraseRow = [string, string, string, 'p' | 'd'];

const PHRASE_ROWS: PhraseRow[] = [
  ['よろしくお願いします', 'yoroshiku onegai shimasu', 'Please treat me well / Thank you', 'p'],
  ['お世話になっております', 'osewa ni natte orimasu', 'Thank you for your continued support', 'p'],
  ['かしこまりました', 'kashikomarimashita', 'Certainly / Understood (very formal)', 'p'],
  ['承知しました', 'shouchi shimashita', 'Understood / I will do so', 'p'],
  ['お手数ですが', 'otesuu desu ga', 'Sorry to trouble you, but...', 'p'],
  ['少々お待ちください', 'shoushou omachi kudasai', 'Please wait a moment', 'p'],
  ['お疲れ様です', 'otsukaresama desu', 'Good work / Thank you for your efforts', 'p'],
  ['お先に失礼します', 'osaki ni shitsurei shimasu', 'Excuse me for leaving before you', 'p'],
  ['おっしゃる通りです', 'ossharu toori desu', 'You are absolutely right', 'p'],
  ['申し訳ありません', 'moushiwake arimasen', 'I sincerely apologize', 'p'],
  ['ご確認ください', 'gokakunin kudasai', 'Please confirm / check', 'p'],
  ['前向きに検討します', 'maemuki ni kentou shimasu', 'I will consider it positively', 'p'],
  ['折り返しご連絡いたします', 'orikaeshi gorenraku itashimasu', 'I will call you back', 'p'],
  ['恐れ入りますが', 'osore irimasu ga', 'I am terribly sorry, but...', 'p'],
  ['何卒よろしくお願いいたします', 'nanitozo yoroshiku onegai itashimasu', 'I sincerely request your cooperation', 'p'],
];

const COURSE_ID = 'bjt'

const expand = (o: 'p' | 'd'): Origin => (o === 'p' ? 'prototype' : 'drafted')

const unitIdFor = (week: number) => `w${String(week).padStart(2, '0')}`

const VOCAB_CARDS: Card[] = VOCAB_ROWS.map(
  ([jp, reading, meaning, exampleJp, exampleEn, week, theme, origin]) => ({
    id: `${COURSE_ID}-vocab-${jp}`,
    courseId: COURSE_ID,
    unitId: unitIdFor(week),
    deck: 'vocab' as const,
    jp,
    reading,
    meaning,
    exampleJp,
    exampleEn,
    theme,
    origin: expand(origin),
  }),
)

const PHRASE_CARDS: Card[] = PHRASE_ROWS.map(([jp, reading, meaning, origin]) => ({
  id: `${COURSE_ID}-phrase-${jp}`,
  courseId: COURSE_ID,
  unitId: '',
  deck: 'phrase' as const,
  jp,
  reading,
  meaning,
  theme: 'Business phrases',
  origin: expand(origin),
}))

const UNITS: Unit[] = Array.from({ length: 24 }, (_, i) => {
  const week = i + 1
  const id = unitIdFor(week)
  return { id, index: week, theme: VOCAB_CARDS.find((c) => c.unitId === id)?.theme ?? '' }
})

export const BJT_COURSE: Course = {
  id: COURSE_ID,
  name: 'BJT - Business Japanese',
  unitLabel: 'Week',
  units: UNITS,
  cards: [...VOCAB_CARDS, ...PHRASE_CARDS],
}
