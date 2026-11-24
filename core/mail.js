// XEVARION II — メール（受け取り期限つき）とコード入力（段階2・2026-11-24）
// ・メールは運営が管理画面（portal/admin.js）から送る：
//     みんなへ＝mail/all/<id>（サインインした人はだれでも読める）・ひとりへ＝mail/to/<ID>/<id>（本人だけ読める）
//     形：{ at, title, body?, items: { xeva?, gem?, ticket? }, until?（ミリ秒・過ぎたら受け取れない＝出さない） }
// ・コードは運営が作る：codes/<コード>（A〜Z と 0〜9 の4〜16文字）＝ { at, title?, items, until? }。コードを知っている人だけが読める（一覧は運営だけ）
// ・受け取った印はアカウントで同期：mailgot（flags：'a:<id>'＝みんなへ・'t:<id>'＝ひとりへ）・codegot（flags：コード）。1つのアカウントで1回
// ・受け取る前にクラウドの最新を読む（ほかの端末で受け取りずみなら二度もらわない）。書いたらすぐ送る
// ・メールの一覧は、ホームやメールの板を開いたときに読む（5分に1回まで）。この端末に写し（mailCache）を持つ（電波がなくても前に読んだぶんは出る）
// ・キーは boot.js でこのファイルを読みこんで、同期の最初の読みこみより前に登録する
import * as store from './store.js';
import * as wallet from './wallet.js';
import * as sync from './sync.js';
import * as account from './account.js';
import { backend } from './backend/index.js';
import { serverNow } from './clock.js';

store.define('mailgot', { kind: 'flags' });
store.define('codegot', { kind: 'flags' });
store.define('mailCache', { scope: 'user', sync: false }); // 読んだメールの写し（このアカウント・この端末だけ）

const KINDS = ['xeva', 'gem', 'ticket'];
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;
export const CODE_RE = /^[A-Z0-9]{4,16}$/;
/** コードの書き方をそろえる（大文字・空白とハイフンをとる） */
export const normCode = (s) => String(s ?? '').toUpperCase().replace(/[\s\-ー－]/g, '');

/** もらえるものを数だけにそろえる（xeva・gem・ticket の正の整数だけ） */
export function normItems(o) {
  const out = {};
  for (const k of KINDS) {
    const n = Math.floor(Number(o && o[k]) || 0);
    if (n > 0) out[k] = Math.min(n, 1e9);
  }
  return out;
}
function parse(prefix, obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([id, m]) => {
    if (!ID_RE.test(id) || !m || typeof m.title !== 'string' || !Number.isFinite(Number(m.at))) return null;
    const items = normItems(m.items);
    if (!Object.keys(items).length) return null;
    return {
      key: `${prefix}:${id}`, id, to: prefix === 't', at: Number(m.at),
      title: m.title.slice(0, 80), body: typeof m.body === 'string' ? m.body.slice(0, 2000) : '',
      items, until: Number(m.until) || 0,
    };
  }).filter(Boolean);
}

// ── メール ──
const subs = new Set();
let raw = null; // { all, to }（読めたもの）
let rawUid = null;
let last = 0;
let fetching = null;
const emit = () => { for (const fn of [...subs]) fn(); };

/** 受け取れる期間のメール（新しい順）。claimed＝受け取りずみ */
export function list() {
  const uid = store.userId();
  if (!uid) return [];
  const r = rawUid === uid && raw ? raw : store.get('mailCache') || {};
  const got = store.get('mailgot');
  const now = serverNow();
  return [...parse('a', r.all), ...parse('t', r.to)]
    .filter((m) => !m.until || m.until > now)
    .map((m) => ({ ...m, claimed: !!got[m.key] }))
    .sort((a, b) => b.at - a.at);
}
/** 受け取れる（まだ受け取っていない）数 */
export const ready = (l = list()) => l.filter((m) => !m.claimed).length;
/** メールか受け取った印が変わったら知らせる。止める関数を返す */
export function onChange(fn) {
  subs.add(fn);
  const off = store.on('mailgot', fn);
  return () => { subs.delete(fn); off(); };
}

/** クラウドのメールを読みなおす。5分に1回まで（force で今すぐ） */
export function refresh({ force = false } = {}) {
  const uid = store.userId();
  const me = account.current();
  if (!uid || !me) return Promise.resolve(false);
  if (fetching) return fetching;
  if (!force && rawUid === uid && Date.now() - last < 300000) return Promise.resolve(false);
  fetching = (async () => {
    try {
      const be = await backend();
      const get = (p) => Promise.race([be.rt.get(p), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
      const [all, to] = await Promise.all([get('mail/all'), get(`mail/to/${me.id}`)]);
      if (store.userId() !== uid) return false;
      raw = { all: all || {}, to: to || {} };
      rawUid = uid;
      last = Date.now();
      store.set('mailCache', raw);
      emit();
      return true;
    } catch (e) {
      console.warn('mail: 読めませんでした', e);
      return false;
    } finally { fetching = null; }
  })();
  return fetching;
}

/** 1つ受け取る。受け取れたら items・だめなら null */
export async function claim(key) {
  const uid = store.userId();
  if (!uid) return null;
  await sync.pullNow().catch(() => false);
  await refresh({ force: true }); // 消されたメール・期限を最新に（読めなければ写しで）
  const m = list().find((x) => x.key === key);
  if (!m || m.claimed || store.userId() !== uid) return null;
  store.flag('mailgot', m.key);
  give(m.items);
  sync.pushNow().catch(() => {});
  return m.items;
}
/** 受け取れるものを全部。もらったものの合計を返す（なければ {}） */
export async function claimAll() {
  const uid = store.userId();
  if (!uid) return {};
  await sync.pullNow().catch(() => false);
  await refresh({ force: true });
  if (store.userId() !== uid) return {};
  const sum = {};
  for (const m of list()) {
    if (m.claimed) continue;
    store.flag('mailgot', m.key);
    give(m.items);
    for (const [k, n] of Object.entries(m.items)) sum[k] = (sum[k] || 0) + n;
  }
  if (Object.keys(sum).length) sync.pushNow().catch(() => {});
  return sum;
}

// ── コード入力 ──
/**
 * コードを入れて受け取る。
 * @returns {Promise<{ok:true, items, title}|{ok:false, code}>} code：'format'・'done'（このアカウントは受け取りずみ）・'notfound'・'expired'・'network'・'denied'
 */
export async function redeem(input) {
  const uid = store.userId();
  if (!uid) return { ok: false, code: 'no-auth' };
  const c = normCode(input);
  if (!CODE_RE.test(c)) return { ok: false, code: 'format' };
  await sync.pullNow().catch(() => false);
  if (store.get('codegot')[c]) return { ok: false, code: 'done' };
  const be = await backend();
  let v;
  try { v = await be.rt.get(`codes/${c}`); } catch (e) {
    return { ok: false, code: /permission|denied/i.test(String(e?.code || e?.message || '')) ? 'denied' : 'network' };
  }
  if (!v || typeof v !== 'object') return { ok: false, code: 'notfound' };
  if (Number(v.until) && Number(v.until) <= serverNow()) return { ok: false, code: 'expired' };
  const items = normItems(v.items);
  if (!Object.keys(items).length) return { ok: false, code: 'notfound' };
  if (store.userId() !== uid) return { ok: false, code: 'no-auth' };
  if (store.get('codegot')[c]) return { ok: false, code: 'done' };
  store.flag('codegot', c);
  give(items);
  sync.pushNow().catch(() => {});
  return { ok: true, items, title: typeof v.title === 'string' ? v.title.slice(0, 60) : '' };
}

function give(items) { for (const [k, n] of Object.entries(items || {})) wallet.add(k, n); }
