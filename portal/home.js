// XEVARION II — ホーム
// ★ 2026-11-24 第6回の刷新：E2 BLOOM POSTER（3人の絵を斜めに重ねたポスター＋大きな英字の名前）× D1（幅で組みかえる）
//   iPhone：上のバー → ポスター → パートナーの板（ロビーへ）→ イベント → あそぶ → ミッション・メール・お知らせ
//   iPad 縦：同じ並びを大きく／PC・iPad 横：左のメニュー（shell）・まん中に絵・右に今日のこと・アプリは横並び（CSS の grid）
// ★ 絵の決まり：パートナーは完凸なら完凸バナー・その前は全身（完凸バナーはごほうびなので見せない）。ほかの2人も全身
// ★ 絵は止まっている（動くのはロビーだけ）＝ホームにいるあいだ電池を使わない
import { t } from '../core/i18n.js';
import * as chara from '../core/chara.js';
import { GRAND_DEBUT } from '../core/gacha.js';
import { ico } from '../ui/icons.js';
import { esc, bindActs } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { topbarHTML, bindTopbar, decoHTML } from './shell.js';
import { APPS, appById } from './routes.js';
import { onSign, leftStr } from './derby-sign.js';
import * as daily from '../core/daily.js';
import { openLogbo } from './logbo.js';
import { openMissions } from './missions.js';
import * as mail from '../core/mail.js';

export async function mount(el, { go }) {
  el.classList.add('hm');
  el.innerHTML = `
    ${decoHTML()}
    <div class="hm-scroll x-scroll"><div class="hm-wrap">
      <header class="hm-top">${topbarHTML()}</header>
      <section class="hm-hero"><div class="hm-pans"></div><div class="hm-bubble" aria-live="polite"></div></section>
      <div class="hm-info"></div>
      <div class="hm-side">
        <button type="button" class="hm-ev" data-act="gacha"><img src="${GRAND_DEBUT.bannerSmall}" alt="" decoding="async"><div><em>${t('home.evOn')}</em><b>${esc(GRAND_DEBUT.name)}</b><small>${t('home.evSub')}</small></div>${ico('next')}</button>
        <div class="hm-rows">
          <button type="button" class="hm-row" data-act="missions">${ico('mission')}<span><b>${t('ms.title')}</b><small data-ms></small></span><em class="hm-badge" data-msn hidden></em>${ico('next')}</button>
          <button type="button" class="hm-row" data-act="mail">${ico('mail')}<span><b>${t('ml.title')}</b><small data-ml></small></span><em class="hm-badge" data-mln hidden></em>${ico('next')}</button>
          <button type="button" class="hm-row" data-act="news">${ico('bell')}<span><b>${t('news.title')}</b><small data-nw></small></span><em class="hm-badge" data-nwn hidden>${t('news.new')}</em>${ico('next')}</button>
        </div>
      </div>
      <section class="hm-apps">
        <h2>${t('home.play')}<small>PLAY</small><i></i></h2>
        <div class="hm-grid">
          ${APPS.map((a) => `<button type="button" class="hm-app" data-act="app" data-id="${a.id}" data-name="${esc(a.name)}"><img class="x-appic" src="assets/apps/${a.id}-192.webp" alt="" decoding="async"><b>${esc(a.short || a.name)}</b><small>${esc(t('app.' + a.id))}</small></button>`).join('')}
          <button type="button" class="hm-app" data-act="sites"><span class="hm-fold"><img src="assets/apps/ngx-96.webp" alt=""><img src="assets/apps/ishida-96.webp" alt=""></span><b>${t('home.sites')}</b><small>${t('home.sitesSub')}</small></button>
        </div>
      </section>
    </div></div>`;

  const pansEl = el.querySelector('.hm-pans');
  const infoEl = el.querySelector('.hm-info');
  const bubble = el.querySelector('.hm-bubble');
  let shown = '';

  /** ほかの子の小さな絵（全身の上の方）。まだ会っていない子は「まだ」の札（押すとガチャへ） */
  const side = (cls, c) => {
    const own = chara.owned(c.id);
    return `<button type="button" class="hm-pan ${cls} ${c.el}" data-act="other" data-id="${c.id}" aria-label="${esc(c.name)}">
      <img class="full" src="${chara.art(c.id, 'full-512')}" alt="" decoding="async"><span class="nm">${esc(c.name)}</span>${own ? '' : `<span class="nw">${t('home.notYet')}</span>`}</button>`;
  };

  function paint() {
    const p = chara.partner();
    const max = p && chara.isMax(p.id);
    const key = p ? p.id + (max ? ':max' : '') + ':' + chara.CHARS.map((c) => (chara.owned(c.id) ? 1 : 0)).join('') : 'none';
    if (key === shown) return;
    shown = key;
    const rest = chara.CHARS.filter((c) => !p || c.id !== p.id);
    const main = !p
      ? `<div class="hm-pan m" data-act="gacha"><img class="ban" src="${GRAND_DEBUT.bannerSmall}" alt="" style="object-position:50% 50%"></div>`
      : `<div class="hm-pan m ${p.el}" data-act="talk" role="button" aria-label="${esc(t('home.talk', { name: p.name }))}">${max
        ? `<img class="ban" src="${chara.art(p.id, 'banner-940')}" alt="${esc(p.name)}">`
        : `<img class="full" src="${chara.art(p.id, 'full-1024')}" alt="${esc(p.name)}">`}</div>`;
    pansEl.innerHTML = `${rest[0] ? side('s1', rest[0]) : ''}${rest[1] ? side('s2', rest[1]) : ''}${main}
      <div class="hm-head"><small>${p ? 'MY PARTNER' : 'WELCOME'}</small><b>${p ? p.en : 'XEVARION'}</b></div>`;
    infoEl.innerHTML = p
      ? `<div class="who"><small>${t('home.partnerJa')}</small><b>${esc(p.name)}</b><span class="x-chip x-el ${p.el}">${chara.ELEMENTS[p.el].en}</span></div>
        ${max ? `<button type="button" class="x-btn primary" data-act="lobby">${t('home.lobby')}${ico('next')}</button>`
          : `<button type="button" class="x-btn secondary" data-act="lobbyLock">${ico('lock')}${t('home.lobbyLock')}</button>`}`
      : `<div class="who"><b style="font-size:16px">${t('home.noPartner')}</b></div><button type="button" class="x-btn primary" data-act="gacha">${t('tab.gacha')}${ico('next')}</button>`;
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

  // メール（受け取れる数）。一覧は core/mail.js（5分に1回まで読む）
  const mlText = el.querySelector('[data-ml]');
  const mlBadge = el.querySelector('[data-mln]');
  const paintMail = () => {
    const n = mail.ready();
    mlText.textContent = n ? t('ml.homeN', { n }) : t('ml.homeNone');
    mlBadge.hidden = !n;
    mlBadge.textContent = n;
  };
  paintMail();
  mail.refresh();

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
    mail.onChange(paintMail),
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
      other(b) { go(chara.owned(b.dataset.id) ? 'chara/' + b.dataset.id : 'gacha'); },
      gacha() { go('gacha'); },
      missions() { openMissions(); },
      app(b) {
        if (appById(b.dataset.id)?.path) go('app/' + b.dataset.id);
        else toast(t('soon', { name: b.dataset.name }));
      },
      sites() { go('apps'); },
      news() { import('./news.js').then((N) => N.openNews()); },
      mail() { import('./mail.js').then((m) => m.openMail()); },
      lobby() { go('lobby'); },
      lobbyLock() { const p = chara.partner(); toast(t('chara.toMax', { n: chara.MAX_COPIES - chara.copies(p.id) })); },
    }),
  ];
  return () => { gone = true; offNews?.(); clearTimeout(hideT); clearTimeout(lbT); offs.forEach((f) => f()); };
}
