// XEVARION II — ホームとアプリの一覧の MagiDerby の札（2026-11-23 ご回答「札だけ入れる」・初代 home-mate.js の derbySale／derbyPayN を写したもの）
//
// ・発売中 … 発売中の GⅠ（レースの前の水曜 0:00〜発走の2分前。枠順の発表前も）がある → 金色の札と輪
//   締切間近 … 締切まで6時間を切った → 赤い札に残り時間（あと○時間○分）
// ・結果 n … 買った馬券のうち、結果が出たのに MagiDerby でまだ確かめていない枚数（MagiDerby で押して確かめると払い戻し）
// ・GⅠ の一覧（derby/index.json＝初代の置き場をそのまま）は、札を出す画面が見えているあいだ10分ごとに読む。
//   MagiDerby の控え（x2a.derby.c:index.json）も使う。馬券は II の記録 derby（core/appdata.js）
// ★ 見た目だけ（買えるかどうかの判定は MagiDerby がサーバーの時刻でする）。
//   発売の決まりは apps/derby/js/md-data.js（saleBack）・md-net.js（N.saleWins）と同じ。片方を変えたらもう一方も
import * as store from '../core/store.js';
import * as power from '../core/power.js';
import { serverNow } from '../core/rooms.js';

const IDX_URL = 'https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/derby/index.json';
const CACHE = 'x2a.derby.c:index.json';
const SOON = 6 * 3600000;      // 締切まで6時間を切ったら「締切間近」
const EVERY = 10 * 60000;      // 一覧を読みなおす間（10分）
const JST = 9 * 3600000;
const SHORT = {
  '優駿牝馬': 'オークス', '東京優駿': '日本ダービー', '天皇賞（春）': '天皇賞・春', '天皇賞（秋）': '天皇賞・秋',
  'フェブラリーステークス': 'フェブラリーS', 'スプリンターズステークス': 'スプリンターズS', 'マイルチャンピオンシップ': 'マイルCS',
  'ジャパンカップ': 'ジャパンC', 'チャンピオンズカップ': 'チャンピオンズC', '阪神ジュベナイルフィリーズ': '阪神JF',
  '朝日杯フューチュリティステークス': '朝日杯FS', 'ホープフルステークス': 'ホープフルS', 'NHKマイルカップ': 'NHKマイルC',
  'ヴィクトリアマイル': 'ヴィクトリアM',
};

let idx = null;
let lastFetch = 0;
let timer = 0;
let offs = [];
const subs = new Set();

function fromCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if (c && c.data && Array.isArray(c.data.races)) idx = c.data;
  } catch {}
}

async function refresh(force) {
  if (!force && Date.now() - lastFetch < EVERY - 5000) return;
  if (navigator.onLine === false || document.hidden) return;
  lastFetch = Date.now();
  try {
    const r = await fetch(IDX_URL + '?t=' + Math.floor(Date.now() / 300000), { cache: 'no-cache' });
    if (r.ok) {
      const j = await r.json();
      if (j && Array.isArray(j.races)) idx = j;
    }
  } catch {}
  emit();
}

/** 発売中の GⅠ（無ければ null）。index＝derby/index.json・t＝いまの時刻（ms） */
export function saleOf(index, t) {
  for (const r of (index && index.races) || []) {
    if (!r || !r.rid || (r.st !== 'draw' && r.st !== 'entry') || !r.date) continue;   // 枠順の発表前（entry）も馬名で買える
    const d = String(r.date).split('-').map(Number);
    const p = String(r.post || '15:40').split(':').map(Number);
    const day0 = Date.UTC(d[0], d[1] - 1, d[2]) - JST;
    const close = day0 + (p[0] * 60 + p[1]) * 60000 - 120000;                          // 締切＝発走の2分前
    const wd = new Date(Date.UTC(d[0], d[1] - 1, d[2])).getUTCDay();
    const back = ((wd - 3 + 7) % 7) || 7;                                               // レースの前の水曜 0:00 から
    if (t >= day0 - back * 86400000 && t < close) return { nm: r.nm, short: SHORT[r.nm] || r.nm, soon: close - t <= SOON, left: close - t };
  }
  return null;
}

let recStr;
let recTk = null;
/** 馬券（記録 derby の tk）。同じ記録なら読みなおさない */
function tickets() {
  let s = null;
  try { s = store.get('derby'); } catch { return null; }
  if (s !== recStr) {
    recStr = s;
    try { const o = typeof s === 'string' ? JSON.parse(s) : s; recTk = o && typeof o.tk === 'object' ? o.tk : null; } catch { recTk = null; }
  }
  return recTk;
}
/** 結果が出て、まだ確かめていない馬券の数。tk＝記録の馬券・index＝derby/index.json */
export function resultsOf(tk, index) {
  if (!tk || typeof tk !== 'object') return 0;
  const byRid = {};
  for (const r of (index && index.races) || []) if (r && r.rid) byRid[r.rid] = r;
  let n = 0;
  for (const k of Object.values(tk)) {
    if (!k) continue;
    if (k.st === 'ready') n++;
    else if (k.st === 'open' && byRid[k.rid] && byRid[k.rid].st === 'result') n++;
  }
  return n;
}

/** いまの札 { sale: { nm, short, soon, left } | null, res: 数, sig } */
export function sign() {
  let sale = null;
  let res = 0;
  try { sale = saleOf(idx, serverNow()); res = resultsOf(tickets(), idx); } catch (e) { console.warn('derby-sign', e); }
  const sig = (sale ? sale.nm + (sale.soon ? ':' + Math.ceil(sale.left / 60000) : '') : '') + '|' + res;
  return { sale, res, sig };
}

/** 残り時間 →「あと3時間20分」「あと45分」 */
export function leftStr(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? Math.floor(m / 60) + '時間' + (m % 60 ? (m % 60) + '分' : '') : m + '分';
}

function emit() {
  if (!subs.size) return;
  const s = sign();
  for (const fn of subs) { try { fn(s); } catch (e) { console.error(e); } }
}

function start() {
  fromCache();
  offs = [
    store.on('derby', emit),                                                   // MagiDerby で確かめた・同期で券が届いた
    power.onVisible((v) => { if (v) { fromCache(); emit(); refresh(false); } }),
  ];
  timer = setInterval(() => { emit(); refresh(false); }, 60000);              // 1分ごとに描きなおす（残り時間）・10分ごとに読む
  refresh(false);
}
function stop() {
  clearInterval(timer);
  offs.forEach((f) => f());
  offs = [];
}

/** 札が変わったら知らせる（すぐ1回呼ぶ）。止める関数を返す */
export function onSign(fn) {
  subs.add(fn);
  if (subs.size === 1) start();
  try { fn(sign()); } catch (e) { console.error(e); }
  return () => {
    subs.delete(fn);
    if (!subs.size) stop();
  };
}
