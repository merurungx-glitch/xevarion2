// XEVARION II — 部屋（何人かが別々の端末から1つの部屋に入って遊ぶ）
//
// ・使うアプリ：MagiChainParty の「部屋番号で対戦」・MagiQuiz の「2台で対戦」（MagiQuiz は部屋の中を直接読み書きする口と now() を使う）
// ・場所：rooms/<ゲーム>/<4桁>（公開版＝Firebase xevarion2／手元＝local.js の x2dev.rtdb）。入れるのはサインインした人だけ
// ・部屋の形：{ meta:{ host, status:'lobby'|'playing'|'done', createdAt, …ゲームの設定 },
//               players:{ uid:{ name, face, slot, ready, online, joinedAt } }, state, rewarded }
// ・だれが何を書けるか（firebase/database.rules.json）：meta＝ホストだけ／players＝本人（とホスト）／state＝部屋にいる人／
//   rewarded＝ホストが1回だけ。部屋を作る＝空いている番号か1日より古い部屋だけ
// ・アプリの窓（portal/bridge.js）が open() で1つ作り、窓を閉じるときに closeApp() で片づける
import * as account from './account.js';
import * as chara from './chara.js';
import { backend } from './backend/index.js';
import { serverNow } from './clock.js';

const OLD = 24 * 60 * 60 * 1000;   // 1日より古い部屋の番号は使い直してよい

// サーバーの時刻は core/clock.js（見張りは1つだけ・どの部屋でも同じ）。ここからも出す（これまでどおり rooms.serverNow で使える）
export { serverNow };
const gen4 = () => String(Math.floor(1000 + Math.random() * 9000));
const errOf = (e) => (/permission/i.test(String((e && (e.message || e.code)) || '')) ? 'denied' : 'net');
/** 部屋の設定に入れてよいもの（数・文字・はい/いいえ だけ。host・status・createdAt は入れさせない） */
function pick(o) {
  const out = {};
  for (const [k, v] of Object.entries(o || {})) {
    if (['host', 'status', 'createdAt'].includes(k) || !/^[a-zA-Z0-9_]{1,24}$/.test(k)) continue;
    if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length <= 40)) out[k] = v;
  }
  return out;
}

export function open(game, { max = 6 } = {}) {
  let cur = null;            // { code, uid, path }
  const offs = new Set();    // 止める関数（監視）
  const rtP = backend().then((be) => be.rt);
  const me = () => {
    const u = account.current();
    if (!u) return null;
    const p = chara.partner();
    return { uid: u.uid, name: String(account.profile().name || u.id).slice(0, 12), face: p ? p.id : '' };
  };
  const watch = async (sub, cb) => {
    if (!cur) return;
    const rt = await rtP;
    offs.add(rt.on(sub ? `${cur.path}/${sub}` : cur.path, cb));
  };
  async function presence() {
    const rt = await rtP;
    const p = `${cur.path}/players/${cur.uid}/online`;
    try { await rt.set(p, true); rt.onDisconnectSet(p, false); } catch (e) { console.warn('rooms: presence', e); }
    // ホストが部屋を片づけたら、切断の書きこみを取り消す（消えた部屋に players/<自分>/online だけが残らないように）
    offs.add(rt.on(`${cur.path}/meta`, (m) => { if (m == null) rt.cancelDisconnect(p); }));
  }
  function detach() { for (const off of offs) { try { off(); } catch {} } offs.clear(); }

  /** 部屋を作る（ホスト＝0番の席）→ { code } か { error: code|denied|net|auth } */
  async function create(opts) {
    const m = me();
    if (!m) return { error: 'auth' };
    const rt = await rtP;
    try {
      for (let i = 0; i < 8; i++) {
        const code = gen4();
        const path = `rooms/${game}/${code}`;
        const room = {
          meta: { ...pick(opts), host: m.uid, status: 'lobby', createdAt: rt.now() },
          players: { [m.uid]: { name: m.name, face: m.face, slot: 0, ready: true, online: true, joinedAt: Date.now() } },
        };
        const r = await rt.txn(path, (old) => {
          if (old && old.meta && !(typeof old.meta.createdAt === 'number' && old.meta.createdAt < Date.now() - OLD)) return undefined;   // 使われている → 次の番号
          return room;
        });
        if (r.committed && r.value && r.value.meta && r.value.meta.host === m.uid) {
          cur = { code, uid: m.uid, path };
          await presence();
          return { code };
        }
      }
      return { error: 'code' };
    } catch (e) { return { error: errOf(e) }; }
  }

  /** 部屋に入る → { ok } か { error: nofound|started|full|denied|net|auth } */
  async function join(code) {
    const m = me();
    if (!m) return { error: 'auth' };
    code = String(code || '').trim();
    if (!/^\d{4}$/.test(code)) return { error: 'nofound' };
    const rt = await rtP;
    const path = `rooms/${game}/${code}`;
    try {
      const room = await rt.get(path);
      if (!room || !room.meta) return { error: 'nofound' };
      const players = room.players || {};
      if (players[m.uid]) {
        await rt.update(`${path}/players/${m.uid}`, { online: true, ready: true, name: m.name, face: m.face });   // 入り直し（ゲーム中でも）
      } else {
        if (room.meta.status !== 'lobby') return { error: 'started' };
        if (Object.keys(players).length >= max) return { error: 'full' };
        const used = new Set(Object.values(players).map((p) => p.slot));
        let slot = 0;
        while (used.has(slot)) slot++;
        await rt.set(`${path}/players/${m.uid}`, { name: m.name, face: m.face, slot, ready: false, online: true, joinedAt: Date.now() });
      }
      cur = { code, uid: m.uid, path };
      await presence();
      return { ok: true };
    } catch (e) { return { error: errOf(e) }; }
  }

  async function setReady(ready) { if (cur) await (await rtP).set(`${cur.path}/players/${cur.uid}/ready`, !!ready); }
  async function setOptions(opts) { if (cur) await (await rtP).update(`${cur.path}/meta`, pick(opts)); }
  /** ホストが始める：席の番号を 0〜n-1 に確定して、はじめの状態を書き、status を playing に */
  async function startGame(state, slotUpdates) {
    if (!cur) return { error: 'no' };
    const upd = { state, 'meta/status': 'playing' };
    for (const [uid, slot] of Object.entries(slotUpdates || {})) upd[`players/${uid}/slot`] = slot;
    try { await (await rtP).update(cur.path, upd); return { ok: true }; } catch (e) { return { error: errOf(e) }; }
  }
  async function pushState(state) { if (cur) await (await rtP).set(`${cur.path}/state`, state); }
  /** ホストが終わりの印を付ける（status＝done）。このあとホストが出ると部屋ごと消える（終わった部屋を残さない） */
  async function finish() {
    if (!cur) return;
    try { await (await rtP).update(`${cur.path}/meta`, { status: 'done' }); } catch (e) { console.warn('rooms: finish', e); }
  }
  /** 出る：ロビーか終わったあとのホストなら部屋ごと消す・ほかは自分だけ（ゲーム中のホストは自分だけ＝ほかの人は続けられる） */
  async function leave() {
    if (!cur) return;
    const { path, uid } = cur;
    const rt = await rtP;
    detach();
    rt.cancelDisconnect(`${path}/players/${uid}/online`);
    cur = null;
    try {
      const meta = await rt.get(`${path}/meta`);
      if (meta && meta.host === uid && meta.status !== 'playing') await rt.set(path, null);
      else await rt.set(`${path}/players/${uid}`, null);
    } catch (e) { console.warn('rooms: leave', e); }
  }
  /** 部屋がなくなった（ホストが片づけた）・自分が部屋から外れたとき：何も書かずに手を放す（監視と切断の印も外す） */
  async function forget() {
    if (!cur) { detach(); return; }
    const { path, uid } = cur;
    const rt = await rtP;
    detach();
    rt.cancelDisconnect(`${path}/players/${uid}/online`);
    cur = null;
  }
  /** ホストが賞金を配るのは1回だけ（rewarded の印）。配ってよければ true */
  async function awardOnce() {
    if (!cur) return false;
    try {
      const r = await (await rtP).txn(`${cur.path}/rewarded`, (v) => (v ? undefined : true));
      return !!r.committed && r.value === true;
    } catch (e) { return false; }
  }
  /** アプリの窓を閉じるとき：ロビー・終わったあとなら出る・ゲーム中なら「切断」にして監視を止める（入り直せる） */
  async function closeApp() {
    if (!cur) { detach(); return; }
    const { path, uid } = cur;
    const rt = await rtP;
    try {
      const meta = await rt.get(`${path}/meta`);
      if (!meta || meta.status !== 'playing') { await leave(); return; }
      detach();
      rt.cancelDisconnect(`${path}/players/${uid}/online`);
      cur = null;
      await rt.set(`${path}/players/${uid}/online`, false);
    } catch (e) { detach(); cur = null; }
  }

  // ── 部屋の中を直接読む・書く（アプリが自分の形で state を使うとき：MagiQuiz の「2台で対戦」）──
  //    sub＝部屋の中の場所（'' は部屋ぜんぶ・'state/acts/3/<uid>' など）。書けるのはルールのとおり：
  //    state の下＝部屋にいる人・meta＝ホストだけ・players/<自分>（形はルールで決まっている）。部屋に入っていなければ失敗
  const full = (sub) => (sub ? `${cur.path}/${sub}` : cur.path);
  const need = () => { if (!cur) throw Object.assign(new Error('rooms: not in a room'), { code: 'no-room' }); };
  async function rget(sub) { need(); return (await rtP).get(full(sub)); }
  async function rset(sub, v) { need(); return (await rtP).set(full(sub), v); }
  async function rupdate(sub, obj) { need(); return (await rtP).update(full(sub), obj); }
  async function rtxn(sub, fn) { need(); return (await rtP).txn(full(sub), fn); }

  return {
    MAX_PLAYERS: max,
    create, join, leave, forget, setReady, setOptions, startGame, pushState, finish, awardOnce, closeApp,
    get: rget, set: rset, update: rupdate, txn: rtxn,
    watch: (sub, cb) => watch(sub, cb),
    now: serverNow,
    watchRoom: (cb) => watch('', cb),
    watchState: (cb) => watch('state', cb),
    watchConnected: async (cb) => { const rt = await rtP; offs.add(rt.connected(cb)); },
    detach,
    isHost: (room) => !!(room && room.meta && cur && room.meta.host === cur.uid),
    myUid: () => (cur ? cur.uid : (account.current() || {}).uid || null),
    code: () => (cur ? cur.code : null),
    inRoom: () => !!cur,
  };
}
