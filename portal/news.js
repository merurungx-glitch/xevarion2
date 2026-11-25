// XEVARION II — お知らせ（お知らせ・更新内容を1か所に・タブで分ける。docs/decisions.md「初代の機能の引きつぎ」）
// ★ 2026-11-25 第7回 DN1：デベロッパーノートは開発チームからの手紙として別に作った（portal/devnotes.js・メニューから）。
//   tab:'dev' のものは、この板には出さず、デベロッパーノートの一覧の下の「開発メモ」に出す（NEW の数にも入れない）
// ・中身は2か所から：
//     ① portal/news-data.js … 版といっしょに配る（★ 版を出すたびに「更新内容」を1つ足す＝docs/release.md）
//     ② Firebase の news/<id> … 運営が書く（管理画面は段階2）。だれでも読める・運営だけ書ける（firebase/database.rules.json）
//        形：{ at: ミリ秒, tab: 'news'|'update'|'dev', title, body, act?, until?: ミリ秒（これを過ぎたら出さない） }。同じ id なら②が勝つ
// ・②は板やホームを開いたときに読み（10分に1回まで）、この端末に写しを持つ（電波がなくても前に読んだぶんは出る）
// ・読んだ印は core/news.js（newsSeen＝読んだ中でいちばん新しい時刻・アカウントで同期）
import { t } from '../core/i18n.js';
import * as store from '../core/store.js';
import * as seenMark from '../core/news.js';
import * as vet from '../core/veteran.js';
import * as router from '../core/router.js';
import { backend } from '../core/backend/index.js';
import { serverNow } from '../core/clock.js';
import { openSheet } from '../ui/sheet.js';
import { esc } from '../ui/dom.js';
import { NEWS } from './news-data.js';

store.define('newsRemote', { scope: 'device', sync: false }); // ②の写し（この端末だけ）

export const TABS = ['news', 'update', 'dev'];   // 中身の種類（'dev'＝開発メモ）
const BOARD = ['news', 'update'];               // この板のタブ
const ACTS = ['gacha', 'missions', 'logbo', 'veteran'];
const subs = new Set();
let remote = null;
let lastFetch = 0;
let fetching = null;

function norm(id, x) {
  if (!x || typeof x !== 'object' || typeof x.title !== 'string' || !Number.isFinite(Number(x.at))) return null;
  const tab = TABS.includes(x.tab) ? x.tab : 'news';
  return {
    id, tab, at: Number(x.at),
    title: x.title.slice(0, 80),
    body: typeof x.body === 'string' ? x.body.slice(0, 2000) : '',
    act: ACTS.includes(x.act) ? x.act : '',
    until: Number(x.until) || 0,
  };
}

/** 全部（新しい順・期限の過ぎたものはのぞく） */
export function items() {
  const map = new Map();
  for (const x of NEWS) { const n = norm(x.id, x); if (n) map.set(x.id, n); }
  const r = remote || store.get('newsRemote') || {};
  for (const [id, x] of Object.entries(r)) { const n = norm(id, x); if (n) map.set(id, n); }
  const now = serverNow();
  return [...map.values()].filter((x) => !x.until || x.until > now).sort((a, b) => b.at - a.at);
}
/** そのタブのいちばん新しいもの */
export const latest = (tab = 'news', list = items()) => list.find((x) => x.tab === tab) || null;
/** まだ読んでいないもの */
export function unread(list = items()) {
  const s = seenMark.seen();
  return list.filter((x) => x.tab !== 'dev' && x.at > s);
}
/** 中身か読んだ印が変わったら知らせる。止める関数を返す */
export function onChange(fn) {
  subs.add(fn);
  const off = seenMark.onSeen(fn);
  return () => { subs.delete(fn); off(); };
}
const emit = () => { for (const fn of [...subs]) fn(); };

/** ②（Firebase の news）を読みなおす。10分に1回まで（force で今すぐ） */
export function refresh({ force = false } = {}) {
  if (fetching) return fetching;
  if (!force && Date.now() - lastFetch < 600000) return Promise.resolve(false);
  fetching = (async () => {
    try {
      const be = await backend();
      const v = await Promise.race([be.rt.get('news'), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
      remote = v && typeof v === 'object' ? v : {};
      lastFetch = Date.now();
      store.set('newsRemote', remote);
      emit();
      return true;
    } catch (e) {
      console.warn('news: 読めませんでした', e);
      return false;
    } finally { fetching = null; }
  })();
  return fetching;
}

// ---- 板 ----
const dateOf = (at) => {
  const d = new Date(at + 9 * 3600000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
};
function actHTML(x) {
  if (!x.act) return '';
  if (x.act === 'veteran' && vet.mark()) return `<span class="nw-st">${t('news.act.vetDone')}</span>`;
  return `<button type="button" class="x-btn secondary small" data-nw-act="${x.act}">${t('news.act.' + x.act)}</button>`;
}
function listHTML(tab, list, seenAt) {
  const xs = list.filter((x) => x.tab === tab);
  if (!xs.length) return `<p class="nw-empty">${t('news.empty')}</p>`;
  return xs.map((x) => `<article class="nw-i${x.at > seenAt ? ' new' : ''}">
      <div class="nw-d">${dateOf(x.at)}${x.at > seenAt ? `<em>${t('news.new')}</em>` : ''}</div>
      <h3>${esc(x.title)}</h3>
      ${x.body ? `<p>${esc(x.body).replace(/\n/g, '<br>')}</p>` : ''}
      ${actHTML(x)}
    </article>`).join('');
}

let open = null;
/** お知らせの板を開く（tab：'news'・'update'） */
export function openNews(tab = 'news') {
  if (open) return open;
  const seenAt = seenMark.seen(); // 開いたときの印（NEW の印は、この板を閉じるまで残す）
  let cur = BOARD.includes(tab) ? tab : 'news';
  const html = () => {
    const list = items();
    const dot = (k) => list.some((x) => x.tab === k && x.at > seenAt);
    return `<div class="nw">
        <div class="x-seg nw-tabs">${BOARD.map((k) => `<button type="button" data-nw-tab="${k}" class="${k === cur ? 'on' : ''}">${t('news.tab.' + k)}${dot(k) ? '<i class="nw-dot"></i>' : ''}</button>`).join('')}</div>
        <div class="nw-list">${listHTML(cur, list, seenAt)}</div>
      </div>`;
  };
  open = openSheet({ title: t('news.title'), body: html() });
  const sheet = open;
  const b = sheet.el.querySelector('.x-sheet-b');
  const paint = () => { b.innerHTML = html(); };
  const readAll = () => { const l = unread(items()); if (l.length) seenMark.markSeen(l[0].at); }; // 板に出るぶん（開発メモはのぞく）
  readAll();
  sheet.el.addEventListener('click', (e) => {
    const tb = e.target.closest('[data-nw-tab]');
    if (tb) { cur = tb.dataset.nwTab; paint(); b.scrollTop = 0; return; }
    const ab = e.target.closest('[data-nw-act]');
    if (!ab) return;
    const a = ab.dataset.nwAct;
    if (a === 'gacha') { sheet.close(null); router.go('gacha'); }
    else if (a === 'missions') import('./missions.js').then((m) => m.openMissions());
    else if (a === 'logbo') import('./logbo.js').then((m) => m.openLogbo());
    else if (a === 'veteran') import('./veteran.js').then((m) => m.openVeteran());
  });
  // ②が届いたとき・特典を受け取ったときに描きなおす（読んだ印の変化では描きなおさない）
  const onItems = () => { paint(); readAll(); };
  subs.add(onItems);
  const offVet = vet.onMark(paint);
  refresh();
  sheet.closed.then(() => { subs.delete(onItems); offVet(); open = null; });
  return sheet;
}
