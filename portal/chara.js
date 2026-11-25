// XEVARION II — キャラ（図鑑：一覧と詳細）
// ★ 2026-11-25 ご指定（初代の図鑑の II 版）：
//   ・番号（No.1＝美月・core/chara.js の no）・名前で検索（漢字・かな・カナ・英字・番号）・絞り込み（持っている・まだ・完凸・属性）・並び替え（番号・名前・凸）
//   ・アイコンにする（上のバーの顔）・ロビー設定（ホームのメイン・サブ1・サブ2＝portal/lobbyset.js と同じ設定）
//   ・絵は LD なしの絵（banner）。LD（全身・背景なし）はホームのメインを動かすときとロビーだけ
//   ・完凸の子は一覧の絵が光る（.p-mx＝初代の図鑑と同じ金のオーラと光の筋）。凸で見た目は変えない（完凸バナーの「開放」はやめた）
// ・絞り込みと並びは、この端末に覚える（charaView）
import { t } from '../core/i18n.js';
import * as store from '../core/store.js';
import * as chara from '../core/chara.js';
import { ico } from '../ui/icons.js';
import { esc, bindActs } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { headHTML, decoHTML } from './shell.js';

store.define('charaView', { scope: 'device', def: null });

const pips = (n) => `<span class="x-pips">${Array.from({ length: chara.MAX_AWK }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const elChip = (c) => `<span class="x-chip x-el ${c.el}">${ico(c.el)}${chara.ELEMENTS[c.el].en}</span>`;
const stateOf = (id) => (!chara.owned(id) ? t('chara.notOwned') : chara.isMax(id) ? t('chara.max') : t('chara.awk', { n: chara.awk(id) }));
// 検索用：カタカナ→ひらがな・英字は小文字・空白なし
const fold = (s) => String(s || '').toLowerCase().replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60)).replace(/[\s.・]/g, '');
const EL_KEYS = Object.keys(chara.ELEMENTS);

export async function mount(el, { params, go }) {
  const id = params[0];
  return id && chara.byId(id) ? detail(el, id, go) : list(el, go);
}

/** ホームのどの枠にいるか（メイン・サブ1・サブ2・なし） */
function slotOf(id) {
  if (chara.partner()?.id === id) return 'main';
  const k = chara.subsChosen().indexOf(id);
  return k >= 0 ? 'sub' + (k + 1) : '';
}
const slotTag = (sl) => (sl === 'main' ? t('chara.main') : sl ? t('chara.sub', { n: sl.slice(3) }) : '');

function list(el, go) {
  const v0 = store.get('charaView') || {};
  const V = { f: ['all', 'own', 'not', 'max'].includes(v0.f) ? v0.f : 'all', el: EL_KEYS.includes(v0.el) ? v0.el : '', s: ['no', 'name', 'awk'].includes(v0.s) ? v0.s : 'no', q: '' };
  const save = () => store.set('charaView', { f: V.f, el: V.el, s: V.s });
  el.innerHTML = `${decoHTML()}${headHTML('chara')}<div class="p-body x-scroll">
      <div class="ch-tools">
        <label class="ch-q">${ico('search')}<input type="search" placeholder="${t('chara.search')}" autocomplete="off" enterkeyhint="search" aria-label="${t('chara.search')}"></label>
        <button type="button" class="ch-lsb" data-act="lobbySet">${ico('swap')}<span>${t('chara.lobbySet')}</span></button>
      </div>
      <div class="ch-fl x-scroll" role="toolbar"></div>
      <div class="ch-so"></div>
      <div class="ch-list"></div>
    </div>`;
  const box = el.querySelector('.ch-list');
  const flEl = el.querySelector('.ch-fl');
  const soEl = el.querySelector('.ch-so');
  const qIn = el.querySelector('.ch-q input');

  const pick = () => {
    const q = fold(V.q);
    let xs = chara.CHARS.filter((c) => {
      const own = chara.owned(c.id);
      if (V.f === 'own' && !own) return false;
      if (V.f === 'not' && own) return false;
      if (V.f === 'max' && !chara.isMax(c.id)) return false;
      if (V.el && c.el !== V.el) return false;
      return !q || [c.name, c.kana, c.en, 'no' + c.no, String(c.no)].some((x) => fold(x).includes(q));
    });
    if (V.s === 'name') xs = xs.slice().sort((a, b) => a.kana.localeCompare(b.kana, 'ja') || a.no - b.no);
    else if (V.s === 'awk') xs = xs.slice().sort((a, b) => chara.copies(b.id) - chara.copies(a.id) || a.no - b.no);
    return xs;
  };
  const paintTools = () => {
    flEl.innerHTML = ['all', 'own', 'not', 'max'].map((k) => `<button type="button" class="ch-chip${V.f === k ? ' on' : ''}" data-f="${k}">${t('chara.f.' + k)}</button>`).join('')
      + '<i class="ch-sep"></i>'
      + EL_KEYS.map((k) => `<button type="button" class="ch-chip el ${k}${V.el === k ? ' on' : ''}" data-el="${k}" aria-label="${chara.ELEMENTS[k].ja}" title="${chara.ELEMENTS[k].ja}">${ico(k)}</button>`).join('');
  };
  const paint = () => {
    const xs = pick();
    const icon = chara.iconChar()?.id;
    soEl.innerHTML = `<span class="ch-sl">${t('chara.s.label')}</span>${['no', 'name', 'awk'].map((k) => `<button type="button" class="ch-chip sm${V.s === k ? ' on' : ''}" data-s="${k}">${t('chara.s.' + k)}</button>`).join('')}
      <span class="ch-cnt">${t('chara.count', { n: xs.length, all: chara.CHARS.length })}</span>`;
    box.innerHTML = xs.length ? xs.map((c) => {
      const own = chara.owned(c.id);
      const sl = own ? slotOf(c.id) : '';
      return `<button type="button" class="ch-card ${c.el}${own ? '' : ' no'}" data-act="open" data-id="${c.id}">
        <div class="pic${chara.isMax(c.id) ? ' p-mx x-fx' : ''}"><img src="${chara.art(c.id, 'banner-470')}" alt="" decoding="async" loading="lazy">
          <i class="ch-no">${t('chara.no', { n: c.no })}</i><span class="ch-elm">${ico(c.el)}</span>
          ${own ? '' : `<span class="ch-lock">${ico('lock')}</span>`}
          <span class="ch-tags">${sl ? `<em>${slotTag(sl)}</em>` : ''}${own && icon === c.id ? `<em class="ic">${t('chara.iconOn')}</em>` : ''}</span></div>
        <div class="inf"><small>${c.en}</small><b>${esc(c.name)}</b>
          <div class="row">${own ? pips(chara.awk(c.id)) : ''}<span class="x-chip">${stateOf(c.id)}</span></div></div>
      </button>`;
    }).join('') : `<p class="ch-none">${t('chara.none')}</p>`;
  };
  paintTools();
  paint();
  const onTools = (e) => {
    const f = e.target.closest('[data-f]');
    const ek = e.target.closest('[data-el]');
    const sk = e.target.closest('[data-s]');
    if (f) V.f = f.dataset.f;
    else if (ek) V.el = V.el === ek.dataset.el ? '' : ek.dataset.el;   // もう一度押すと外れる
    else if (sk) V.s = sk.dataset.s;
    else return;
    save();
    paintTools();
    paint();
  };
  el.addEventListener('click', onTools);
  qIn.addEventListener('input', () => { V.q = qIn.value; paint(); });
  const offs = [chara.onChange(paint), bindActs(el, {
    open: (b) => go('chara/' + b.dataset.id),
    lobbySet: () => import('./lobbyset.js').then((m) => m.openLobbySet()),
  })];
  return () => { el.removeEventListener('click', onTools); offs.forEach((f) => f()); };
}

function detail(el, id, go) {
  const c = chara.byId(id);
  el.innerHTML = `
    <button type="button" class="ch-back" data-act="back" aria-label="${t('btn.back')}">${ico('back')}</button>
    <div class="p-body x-scroll"><div class="ch-det-art ${c.el}"></div><div class="ch-det"></div></div>`;
  const artEl = el.querySelector('.ch-det-art');
  const det = el.querySelector('.ch-det');
  const paint = () => {
    const own = chara.owned(id);
    const max = chara.isMax(id);
    const isIcon = chara.iconChar()?.id === id;
    const sl = own ? slotOf(id) : '';
    artEl.innerHTML = `<img class="${own ? '' : 'no'}" src="${chara.art(id, 'banner-940')}" alt="${esc(c.name)}">`;
    const state = !own ? t('chara.notOwned') : max ? t('chara.max') : t('chara.toMax', { n: chara.MAX_COPIES - chara.copies(id) });
    const slotBtn = (k, label) => `<button type="button" class="ch-slot${sl === k ? ' on' : ''}" data-act="slot" data-k="${k}" aria-pressed="${sl === k}">${label}</button>`;
    det.innerHTML = `
      <div class="en">${t('chara.no', { n: c.no })}　${c.en}　${esc(c.kana)}</div>
      <h2>${esc(c.name)}</h2>
      <div class="row">${elChip(c)}<span class="x-chip">${chara.ELEMENTS[c.el].ja}</span>${own ? pips(chara.awk(id)) : ''}<span class="x-chip">${state}</span></div>
      <div class="acts">
        ${!own ? `<button type="button" class="x-btn primary" data-act="gacha">${ico('gacha')}${t('tab.gacha')}</button>`
          : `<button type="button" class="x-btn secondary" data-act="lobby">${ico('door')}${t('chara.lobby')}</button>
             <button type="button" class="x-btn ${isIcon ? 'secondary' : 'primary'}" data-act="icon" ${isIcon ? 'disabled' : ''}>${ico('user')}${isIcon ? t('chara.iconNow') : t('chara.icon')}</button>`}
      </div>
      ${own ? `<div class="ch-h">LOBBY</div>
        <div class="ch-slots" role="group" aria-label="${t('chara.lobbySet')}">${slotBtn('main', t('chara.main'))}${slotBtn('sub1', t('chara.sub', { n: 1 }))}${slotBtn('sub2', t('chara.sub', { n: 2 }))}</div>
        <p class="ch-note">${t('chara.lsNote')}</p>
        <div class="ch-h">TALK</div><ul class="ch-lines">${chara.lines(id).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}`;
  };
  paint();
  const offs = [
    chara.onChange(paint),
    bindActs(el, {
      back: () => go('chara'),
      gacha: () => go('gacha'),
      lobby: () => go('lobby/' + id),
      icon() { chara.setIcon(id); toast(t('chara.iconSet', { name: c.name })); },
      slot(b) {
        const k = b.dataset.k;
        if (k === 'main') { chara.setPartner(id); toast(t('chara.mainSet', { name: c.name })); return; }
        const n = k === 'sub1' ? 1 : 2;
        if (chara.setSub(n - 1, id)) toast(t('chara.subSet', { name: c.name, n }));
        else toast(t('ls.cant'));
      },
    }),
  ];
  return () => offs.forEach((f) => f());
}
