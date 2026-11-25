// XEVARION II — デベロッパーノート（★ 2026-11-25 第7回 DN1）
// ・開発チームから版ごとに1通の手紙（なにを変えたか・なぜ・次に作っていること・こぼれ話）。お知らせ・更新内容とは別のもの
// ・「更新する」のあと、ホームに来たときに、まだ読んでいない新しい手紙が1回ひらく（ログボのあと＝portal/home.js）
// ・メニューの「デベロッパーノート」に表紙つきの一覧。下に「開発メモ」（お知らせの tab:'dev'＝前からのメモと、管理画面で書くもの）
// ・はじめての人（最初の10連）には、それまでの手紙を自動でひらかない（portal/first.js が markAllSeen）。メニューからは読める
// ・中身は portal/devnotes-data.js・読んだ印は core/devnotes.js（dnSeen・アカウントで同期）・見た目は portal/devnotes.css（開いたときに読む）
import { t } from '../core/i18n.js';
import * as chara from '../core/chara.js';
import * as dn from '../core/devnotes.js';
import { ico } from '../ui/icons.js';
import { esc, loadCSS } from '../ui/dom.js';
import { openSheet } from '../ui/sheet.js';
import { NOTES } from './devnotes-data.js';

const CSS = 'portal/devnotes.css';
const dateOf = (at) => {
  const d = new Date(at + 9 * 3600000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
};
const noOf = (n) => '#' + String(n.no).padStart(2, '0');
const txt = (s) => esc(s).replace(/\n/g, '<br>');
const paras = (a) => (Array.isArray(a) ? a : a ? [a] : []).map((s) => `<p>${txt(s)}</p>`).join('');

/** まだ読んでいない手紙 */
export const unread = () => NOTES.filter((n) => !dn.isSeen(n.id));
export const onChange = (fn) => dn.onSeen(fn);
/** いまある手紙を全部読んだことにする（はじめての人：最初の10連のとき） */
export function markAllSeen() { for (const n of NOTES) dn.markSeen(n.id); }

/** 表紙（2人の絵を写真のように左右にかたむけて重ね、まん中に DEVELOPER NOTE #01） */
function coverHTML(n, cls = '') {
  const [a, b] = n.cover || [];
  const img = (id, k) => (id && chara.byId(id) ? `<img class="${k}" src="${chara.art(id, 'banner-470')}" alt="" decoding="async">` : '');   // LD なしの絵（写真のように）
  return `<div class="dn-cv ${cls}" aria-hidden="true"><i class="dn-cv-band"></i>${img(a, 'a')}${img(b, 'b')}
    <div class="dn-cv-t"><small>DEVELOPER NOTE</small><b>${noOf(n)}</b></div></div>`;
}

function letterHTML(n) {
  return `${coverHTML(n)}
    <div class="dn-bd">
      <div class="dn-meta">${dateOf(n.at)}${n.ver ? `<span>${esc(t('dn.ver', { v: n.ver }))}</span>` : ''}</div>
      <h2 class="dn-t">${esc(n.title)}</h2>
      ${paras(n.lead)}
      ${(n.parts || []).map((p) => `<h3>${esc(p.h)}</h3>${paras(p.p)}${p.why ? `<p class="dn-why"><i>${t('dn.why')}</i>${txt(p.why)}</p>` : ''}`).join('')}
      <div class="dn-sign">${esc(n.sign || t('dn.sign'))}<small>${t('dn.from')}</small></div>
    </div>`;
}

let letter = null;
/** 手紙をひらく（id が無ければいちばん新しいもの）。{ close, closed } を返す（閉じると closed が終わる） */
export async function openNote(id) {
  const n = NOTES.find((x) => x.id === id) || NOTES[0];
  if (!n) return null;
  await loadCSS(CSS);
  letter?.close();
  dn.markSeen(n.id);
  const ov = document.createElement('div');
  ov.className = 'dn-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', `${t('dn.title')} ${noOf(n)}`);
  ov.innerHTML = `<article class="dn-card">
      <button type="button" class="dn-x" data-dn-x aria-label="${t('btn.close')}">${ico('close')}</button>
      <div class="dn-sc x-scroll">${letterHTML(n)}
        <div class="dn-f"><button type="button" class="x-btn primary block" data-dn-x>${t('btn.close')}</button></div>
      </div>
    </article>`;
  document.body.appendChild(ov);
  let done;
  const closed = new Promise((r) => (done = r));
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }; // 下にある板（一覧）は閉じない
  function close() {
    if (ov.dataset.closing) return;
    ov.dataset.closing = '1';
    ov.classList.remove('show');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => ov.remove(), 280);
    if (letter === api) letter = null;
    done();
  }
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-dn-x]')) close(); });
  addEventListener('keydown', onKey, true);
  const api = { close, closed };
  letter = api;
  requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('show')));
  return api;
}

/** ホームから：まだ読んでいない、いちばん新しい手紙を1回ひらく（ひらいたら { close, closed }・なければ null） */
let autoDone = false;
export async function autoOpen() {
  const n = NOTES[0];
  if (autoDone || !n || dn.isSeen(n.id)) return null;
  autoDone = true;
  return openNote(n.id);
}

let list = null;
/** 一覧（表紙つきの手紙・その下に開発メモ） */
export async function openList() {
  if (list) return list;
  await loadCSS(CSS);
  let memos = [];
  const html = () => `<div class="dn-list">
      ${NOTES.length ? NOTES.map((n) => `<button type="button" class="dn-it${dn.isSeen(n.id) ? '' : ' new'}" data-dn-open="${n.id}">
          ${coverHTML(n, 'sm')}
          <div class="dn-it-t"><small>${dateOf(n.at)}${dn.isSeen(n.id) ? '' : `<em>${t('news.new')}</em>`}</small><b>${esc(n.title)}</b>${n.sum ? `<span>${esc(n.sum)}</span>` : ''}</div>
        </button>`).join('') : `<p class="dn-empty">${t('news.empty')}</p>`}
      ${memos.length ? `<div class="dn-mh">${t('dn.memo')}<small>${t('dn.memoNote')}</small></div>
        ${memos.map((x) => `<article class="dn-memo"><div class="dn-memo-d">${dateOf(x.at)}</div><h3>${esc(x.title)}</h3>${x.body ? `<p>${txt(x.body)}</p>` : ''}</article>`).join('')}` : ''}
    </div>`;
  list = openSheet({ title: t('dn.title'), body: html() });
  const sheet = list;
  const b = sheet.el.querySelector('.x-sheet-b');
  const paint = () => { const y = b.scrollTop; b.innerHTML = html(); b.scrollTop = y; };
  sheet.el.addEventListener('click', (e) => {
    const it = e.target.closest('[data-dn-open]');
    if (it) openNote(it.dataset.dnOpen);
  });
  const offSeen = dn.onSeen(paint);
  // 開発メモ＝お知らせの tab:'dev'（版といっしょに配るぶん＋運営が Firebase に書くぶん）
  let offNews = null;
  import('./news.js').then((N) => {
    if (list !== sheet) return;
    const take = () => { memos = N.items().filter((x) => x.tab === 'dev'); paint(); };
    take();
    offNews = N.onChange(take);
    N.refresh();
  }).catch((e) => console.warn('news', e));
  sheet.closed.then(() => { offSeen(); offNews?.(); list = null; });
  return sheet;
}
