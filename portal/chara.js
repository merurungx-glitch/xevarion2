// XEVARION II — キャラ（一覧と詳細）
import { t } from '../core/i18n.js';
import * as chara from '../core/chara.js';
import { ico } from '../ui/icons.js';
import { esc, bindActs } from '../ui/dom.js';
import { toast } from '../ui/toast.js';

const pips = (n) => `<span class="x-pips">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const elChip = (c) => `<span class="x-chip x-el ${c.el}">${ico(c.el)}${chara.ELEMENTS[c.el].en}</span>`;

export async function mount(el, { params, go }) {
  const id = params[0];
  return id && chara.byId(id) ? detail(el, id, go) : list(el, go);
}

function list(el, go) {
  el.innerHTML = `<header class="x-head"><h1>${t('chara.title')}</h1></header><div class="p-body x-scroll"><div class="ch-list"></div></div>`;
  const box = el.querySelector('.ch-list');
  const paint = () => {
    const P = chara.partner();
    box.innerHTML = chara.CHARS.map((c) => {
      const own = chara.owned(c.id);
      const awk = chara.awk(c.id);
      const state = !own ? t('chara.notOwned') : chara.isMax(c.id) ? t('chara.max') : t('chara.awk', { n: awk });
      return `<button type="button" class="ch-card ${own ? '' : 'no'}" data-act="open" data-id="${c.id}">
        <div class="pic"><img src="${chara.art(c.id, 'full-512')}" alt="" decoding="async"></div>
        <div class="inf"><small>${c.en}</small><b>${esc(c.name)}</b><div>${elChip(c)}</div>
          <div class="row">${own ? pips(awk) : ''}<span class="x-chip">${state}</span>${P && P.id === c.id ? `<span class="ch-badge">${t('chara.partner')}</span>` : ''}</div></div>
      </button>`;
    }).join('');
  };
  paint();
  const offs = [chara.onChange(paint), bindActs(el, { open: (b) => go('chara/' + b.dataset.id) })];
  return () => offs.forEach((f) => f());
}

function detail(el, id, go) {
  const c = chara.byId(id);
  el.innerHTML = `
    <button type="button" class="ch-back" data-act="back" aria-label="${t('btn.back')}">${ico('back')}</button>
    <div class="p-body x-scroll"><div class="ch-det-art"></div><div class="ch-det"></div></div>`;
  const artEl = el.querySelector('.ch-det-art');
  const det = el.querySelector('.ch-det');
  const paint = () => {
    const own = chara.owned(id);
    const max = chara.isMax(id);
    const awk = chara.awk(id);
    const isPartner = chara.partner()?.id === id;
    artEl.innerHTML = `<img class="${own ? '' : 'no'}" src="${chara.art(id, 'full-1024')}" alt="${esc(c.name)}">`;
    const state = !own ? t('chara.notOwned') : max ? t('chara.max') : t('chara.toMax', { n: chara.MAX_COPIES - chara.copies(id) });
    det.innerHTML = `
      <div class="en">${c.en}　${esc(c.kana)}</div>
      <h2>${esc(c.name)}</h2>
      <div class="row">${elChip(c)}<span class="x-chip">${chara.ELEMENTS[c.el].ja}</span>${own ? pips(awk) : ''}<span class="x-chip">${state}</span></div>
      <div class="acts">
        ${!own ? `<button type="button" class="x-btn primary" data-act="gacha">${ico('gacha')}${t('tab.gacha')}</button>`
          : isPartner ? `<button type="button" class="x-btn secondary" disabled>${ico('heart')}${t('chara.partner')}</button>`
          : `<button type="button" class="x-btn primary" data-act="partner">${ico('heart')}${t('chara.setPartner')}</button>`}
        ${max ? `<button type="button" class="x-btn secondary" data-act="lobby">${ico('door')}${t('chara.lobby')}</button>` : ''}
      </div>
      <div class="ch-h">MAX BANNER</div>
      <div class="ch-ban ${max ? '' : 'lock'}"><img src="${chara.art(id, max ? 'banner-940' : 'banner-470')}" alt="" decoding="async">${max ? '' : `<div class="lk">${ico('lock')}${t('chara.bannerLock')}</div>`}</div>
      ${own ? `<div class="ch-h">TALK</div><ul class="ch-lines">${chara.lines(id).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}`;
  };
  paint();
  const offs = [
    chara.onChange(paint),
    bindActs(el, {
      back: () => go('chara'),
      gacha: () => go('gacha'),
      lobby: () => go('lobby/' + id),
      partner() { chara.setPartner(id); toast(t('chara.partnerSet', { name: c.name })); },
    }),
  ];
  return () => offs.forEach((f) => f());
}
