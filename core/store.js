// XEVARION II — 保存の口（ここ以外から localStorage をさわらない）
//
// ・キーはすべて define() で先に登録する（名前・置き場・同期するか・合わせ方）
// ・置き場は2つ：device＝この端末だけ（動作モードなど）／user＝アカウントごと（お金・キャラなど）
//   user のキーは x2.u.<uid>.<名前> に入るので、別のアカウントでサインインしても混ざらない
// ・同期するキーを書くと「未送信」の印が付き、core/sync.js が送る（送るまで印は端末に残る）
import { KEY } from './config.js';
import { mergeRec, counterTotals, sameRec } from './merge.js';

const DEFS = new Map();
const subs = new Map();
let uid = null;

const ls = (() => {
  try {
    const k = KEY + '$probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const m = new Map(); // 保存できない環境（プライベートモードなど）でも動くように
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i], get length() { return m.size; } };
  }
})();

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/**
 * キーを登録する。
 * @param {string} name
 * @param {{scope?:'user'|'device', sync?:boolean, kind?:'lww'|'counter'|'flags'|'lex'|'derby', def?:any}} o
 */
export function define(name, o = {}) {
  const scope = o.scope || 'user';
  DEFS.set(name, { name, scope, sync: o.sync ?? scope === 'user', kind: o.kind || 'lww', def: o.def ?? null });
}

const def = (name) => {
  const d = DEFS.get(name);
  if (!d) throw new Error('store: 未登録のキー ' + name);
  return d;
};
const lsKey = (d) => (d.scope === 'user' ? `${KEY}u.${uid}.${d.name}` : KEY + d.name);
const dirtyKey = () => `${KEY}u.${uid}.$dirty`;

function read(d) {
  if (d.scope === 'user' && !uid) return null;
  try { return JSON.parse(ls.getItem(lsKey(d)) || 'null'); } catch { return null; }
}
function write(d, rec, markDirty) {
  if (d.scope === 'user' && !uid) return;
  try { ls.setItem(lsKey(d), JSON.stringify(rec)); } catch (e) { console.warn('store: 保存できません', e); }
  if (markDirty && d.sync) setDirty(d.name, true);
  emit(d.name);
}

/** 値を読む（counter は {フィールド: 合計}・flags は {印: true}） */
export function get(name) {
  const d = def(name);
  const r = read(d);
  if (d.kind === 'counter') return counterTotals(r);
  if (d.kind === 'flags') return (r && r.v) || {};
  return r && r.v !== undefined ? clone(r.v) : clone(d.def); // ★ Firebase は null を保存しない（v が無い記録もある）
}

export const kindOf = (name) => def(name).kind;
export const isSync = (name) => { const d = DEFS.get(name); return !!(d && d.sync && d.scope === 'user'); };

/** lww（と lex・derby＝アプリの記録）のキーに書く */
export function set(name, value) {
  const d = def(name);
  if (d.kind !== 'lww' && d.kind !== 'lex' && d.kind !== 'derby') throw new Error('store.set は lww・lex・derby だけ: ' + name);
  write(d, { v: clone(value), t: Date.now() }, true);
}

/** counter のキーに足す（マイナスで引く）。この端末のぶんだけが増える */
export function add(name, field, delta) {
  const d = def(name);
  if (d.kind !== 'counter') throw new Error('store.add は counter だけ: ' + name);
  if (!delta) return;
  const r = read(d) || { v: {}, t: 0 };
  const me = (r.v[deviceId()] ||= {});
  const pn = (me[field] ||= [0, 0]);
  if (delta > 0) pn[0] += delta; else pn[1] += -delta;
  r.t = Date.now();
  write(d, r, true);
}

/** flags のキーに印を付ける */
export function flag(name, key) {
  const d = def(name);
  if (d.kind !== 'flags') throw new Error('store.flag は flags だけ: ' + name);
  const r = read(d) || { v: {}, t: 0 };
  if (r.v[key]) return;
  r.v[key] = true;
  r.t = Date.now();
  write(d, r, true);
}

/** 同期用：生の記録 */
export const rec = (name) => read(def(name));

/** 同期用：クラウドから来た記録を合わせる。手元にしかない情報が残ったら「未送信」にする */
export function merge(name, remote) {
  const d = def(name);
  const local = read(d);
  const m = mergeRec(d.kind, local, remote);
  if (!sameRec(m, local)) write(d, m, false);
  if (d.sync && !sameRec(m, remote)) setDirty(name, true);
}

/** 同期するキーの一覧（user の置き場だけ） */
export const syncNames = () => [...DEFS.values()].filter((d) => d.sync && d.scope === 'user').map((d) => d.name);

function dirtySet() {
  if (!uid) return new Set();
  try { return new Set(JSON.parse(ls.getItem(dirtyKey()) || '[]')); } catch { return new Set(); }
}
function setDirty(name, on) {
  if (!uid) return;
  const s = dirtySet();
  if (on) s.add(name); else s.delete(name);
  try { ls.setItem(dirtyKey(), JSON.stringify([...s])); } catch {}
}
export const dirty = () => [...dirtySet()];
/** 送れたキーの印を外す。★ 送っているあいだに書きかわったキーは外さない */
export function markClean(sent) {
  for (const [name, r] of Object.entries(sent)) if (sameRec(read(def(name)), r)) setDirty(name, false);
}

/** サインインした人の置き場を使う（null でサインアウト） */
export function useUser(id) {
  uid = id || null;
  emit('*');
}
export const userId = () => uid;

/** この端末の印（端末ごとに1つ・同期しない） */
let dev = null;
export function deviceId() {
  if (dev) return dev;
  dev = ls.getItem(KEY + 'device');
  if (!dev) {
    const b = new Uint8Array(8);
    crypto.getRandomValues(b);
    dev = 'd' + [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    ls.setItem(KEY + 'device', dev);
  }
  return dev;
}

/** この端末に保存している XEVARION II のぶんの大きさ（バイト） */
export function usedBytes() {
  let n = 0;
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(KEY)) n += (k.length + (ls.getItem(k) || '').length) * 2;
  }
  return n;
}

/** あるアカウントの手元のぶんを全部消す（試験用・サインアウトでは消さない） */
export function wipeUser(id) {
  const pre = `${KEY}u.${id}.`;
  const del = [];
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(pre)) del.push(k); }
  del.forEach((k) => ls.removeItem(k));
}

/** 変わったら知らせる。name に '*' でぜんぶ */
export function on(name, fn) {
  if (!subs.has(name)) subs.set(name, new Set());
  subs.get(name).add(fn);
  return () => subs.get(name).delete(fn);
}
function emit(name) {
  for (const k of [name, '*']) for (const fn of subs.get(k) || []) { try { fn(name); } catch (e) { console.error(e); } }
}

// 別のタブで変わったときも知らせる
addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith(KEY)) return;
  for (const d of DEFS.values()) if (lsKey(d) === e.key) emit(d.name);
});
