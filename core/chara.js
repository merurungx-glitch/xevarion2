// XEVARION II — キャラの台帳と、持っている数（凸）・ホームに出す子（メイン・サブ）・アイコンの子
// キャラを足すとき：CHARS に1件（no＝図鑑の番号）＋ art/chara/<id>/ に絵 ＋ tools/build_assets.py の CHARS ＋ core/gacha.js の chars
// ★ 2026-11-25 ご指定：完凸は 3凸（4人目）／凸で見た目は変えない（完凸の子はアイコンが光るだけ＝portal.css の .p-mx）
//   絵の使い分け：LD（全身・背景なし＝full-*）はホームのメインを動かすとき（とロビー・一部のゲーム）だけ。ほかは LD なしの絵（banner-*・face-*）
import * as store from './store.js';

store.define('copies', { kind: 'counter' }); // 出た回数（1人目＝0凸 … 4人目＝3凸＝完凸）
store.define('partner', { kind: 'lww', def: null }); // メイン（ホームのいちばん大きな板で動く子・MY PARTNER）
store.define('subs', { kind: 'lww', def: null });    // サブ2人 [id|null, id|null]（null＝おまかせ）★ 2026-11-25 ロビー設定
store.define('icon', { kind: 'lww', def: null });    // プロフィールのアイコンの子（null＝メイン）★ 2026-11-25 図鑑の「アイコンにする」

export const ELEMENTS = {
  flare: { en: 'FLARE', ja: '火' },
  tide: { en: 'TIDE', ja: '水' },
  terra: { en: 'TERRA', ja: '木' },
  nova: { en: 'NOVA', ja: '光' },
  void: { en: 'VOID', ja: '闇' },
};

// 並びは図鑑の番号順（no）。★ 2026-11-25 ご指定：No.1 は美月
export const CHARS = [
  { no: 1, id: 'miduki', name: '美月', kana: 'みづき', en: 'MIDUKI', el: 'terra' },
  { no: 2, id: 'yuzuha', name: '柚葉', kana: 'ゆずは', en: 'YUZUHA', el: 'flare' },
  { no: 3, id: 'minase', name: '水瀬', kana: 'みなせ', en: 'MINASE', el: 'tide' },
  // ★ 2026-11-25 第7回：まだ使っていなかった属性を1人ずつ（案B＝絵の色で決める形）
  { no: 4, id: 'sui', name: '翠', kana: 'すい', en: 'SUI', el: 'void' },
  { no: 5, id: 'mana', name: '愛菜', kana: 'まな', en: 'MANA', el: 'nova' },
];

/** 完凸に必要な人数（4人目で完凸＝3凸）。★ 2026-11-25 ご指定で 4凸→3凸（前に5人目まで出ていた子も完凸のまま） */
export const MAX_COPIES = 4;
export const MAX_AWK = MAX_COPIES - 1;

export const byId = (id) => CHARS.find((c) => c.id === id) || null;
export const copies = (id) => Math.max(0, store.get('copies')[id] || 0);
export const owned = (id) => copies(id) > 0;
/** 凸の数（0〜3） */
export const awk = (id) => Math.min(MAX_AWK, Math.max(0, copies(id) - 1));
export const isMax = (id) => copies(id) >= MAX_COPIES;
/** 絵の場所：kind = full-1024 / full-512（LD＝動かすときだけ）／ banner-940 / banner-470 / face-256 / face-96（LD なし＝ふだんはこちら） */
export const art = (id, kind) => `assets/chara/${id}/${kind}.webp`;

/** メイン（パートナー）。選んでいなければ、持っている子のうち番号のいちばん若い子 */
export function partner() {
  const p = store.get('partner');
  if (p && owned(p)) return byId(p);
  return CHARS.find((c) => owned(c.id)) || null;
}
/** メインにする。その子がサブにいたら、そのサブの枠には前のメインが入る（入れかえ） */
export function setPartner(id) {
  if (!owned(id)) return;
  const old = partner()?.id;
  const s = subsChosen();
  const k = s.indexOf(id);
  if (k >= 0) { s[k] = old && old !== id ? old : null; store.set('subs', s); }
  store.set('partner', id);
}

/** サブに選んだ子（[サブ1, サブ2]・null＝おまかせ）。持っていない子・メインと同じ子は null にして返す */
export function subsChosen() {
  const v = store.get('subs');
  const main = partner()?.id;
  const a = Array.isArray(v) ? [v[0] || null, v[1] || null] : [null, null];
  return a.map((id, i) => (id && owned(id) && id !== main && a.indexOf(id) === i ? id : null));
}
/** サブ（slot 0 か 1）に id を入れる（null＝おまかせ）。メインを選んだら入れかえ（前のサブがメインに）・もう一方のサブと同じなら入れかえ */
export function setSub(slot, id) {
  if (slot !== 0 && slot !== 1) return false;
  if (id && !owned(id)) return false;
  const s = subsChosen();
  const main = partner()?.id;
  if (id && id === main) {
    if (!s[slot]) return false;                 // メインの代わりがいない（おまかせの枠）ときは入れかえない
    store.set('partner', s[slot]);
  }
  const o = 1 - slot;
  if (id && s[o] === id) s[o] = s[slot];
  s[slot] = id || null;
  store.set('subs', s);
  return true;
}

/** アイコンの子（選んでいなければメイン） */
export function iconChar() {
  const v = store.get('icon');
  return (v && owned(v) && byId(v)) || partner();
}
export function setIcon(id) {
  if (owned(id)) store.set('icon', id);
}

export const onChange = (fn) => {
  const offs = ['copies', 'partner', 'subs', 'icon'].map((k) => store.on(k, fn));
  return () => offs.forEach((f) => f());
};

// ★ 2026-11-25 第7回で決めた性格と話し方（docs/decisions.md）。0凸で2つ・凸が進むと1つずつ増え、完凸（3凸）で全部（最後の1つは完凸のセリフ）
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
/** いま話せる会話（0凸で2つ・1凸ごとに1つ増える・完凸で全部） */
export function lines(id) {
  const L = LINES[id] || [];
  return isMax(id) ? L.slice() : L.slice(0, Math.min(L.length, 2 + awk(id)));
}
export function randomLine(id) {
  const L = lines(id);
  return L[Math.floor(Math.random() * L.length)] || '';
}
