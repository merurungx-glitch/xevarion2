// XEVARION II — タイトル（2026-11-24 第6回で決定：T1 ひかりの中から）
// ・いただいた絵（art/title/title-miduki.webp・ロゴ入り）をそのまま使う。ロゴは絵の中にあるので、ロゴを別に動かさない
//   （前の「輪がロゴになる」動きは、描く輪とロゴの絵の形が合っておらずズレて見えた）
// ・iPhone など縦長：絵を横いっぱい（白い飾り枠もロゴも切れない）・上（時計のところ）は空の色・下の帯に TAP TO START
//   iPad 縦：絵をまん中に・左右は同じ絵をぼかしたもの／PC・iPad 横：絵をまん中に大きく・左右はぼかした絵・TAP は右下
//   （ぼかしは tools/build_assets.py で先に絵にしてある＝画面で計算しない）
// ・演出：白い光から絵がふわっと出て少しだけ引く → ロゴに光が1回走る → 花びらが少し舞う（約2.5秒）。タップでとばせる
//   省電力・「演出を短く」では短い版（ふわっと出るだけ）
import { t } from '../core/i18n.js';
import { VERSION } from '../core/config.js';
import * as account from '../core/account.js';
import * as router from '../core/router.js';
import * as viewport from '../core/viewport.js';
import { firstTenDone } from '../core/gacha.js';
import { short } from '../ui/fx.js';
import { showLoading } from '../ui/loading.js';
import { playIntro, introPlayed } from './intro.js';

const PIC = 'assets/title/miduki-940.webp';
const RATIO = 1672 / 940;   // 絵の 縦 ÷ 横
const PETALS = [[12, 0], [30, 1.4], [52, 2.6], [70, 0.7], [88, 3.6], [42, 4.6], [62, 5.6]];

export async function mount(el, { go }) {
  el.classList.add('tt');
  el.innerHTML = `
    <div class="tt-bg"></div>
    <div class="tt-card"><img class="tt-pic" src="${PIC}" alt="XEVARION II" decoding="async"><i class="tt-shine"></i></div>
    <div class="tt-pts x-fx" aria-hidden="true">${PETALS.map(([x, d]) => `<i style="left:${x}%;animation-delay:${d}s"></i>`).join('')}</div>
    <div class="tt-foot">
      <div class="tt-wait"><div class="x-spin"></div>${t('title.loading')}</div>
      <div class="tt-tap" hidden>${t('title.tap')}</div>
      <div class="tt-cred">${t('title.credit')}<span>VER ${VERSION}</span></div>
    </div>
    <div class="tt-white"></div>`;

  const card = el.querySelector('.tt-card');
  const pic = el.querySelector('.tt-pic');
  const wait = el.querySelector('.tt-wait');
  const tap = el.querySelector('.tt-tap');
  let alive = true;
  let busy = false;

  /** 絵の大きさと置き場所：縦長＝横いっぱい（下に帯を残す）／横長＝高さいっぱいでまん中 */
  function layout() {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const ins = viewport.insets();
    const st = ins.t || 0, sb = ins.b || 0;
    const wide = W / H > 0.8;
    let w, h, top;
    if (!wide) {
      const band = 84;                                  // 下の帯（TAP TO START と運営の名前）
      w = Math.min(W, (H - st - sb - band) / RATIO);
      h = w * RATIO;
      top = st;
    } else {
      const pad = Math.max(16, Math.round(H * 0.035));
      h = H - st - sb - pad * 2;
      w = h / RATIO;
      top = st + pad;
    }
    el.classList.toggle('wide', wide);
    card.style.cssText = `width:${Math.round(w)}px;height:${Math.round(h)}px;top:${Math.round(top)}px;left:${Math.round((W - w) / 2)}px`;
  }
  layout();
  const offVp = viewport.onChange(layout);
  addEventListener('resize', layout);

  // アプリを開いたときだけ、先に起動ロゴ（NGX → ISHIDA Production → 白い光 → この画面の白から絵へ）
  if (!introPlayed()) await playIntro();
  if (!alive) return;
  // 絵が読めてから始める（白から出るので、途中で絵が抜けて見えないように）。遅いときも 1.5 秒で始める
  await Promise.race([pic.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
  if (!alive) return;
  el.classList.add(short() ? 'go-short' : 'go');
  const t0 = performance.now();

  account.whenReady().then(() => {
    if (!alive) return;
    wait.hidden = true;
    // TAP TO START は絵が出きったころ（1.9秒）に出す。準備がそれより遅ければ、すぐ出す
    tap.style.setProperty('--td', Math.max(0, 1.9 - (performance.now() - t0) / 1000).toFixed(2) + 's');
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
    offVp();
    removeEventListener('resize', layout);
  };
}
