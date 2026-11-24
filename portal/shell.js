// XEVARION II — 画面の枠（下のタブ）と、上のバー（アイコン・名前・お金）
import { ico } from '../ui/icons.js';
import { fmt } from '../ui/dom.js';
import { t } from '../core/i18n.js';
import * as router from '../core/router.js';
import * as store from '../core/store.js';
import * as wallet from '../core/wallet.js';
import * as account from '../core/account.js';
import * as chara from '../core/chara.js';
import * as vet from '../core/veteran.js';

const TABS = ['home', 'apps', 'gacha', 'chara', 'menu'];
let bar = null;

export function buildShell(app) {
  app.innerHTML = `<main id="screen"></main>
    <nav class="x-tabbar" id="tabbar" hidden>${TABS.map((k) => `<button type="button" class="x-tab" data-tab="${k}">${ico(k)}<span>${t('tab.' + k)}</span></button>`).join('')}</nav>`;
  bar = app.querySelector('#tabbar');
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) router.go(b.dataset.tab);
  });
}

export function onRoute(name, R) {
  bar.hidden = !R.tab;
  for (const b of bar.children) b.classList.toggle('on', b.dataset.tab === R.tab);
}

export const topbarHTML = () => `
  <div class="p-topbar">
    <img class="p-ava" data-tb="ava" alt="" hidden>
    <div class="p-who"><b data-tb="name"></b><small><i class="p-vet" data-tb="vet" hidden>${t('vet.badge')}</i><span data-tb="id"></span></small></div>
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
