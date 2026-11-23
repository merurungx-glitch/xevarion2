// XEVARION II — アプリが持つ、アカウントごとの同期する記録（アプリは橋の X2.appData で使う）
//
// ・いまは MagiLex の学習の記録（lex）だけ。合わせ方は merge.js の lex（問題ごと・印ごとに合わせる＝2台で別々に解いても消えない）
// ・クラウドは users/<uid>/data/lex（ルールはほかの記録と同じ）。手元は x2.u.<uid>.lex
// ・アプリとは JSON の文字でやりとりする（iframe の中のオブジェクトと親のオブジェクトを混ぜない）
// ★ 起動のとき（boot.js）に読みこむ：同期の最初の読みこみより前にキーを登録しておかないと、新しい端末でクラウドの記録が入らない
import * as store from './store.js';

const DATA = { lex: 'lex' }; // アプリの id → 記録のキー
store.define('lex', { kind: 'lex', def: null });

export const keyOf = (appId) => DATA[appId] || null;

/** 記録を JSON の文字で（無ければ null） */
export function load(appId) {
  const k = keyOf(appId);
  if (!k) return null;
  const v = store.get(k);
  return v == null ? null : JSON.stringify(v);
}

/** 記録を書く（JSON の文字）。書けたら true */
export function save(appId, json) {
  const k = keyOf(appId);
  if (!k || !store.userId()) return false;
  let v;
  try { v = JSON.parse(json); } catch { return false; }
  store.set(k, v);
  return true;
}

/** 変わったら知らせる（ほかの端末の記録が同期で入ったときも）。止める関数を返す */
export function on(appId, fn) {
  const k = keyOf(appId);
  return k ? store.on(k, () => fn()) : () => {};
}
