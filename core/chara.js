// XEVARION II — キャラの台帳と、持っている数（凸）
// キャラを足すとき：CHARS に1件 ＋ art/chara/<id>/ に絵 ＋ tools/build_assets.py の CHARS ＋ core/gacha.js の chars
import * as store from './store.js';

store.define('copies', { kind: 'counter' }); // 出た回数（1人目＝0凸 … 5人目＝4凸＝完凸）
store.define('partner', { kind: 'lww', def: null });

export const ELEMENTS = {
  flare: { en: 'FLARE', ja: '火' },
  tide: { en: 'TIDE', ja: '水' },
  terra: { en: 'TERRA', ja: '木' },
  nova: { en: 'NOVA', ja: '光' },
  void: { en: 'VOID', ja: '闇' },
};

export const CHARS = [
  { id: 'yuzuha', name: '柚葉', kana: 'ゆずは', en: 'YUZUHA', el: 'flare' },
  { id: 'minase', name: '水瀬', kana: 'みなせ', en: 'MINASE', el: 'tide' },
  { id: 'miduki', name: '美月', kana: 'みづき', en: 'MIDUKI', el: 'terra' },
  // ★ 2026-11-25 第7回：まだ使っていなかった属性を1人ずつ（案B＝絵の色で決める形）
  { id: 'sui', name: '翠', kana: 'すい', en: 'SUI', el: 'void' },
  { id: 'mana', name: '愛菜', kana: 'まな', en: 'MANA', el: 'nova' },
];

/** 完凸に必要な人数（5人目で完凸＝4凸） */
export const MAX_COPIES = 5;

export const byId = (id) => CHARS.find((c) => c.id === id) || null;
export const copies = (id) => Math.max(0, store.get('copies')[id] || 0);
export const owned = (id) => copies(id) > 0;
/** 凸の数（0〜4） */
export const awk = (id) => Math.min(MAX_COPIES - 1, Math.max(0, copies(id) - 1));
export const isMax = (id) => copies(id) >= MAX_COPIES;
/** 絵の場所：kind = full-1024 / full-512 / banner-940 / banner-470 / face-256 / face-96 */
export const art = (id, kind) => `assets/chara/${id}/${kind}.webp`;

export function partner() {
  const p = store.get('partner');
  if (p && owned(p)) return byId(p);
  return CHARS.find((c) => owned(c.id)) || null;
}
export function setPartner(id) {
  if (owned(id)) store.set('partner', id);
}
export const onChange = (fn) => {
  const a = store.on('copies', fn);
  const b = store.on('partner', fn);
  return () => { a(); b(); };
};

// ★ 2026-11-25 第7回で決めた性格と話し方（docs/decisions.md）。凸が進むと1つずつ増える。最後の1つは完凸のとき
//   柚葉＝元気いっぱいのムードメーカー（わたし・きみ・「〜だよ！」「〜しよっ」）
//   水瀬＝おっとりした照れ屋（わたし・あなた・「〜ね」「……」）
//   美月＝落ち着いた大人のお姉さん・少しからかう（わたし・きみ・「〜かな」「ふふ」）
//   翠＝好奇心いっぱいの夏のお嬢さま（わたし・あなた・ていねい語）
//   愛菜＝面倒見のいいしっかり者・料理が得意・心配性（わたし・きみ・「〜でしょ」「もう」）
const LINES = {
  yuzuha: ['おかえりっ！ 今日はなにして遊ぶ？', 'えへへ、つついたな〜？ おかえしだっ！', 'ねえねえ、ガチャ見に行こっ！ 今日はいい予感がするんだよね！', 'このネックレス？ ずっと大事にしてるんだ。きみにだけ教えたげる。', 'ゲームは勝つまでやる派！ ……きみには、ちょっとだけ手かげんしてあげる。', 'ずっといっしょにいてくれて、ありがと。……大好きだよ。'],
  minase: ['おかえりなさい。……海の音、聞こえる？', 'ひゃっ……！ び、びっくりした……。', 'ゆっくりしていってね。……わたしも、となりにいるから。', 'このはおり、風が通って気持ちいいの。……似合ってる、かな。', '言葉にするのは、ちょっと苦手。……でも、あなたのことは、ちゃんと見てるよ。', 'あなたといると、時間がゆっくりになるの。……ずっと、このままがいいな。'],
  miduki: ['おかえり。待ってたよ。', 'ふふ、くすぐったいな。……もう一回？', '今日はどのアプリにしようかな。……きみが決めていいよ。', 'お花の世話って、けっこう好きなんだ。きみも水やり、手伝ってくれる？', 'たよりにしてくれるのはうれしいな。……たまには、わたしにも甘えさせてね。', 'ここまで来てくれたきみに、いちばんの笑顔をあげる。'],
  sui: ['ごきげんよう。今日はどこへ連れていってくれますか？', 'まあ……！ 帽子が飛んでしまいそうです。', '潮風が気持ちいいですね。ここ、わたしのお気に入りなんです。', 'ガチャ、というものですか？ ……ふふ、少しだけ、わくわくします。', '知らないことばかりですけれど、あなたといっしょなら、こわくありません。', 'あなたと見た景色は、ぜんぶ宝物です。'],
  mana: ['おかえり。ごはん、ちゃんと食べた？', 'もう、くすぐったいってば。', '無理してない？ 休むのも大事なんだからね。', '今日はなに作ろうかな。……リクエスト、ある？', 'え、わたしのこと、ほめてくれるの？ ……もう、照れるでしょ。', 'きみが笑ってると、わたしもうれしいな。……これからも、そばにいさせてね。'],
};
/** いま話せる会話（0凸で2つ・1凸ごとに1つ増える） */
export function lines(id) {
  const L = LINES[id] || [];
  return L.slice(0, Math.min(L.length, 2 + awk(id)));
}
export function randomLine(id) {
  const L = lines(id);
  return L[Math.floor(Math.random() * L.length)] || '';
}
