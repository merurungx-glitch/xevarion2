// XEVARION II — 入手の演出（第3回で決定：A＋C　大きさで使い分け）
// ・A earnFly：もらった場所からコインがはじけて、上のお財布（[data-earn="xeva"] など）へ飛ぶ。数字は数え上げ
// ・C earnCard：GET! のカード（ログボ・特典など大きいとき）→ OK で閉じたら A
// ★ お財布（wallet）は呼ぶ前に増やしておく。数字は「増える前の値」から数え上げる
//   数え上げのあいだは、お財布の数字に data-hold を付けて、ほかの描きなおしで飛ばないようにする
import { t } from '../core/i18n.js';
import * as wallet from '../core/wallet.js';
import { fmt } from './dom.js';
import { anim, short, preloadAll } from './fx.js';

const ICON = { xeva: 'assets/ui/xeva-64.webp', gem: 'assets/ui/gem-64.webp', ticket: 'assets/ui/ticket-128.webp' };
const NAME = { xeva: 'cur.xeva', gem: 'cur.gem', ticket: 'cur.ticket' };

function countUp(el, from, to, ms, fmtFn) {
  if (ms <= 0) { el.textContent = fmtFn(to); return Promise.resolve(); }
  const t0 = performance.now();
  return new Promise((res) => {
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      el.textContent = fmtFn(Math.round(from + (to - from) * p));
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

/** A：お財布へ飛ぶ */
export async function earnFly(items, { from } = {}) {
  const jobs = [];
  for (const [k, n] of Object.entries(items)) {
    if (!n || !ICON[k]) continue;
    const target = [...document.querySelectorAll(`[data-earn="${k}"]`)].find((e) => e.getClientRects().length);
    if (target) jobs.push(flyOne(k, n, target, from));
  }
  await Promise.all(jobs);
}

async function flyOne(k, n, target, from) {
  const num = target.querySelector('[data-num]') || target;
  const to = wallet.get()[k];
  const fromV = Math.max(0, to - n);
  num.dataset.hold = '1';
  num.textContent = fmt(fromV);
  const r = target.getBoundingClientRect();
  const tx = r.left + 14;
  const ty = r.top + r.height / 2;
  const f = from || { x: innerWidth / 2, y: innerHeight * 0.55 };
  const count = short() ? 0 : Math.min(12, 4 + Math.ceil(Math.log10(n + 1) * 2));
  const flights = [];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('i');
    c.className = 'fx-coin';
    c.style.backgroundImage = `url('${ICON[k]}')`;
    if (k === 'ticket') { c.style.width = '30px'; c.style.height = '20px'; }
    document.body.appendChild(c);
    const a = Math.random() * 6.283;
    const d = 40 + Math.random() * 50;
    const bx = f.x + Math.cos(a) * d;
    const by = f.y + Math.sin(a) * d;
    flights.push(c.animate([
      { transform: `translate(${f.x - 12}px,${f.y - 12}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${bx - 12}px,${by - 12}px) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${(bx + tx) / 2 - 12}px,${Math.min(by, ty) - 60}px) scale(.9)`, opacity: 1, offset: 0.65 },
      { transform: `translate(${tx - 12}px,${ty - 12}px) scale(.5)`, opacity: 0.2 },
    ], { duration: 900 + i * 40, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }).finished
      .then(() => { c.remove(); target.animate([{ scale: 1 }, { scale: 1.14 }, { scale: 1 }], { duration: 160 }); })
      .catch(() => c.remove()));
  }
  await countUp(num, fromV, to, short() ? 0 : 1200, fmt);
  await Promise.all(flights);
  delete num.dataset.hold;
  num.textContent = fmt(wallet.get()[k]);
}

/** C：GET! のカード → OK で閉じたら A */
export async function earnCard(items, { sub = '' } = {}) {
  const list = Object.entries(items).filter(([k, n]) => n && ICON[k]);
  await preloadAll(list.map(([k]) => ICON[k]), 800);
  const wrap = document.createElement('div');
  wrap.className = 'fx-get';
  wrap.innerHTML = `<div class="fx-get-card" role="dialog" aria-modal="true"><h3>GET!</h3><p>${sub}</p>
    <div class="fx-get-rows">${list.map(([k, n]) => `<div class="fx-get-row" data-n="${n}"><i class="x-cur ${k}"></i><span>${t(NAME[k])}</span><b>+0</b></div>`).join('')}</div>
    <button type="button" class="x-btn primary block">${t('btn.ok')}</button></div>`;
  document.body.appendChild(wrap);
  const card = wrap.firstElementChild;
  anim(wrap, [{ opacity: 0 }, { opacity: 1 }], { d: 200 });
  anim(card, [{ opacity: 0, transform: 'scale(.88)' }, { opacity: 1, transform: 'none' }], { d: 380, ease: 'cubic-bezier(.3,1.4,.5,1)' });
  for (const row of card.querySelectorAll('.fx-get-row')) {
    anim(row, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { d: 300 });
    await countUp(row.querySelector('b'), 0, +row.dataset.n, short() ? 0 : 450, (v) => '+' + fmt(v));
  }
  await new Promise((res) => card.querySelector('.x-btn').addEventListener('click', res, { once: true }));
  const r = card.getBoundingClientRect();
  await anim(wrap, [{ opacity: 1 }, { opacity: 0 }], { d: 220 });
  wrap.remove();
  await earnFly(items, { from: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
}

/** 大きさで使い分け：big=true（ログボ・特典など）なら C、ふだんは A */
export const earn = (items, o = {}) => (o.big ? earnCard(items, o) : earnFly(items, o));
