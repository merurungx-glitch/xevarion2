// XEVARION II — 毎日のもの：ログインボーナス（7日で1周）・ミッション（毎日3つ＋毎週3つ）・ショップの今日のチケット
// ★ 2026-11-24 第5回の相談で決定（docs/decisions.md・docs/consult-board-05.html）。数字を変えるときはこのファイルの表だけ直す
//
// ・日付は日本の時刻（JST）で数える。時計はサーバーの時刻（core/clock.js：端末の時計を進めても日付は進まない）
// ・記録はアカウントで同期する（キーは boot.js でこのファイルを読みこんで、同期の最初の読みこみより前に登録）
//     logbo  flags   … ログボを受け取った日 { 'YYYY-MM-DD': true }。何日目か＝それまでに受け取った日の数 % 7（休んでもつづきから）
//     mflag  flags   … 今日のミッションの印 { 'app:YYYY-MM-DD', 'talk:YYYY-MM-DD' }
//     mcount counter … 今週の数 { 'party:W<月曜の日付>', 'gacha:W<月曜の日付>' }（2台で同時に増やしても消えない）
//     mclaim flags   … 受け取った印 { 'd:<日付>:<id>' ・ 'd:<日付>:all' ・ 'w:<週>:all' }
//     shopd  flags   … 今日のチケットを買った日 { 'YYYY-MM-DD': true }
// ・受け取り・買うまえにクラウドの最新を読む（ほかの端末で受け取りずみなら二度もらわない）。書いたらすぐ送る
// ・「MagiLex で10問」は MagiLex の学習の記録（lex の days[今日]）をそのまま数える（アプリは直さない）
import * as store from './store.js';
import * as wallet from './wallet.js';
import * as sync from './sync.js';
import { serverNow } from './clock.js';
import { onPull } from './gacha.js';

store.define('logbo', { kind: 'flags' });
store.define('mflag', { kind: 'flags' });
store.define('mcount', { kind: 'counter' });
store.define('mclaim', { kind: 'flags' });
store.define('shopd', { kind: 'flags' });

// ── 表（第5回の相談の数字） ──
/** ログインボーナス：1〜7日目 */
export const LOGBO = [{ xeva: 300 }, { xeva: 300 }, { gem: 2 }, { xeva: 500 }, { xeva: 500 }, { gem: 3 }, { ticket: 1 }];
/** 今日のミッション（各 100 XEVA・3つとも達成で 💎1） */
export const DAILY = [
  { id: 'app', name: 'アプリで1回あそぶ', need: 1, items: { xeva: 100 } },
  { id: 'lex', name: 'MagiLex で10問とく', need: 10, items: { xeva: 100 } },
  { id: 'talk', name: 'パートナーと話す', need: 1, items: { xeva: 100 } },
];
export const DAILY_ALL = { gem: 1 };
/** 今週のミッション（月曜〜日曜・3つとも達成で 🎫1） */
export const WEEKLY = [
  { id: 'login', name: '5日ログインする', need: 5 },
  { id: 'party', name: 'パーティーゲームで3回あそぶ', need: 3 },
  { id: 'gacha', name: 'ガチャを10回ひく', need: 10 },
];
export const WEEKLY_ALL = { ticket: 1 };
/** ショップの今日のチケット（1日1枚まで・0:00 に入れかわる） */
export const DAILY_TICKET_PRICE = 800;

// ── 日付（JST） ──
const JST = 9 * 3600000;
export const now = () => serverNow();
export const dayKey = (t = now()) => new Date(t + JST).toISOString().slice(0, 10);
/** その週の月曜（JST）→ 'W2026-11-23' */
export function weekKey(t = now()) {
  const d = new Date(t + JST);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return 'W' + d.toISOString().slice(0, 10);
}
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const flags = (name) => store.get(name) || {};

// ── ログインボーナス ──
/** 今日のログボ：{ today, claimed, idx（0〜6＝1〜7日目）, items } */
export function logbo(t = now()) {
  const f = flags('logbo');
  const today = dayKey(t);
  const claimed = !!f[today];
  const n = Object.keys(f).filter((k) => f[k] && DAY_RE.test(k)).length - (claimed ? 1 : 0);   // 今日より前に受け取った日の数
  const idx = ((n % 7) + 7) % 7;
  return { today, claimed, idx, items: LOGBO[idx] };
}
/** 受け取る。受け取れたら { idx, items }・受け取りずみなら null */
export async function claimLogbo() {
  await sync.pullNow().catch(() => false);
  const s = logbo();
  if (s.claimed || !store.userId()) return null;
  store.flag('logbo', s.today);
  give(s.items);
  sync.pushNow().catch(() => {});
  return { idx: s.idx, items: s.items };
}

// ── ミッション ──
/** MagiLex で今日といた数（MagiLex の日付は端末の時計・日本ではふつう JST と同じ） */
function lexToday(day) {
  const v = store.get('lex');
  const days = v && typeof v === 'object' && v.days;
  return days ? Number(days[day]) || 0 : 0;
}
function weekDays(week) {
  const start = Date.parse(week.slice(1) + 'T00:00:00Z');
  return Array.from({ length: 7 }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
}
/** ミッションの今：{ day, week, daily:[{id,name,need,have,done,claimed,items}], dailyAll:{done,claimed,items}, weekly:[…], weeklyAll:{…}, ready } */
export function missions(t = now()) {
  const day = dayKey(t), week = weekKey(t);
  const mf = flags('mflag'), mc = store.get('mcount') || {}, cl = flags('mclaim'), lb = flags('logbo');
  const haveD = { app: mf['app:' + day] ? 1 : 0, lex: lexToday(day), talk: mf['talk:' + day] ? 1 : 0 };
  const haveW = { login: weekDays(week).filter((d) => lb[d]).length, party: Math.max(0, mc['party:' + week] || 0), gacha: Math.max(0, mc['gacha:' + week] || 0) };
  const daily = DAILY.map((m) => {
    const have = Math.min(m.need, haveD[m.id]);
    return { ...m, have, done: have >= m.need, claimed: !!cl[`d:${day}:${m.id}`], key: `d:${day}:${m.id}` };
  });
  const weekly = WEEKLY.map((m) => {
    const have = Math.min(m.need, haveW[m.id]);
    return { ...m, have, done: have >= m.need };
  });
  const dailyAll = { done: daily.every((m) => m.done), claimed: !!cl[`d:${day}:all`], items: DAILY_ALL, key: `d:${day}:all` };
  const weeklyAll = { done: weekly.every((m) => m.done), claimed: !!cl[`w:${week}:all`], items: WEEKLY_ALL, key: `w:${week}:all` };
  const ready = daily.filter((m) => m.done && !m.claimed).length + (dailyAll.done && !dailyAll.claimed ? 1 : 0) + (weeklyAll.done && !weeklyAll.claimed ? 1 : 0);
  return { day, week, daily, dailyAll, weekly, weeklyAll, ready };
}
/** 受け取る（key は missions() の key）。受け取れたら items・だめなら null */
export async function claimMission(key) {
  await sync.pullNow().catch(() => false);
  const M = missions();
  const all = [...M.daily, M.dailyAll, M.weeklyAll];
  const m = all.find((x) => x.key === key);
  if (!m || !m.done || m.claimed || !store.userId()) return null;
  store.flag('mclaim', key);
  give(m.items);
  sync.pushNow().catch(() => {});
  return m.items;
}
/** 受け取れるものを全部（今日の3つ・3つとも・今週の3つとも）。もらったものの合計を返す */
export async function claimAllMissions() {
  await sync.pullNow().catch(() => false);
  const M = missions();
  const sum = {};
  for (const m of [...M.daily, M.dailyAll, M.weeklyAll]) {
    if (!m.done || m.claimed) continue;
    store.flag('mclaim', m.key);
    give(m.items);
    for (const [k, n] of Object.entries(m.items)) sum[k] = (sum[k] || 0) + n;
  }
  if (Object.keys(sum).length) sync.pushNow().catch(() => {});
  return sum;
}
/** 進んだことを書く：'app'（アプリをひらいた）・'talk'（パートナーと話した）・'party'（パーティーゲームが1回終わった） */
export function note(kind) {
  if (!store.userId()) return;
  if (kind === 'app' || kind === 'talk') {
    const k = `${kind}:${dayKey()}`;
    if (!flags('mflag')[k]) store.flag('mflag', k);
  } else if (kind === 'party') {
    store.add('mcount', 'party:' + weekKey(), 1);
  }
}
onPull((n) => { if (store.userId() && n > 0) store.add('mcount', 'gacha:' + weekKey(), n); });

// ── ショップ：今日のチケット ──
export const dailyTicket = () => ({ bought: !!flags('shopd')[dayKey()], price: DAILY_TICKET_PRICE });
/** 買う：'ok'・'done'（今日はもう買った）・'short'（XEVA が足りない） */
export async function buyDailyTicket() {
  await sync.pullNow().catch(() => false);
  if (dailyTicket().bought) return 'done';
  if (!store.userId() || !wallet.spend('xeva', DAILY_TICKET_PRICE)) return 'short';
  store.flag('shopd', dayKey());
  wallet.add('ticket', 1);
  sync.pushNow().catch(() => {});
  return 'ok';
}

// ── 共通 ──
function give(items) { for (const [k, n] of Object.entries(items || {})) wallet.add(k, n); }
/** どれかが変わったら知らせる（ほかの端末から同期で届いたときも）。止める関数を返す */
export function onChange(fn) {
  const offs = ['logbo', 'mflag', 'mcount', 'mclaim', 'shopd', 'lex'].map((k) => store.on(k, () => fn()));
  return () => offs.forEach((f) => f());
}
