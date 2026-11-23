// XEVARION II — お財布（XEVA・ジェム・ガチャチケット）
// ★ counter（端末ごとの足し引き）で持つので、2台で同時に増やしても減らしても消えない。
import * as store from './store.js';

store.define('wallet', { kind: 'counter' });

/** 両替：200 XEVA → ジェム 1（一方通行） */
export const RATE = 200;

export function get() {
  const t = store.get('wallet');
  return { xeva: Math.max(0, t.xeva || 0), gem: Math.max(0, t.gem || 0), ticket: Math.max(0, t.ticket || 0) };
}
export function add(field, n) {
  n = Math.floor(n);
  if (n > 0) store.add('wallet', field, n);
}
/** 足りなければ false（何も減らさない） */
export function spend(field, n) {
  n = Math.floor(n);
  if (n <= 0) return true;
  if (get()[field] < n) return false;
  store.add('wallet', field, -n);
  return true;
}
/** XEVA をジェムに両替する。両替できたジェムの数を返す */
export function exchange(xeva) {
  const gems = Math.floor(xeva / RATE);
  if (gems <= 0 || !spend('xeva', gems * RATE)) return 0;
  add('gem', gems);
  return gems;
}
export const on = (fn) => store.on('wallet', fn);
