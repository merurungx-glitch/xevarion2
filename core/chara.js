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

// ★ 会話は仮（性格・口調はまだ決めていない）。凸が進むと1つずつ増える。最後の1つは完凸のとき
const LINES = {
  yuzuha: ['おかえりなさい！今日はなにして遊ぶ？', 'えへへ、来てくれてうれしいな。', 'ガチャ、いっしょに見に行こっか？', 'このネックレス？ ずっと大事にしてるんだ。', 'ねえ、もう少しだけ、ここにいてもいい？', 'ロビーで待ってるね。'],
  minase: ['おかえり。海の音、聞こえる？', 'ゆっくりしていってね。', '今日はどのアプリにする？', 'このはおり、風が通って気持ちいいの。', 'あなたといると、時間がゆっくりになるみたい。', 'テラスで、潮風にあたろうか。'],
  miduki: ['おかえり、待ってたよ。', 'ん〜っ、のびのびしたい気分！', 'MagiQuiz、いっしょにやろうか？', 'お花の世話って、けっこう好きなんだ。', 'ふふ、今日もいい日になりそう。', 'ロビーで会えるの、楽しみにしてたよ。'],
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
