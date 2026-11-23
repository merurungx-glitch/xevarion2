// XEVARION II — タイトル（第3回で決定：B　1人ずつ主役）
// まん中に1人を大きく・7秒ごとに次の子へ（属性の色の光も変わる）・名前を左下に
// ★ 画面が見えていないときは次の子へ進めない。省電力・「演出を短く」では切りかえを短く・ロゴの光なし
import { t } from '../core/i18n.js';
import { VERSION } from '../core/config.js';
import * as account from '../core/account.js';
import * as router from '../core/router.js';
import { firstTenDone } from '../core/gacha.js';
import { CHARS, ELEMENTS, art, partner } from '../core/chara.js';
import { anim, orbitSVG, shineHTML, sweep, short } from '../ui/fx.js';
import { esc } from '../ui/dom.js';
import { showLoading } from '../ui/loading.js';
import { playIntro, introPlayed } from './intro.js';

const EL_COLOR = { flare: '#ff5b4a', tide: '#2e9bff', terra: '#25b871', nova: '#f0a91c', void: '#8e5cff' };
const CYCLE = 7000;

export async function mount(el, { go }) {
  el.classList.add('tt');
  el.innerHTML = `
    <div class="tt-stars x-fx"></div>
    <div class="tt-glow"></div>
    <div class="tt-orbit x-fx">${orbitSVG({ w: 780, stroke: 1.2 })}</div>
    <div class="tt-stage"></div>
    <div class="tt-fade"></div>
    <div class="tt-logo">${shineHTML('assets/brand/logo-640.webp', 'XEVARION II')}</div>
    <div class="tt-name"></div>
    <div class="tt-wait"><div class="x-spin"></div>${t('title.loading')}</div>
    <div class="tt-tap" hidden>${t('title.tap')}</div>
    <div class="tt-cred">${t('title.credit')}<br>VER ${VERSION}</div>`;

  const stageEl = el.querySelector('.tt-stage');
  const nameEl = el.querySelector('.tt-name');
  const logoEl = el.querySelector('.tt-logo');
  const wait = el.querySelector('.tt-wait');
  const tap = el.querySelector('.tt-tap');
  let alive = true;
  let busy = false;
  let idx = Math.floor(Math.random() * CHARS.length);
  let cycleT = 0;
  let sweepT = 0;

  function show(first) {
    const c = CHARS[idx % CHARS.length];
    el.style.setProperty('--c', EL_COLOR[c.el]);
    const img = new Image();
    img.src = art(c.id, 'full-1024');
    img.alt = c.name;
    img.decoding = 'async';
    const olds = [...stageEl.querySelectorAll('img')];
    stageEl.appendChild(img);
    if (first || short()) {
      olds.forEach((o) => o.remove());
      anim(img, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { d: short() ? 150 : 650 });
    } else {
      anim(img, [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { d: 700 });
      olds.forEach((o) => anim(o, [{ opacity: 1 }, { opacity: 0, transform: 'translateX(-24px)' }], { d: 600 }).then(() => o.remove()));
    }
    nameEl.innerHTML = `<small>${c.en}</small><b>${esc(c.name)}</b><span>${ELEMENTS[c.el].en}</span>`;
    anim(nameEl, [{ opacity: 0, transform: 'translateX(-12px)' }, { opacity: 1, transform: 'none' }], { d: short() ? 120 : 500 });
  }

  // アプリを開いたときだけ、先に起動ロゴ
  if (!introPlayed()) await playIntro();
  if (!alive) return;

  const p = account.current() && partner();
  if (p) idx = CHARS.findIndex((c) => c.id === p.id);
  show(true);
  anim(logoEl, [{ opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1 }], { d: short() ? 150 : 650 });
  cycleT = setInterval(() => { if (!document.hidden) { idx++; show(false); } }, CYCLE);
  const loopSweep = () => {
    if (!alive) return;
    if (!short() && !document.hidden) sweep(logoEl);
    sweepT = setTimeout(loopSweep, 5000);
  };
  sweepT = setTimeout(loopSweep, 1400);

  account.whenReady().then(() => {
    if (!alive) return;
    wait.hidden = true;
    tap.hidden = false;
    if (!window.__x2ready) window.__x2ready = performance.now(); // 起動の読み込み量をはかる区切り
  });

  el.addEventListener('click', async () => {
    if (!account.isReady() || busy) return;
    busy = true;
    if (!account.current()) { go('auth'); return; }
    const L = showLoading();
    await account.whenSynced();
    L.done();
    if (!alive) return;
    go(firstTenDone() ? router.takePending() || 'home' : 'first');
  });

  return () => {
    alive = false;
    clearInterval(cycleT);
    clearTimeout(sweepT);
  };
}
