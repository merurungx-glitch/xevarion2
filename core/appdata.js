// XEVARION II — アプリが持つ、アカウントごとの同期する記録（アプリは橋の X2.appData で使う）
//
// ・MagiLex の学習の記録（lex）と MagiDerby の馬券の記録（derby）。合わせ方は merge.js の lex・derby
//   （lex＝問題ごと・印ごと／derby＝馬券ごと。2台で別々に使っても消えない）
// ・クラウドは users/<uid>/data/<キー>（ルールはほかの記録と同じ）。手元は x2.u.<uid>.<キー>
// ・アプリとは JSON の文字でやりとりする（iframe の中のオブジェクトと親のオブジェクトを混ぜない）
// ・RAW のキーは、中身を JSON の文字のまま持つ（Firebase は配列を {0:…} にしたり空の配列を消したりする → 馬券の買い目が崩れない）
// ★ 起動のとき（boot.js）に読みこむ：同期の最初の読みこみより前にキーを登録しておかないと、新しい端末でクラウドの記録が入らない
import * as store from './store.js';

const DATA = { lex: 'lex', derby: 'derby' }; // アプリの id → 記録のキー
const RAW = new Set(['derby']);
store.define('lex', { kind: 'lex', def: null });
store.define('derby', { kind: 'derby', def: null });

export const keyOf = (appId) => DATA[appId] || null;

/** 記録を JSON の文字で（無ければ null） */
export function load(appId) {
  const k = keyOf(appId);
  if (!k) return null;
  const v = store.get(k);
  if (v == null) return null;
  return RAW.has(k) && typeof v === 'string' ? v : JSON.stringify(v);
}

/** 記録を書く（JSON の文字）。書けたら true */
export function save(appId, json) {
  const k = keyOf(appId);
  if (!k || !store.userId()) return false;
  let v;
  try { v = JSON.parse(json); } catch { return false; }
  if (!v || typeof v !== 'object') return false;
  store.set(k, RAW.has(k) ? String(json) : v);
  return true;
}

/** 変わったら知らせる（ほかの端末の記録が同期で入ったときも）。止める関数を返す */
export function on(appId, fn) {
  const k = keyOf(appId);
  return k ? store.on(k, () => fn()) : () => {};
}
