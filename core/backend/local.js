// XEVARION II — 手元の試験用の裏方
// この端末の localStorage の「x2dev.」の中だけで、アカウントとクラウドのまねをする。
// 本物の Firebase には何も送らない。合わせ方は本物と同じ merge.js を使う。
import { mergeRec } from '../merge.js';

export const name = 'local';
const K = 'x2dev.server';
const SK = 'x2dev.session';
const wait = (ms = 140) => new Promise((r) => setTimeout(r, ms));

class BackendError extends Error {
  constructor(code) { super(code); this.code = code; }
}

function load() {
  try { return JSON.parse(localStorage.getItem(K)) || { users: {}, ids: {} }; } catch { return { users: {}, ids: {} }; }
}
function save(d) { localStorage.setItem(K, JSON.stringify(d)); }
async function hash(id, pass) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`x2dev:${id}:${pass}`));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

let user = null;
let authCb = null;
function setUser(u) {
  user = u;
  if (u) localStorage.setItem(SK, JSON.stringify(u)); else localStorage.removeItem(SK);
  if (authCb) authCb(u);
}

export async function init() {
  try { user = JSON.parse(localStorage.getItem(SK)); } catch { user = null; }
  if (user && !load().users[user.uid]) user = null; // 試験データを消したあと
}
export function onAuth(cb) {
  authCb = cb;
  setTimeout(() => cb(user), 0);
  return () => { authCb = null; };
}

export async function signUp(id, pass, profile) {
  await wait();
  const d = load();
  if (d.ids[id]) throw new BackendError('id-taken');
  const uid = 'dev_' + Math.random().toString(36).slice(2, 10);
  d.ids[id] = uid;
  d.users[uid] = { id, pass: await hash(id, pass), profile: { ...profile, id, createdAt: Date.now() }, data: {} };
  save(d);
  const u = { uid, id };
  setUser(u);
  return u;
}
export async function signIn(id, pass) {
  await wait();
  const d = load();
  const uid = d.ids[id];
  if (!uid || d.users[uid].pass !== (await hash(id, pass))) throw new BackendError('bad-login');
  const u = { uid, id };
  setUser(u);
  return u;
}
export async function signOut() { setUser(null); }

export async function getProfile(uid) { await wait(40); return load().users[uid]?.profile || null; }
export async function setProfile(uid, part) {
  await wait(40);
  const d = load();
  if (d.users[uid]) { Object.assign(d.users[uid].profile, part); save(d); }
}

export async function pull(uid) {
  await wait();
  return JSON.parse(JSON.stringify(load().users[uid]?.data || {}));
}
/** 送られた記録をクラウド側で合わせて、合わせた結果を返す（本物はトランザクション） */
export async function push(uid, recs, kinds) {
  await wait();
  const d = load();
  const u = d.users[uid];
  if (!u) throw new BackendError('no-user');
  const out = {};
  for (const [n, r] of Object.entries(recs)) {
    u.data[n] = mergeRec(kinds[n] || 'lww', u.data[n] || null, r);
    out[n] = u.data[n];
  }
  save(d);
  return out;
}

/** パーティーの連携：その人の ID と合言葉を確かめる（この端末のサインインは切りかえない） */
export async function verifyLogin(id, pass) {
  await wait();
  const d = load();
  const uid = d.ids[id];
  if (!uid || d.users[uid].pass !== (await hash(id, pass))) throw new BackendError('bad-login');
  const u = d.users[uid];
  return { uid, id, name: u.profile?.name || id, partner: u.data?.partner?.v || null };
}

/** 受け取り箱へ送る（パーティーの賞金など）。同じ印で送り直しても1つ（送った人だけが上書きできる） */
export async function sendInbox(to, mid, msg) {
  await wait(60);
  if (!user) throw new BackendError('no-auth');
  const d = load();
  if (!d.users[to] || to === user.uid) throw new BackendError('denied');
  const box = ((d.inbox ||= {})[to] ||= {});
  if (box[mid] && box[mid].from !== user.uid) throw new BackendError('denied');
  box[mid] = { ...msg, from: user.uid };
  save(d);
}
/** 自分の受け取り箱から取り出す（取り出したものはクラウドから消える） */
export async function takeInbox(uid) {
  await wait(60);
  if (!user || user.uid !== uid) return [];
  const d = load();
  const box = d.inbox?.[uid] || {};
  const out = Object.entries(box).map(([mid, m]) => ({ mid, ...m }));
  if (out.length) { delete d.inbox[uid]; save(d); }
  return out;
}

/** 試験用：このアカウントを消す */
export async function deleteAccount(uid) {
  const d = load();
  const id = d.users[uid]?.id;
  delete d.users[uid];
  if (id) delete d.ids[id];
  if (d.inbox) delete d.inbox[uid];
  save(d);
  setUser(null);
}

export async function startAnalytics() {}
