// XEVARION II — 画面づくりの小道具

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** 人が入れた文字（表示名など）を画面に出すときは必ず通す */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** 1,234 のように区切る */
export const fmt = (n) => Number(n || 0).toLocaleString('ja-JP');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** root の中の [data-act] を押したときに acts[名前](要素, 押した場所) を呼ぶ（1か所でまとめて受ける） */
export function bindActs(root, acts) {
  const fn = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const f = acts[el.dataset.act];
    if (f) f(el, e);
  };
  root.addEventListener('click', fn);
  return () => root.removeEventListener('click', fn);
}

const cssDone = new Map();
/** 画面ごとの CSS を、はじめて使うときにだけ読む */
export function loadCSS(href) {
  if (cssDone.has(href)) return cssDone.get(href);
  const p = new Promise((res) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = () => res();
    l.onerror = () => res();
    document.head.appendChild(l);
  });
  cssDone.set(href, p);
  return p;
}

/** 絵を前もって読む（表示する直前のちらつきを防ぐ） */
export function preload(src) {
  return new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => res(im);
    im.src = src;
  });
}
