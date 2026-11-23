// XEVARION II — 同期（この端末 ⇄ クラウド）
// ・起動とサインインのときに全部読み、merge.js の決まりで合わせる
// ・書いたキーには「未送信」の印が付く → 2.5秒まとめてから送る（送るのは印の付いたキーだけ）
// ・画面を離れるときは、その場で送る（★ 古いデータを丸ごと送らない＝初代の上書き事故を防ぐ）
// ・送れなかったら印は残り、15秒後・通信が戻ったとき・次の起動でまた送る
import * as store from './store.js';
import * as power from './power.js';

let be = null;
let uid = null;
let running = false;
let timer = 0;
let offStore = null;
let offVis = null;
let lastPull = 0;
let status = 'idle';
const subs = new Set();

export const getStatus = () => status;
export function onStatus(fn) { subs.add(fn); return () => subs.delete(fn); }
function setStatus(s) {
  if (status === s) return;
  status = s;
  for (const fn of subs) fn(s);
}
const kinds = () => Object.fromEntries(store.syncNames().map((n) => [n, store.kindOf(n)]));

/** 同期を始める（最初の読み込みが終わるまで待てる） */
export async function start(backend, id) {
  stop();
  be = backend;
  uid = id;
  running = true;
  offStore = store.on('*', (n) => { if (running && n !== '*' && store.isSync(n)) later(2500); });
  offVis = power.onVisible((visible) => {
    if (!running) return;
    if (!visible) pushNow();
    else if (Date.now() - lastPull > 30000) pullAll();
  });
  addEventListener('online', onOnline);
  await pullAll();
  later(200);
}

export function stop() {
  running = false;
  clearTimeout(timer);
  offStore?.();
  offVis?.();
  offStore = offVis = null;
  removeEventListener('online', onOnline);
}

function onOnline() { if (running) { pullAll(); later(500); } }
function later(ms) { clearTimeout(timer); timer = setTimeout(pushNow, ms); }

async function pullAll() {
  const me = uid;
  try {
    setStatus('busy');
    const data = (await be.pull(me)) || {};
    if (!running || uid !== me || store.userId() !== me) return;
    lastPull = Date.now();
    for (const n of store.syncNames()) if (data[n]) store.merge(n, data[n]);
    setStatus('idle');
    if (store.dirty().length) later(400);
  } catch (e) {
    console.warn('sync: 読めませんでした', e);
    setStatus('offline');
  }
}

/** 未送信のキーを今すぐ送る */
export async function pushNow() {
  if (!running) return;
  const me = uid;
  const recs = {};
  for (const n of store.dirty()) { const r = store.rec(n); if (r) recs[n] = r; }
  if (!Object.keys(recs).length) return;
  try {
    setStatus('busy');
    const merged = await be.push(me, recs, kinds());
    if (store.userId() !== me) return;
    store.markClean(recs);
    for (const [n, r] of Object.entries(merged || {})) if (r) store.merge(n, r);
    setStatus('idle');
  } catch (e) {
    console.warn('sync: 送れませんでした', e);
    setStatus('offline');
    if (running) later(15000);
  }
}
