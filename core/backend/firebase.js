// XEVARION II — 本物の裏方（Firebase：Authentication ＋ Realtime Database）
// ・SDK は gstatic の ES モジュールを、使うときにだけ読む（版は config.js の1か所）
// ・ID＋合言葉は「ID@id.xevarion2.example」というメールの形にして、メール／パスワードの方式で使う（メールは送らない）
// ・データは users/<uid>/data/<キー> = { v, t }。書くときはトランザクションで、クラウド側でも merge.js と同じ合わせ方をする
import { FIREBASE, ID_MAIL_DOMAIN } from '../config.js';
import { mergeRec } from '../merge.js';

export const name = 'firebase';
const url = (m) => `https://www.gstatic.com/firebasejs/${FIREBASE.sdk}/firebase-${m}.js`;
let A, D, app, auth, db;

class BackendError extends Error {
  constructor(code, raw) { super(code); this.code = code; this.raw = raw; }
}
const MAP = {
  'auth/email-already-in-use': 'id-taken',
  'auth/invalid-credential': 'bad-login',
  'auth/invalid-login-credentials': 'bad-login',
  'auth/wrong-password': 'bad-login',
  'auth/user-not-found': 'bad-login',
  'auth/invalid-email': 'bad-login',
  'auth/weak-password': 'weak-pass',
  'auth/network-request-failed': 'network',
  'auth/operation-not-allowed': 'not-enabled',
  'auth/configuration-not-found': 'not-enabled',
  'auth/too-many-requests': 'too-many',
};
const norm = (e) => new BackendError(MAP[e?.code] || e?.code || 'unknown', e?.code);

const mail = (id) => `${id}@${ID_MAIL_DOMAIN}`;
const idOf = (email) => String(email || '').split('@')[0];

export async function init() {
  if (app) return;
  const [fa, fauth, fdb] = await Promise.all([import(url('app')), import(url('auth')), import(url('database'))]);
  A = fauth;
  D = fdb;
  app = fa.initializeApp(FIREBASE.config);
  auth = A.getAuth(app);
  db = D.getDatabase(app);
}

export function onAuth(cb) {
  return A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, id: idOf(u.email) } : null));
}

export async function signUp(id, pass, profile) {
  try {
    const cr = await A.createUserWithEmailAndPassword(auth, mail(id), pass);
    const uid = cr.user.uid;
    await D.set(D.ref(db, `users/${uid}/profile`), { ...profile, id, createdAt: D.serverTimestamp() });
    return { uid, id };
  } catch (e) { throw norm(e); }
}
export async function signIn(id, pass) {
  try {
    const cr = await A.signInWithEmailAndPassword(auth, mail(id), pass);
    return { uid: cr.user.uid, id };
  } catch (e) { throw norm(e); }
}
export async function signOut() { await A.signOut(auth); }

export async function getProfile(uid) {
  const s = await D.get(D.ref(db, `users/${uid}/profile`));
  return s.val();
}
export async function setProfile(uid, part) { await D.update(D.ref(db, `users/${uid}/profile`), part); }

export async function pull(uid) {
  const s = await D.get(D.ref(db, `users/${uid}/data`));
  return s.val() || {};
}
export async function push(uid, recs, kinds) {
  const out = {};
  await Promise.all(Object.entries(recs).map(async ([n, r]) => {
    const res = await D.runTransaction(D.ref(db, `users/${uid}/data/${n}`), (cur) => mergeRec(kinds[n] || 'lww', cur, r));
    out[n] = res.snapshot.val();
  }));
  return out;
}

// ---- パーティーの連携と受け取り箱 ----
// 連携の確かめ：2つ目の Firebase アプリ（記憶はメモリだけ）でその人としてサインインし、名前とパートナーを読んで、すぐサインアウトする。
// ★ この端末のサインインは切りかえない・合言葉もサインインの状態も端末に残さない
let vApp = null;
let vAuth = null;
let vDb = null;
async function verifier() {
  if (vApp) return;
  const fa = await import(url('app'));
  vApp = fa.initializeApp(FIREBASE.config, 'x2-party');
  vAuth = A.initializeAuth(vApp, { persistence: A.inMemoryPersistence });
  vDb = D.getDatabase(vApp);
}
export async function verifyLogin(id, pass) {
  await verifier();
  try {
    const cr = await A.signInWithEmailAndPassword(vAuth, mail(id), pass);
    const uid = cr.user.uid;
    let name = id;
    let partner = null;
    try {
      D.goOnline(vDb);
      const [p, q] = await Promise.all([D.get(D.ref(vDb, `users/${uid}/profile/name`)), D.get(D.ref(vDb, `users/${uid}/data/partner`))]);
      name = p.val() || id;
      partner = q.val()?.v || null;
    } catch (e) { console.warn('party: 名前を読めませんでした', e); }
    return { uid, id, name, partner };
  } catch (e) {
    throw norm(e);
  } finally {
    try { D.goOffline(vDb); } catch {} // 2本目の接続は使い終わったら閉じる（電池）
    try { await A.signOut(vAuth); } catch {}
  }
}

/** 受け取り箱へ送る。★ 通信がないと終わらない（呼ぶ側で待ち時間を決める） */
export async function sendInbox(to, mid, msg) {
  const me = auth.currentUser;
  if (!me) throw new BackendError('no-auth');
  try { await D.set(D.ref(db, `inbox/${to}/${mid}`), { ...msg, from: me.uid }); } catch (e) { throw new BackendError(/permission/i.test(e?.message || '') ? 'denied' : 'network', e?.message); }
}
/** 自分の受け取り箱から取り出す。2台で同時に取り出しても、1つは1台にしか入らない（トランザクションで消した側だけ） */
export async function takeInbox(uid) {
  const s = await D.get(D.ref(db, `inbox/${uid}`));
  const out = [];
  for (const mid of Object.keys(s.val() || {})) {
    let got = null;
    const r = await D.runTransaction(D.ref(db, `inbox/${uid}/${mid}`), (cur) => { got = cur; return null; }, { applyLocally: false });
    if (r.committed && got) out.push({ mid, ...got });
  }
  return out;
}

// ---- 部屋（core/rooms.js だけが使う）：リアルタイムのデータの口 ----
// ★ 書きこみの失敗（ルールで拒否など）は Promise の reject で返る。rooms.js が「denied／net」に分ける
export const rt = {
  get: async (path) => (await D.get(D.ref(db, path))).val(),
  set: (path, v) => D.set(D.ref(db, path), v),
  update: (path, obj) => D.update(D.ref(db, path), obj),
  async txn(path, fn) {
    const r = await D.runTransaction(D.ref(db, path), fn, { applyLocally: false });
    return { committed: r.committed, value: r.snapshot.val() };
  },
  /** 変わるたびに cb(値)。止める関数を返す */
  on: (path, cb) => D.onValue(D.ref(db, path), (s) => cb(s.val()), (e) => console.warn('rt:', path, e && e.message)),
  onDisconnectSet(path, v) { try { D.onDisconnect(D.ref(db, path)).set(v); } catch (e) { console.warn(e); } },
  cancelDisconnect(path) { try { D.onDisconnect(D.ref(db, path)).cancel(); } catch {} },
  connected: (cb) => D.onValue(D.ref(db, '.info/connected'), (s) => cb(!!s.val())),
  /** サーバーの時刻と端末の時計の差（ms）。変わるたびに cb(差)。止める関数を返す */
  offset: (cb) => D.onValue(D.ref(db, '.info/serverTimeOffset'), (s) => cb(Number(s.val()) || 0)),
  now: () => D.serverTimestamp(),
};

let analytics = false;
/** 利用状況の送信（設定で止められる）。起動が落ちついてから呼ぶ */
export async function startAnalytics() {
  if (analytics || !app) return;
  analytics = true;
  try {
    const fa = await import(url('analytics'));
    if (await fa.isSupported()) fa.getAnalytics(app);
  } catch (e) { console.warn('analytics', e); }
}
