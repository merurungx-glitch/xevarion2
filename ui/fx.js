// XEVARION II — 演出の共通部品
// ・動きは「動かす・透かす」だけ（ぼかしは使わない）
// ・省電力／「演出を短く」のときは short() が true → 各演出が短い版にする
// ・とちゅうで止める・とばすために runner() を使う
import * as power from '../core/power.js';

export const short = () => power.shortFx();

export const STOP = 'fx-stop';
export const SKIP = 'fx-skip';

/** 止める・とばすができる待ち時間。r.wait(ms) は止められたら STOP、とばされたら SKIP を投げる
 *  ★ skip()／stop() を呼んだ瞬間に、いま待っているものをすべて終わらせる（とばすのが遅れないように） */
export function runner() {
  const pend = new Set();
  const r = { alive: true, skipped: false };
  const hold = (setup) => new Promise((res, rej) => {
    if (!r.alive) return rej(STOP);
    if (r.skipped) return rej(SKIP);
    const p = { rej, cleanup: () => {} };
    p.cleanup = setup(() => { pend.delete(p); p.cleanup(); res(); });
    pend.add(p);
  });
  const flush = (why) => { for (const p of [...pend]) { pend.delete(p); p.cleanup(); p.rej(why); } };
  r.wait = (ms) => hold((done) => { const to = setTimeout(done, ms); return () => clearTimeout(to); });
  /** タップされるか、ms たったら進む */
  r.tapOr = (el, ms) => hold((done) => {
    const to = setTimeout(done, ms);
    el.addEventListener('click', done);
    return () => { clearTimeout(to); el.removeEventListener('click', done); };
  });
  r.stop = () => { r.alive = false; flush(STOP); };
  r.skip = () => { r.skipped = true; flush(SKIP); };
  return r;
}

/** Web Animations の短い書き方（終わったら進む Promise を返す・止められても例外にしない） */
export function anim(el, keyframes, { d = 400, delay = 0, ease = 'cubic-bezier(.2,.8,.2,1)', it = 1, dir = 'normal', fill = 'both' } = {}) {
  if (!el || !el.animate) return Promise.resolve();
  return el.animate(keyframes, { duration: d, delay, easing: ease, iterations: it, direction: dir, fill }).finished.catch(() => {});
}

let gid = 0;
const ORBIT = ['#22e4ff', '#3a6bff', '#9a3dff', '#e35bff'];
/** ロゴの「軌道」の輪（2つの楕円）。draw=true で描いていく演出用 */
export function orbitSVG({ w = 300, stroke = 1.6, draw = false, colors = ORBIT, cls = '' } = {}) {
  const id = 'x2o' + ++gid;
  const stops = colors.map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`).join('');
  const dash = draw ? 'pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"' : '';
  return `<svg class="fx-orbit ${cls}" viewBox="0 0 400 300" width="${w}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient></defs>
    <g class="r1"><ellipse cx="200" cy="150" rx="178" ry="64" transform="rotate(-18 200 150)" fill="none" stroke="url(#${id})" stroke-width="${stroke}" ${dash}/></g>
    <g class="r2"><ellipse cx="200" cy="150" rx="150" ry="80" transform="rotate(22 200 150)" fill="none" stroke="url(#${id})" stroke-width="${(stroke * 0.8).toFixed(2)}" opacity=".8" ${dash}/></g></svg>`;
}
/** 輪の色を変える（昇格のとき） */
export function recolorOrbit(svg, colors) {
  const stops = svg.querySelectorAll('stop');
  stops.forEach((s, i) => s.setAttribute('stop-color', colors[Math.min(i, colors.length - 1)]));
}

/** 光が走るロゴ（絵の形だけに光を通す）
 *  ★ CSS 変数の中の url() は「使う側の CSS ファイル」から見た場所になる（portal/assets/… になって 404 だった）→ 絶対の URL にして渡す */
export function shineHTML(src, alt = '', cls = '') {
  const abs = new URL(src, document.baseURI).href;
  return `<span class="fx-shine ${cls}" style="--m:url('${abs}')"><img src="${src}" alt="${alt}" decoding="async"><i></i></span>`;
}
export function sweep(root, delay = 0) {
  const i = root && root.querySelector('.fx-shine i');
  return anim(i, [{ backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0' }], { d: 800, delay, ease: 'ease-in-out', fill: 'none' });
}

/** 画面いっぱいのキャンバス（高精細でも2倍まで＝電池のため） */
export function canvasLayer(host) {
  const c = document.createElement('canvas');
  c.className = 'fx-canvas';
  host.appendChild(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = host.clientWidth;
  const h = host.clientHeight;
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  return { c, g, w, h };
}

/** 絵を前もって読む（最大 ms まで待つ） */
export function preloadAll(srcs, ms = 1500) {
  const one = (s) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = res; im.src = s; });
  return Promise.race([Promise.all(srcs.map(one)), new Promise((r) => setTimeout(r, ms))]);
}
