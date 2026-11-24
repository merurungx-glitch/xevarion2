// XEVARION II — 起動ロゴ（第3回で決定：A　NGX → ISHIDA Production → …）
// ★ 2026-11-24 第6回で変更：2社のあとの「軌道の輪が描かれてロゴになる」部分はやめた
//   （描く輪の線と、そのあと出るロゴの絵の輪の大きさ・かたむきが合っておらず、ずれて見えていた）。
//   2社のあとは白い光がひらいて、タイトルの絵（ロゴ入り）へつながる（タイトルは白から始まる＝つなぎ目が見えない）
// ・アプリを開いたときだけ（このページの読みこみで1回）。裏から戻ったときは出さない
// ・タップでとばせる。省電力・「演出を短く」では約半分の時間
import { anim, shineHTML, sweep, runner, preloadAll, short, SKIP, STOP } from '../ui/fx.js';

const SRC = {
  ngx: 'assets/brand/ngx-on-dark-480.webp',
  ishida: 'assets/brand/ishida-on-dark-480.webp',
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
    await light(el, R, k);
  } catch (e) {
    if (e !== SKIP && e !== STOP) console.error(e);
  }
  // とばしたときも、最後は白にしてからタイトルへ（タイトルは白から始まる）
  el.style.background = '#fff';
  await anim(el, [{ opacity: 1 }, { opacity: 0 }], { d: 160 });
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

/** 白い光がまん中からひらいて、画面が白になる（このあとタイトルの絵が白から出る） */
async function light(host, R, k) {
  const g = add(host, 'burst');
  await anim(g, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(.1)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }], { d: 520 * k, ease: 'cubic-bezier(.3,0,.2,1)' });
  host.style.background = '#fff';
  await R.wait(60 * k);
}
