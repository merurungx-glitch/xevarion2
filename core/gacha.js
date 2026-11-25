// XEVARION II — ガチャのしくみ（GRAND DEBUT GACHA）
// ・みんなまとめて（案1）：キャラ 6%（3人で等分）・10連の10回目は 20%
//   ★ 2026-11-25 第7回：翠・愛菜を足して5人（G1）。1人あたりはいまと同じ 2%（10回目 6.7%）になるよう、キャラ 10%・10回目 1/3 に上げた
// ・それ以外は何も出ない（オービット＋1 だけ）。★ 2026-11-24 第5回の相談で決定（前は XEVA 200〜5,000＝平均 約610 が戻っていた）
// ・天井：1回ごとにオービット1つ → 100 で好きな子1人
// ・凸：5人目で完凸。完凸のあとに出たらジェム25 に変わる
// ・最初の10連は、キャラが1人かならず出る
// ★ 数字は第2回の相談の叩き台。変えるときは GRAND_DEBUT だけ直せばよい（提供割合の表も同じ数字から作る）
import * as store from './store.js';
import * as wallet from './wallet.js';
import { MAX_COPIES, copies, setPartner } from './chara.js';

store.define('orbit', { kind: 'counter' });
store.define('gflags', { kind: 'flags' }); // welcome（リリース記念を受け取った）・firstTen（最初の10連をひいた）
store.define('glog', { kind: 'lww', def: [] });

export const GRAND_DEBUT = {
  id: 'grand-debut',
  name: 'GRAND DEBUT GACHA',
  banner: 'assets/gacha/grand-debut-1200.webp',
  bannerSmall: 'assets/gacha/grand-debut-600.webp',
  price: 5, // ジェム／1回（ガチャチケットは1枚で1回）
  charRate: 0.1,
  tenthRate: 1 / 3,
  pity: 100,
  overGem: 25,
  welcomeTickets: 10,
  chars: ['yuzuha', 'minase', 'miduki', 'sui', 'mana'],
  newChars: ['sui', 'mana'],   // 新しく参戦した子（ガチャとホームのイベントの札に NEW）
  newUntil: '2026-12-25',      // この日まで NEW を出す（日本の日付）
};
const G = GRAND_DEBUT;

const rnd = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
};

/** n回ひくときの払い方：チケットを先に使い、足りないぶんをジェムで */
export function cost(n) {
  const tickets = Math.min(wallet.get().ticket, n);
  return { tickets, gems: (n - tickets) * G.price };
}
export const shortBy = (n) => Math.max(0, cost(n).gems - wallet.get().gem);
export const orbit = () => Math.max(0, store.get('orbit').pt || 0);
export const firstTenDone = () => !!store.get('gflags').firstTen;
export const log = () => store.get('glog') || [];

/** ひく。払えなければ null。結果の配列を返す（お財布・凸・天井・記録まで反映ずみ） */
export function pull(n) {
  const c = cost(n);
  if (wallet.get().gem < c.gems) return null;
  if (c.tickets && !wallet.spend('ticket', c.tickets)) return null;
  if (c.gems && !wallet.spend('gem', c.gems)) {
    wallet.add('ticket', c.tickets);
    return null;
  }
  const guarantee = n === 10 && !firstTenDone();
  const out = [];
  for (let i = 0; i < n; i++) {
    const tenth = n === 10 && i === 9;
    let hit = rnd() < (tenth ? G.tenthRate : G.charRate);
    if (guarantee && tenth && !out.some((r) => r.type === 'char')) hit = true;
    out.push(hit ? { type: 'char', id: G.chars[Math.floor(rnd() * G.chars.length)] } : { type: 'orbit' });
  }
  store.add('orbit', 'pt', n);
  if (guarantee) store.flag('gflags', 'firstTen');
  out.forEach(apply);
  addLog(out.filter((r) => r.type === 'char'));   // 記録はキャラだけ（キャラ以外は何も出ないので）
  pulled(n);
  return out;
}

/* ガチャをひいた回数を知らせる（ミッション「ガチャを10回ひく」など・core/mission.js が聞く） */
const pullSubs = new Set();
export function onPull(fn) { pullSubs.add(fn); return () => pullSubs.delete(fn); }
function pulled(n) { for (const fn of pullSubs) { try { fn(n); } catch (e) { console.error(e); } } }

function apply(r) {
  if (r.type === 'orbit') return;                                 // キャラ以外：オービット（上でまとめて足した）だけ
  if (r.type === 'xeva') { wallet.add('xeva', r.n); return; }     // （2026-11-24 より前の記録の形）
  const before = copies(r.id);
  if (before >= MAX_COPIES) { r.over = G.overGem; wallet.add('gem', G.overGem); return; }
  store.add('copies', r.id, 1);
  r.isNew = before === 0;
  r.awk = before; // 1人目＝0凸
  r.max = before + 1 >= MAX_COPIES;
  if (!store.get('partner')) setPartner(r.id); // はじめての子はそのままパートナーに
}

/** 天井：オービット100 で好きな子1人（完凸の子は選べない） */
export function exchangePity(id) {
  if (orbit() < G.pity || copies(id) >= MAX_COPIES) return null;
  store.add('orbit', 'pt', -G.pity);
  const r = { type: 'char', id, pity: true };
  apply(r);
  addLog([r]);
  return r;
}

function addLog(rs) {
  if (!rs.length) return;
  const at = Date.now();
  const items = rs.map((r) => ({ ...r, at })).reverse();
  store.set('glog', [...items, ...log()].slice(0, 50));
}

/** 新しく参戦した子か（ガチャとホームのイベントの札の NEW）。日付は日本の日付で newUntil まで */
const jstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export const isNew = (id) => G.newChars.includes(id) && jstDay() <= G.newUntil;
export const newChars = () => G.newChars.filter(isNew);

/** 提供割合（表と見出しは必ずここから作る） */
export function rates() {
  return {
    each: G.charRate / G.chars.length,
    eachTenth: G.tenthRate / G.chars.length,
    miss: 1 - G.charRate,          // キャラ以外（何も出ない・オービット＋1 だけ）
    missTenth: 1 - G.tenthRate,
  };
}

/** リリース記念（アカウントを作ったときに1回だけ） */
export function grantWelcome() {
  if (store.get('gflags').welcome) return false;
  wallet.add('ticket', G.welcomeTickets);
  store.flag('gflags', 'welcome');
  return true;
}
