// XEVARION II — アカウント（XEVARION II 専用・ID＋合言葉）
// ・アカウントが無いと遊べない（タイトル → サインイン／アカウントを作る）
// ・サインインしたら、その人の置き場（store.useUser）に切りかえて同期を始める
// ・新しい端末でサインインしたときは、クラウドを読み終えてから画面を決める（最初の10連の判定がずれないように）
import * as store from './store.js';
import * as sync from './sync.js';
import { backend } from './backend/index.js';
import { ID_RULE, PASS_MIN, NAME_MAX, BACKEND } from './config.js';
import { t } from './i18n.js';
import { grantWelcome } from './gacha.js';

store.define('profile', { kind: 'lww', def: null }); // { name }
store.define('lastId', { scope: 'device', def: '' }); // サインインの欄に前回の ID を入れておく
store.define('analytics', { scope: 'device', def: true }); // 利用状況の送信（公開版だけ）

let be = null;
let user = null;
let syncedUid = null;
let syncP = Promise.resolve();
let ready = false;
let readyResolve;
const readyP = new Promise((r) => (readyResolve = r));
const subs = new Set();

export const current = () => user;
export const isReady = () => ready;
export const whenReady = () => readyP;
/** 最初の同期（クラウドを読む）が終わるまで待つ。通信がないときは5秒であきらめる */
export const whenSynced = () => Promise.race([syncP, new Promise((r) => setTimeout(r, 5000))]);
export const backendName = () => BACKEND;
export function profile() {
  const p = store.get('profile');
  return { name: (p && p.name) || (user && user.id) || '' };
}
export function onChange(fn) { subs.add(fn); return () => subs.delete(fn); }
const emit = () => { for (const fn of subs) { try { fn(user); } catch (e) { console.error(e); } } };

function adopt(u) {
  user = u;
  store.useUser(u.uid);
  store.set('lastId', u.id);
  if (syncedUid !== u.uid) {
    syncedUid = u.uid;
    syncP = sync.start(be, u.uid).catch((e) => console.warn(e));
  }
}

export async function start() {
  be = await backend();
  try {
    await be.init();
  } catch (e) {
    console.error('backend: 準備できませんでした', e);
    ready = true;
    readyResolve(null);
    emit();
    return;
  }
  be.onAuth((u) => {
    if (u) adopt(u);
    else {
      sync.stop();
      syncedUid = null;
      user = null;
      store.useUser(null);
    }
    if (!ready) { ready = true; readyResolve(user); }
    emit();
  });
}

export const checkId = (id) => (ID_RULE.test(id) ? '' : t('err.idFormat'));
export const checkPass = (p) => (String(p).length >= PASS_MIN ? '' : t('err.passShort'));
export function checkName(n) {
  const len = [...String(n).trim()].length;
  return len >= 1 && len <= NAME_MAX ? '' : t('err.nameLen');
}
const errText = (e) => ({
  'id-taken': t('err.idTaken'),
  'bad-login': t('err.badLogin'),
  'weak-pass': t('err.passShort'),
  network: t('err.network'),
  'not-enabled': t('err.notEnabled'),
  'too-many': t('err.tooMany'),
}[e && e.code] || t('err.unknown', { code: (e && (e.code || e.message)) || '?' }));

/** アカウントを作る。まちがいがあれば Error（画面に出す文）を投げる */
export async function signUp({ id, pass, pass2, name }) {
  id = String(id).trim().toLowerCase();
  name = String(name).trim();
  const bad = checkId(id) || checkName(name) || checkPass(pass) || (pass !== pass2 ? t('err.passMismatch') : '');
  if (bad) throw new Error(bad);
  let u;
  try { u = await be.signUp(id, pass, { name }); } catch (e) { throw new Error(errText(e)); }
  adopt(u);
  store.set('profile', { name });
  grantWelcome();
  emit();
  await whenSynced();
  return u;
}

export async function signIn({ id, pass }) {
  id = String(id).trim().toLowerCase();
  if (!id || !pass) throw new Error(t('err.badLogin'));
  let u;
  try { u = await be.signIn(id, pass); } catch (e) { throw new Error(errText(e)); }
  adopt(u);
  emit();
  await whenSynced();
  return u;
}

export async function signOut() {
  try { await sync.pushNow(); } catch {}
  await be.signOut();
}

export async function rename(name) {
  name = String(name).trim();
  const bad = checkName(name);
  if (bad) throw new Error(bad);
  store.set('profile', { name });
  try { await be.setProfile(user.uid, { name }); } catch (e) { console.warn(e); }
  emit();
}

/** 手元の試験用だけ：このアカウントと手元のデータを消す */
export async function devDelete() {
  if (BACKEND !== 'local' || !user) return;
  const id = user.uid;
  sync.stop();
  store.wipeUser(id);
  await be.deleteAccount(id);
}

/** 利用状況の送信（公開版だけ・設定で止められる） */
export async function analytics(on) {
  if (on && be && be.startAnalytics) await be.startAnalytics();
}
