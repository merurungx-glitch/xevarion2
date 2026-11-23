// XEVARION II — ロード画面（第3回で決定：C　全身＋ヒント）
// ・delay（既定 300ms）より早く終われば出さない（ちらつかせない）
// ・set(0〜1) を呼ぶと進みぐあいの線、呼ばなければ流れる線
import { t } from '../core/i18n.js';
import { CHARS, art } from '../core/chara.js';

const TIPS = ['tip.1', 'tip.2', 'tip.3', 'tip.4', 'tip.5'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function showLoading({ delay = 300 } = {}) {
  let el = null;
  let bar = null;
  let finished = false;
  const open = () => {
    if (finished) return;
    const c = pick(CHARS);
    el = document.createElement('div');
    el.className = 'fx-load';
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="p-stars"></div><img class="ch" src="${art(c.id, 'full-1024')}" alt="" decoding="async">
      <div class="tip"><b>TIPS</b>${t(pick(TIPS))}</div><div class="bar ind"><i></i></div>`;
    bar = el.querySelector('.bar');
    document.body.appendChild(el);
    requestAnimationFrame(() => el && el.classList.add('show'));
  };
  const timer = setTimeout(open, delay);
  return {
    set(p) {
      if (!bar) return;
      bar.classList.remove('ind');
      bar.firstChild.style.width = Math.round(Math.min(1, Math.max(0, p)) * 100) + '%';
    },
    done() {
      finished = true;
      clearTimeout(timer);
      if (el) {
        const e = el;
        el = null;
        e.classList.remove('show');
        setTimeout(() => e.remove(), 260);
      }
    },
  };
}
