// XEVARION II — アプリとの橋（window.X2）
//
// アプリは iframe（src/apps/<フォルダ>/index.html）の中で動き、親の window.X2 だけを通して II の機能を使う。
// アプリの最初のスクリプトで：  window.X2 = parent.X2;  X2.attach(window);
// ★ ここに無いもの（store・wallet など）はアプリから直接さわらない（決まりを1か所に）
//
//   X2.attach(win)        余白（--x2-st/sr/sb/sl）・動作モード（html[data-power]）・省電力のコマ数と解像度
//   X2.ready()            アプリが描けた → II のロード画面を消す
//   X2.exit()             II にもどる
//   X2.onLeave(fn)        アプリを閉じる直前に呼ぶ（途中の保存など）
//   X2.me()               この端末の本人 { uid, id, name, face, faceSrc }
//   X2.faces()            メンバーのアイコンに選べるキャラ [{ id, name, src }]
//   X2.faceSrc(id)        キャラの顔の絵の URL
//   X2.isMax(id)          この端末の本人がそのキャラを完凸しているか（完凸の光）
//   X2.owned(id)          この端末の本人がそのキャラを持っているか（MagiQuiz の司会）
//   X2.asset(path)        src/assets/ の絵の URL（例 'ui/xeva-64.webp'）
//   X2.wallet() / onWallet(fn)   お財布の中身 { xeva, gem, ticket }
//   X2.earn({ xeva, gem, ticket }, why)  アプリのごほうびを本人のお財布へ（1回の上限 EARN_CAP）
//   X2.appData            アプリの同期する記録（MagiLex）：load()→JSON・save(json)・on(fn)。無いアプリは null（core/appdata.js）
//   X2.online()           通信できそうか
//   X2.party.PRIZES       共通の賞金（順位ごと）
//   X2.party.verify(id, pass) → { acc } | { error }   連携（合言葉は保存しない）
//   X2.party.recent() / forget(uid)                     この端末で連携したことのある人
//   X2.party.award([{ uid, amt, why, key }]) → [{ uid, amt, kind:'me'|'cloud'|'wait' }]
//   X2.power.mode() / profile() / onChange(fn)
//   X2.rooms              部屋（別々の端末で1つの部屋に入る）：create(opts)・join(code)・watchRoom/watchState/watchConnected(cb)・
//                         setReady・setOptions・startGame(state, slots)・pushState・finish（終わりの印・ホスト）・leave・forget（部屋が消えたとき：書かずに手を放す）・awardOnce・isHost・myUid・code・inRoom
//                         部屋の中を直接：get/set/update/txn(sub…)・watch(sub, cb)・now()（サーバーの時刻）
//                         （場所は rooms/<アプリの id>/<4桁>。人数の上限は APPS の roomMax（無ければ 6）。窓を閉じると自動で片づける＝core/rooms.js）
import * as party from '../core/party.js';
import * as rooms from '../core/rooms.js';
import * as power from '../core/power.js';
import * as viewport from '../core/viewport.js';
import * as chara from '../core/chara.js';
import * as wallet from '../core/wallet.js';
import * as appdata from '../core/appdata.js';

/** アプリのごほうび（X2.earn）の1回の上限（まちがいで大きな数を入れないように） */
const EARN_CAP = { xeva: 20000, gem: 50, ticket: 20 };

const abs = (p) => new URL(p, document.baseURI).href;
const faceSrc = (id) => (chara.byId(id) ? abs(chara.art(id, 'face-256')) : '');

/** 省電力のとき、アプリの requestAnimationFrame を上限のコマ数（30）に間引く。同じコマの呼び出しはまとめて通す */
function limitFrames(win) {
  const nat = win.requestAnimationFrame.bind(win);
  const can = win.cancelAnimationFrame.bind(win);
  const map = new Map();
  let n = 0;
  let lastT = -1e9;
  const allow = (t) => {
    if (t === lastT) return true;
    if (t - lastT >= 1000 / power.profile().fps - 2) { lastT = t; return true; }
    return false;
  };
  win.requestAnimationFrame = (cb) => {
    if (power.profile().fps >= 60) return nat(cb);
    const id = -(++n);
    const step = (t) => {
      if (!allow(t)) { map.set(id, nat(step)); return; }
      map.delete(id);
      cb(t);
    };
    map.set(id, nat(step));
    return id;
  };
  win.cancelAnimationFrame = (id) => {
    if (id < 0) { const r = map.get(id); if (r) can(r); map.delete(id); } else can(id);
  };
}

/** 省電力のとき、アプリから見える devicePixelRatio を 1 にする（canvas の画素が減る＝電池） */
function saverDpr(win) {
  try {
    const d = Object.getOwnPropertyDescriptor(win, 'devicePixelRatio');
    const v0 = win.devicePixelRatio;
    const real = d && d.get ? () => d.get.call(win) : () => v0;
    Object.defineProperty(win, 'devicePixelRatio', { configurable: true, enumerable: true, get: () => (power.currentMode() === 'saver' ? Math.min(1, real()) : real()) });
  } catch (e) { console.warn('bridge: devicePixelRatio', e); }
}

export function makeBridge(app, { exit, ready }) {
  const offs = [];
  const leaves = new Set();
  let room = null;   // 部屋（使うアプリだけ・はじめて X2.rooms にさわったときに作る）
  const roomApi = () => (room ||= rooms.open(app.id, { max: app.roomMax || 6 }));   // 部屋の人数の上限（routes.js の APPS の roomMax）
  const api = Object.freeze({
    v: 1,
    app: app.id,
    attach(win) {
      const de = win.document.documentElement;
      const put = (s) => {
        de.style.setProperty('--x2-st', s.t + 'px');
        de.style.setProperty('--x2-sr', s.r + 'px');
        de.style.setProperty('--x2-sb', s.b + 'px');
        de.style.setProperty('--x2-sl', s.l + 'px');
      };
      put(viewport.insets());
      offs.push(viewport.onChange(put));
      const mode = () => { de.dataset.power = power.currentMode(); };
      mode();
      offs.push(power.onChange(mode));
      limitFrames(win);
      saverDpr(win);
    },
    ready: () => ready(),
    exit: () => exit(),
    onLeave(fn) { if (typeof fn === 'function') leaves.add(fn); },
    me() {
      const m = party.me();
      return m && { ...m, faceSrc: faceSrc(m.face) };
    },
    faces: () => chara.CHARS.map((c) => ({ id: c.id, name: c.name, src: faceSrc(c.id) })),
    faceSrc,
    isMax: (id) => !!(chara.byId(id) && chara.isMax(id)),
    owned: (id) => !!(chara.byId(id) && chara.owned(id)),
    asset: (p) => abs('assets/' + String(p).replace(/^\/+/, '')),
    online: () => navigator.onLine !== false,
    /** お財布の中身 { xeva, gem, ticket } */
    wallet: () => ({ ...wallet.get() }),
    onWallet(fn) { const off = wallet.on(() => fn({ ...wallet.get() })); offs.push(off); return off; },
    /** アプリのごほうび（MagiLex の学習・ビンゴなど）：この端末の本人のお財布へ。items＝{ xeva, gem, ticket }。入れた数を返す */
    earn(items, why) {
      const out = {};
      for (const f of Object.keys(EARN_CAP)) {
        const n = Math.min(EARN_CAP[f], Math.floor(Number((items || {})[f]) || 0));
        if (n > 0) { wallet.add(f, n); out[f] = n; }
      }
      return out;
    },
    /** アプリが持つ、アカウントごとの同期する記録（MagiLex の学習の記録）。JSON の文字で load()／save(json)・on(fn)。持たないアプリは null */
    appData: appdata.keyOf(app.id) ? Object.freeze({
      load: () => appdata.load(app.id),
      save: (json) => appdata.save(app.id, json),
      on(fn) { const off = appdata.on(app.id, fn); offs.push(off); return off; },
    }) : null,
    party: Object.freeze({
      PRIZES: Object.freeze([...party.PRIZES]),
      MAX_AMT: party.MAX_AMT,
      verify: (id, pass) => party.verify(id, pass),
      recent: () => party.recent().map((r) => ({ ...r, faceSrc: faceSrc(r.face) })),
      forget: (uid) => party.forget(uid),
      award: (list) => party.award(list, { app: app.id }),
    }),
    power: Object.freeze({
      mode: () => power.currentMode(),
      profile: () => ({ ...power.profile() }),
      onChange(fn) { const off = power.onChange(fn); offs.push(off); return off; },
    }),
    get rooms() { return roomApi(); },
  });
  return {
    api,
    /** 閉じる直前：アプリの保存を呼んで、橋の登録を全部外す */
    leave() {
      for (const fn of leaves) { try { fn(); } catch (e) { console.error(e); } }
      leaves.clear();
      offs.splice(0).forEach((f) => { try { f(); } catch {} });
      if (room) { room.closeApp().catch(() => {}); room = null; }   // 部屋の監視を止める（ロビーなら出る）
    },
  };
}
