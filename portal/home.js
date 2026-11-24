// XEVARION II — ホーム（H2 バナー型）
// 上：パートナーの絵（完凸＝完凸バナー／完凸の前＝夜空に全身）・下：全部のアプリ
// ★ 絵は止まっている（動くのはロビーだけ）＝ホームにいるあいだ電池を使わない
import { t } from '../core/i18n.js';
import * as chara from '../core/chara.js';
import { GRAND_DEBUT } from '../core/gacha.js';
import { ico } from '../ui/icons.js';
import { esc, bindActs } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { topbarHTML, bindTopbar } from './shell.js';
import { APPS, appById } from './routes.js';
import { onSign, leftStr } from './derby-sign.js';
import * as daily from '../core/daily.js';
import { openLogbo } from './logbo.js';
import { openMissions } from './missions.js';

export async function mount(el, { go }) {
  el.classList.add('hm');
  el.innerHTML = `
    <div class="hm-art" data-act="talk"></div>
    <div class="hm-top">${topbarHTML()}</div>
    <div class="hm-bubble" aria-live="polite"></div>
    <div class="hm-feat"></div>
    <div class="hm-lobby"></div>
    <div class="hm-sheet x-scroll">
      <div class="hm-sh"><b>${t('home.apps')}</b></div>
      <div class="hm-grid">
        ${APPS.map((a) => `<button type="button" class="hm-app" data-act="app" data-id="${a.id}" data-name="${esc(a.name)}"><img class="x-appic" src="assets/apps/${a.id}-192.webp" alt="" decoding="async"><small>${esc(a.short || a.name)}</small></button>`).join('')}
        <button type="button" class="hm-app" data-act="sites"><span class="hm-fold"><img src="assets/apps/ngx-96.webp" alt=""><img src="assets/apps/ishida-96.webp" alt=""></span><small>${t('home.sites')}</small></button>
      </div>
      <button type="button" class="hm-news hm-ms" data-act="missions">${ico('mission', 'grad')}<span><b>${t('ms.title')}</b><small data-ms></small></span><em class="hm-badge" data-msn hidden></em>${ico('next')}</button>
      <button type="button" class="hm-news hm-nw" data-act="news">${ico('bell', 'grad')}<span><b>${t('news.title')}</b><small data-nw></small></span><em class="hm-badge" data-nwn hidden>${t('news.new')}</em>${ico('next')}</button>
    </div>`;

  const artEl = el.querySelector('.hm-art');
  const featEl = el.querySelector('.hm-feat');
  const lobbyEl = el.querySelector('.hm-lobby');
  const bubble = el.querySelector('.hm-bubble');
  let shown = '';

  function paint() {
    const p = chara.partner();
    const max = p && chara.isMax(p.id);
    const key = p ? p.id + (max ? ':max' : '') : 'none';
    if (key !== shown) {
      shown = key;
      if (!p) artEl.innerHTML = `<img class="ban" src="${GRAND_DEBUT.banner}" alt="" style="object-position:50% 50%">`;
      else if (max) artEl.innerHTML = `<img class="ban" src="${chara.art(p.id, 'banner-940')}" alt="${esc(p.name)}">`;
      else artEl.innerHTML = `<div class="p-stars"></div><img class="full" src="${chara.art(p.id, 'full-1024')}" alt="${esc(p.name)}">`;
    }
    featEl.innerHTML = p
      ? `<small>${max ? t('home.maxBanner') : t('home.partner')}</small><b>${esc(p.name)}</b><em>${p.en}</em><br><span class="x-chip x-el ${p.el}">${ico(p.el)}${chara.ELEMENTS[p.el].en}</span>`
      : `<b style="font-size:18px">${t('home.noPartner')}</b>`;
    lobbyEl.innerHTML = !p ? ''
      : max ? `<button type="button" class="x-btn small" data-act="lobby">${ico('door')}${t('home.lobby')}</button>`
        : `<button type="button" class="x-btn small locked" data-act="lobbyLock">${ico('lock')}${t('home.lobbyLock')}</button>`;
  }
  paint();

  // MagiDerby の札：発売中（金の札と輪）・締切間近（赤い札に残り時間）・結果（まだ確かめていない馬券の数）
  const derbyBtn = el.querySelector('.hm-app[data-id="derby"]');
  let derbySig = '';
  const paintDerby = (s) => {
    if (!derbyBtn || s.sig === derbySig) return;
    derbySig = s.sig;
    derbyBtn.classList.toggle('ds-sale', !!s.sale && !s.sale.soon);
    derbyBtn.classList.toggle('ds-soon', !!(s.sale && s.sale.soon));
    derbyBtn.querySelectorAll('.ds-tag, .ds-res').forEach((x) => x.remove());
    if (s.sale) derbyBtn.insertAdjacentHTML('beforeend', `<i class="ds-tag">${esc(s.sale.soon ? t('derby.left', { t: leftStr(s.sale.left) }) : t('derby.sale'))}</i>`);
    if (s.res) derbyBtn.insertAdjacentHTML('beforeend', `<i class="ds-res">${esc(t('derby.res', { n: s.res }))}</i>`);
  };

  // ミッション（今日・今週の達成と、受け取れる数）
  const msText = el.querySelector('[data-ms]');
  const msBadge = el.querySelector('[data-msn]');
  const paintMs = () => {
    const M = daily.missions();
    const d = M.daily.filter((m) => m.done).length, w = M.weekly.filter((m) => m.done).length;
    msText.textContent = t('ms.homeSub', { d, dn: M.daily.length, w, wn: M.weekly.length });
    msBadge.hidden = !M.ready;
    msBadge.textContent = M.ready;
  };
  paintMs();

  // お知らせ（いちばん新しいお知らせの題と NEW の印）。中身は portal/news.js（ホームが出てから読む）
  const nwText = el.querySelector('[data-nw]');
  const nwNew = el.querySelector('[data-nwn]');
  let offNews = null;
  let gone = false;
  import('./news.js').then((N) => {
    if (gone) return;
    const paintNews = () => {
      const list = N.items();
      nwText.textContent = N.latest('news', list)?.title || '';
      nwNew.hidden = !N.unread(list).length;
    };
    paintNews();
    offNews = N.onChange(paintNews);
    N.refresh();
  }).catch((e) => console.warn('news', e));

  // ログインボーナス：その日はじめてホームを開いたとき（画面が出てから少しして）
  const lbT = setTimeout(() => openLogbo({ auto: true }), 700);

  let hideT = 0;
  const offs = [
    bindTopbar(el.querySelector('.hm-top')),
    chara.onChange(paint),
    onSign(paintDerby),
    daily.onChange(paintMs),
    bindActs(el, {
      talk() {
        const p = chara.partner();
        if (!p) { go('gacha'); return; }
        bubble.textContent = chara.randomLine(p.id);
        bubble.classList.add('show');
        clearTimeout(hideT);
        hideT = setTimeout(() => bubble.classList.remove('show'), 3400);
        daily.note('talk');   // ミッション「パートナーと話す」
      },
      missions() { openMissions(); },
      app(b) {
        if (appById(b.dataset.id)?.path) go('app/' + b.dataset.id);
        else toast(t('soon', { name: b.dataset.name }));
      },
      sites() { go('apps'); },
      news() { import('./news.js').then((N) => N.openNews()); },
      lobby() { go('lobby'); },
      lobbyLock() { const p = chara.partner(); toast(t('chara.toMax', { n: chara.MAX_COPIES - chara.copies(p.id) })); },
    }),
  ];
  return () => { gone = true; offNews?.(); clearTimeout(hideT); clearTimeout(lbT); offs.forEach((f) => f()); };
}
