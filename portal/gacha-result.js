// XEVARION II — ガチャの演出（第3回で決定）
// ・A オービット・サモン：軌道の輪がだんだん速く回る → 光の粒が中心へ → はじけて結果へ（約2.3秒）
// ・レア度の色：最初はいつも青。キャラがいると途中で金、2人以上か完凸なら虹に変わる（昇格）
// ・キャラの登場：出るたびに毎回（属性の色の光＋キャラの絵のカード＋名前＋NEW／凸／完凸の印・タップで次へ）
//   ★ 2026-11-25 ご指定：絵は LD なしの絵（banner-940）を白いふちのカードで（LD はホームで動かすときだけ）
// ・「スキップ」で結果まで。省電力・「演出を短く」では演出も登場もとばして結果へ（粒は出さない）
import { t } from '../core/i18n.js';
import * as power from '../core/power.js';
import { byId, art, ELEMENTS } from '../core/chara.js';
import { fmt, esc } from '../ui/dom.js';
import { anim, orbitSVG, recolorOrbit, runner, canvasLayer, preloadAll, short, SKIP, STOP } from '../ui/fx.js';

const EL = { flare: ['#ff5b4a', '#ffc3a0'], tide: ['#2e9bff', '#b6e8ff'], terra: ['#25b871', '#d4f7b0'], nova: ['#f0a91c', '#ffeaa8'], void: ['#8e5cff', '#dccbff'] };
const LV = {
  1: { ring: ['#22e4ff', '#3a6bff', '#9a3dff', '#e35bff'], glow: 'rgba(58,107,255,.55)', dot: '#9fe9ff' },
  2: { ring: ['#fff4c2', '#ffd56a', '#ff9f2e', '#ffd56a'], glow: 'rgba(255,190,70,.6)', dot: '#ffe08a' },
  3: { ring: ['#ff6b9e', '#ffd56a', '#5df0ff', '#9a7bff'], glow: 'rgba(255,255,255,.6)', dot: '#ffffff' },
};

/** 1＝キャラなし（青）・2＝キャラ1人（金）・3＝2人以上か完凸（虹） */
export function level(results) {
  const chars = results.filter((r) => r.type === 'char');
  if (chars.length >= 2 || chars.some((r) => r.max)) return 3;
  return chars.length ? 2 : 1;
}
const tagOf = (r) => (r.over ? t('gacha.over', { n: r.over }) : r.max ? t('gacha.max') : r.isNew ? t('gacha.new') : t('gacha.awk', { n: r.awk }));

function add(host, cls, html = '') {
  const e = document.createElement('div');
  e.className = cls;
  if (html) e.innerHTML = html;
  host.appendChild(e);
  return e;
}

/** 演出 → 登場 → 結果。結果の OK で閉じたら終わる */
export async function showResult(results, { okLabel } = {}) {
  const host = add(document.body, 'gx', '<div class="p-stars"></div>');
  const chars = results.filter((r) => r.type === 'char');
  await preloadAll(chars.flatMap((r) => [art(r.id, 'face-256'), art(r.id, 'banner-940')]), 1500);
  if (!short()) {
    const R = runner();
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'gx-skip';
    skip.textContent = t('gacha.skip');
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      R.skip();
      host.getAnimations?.({ subtree: true }).forEach((a) => a.cancel()); // 動いている途中のものもすぐ止める
    });
    host.appendChild(skip);
    try {
      if (!results.every((r) => r.pity)) await summon(host, R, level(results), results.length === 1 ? 0.75 : 1);
      for (const r of chars) await cutIn(host, R, r);
    } catch (e) {
      if (e !== SKIP && e !== STOP) console.error(e);
    }
    R.stop();
  }
  host.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
  host.innerHTML = '<div class="p-stars"></div>';
  await grid(host, results, okLabel);
  host.remove();
}

/** A オービット・サモン */
async function summon(host, R, lv, k) {
  const wrap = add(host, '', '');
  wrap.style.cssText = 'position:absolute;inset:0';
  const glow = add(wrap, 'gx-glow');
  glow.style.setProperty('--g', LV[1].glow);
  const ring = add(wrap, 'gx-ring', orbitSVG({ w: 430, stroke: 4, colors: LV[1].ring }));
  anim(ring, [{ opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 }], { d: 420 });
  const [g1, g2] = ring.querySelectorAll('g');
  const D = 2100 * k;
  anim(g1, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(1080deg)' }], { d: D, ease: 'cubic-bezier(.55,0,.9,.5)' });
  anim(g2, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-900deg)' }], { d: D, ease: 'cubic-bezier(.55,0,.9,.5)' });

  // 光の粒（数は動作モードしだい：高画質70・バランス35・省電力0）
  const N = Math.round(70 * power.profile().particles);
  let col = LV[1].dot;
  let stopLoop = null;
  if (N > 0) {
    const { g, w, h } = canvasLayer(wrap);
    const cx = w / 2;
    const cy = h * 0.46;
    const R0 = Math.min(w, 520) * 0.45;
    const ps = Array.from({ length: N }, () => ({ a: Math.random() * 6.283, r: R0 * (0.55 + Math.random() * 0.45), s: 0.6 + Math.random() * 0.9, z: 1 + Math.random() * 2 }));
    const t0 = performance.now();
    stopLoop = power.loop((dt, now) => {
      const kk = Math.min(1, (now - t0) / D);
      const f = dt / 16.7;
      g.clearRect(0, 0, w, h);
      g.fillStyle = col;
      for (const p of ps) {
        p.a += 0.03 * p.s * (1 + kk * 3) * f;
        p.r *= 1 - 0.012 * p.s * (1 + kk * 2) * f;
        if (p.r < 6) p.r = R0 * (0.55 + Math.random() * 0.45);
        g.globalAlpha = 0.4 + 0.6 * (1 - p.r / R0);
        g.beginPath();
        g.arc(cx + Math.cos(p.a) * p.r, cy + Math.sin(p.a) * p.r * 0.55, p.z, 0, 6.283);
        g.fill();
      }
      g.globalAlpha = 1;
    });
  }
  try {
    await R.wait(1000 * k);
    if (lv >= 2) { // 昇格
      recolorOrbit(ring.querySelector('svg'), LV[lv].ring);
      col = LV[lv].dot;
      glow.style.setProperty('--g', LV[lv].glow);
      const pulse = add(wrap, 'gx-pulse');
      pulse.style.setProperty('--pc', lv === 3 ? '#ffffff' : '#ffd56a');
      anim(pulse, [{ scale: 1, opacity: 1 }, { scale: 9, opacity: 0 }], { d: 650, ease: 'ease-out' });
      if (lv === 3) anim(ring, [{ filter: 'hue-rotate(0deg)' }, { filter: 'hue-rotate(360deg)' }], { d: 900, it: 2, ease: 'linear' });
    }
    await R.wait(Math.max(300, D - 1000 * k));
    anim(ring, [{ scale: 1, opacity: 1 }, { scale: 0.1, opacity: 0 }], { d: 300, ease: 'ease-in' });
    const core = add(wrap, 'gx-core');
    await anim(core, [{ scale: 0.2 }, { scale: 18 }], { d: 420, ease: 'ease-in' });
    const fl = add(wrap, 'gx-flash');
    await anim(fl, [{ opacity: 0 }, { opacity: 1 }], { d: 120 });
    await R.wait(80);
  } finally {
    stopLoop?.();
  }
  wrap.remove();
}

/** キャラの登場（タップで次へ・4秒で自動） */
async function cutIn(host, R, r) {
  const c = byId(r.id);
  if (!c) return;
  const [c1, c2] = EL[c.el] || EL.void;
  const ov = add(host, 'gx-cut');
  ov.style.setProperty('--c', c1);
  ov.style.setProperty('--c2', c2);
  anim(ov, [{ opacity: 0 }, { opacity: 1 }], { d: 220 });
  for (let i = 0; i < 2; i++) {
    const b = add(ov, 'gx-band');
    b.style.top = 18 + i * 34 + '%';
    b.style.height = 46 - i * 22 + 'px';
    anim(b, [{ transform: 'skewY(-14deg) translateX(-60%)' }, { transform: 'skewY(-14deg) translateX(60%)' }], { d: 700, delay: 80 + i * 120, ease: 'ease-out' });
  }
  const im = new Image();
  im.src = art(r.id, 'banner-940');
  im.className = 'gx-art';
  im.alt = c.name;
  ov.appendChild(im);
  anim(im, [{ opacity: 0, transform: 'translateX(70px) rotate(8deg) scale(1.06)' }, { opacity: 1, transform: 'rotate(3deg)' }], { d: 520, delay: 120 });
  const nm = add(ov, 'gx-cname', `<small>${c.en}</small><b>${esc(c.name)}</b><span>${ELEMENTS[c.el].en}</span>`);
  anim(nm, [{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'none' }], { d: 450, delay: 260 });
  const tag = tagOf(r);
  const st = add(ov, 'gx-stamp' + (r.max ? ' rb' : '') + (/[^\x00-\x7F]/.test(tag) ? ' jp' : ''), esc(tag));
  anim(st, [{ opacity: 0, transform: 'rotate(-8deg) scale(1.7)' }, { opacity: 1, transform: 'rotate(-8deg) scale(1)' }], { d: 380, delay: 640, ease: 'cubic-bezier(.3,1.6,.5,1)' });
  add(ov, 'gx-hint', t('gacha.tapNext'));
  await R.tapOr(ov, 4000);
  await anim(ov, [{ opacity: 1 }, { opacity: 0 }], { d: 220 });
  ov.remove();
}

function card(r) {
  if (r.type === 'char') {
    const c = byId(r.id);
    return `<div class="gx-card char ${c.el}"><img src="${art(c.id, 'face-256')}" alt=""><span class="tag">${esc(tagOf(r))}</span><span class="lab">${esc(c.name)}</span></div>`;
  }
  if (r.type === 'orbit') return `<div class="gx-card orbit"><img src="assets/brand/mark-512.webp" alt=""><b>${t('gacha.itemOrbit')}</b></div>`;   // キャラ以外（2026-11-24〜）
  return `<div class="gx-card xeva"><i class="x-cur xeva"></i><b>${fmt(r.n)}</b></div>`;
}

/** 結果の一覧（カードが順に返る） */
async function grid(host, results, okLabel) {
  const box = add(host, 'gx-res', `<h2>${t('gacha.result')}</h2>
    <div class="gx-grid ${results.length === 1 ? 'one' : ''}">${results.map(card).join('')}</div>
    <div class="gx-foot"><button type="button" class="x-btn primary" data-ok>${esc(okLabel || t('btn.ok'))}</button></div>`);
  const fast = short();
  box.querySelectorAll('.gx-card').forEach((c, i) => anim(c, [{ opacity: 0, transform: 'perspective(500px) rotateY(90deg)' }, { opacity: 1, transform: 'none' }], { d: fast ? 120 : 380, delay: fast ? 0 : i * 70 }));
  const ok = box.querySelector('[data-ok]');
  await new Promise((res) => ok.addEventListener('click', res, { once: true }));
}
