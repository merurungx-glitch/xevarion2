// XEVARION II — 画面の枠（下のタブ／左のメニュー）と、上のバー（アイコン・名前・お金）
// ★ 2026-11-24 第6回の刷新（D1 幅で組みかえる）：iPhone・iPad 縦＝下のタブ／PC・iPad 横＝左に縦のメニュー（ロゴ・タブ・プロフィール）
//   どちらも同じ <nav>。形は ui/components.css の幅の決まり（1024px 以上の横向き・または 1200px 以上）で変わる
import { ico } from '../ui/icons.js';
import { fmt, esc } from '../ui/dom.js';
import { t } from '../core/i18n.js';
import * as router from '../core/router.js';
import * as store from '../core/store.js';
import * as wallet from '../core/wallet.js';
import * as account from '../core/account.js';
import * as chara from '../core/chara.js';
import * as vet from '../core/veteran.js';

// ★ 2026-11-25 第7回：下のタブは「キャラ・アプリ・ホーム・ガチャ・メニュー」（同じ大きさ）。
//   PC・iPad 横の左のメニューはホームが上（ホーム・キャラ・アプリ・ガチャ・メニュー）＝ components.css の order で並べかえる
const TABS = ['chara', 'apps', 'home', 'gacha', 'menu'];
const EN = { home: 'HOME', apps: 'APPS', gacha: 'GACHA', chara: 'CHARA', menu: 'MENU' };
let bar = null;

export function buildShell(app) {
  app.innerHTML = `<main id="screen"></main>
    <nav class="x-tabbar" id="tabbar" hidden>
      <div class="x-side-logo"><img class="mk" src="assets/brand/mark-256.webp" alt=""><img class="wm" src="assets/brand/wordmark-navy-560.webp" alt="XEVARION II"></div>
      ${TABS.map((k) => `<button type="button" class="x-tab" data-tab="${k}">${ico(k)}<span>${t('tab.' + k)}<small>${EN[k]}</small></span></button>`).join('')}
      <button type="button" class="x-side-me" data-tab="menu"><img alt="" data-sm="ava" hidden><div><b data-sm="name"></b><small><i class="p-vet" data-sm="vet" hidden>${t('vet.badge')}</i><span data-sm="id"></span></small></div></button>
    </nav>`;
  bar = app.querySelector('#tabbar');
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) router.go(b.dataset.tab);
  });
  // 左のメニューのプロフィール（PC・iPad 横だけ見える）
  const q = (k) => bar.querySelector(`[data-sm="${k}"]`);
  const paintMe = () => {
    const u = account.current();
    const p = chara.partner();
    q('name').textContent = u ? account.profile().name : '';
    q('id').textContent = u ? 'ID ' + u.id : '';
    q('vet').hidden = !vet.mark();
    const ava = q('ava');
    if (p) { ava.src = chara.art(p.id, 'face-96'); ava.hidden = false; } else ava.hidden = true;
  };
  paintMe();
  chara.onChange(paintMe);
  store.on('profile', paintMe);
  account.onChange(paintMe);
  vet.onMark(paintMe);
}

export function onRoute(name, R) {
  bar.hidden = !R.tab;
  for (const b of bar.querySelectorAll('.x-tab')) b.classList.toggle('on', b.dataset.tab === R.tab);
}

/** 明るい画面のうしろの飾り（ななめの帯・花びら・きらきら・止まっている）。位置は % なので、どの幅でも同じ散らばり方 */
export function decoHTML() {
  const pts = [[8, 15, 20], [86, 11, -30], [91, 53, 60], [5, 57, 10], [53, 8, 80], [72, 79, -20], [24, 88, 40]];
  const sps = [[6, 13], [88, 19], [94, 47], [41, 4], [17, 71]];
  return `<div class="p-deco" aria-hidden="true"><i class="band"></i>${pts.map(([x, y, r]) => `<i class="pt" style="left:${x}%;top:${y}%;transform:rotate(${r}deg)"></i>`).join('')}${sps.map(([x, y]) => `<i class="sp" style="left:${x}%;top:${y}%"></i>`).join('')}</div>`;
}

/** 各画面の上の見出し：日本語を大きく・英字は小さな飾り（第6回の「日本語が先」）。right＝右に置くもの（お金の札など） */
export const headHTML = (tab, right = '') =>
  `<header class="x-head"><h1>${esc(t('tab.' + tab))}<small>${EN[tab] || ''}</small></h1>${right}</header>`;

export const topbarHTML = () => `
  <div class="p-topbar">
    <div class="p-me">
      <img class="p-ava" data-tb="ava" alt="" hidden>
      <div class="p-who"><b data-tb="name"></b><small><i class="p-vet" data-tb="vet" hidden>${t('vet.badge')}</i><span data-tb="id"></span></small></div>
    </div>
    <span class="p-gap"></span>
    <button type="button" class="x-pill" data-wallet data-earn="xeva" aria-label="${t('cur.xeva')}"><i class="x-cur xeva"></i><span data-tb="xeva" data-num>0</span></button>
    <button type="button" class="x-pill" data-wallet data-earn="gem" aria-label="${t('cur.gem')}"><i class="x-cur gem"></i><span data-tb="gem" data-num>0</span></button>
  </div>`;

/** 上のバーの数字を最新に保つ。片づけの関数を返す */
export function bindTopbar(root) {
  const q = (k) => root.querySelector(`[data-tb="${k}"]`);
  const paint = () => {
    const w = wallet.get();
    const p = chara.partner();
    const u = account.current();
    // 入手の演出で数え上げているあいだ（data-hold）は描きなおさない
    for (const k of ['xeva', 'gem']) if (!q(k).dataset.hold) q(k).textContent = fmt(w[k]);
    q('name').textContent = account.profile().name;
    q('id').textContent = u ? 'ID ' + u.id : '';
    q('vet').hidden = !vet.mark(); // はじまり特典の「初代」の印
    const ava = q('ava');
    if (p) { ava.src = chara.art(p.id, 'face-96'); ava.hidden = false; } else ava.hidden = true;
  };
  paint();
  const offs = [wallet.on(paint), chara.onChange(paint), store.on('profile', paint), account.onChange(paint), vet.onMark(paint)];
  const open = () => import('./wallet-sheet.js').then((m) => m.openWallet());
  root.querySelectorAll('[data-wallet]').forEach((b) => b.addEventListener('click', open));
  return () => offs.forEach((f) => f());
}
