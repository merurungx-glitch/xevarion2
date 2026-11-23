// XEVARION II — 起動ロゴ（第3回で決定：A　NGX → ISHIDA Production → 軌道が描かれて XEVARION II のロゴ・約3.4秒）
// ・アプリを開いたときだけ（このページの読みこみで1回）。裏から戻ったときは出さない
// ・タップでとばせる。省電力・「演出を短く」では約半分の時間
import { anim, orbitSVG, shineHTML, sweep, runner, preloadAll, short, SKIP, STOP } from '../ui/fx.js';

const SRC = {
  ngx: 'assets/brand/ngx-on-dark-480.webp',
  ishida: 'assets/brand/ishida-on-dark-480.webp',
  mark: 'assets/brand/mark-512.webp',
  word: 'assets/brand/wordmark-white-560.webp',
};
let played = false;
export const introPlayed = () => played;

function add(host, cls, html = '') {
  const e = document.createElement('div');
  e.className = cls;
  e.innerHTML = html;
  host.appendChild(e);
  return e;
}
function addImg(host, cls, src) {
  const e = new Image();
  e.className = cls;
  e.src = src;
  e.alt = '';
  e.decoding = 'async';
  host.appendChild(e);
  return e;
}

export async function playIntro() {
  played = true;
  const el = add(document.body, 'fx-intro');
  el.setAttribute('aria-label', 'NGX × ISHIDA Production');
  const R = runner();
  el.addEventListener('click', () => {
    R.skip();
    el.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
  });
  const k = short() ? 0.45 : 1;
  await preloadAll(Object.values(SRC), 1200);
  try {
    await R.wait(200 * k);
    await company(el, R, SRC.ngx, k);
    await company(el, R, SRC.ishida, k);
    await reveal(el, R, k);
  } catch (e) {
    if (e !== SKIP && e !== STOP) console.error(e);
  }
  await anim(el, [{ opacity: 1 }, { opacity: 0 }], { d: 320 });
  el.remove();
}

/** 会社のロゴ：ふわっと出る → 光が走る → 消える */
async function company(host, R, src, k) {
  const b = add(host, 'co', shineHTML(src));
  anim(b, [{ opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1 }], { d: 380 * k });
  sweep(b, 260 * k);
  await R.wait(1000 * k);
  await anim(b, [{ opacity: 1 }, { opacity: 0 }], { d: 260 * k });
  b.remove();
}

/** 軌道の輪が描かれて、XEVARION II のロゴに */
async function reveal(host, R, k) {
  const glow = add(host, 'glow');
  const orb = add(host, 'orb', orbitSVG({ w: 330, stroke: 5, draw: true }));
  anim(glow, [{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }], { d: 700 * k });
  const [e1, e2] = orb.querySelectorAll('ellipse');
  anim(e1, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { d: 650 * k, ease: 'cubic-bezier(.6,0,.3,1)' });
  await anim(e2, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { d: 650 * k, delay: 120 * k, ease: 'cubic-bezier(.6,0,.3,1)' });
  await R.wait(0);
  const mark = addImg(host, 'mark', SRC.mark);
  anim(mark, [{ opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1 }], { d: 320 * k });
  anim(orb, [{ opacity: 1 }, { opacity: 0 }], { d: 320 * k });
  const word = addImg(host, 'word', SRC.word);
  await anim(word, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { d: 420 * k, delay: 120 * k });
  anim(glow, [{ opacity: 1, scale: 1 }, { opacity: 0, scale: 1.5 }], { d: 700 * k });
  await R.wait(700 * k);
}
