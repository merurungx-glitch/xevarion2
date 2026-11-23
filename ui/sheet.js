// XEVARION II — 下から出る板（シート）と、確かめの質問
// ★ ブラウザの confirm() は出ない環境があるので使わない。かならず ask() を使う。
import { ico } from './icons.js';
import { esc } from './dom.js';

const stack = [];

/**
 * 板を開く。
 * @param {object} o  title・body（HTML）・actions（[{label, kind, act}]）・night（夜の色）
 * @returns {{el:HTMLElement, close:Function, closed:Promise}}
 */
export function openSheet({ title = '', body = '', actions = [], night = false, onAction, dismiss = true } = {}) {
  const bd = document.createElement('div');
  bd.className = 'x-backdrop';
  const el = document.createElement('div');
  el.className = 'x-sheet' + (night ? ' night' : '');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="x-sheet-h"><h2>${esc(title)}</h2>${dismiss ? `<button type="button" data-x="close" aria-label="とじる">${ico('close')}</button>` : ''}</div>
    <div class="x-sheet-b x-scroll">${body}</div>
    ${actions.length ? `<div class="x-sheet-f">${actions.map((a, i) => `<button type="button" class="x-btn ${a.kind || 'secondary'}" data-x="act" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}`;
  document.body.append(bd, el);

  let done;
  const closed = new Promise((r) => (done = r));
  let isOpen = true;
  const close = (value) => {
    if (!isOpen) return;
    isOpen = false;
    el.classList.remove('show');
    bd.classList.remove('show');
    const i = stack.indexOf(api);
    if (i >= 0) stack.splice(i, 1);
    setTimeout(() => { el.remove(); bd.remove(); }, 260);
    done(value);
  };
  const api = { el, close, closed };
  stack.push(api);

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    if (b.dataset.x === 'close') close(null);
    if (b.dataset.x === 'act') {
      const a = actions[+b.dataset.i];
      if (onAction) onAction(a, api);
      else close(a.value ?? a.label);
    }
  });
  if (dismiss) bd.addEventListener('click', () => close(null));

  requestAnimationFrame(() => requestAnimationFrame(() => { bd.classList.add('show'); el.classList.add('show'); }));
  return api;
}

/** はい／いいえ を聞く。true か false が返る */
export function ask({ title = '', text = '', ok = 'OK', cancel = 'やめる', danger = false, night = false } = {}) {
  const s = openSheet({
    title,
    night,
    body: `<p style="margin:2px 0 6px;font-size:14.5px;line-height:1.7">${text}</p>`,
    actions: [
      { label: cancel, kind: night ? 'night' : 'secondary', value: false },
      { label: ok, kind: danger ? 'primary danger' : 'primary', value: true },
    ],
  });
  return s.closed.then((v) => v === true);
}

/** いちばん上の板を閉じる（戻るボタン・Esc 用） */
export function closeTop() {
  const top = stack[stack.length - 1];
  if (top) { top.close(null); return true; }
  return false;
}

addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTop(); });
