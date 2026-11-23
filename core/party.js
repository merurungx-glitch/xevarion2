// XEVARION II — パーティーの部品（1台を囲むゲームで共通：Yacht・GuraPlate・Shift・ChainParty・Quiz）
//
// ・連携：その人の ID と合言葉を、その人に入れてもらって確かめる（この端末のサインインは切りかえない）。
//         ★ 合言葉は保存しない。この端末に覚えるのは「連携したことのある人」の ID・名前・パートナーだけ
// ・賞金：この端末の本人 → その場でお財布へ（オフラインでも入る）
//         連携した人   → その人の「受け取り箱」（inbox/<uid>）へ送る。送れなければ送り待ちに入れて、
//                         通信が戻ったとき・画面にもどったとき・次の起動で送り直す
// ・受け取り：自分の受け取り箱は、サインインのあと・画面にもどったときに取り出してお財布へ入れる
//            （2台で同時に取り出しても、1つは1台にしか入らない）
import * as store from './store.js';
import * as wallet from './wallet.js';
import * as account from './account.js';
import * as chara from './chara.js';
import * as power from './power.js';
import { backend } from './backend/index.js';
import { ID_RULE } from './config.js';

store.define('partyQ', { scope: 'device', def: [] }); // 送り待ちの賞金
store.define('partyRecent', { scope: 'device', def: [] }); // この端末で連携したことのある人

/** 1台を囲むゲームの共通の賞金（順位ごと・初代と同じ額）。お金の数字の相談で見直す */
export const PRIZES = [250, 200, 150, 100, 50];
/** 1回に送れる額の上限（MagiQuiz の1位 1,000）。ルールの上限と同じ */
export const MAX_AMT = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const faceOk = (id) => (chara.byId(id) ? id : '');

/** この端末の本人（サインインしている人） */
export function me() {
  const u = account.current();
  if (!u) return null;
  const p = chara.partner();
  return { uid: u.uid, id: u.id, name: account.profile().name, face: p ? p.id : '' };
}

// ---- 連携 ----
/**
 * ID と合言葉を確かめる → { acc:{uid,id,name,face} } か { error }
 * error：format（ID の形）・self（自分）・bad（ちがう）・net（通信）・many（失敗が多い）
 */
export async function verify(id, pass) {
  id = String(id || '').trim().toLowerCase();
  if (!ID_RULE.test(id) || !pass) return { error: 'format' };
  const u = account.current();
  if (u && u.id === id) return { error: 'self' };
  if (navigator.onLine === false) return { error: 'net' };
  try {
    const be = await backend();
    const r = await be.verifyLogin(id, String(pass));
    const acc = { uid: r.uid, id: r.id, name: String(r.name || r.id).slice(0, 24), face: faceOk(r.partner) };
    remember(acc);
    return { acc };
  } catch (e) {
    const c = e && e.code;
    return { error: c === 'bad-login' ? 'bad' : c === 'too-many' ? 'many' : 'net' };
  }
}

export function recent() {
  const a = store.get('partyRecent');
  return Array.isArray(a) ? a : [];
}
export function remember(acc) {
  if (!acc || !acc.uid) return;
  const a = recent().filter((x) => x.uid !== acc.uid);
  a.unshift({ uid: acc.uid, id: acc.id || '', name: acc.name || '', face: faceOk(acc.face) });
  store.set('partyRecent', a.slice(0, 12));
}
export function forget(uid) { store.set('partyRecent', recent().filter((x) => x.uid !== uid)); }

// ---- 賞金 ----
const midOf = (app, key) => `${app}-${store.deviceId().slice(1, 9)}-${key}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);

/**
 * 賞金を配る。list＝[{ uid, amt, why, key }]（key＝その試合で一意の印。送り直しても二重にならない）
 * 戻り値＝[{ uid, amt, kind }]（kind：me＝この端末のお財布へ／cloud＝送れた／wait＝あとで送る）
 */
export async function award(list, { app = 'app' } = {}) {
  const u = account.current();
  const q = store.get('partyQ') || [];
  const out = [];
  for (const x of list || []) {
    const amt = Math.min(MAX_AMT, Math.floor(+x.amt || 0));
    if (amt <= 0 || !x.uid) continue;
    if (u && x.uid === u.uid) {
      wallet.add('xeva', amt);
      out.push({ uid: x.uid, amt, kind: 'me' });
      continue;
    }
    const mid = midOf(app, x.key || Date.now() + '_' + out.length);
    if (!q.some((it) => it.mid === mid)) q.push({ mid, to: x.uid, amt, app, why: String(x.why || '').slice(0, 60), at: Date.now() });
    out.push({ uid: x.uid, amt, kind: 'wait', mid });
  }
  store.set('partyQ', q.slice(-100));
  if (out.some((o) => o.kind === 'wait')) await flush(5000); // 5秒までは待つ（それより遅ければ「あとで送ります」）
  const left = new Set((store.get('partyQ') || []).map((it) => it.mid));
  return out.map((o) => (o.kind === 'wait' && !left.has(o.mid) ? { ...o, kind: 'cloud' } : o)).map(({ mid, ...o }) => o);
}

const drop = (mid) => store.set('partyQ', (store.get('partyQ') || []).filter((it) => it.mid !== mid));
let flushing = null;
/** 送り待ちを送る。waitMs を渡すと、それ以上は待たずに戻る（送るのは続ける） */
export function flush(waitMs = 0) {
  if (!flushing) flushing = doFlush().finally(() => { flushing = null; });
  return waitMs ? Promise.race([flushing, sleep(waitMs)]) : flushing;
}
async function doFlush() {
  const u = account.current();
  if (!u || navigator.onLine === false) return;
  const be = await backend();
  for (const it of [...(store.get('partyQ') || [])]) {
    if (account.current()?.uid !== u.uid) return;
    const p = be.sendInbox(it.to, it.mid, { kind: 'xeva', amt: it.amt, app: it.app, why: it.why, at: it.at });
    p.then(() => drop(it.mid), () => {}); // 待ちきれずに戻ったあとで届いても、送り待ちから外す
    try {
      await Promise.race([p, sleep(8000).then(() => { throw Object.assign(new Error('timeout'), { code: 'timeout' }); })]);
    } catch (e) {
      if (e && e.code === 'denied') { console.warn('party: 送れない賞金（相手のアカウントがない・ルール）', it); continue; } // 残して次へ（ルールを貼る前に消さない）
      return; // 通信が悪い → あとで
    }
  }
}

// ---- 受け取り ----
const giftSubs = new Set();
/** 賞金が届いたら知らせる（ホームでトーストと入手の演出を出す） fn({ sum, apps }) */
export function onGift(fn) { giftSubs.add(fn); return () => giftSubs.delete(fn); }
let claiming = false;
export async function claim() {
  const u = account.current();
  if (!u || claiming || navigator.onLine === false) return 0;
  claiming = true;
  try {
    const be = await backend();
    const got = await be.takeInbox(u.uid);
    if (account.current()?.uid !== u.uid) return 0;
    let sum = 0;
    const apps = new Set();
    for (const m of got) {
      if (m.kind !== 'xeva') continue;
      const n = Math.min(MAX_AMT, Math.floor(+m.amt || 0));
      if (n > 0) { sum += n; if (m.app) apps.add(m.app); }
    }
    if (sum) {
      wallet.add('xeva', sum);
      for (const fn of giftSubs) { try { fn({ sum, apps: [...apps] }); } catch (e) { console.error(e); } }
    }
    return sum;
  } catch (e) {
    console.warn('party: 受け取り箱を読めませんでした', e);
    return 0;
  } finally {
    claiming = false;
  }
}

// ---- いつ送る・いつ受け取るか ----
let started = false;
let lastUid = null;
let lastRun = 0;
function run() {
  lastRun = Date.now();
  flush();
  claim();
}
export function init() {
  if (started) return;
  started = true;
  account.onChange((u) => {
    if (!u) { lastUid = null; return; }
    if (u.uid === lastUid) return;
    lastUid = u.uid;
    account.whenSynced().then(() => { if (account.current()?.uid === u.uid) run(); });
  });
  power.onVisible((v) => { if (v && account.current() && Date.now() - lastRun > 60000) run(); });
  addEventListener('online', () => { if (account.current()) run(); });
}
