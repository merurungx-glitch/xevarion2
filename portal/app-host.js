// XEVARION II — アプリの窓（#/app/<id>）
// ・アプリは routes.js の APPS の path（src/apps/<フォルダ>/index.html）を iframe で開く。II の機能は window.X2（bridge.js）で使う
// ・下のタブは出さない（全画面）。開いているあいだ、html の地の色をアプリの色にする（iPhone の描けない下の帯も同じ色に）
// ・閉じたら iframe ごと捨てる → アプリの描画・音・タイマーが全部止まる（電池）
// ・読みこみのあいだは II のロード画面（C）。アプリが X2.ready() を呼んだら消す
// ★ 2026-11-28 公式サイト（routes.js の SITES）もこの窓で開く。サイトはミッション「アプリで1回あそぶ」に数えない
import { APPS, SITES, ROUTES } from './routes.js';
import * as router from '../core/router.js';
import { showLoading } from '../ui/loading.js';
import { makeBridge } from './bridge.js';
import * as daily from '../core/daily.js';

export async function mount(el, { params, go }) {
  const a = APPS.find((x) => x.id === params[0]) || SITES.find((x) => x.id === params[0]);
  if (!a || !a.path) { go('apps', { replace: true }); return null; }

  // もどる先：II の画面から開いたなら履歴をもどる（ブラウザの「戻る」と同じ）。直接開いたならホームへ
  const from = router.currentName();
  const exit = () => { if (ROUTES[from]?.tab) history.back(); else go('home', { replace: true }); };

  const de = document.documentElement;
  de.dataset.app = a.id;
  de.style.setProperty('--app-bg', a.bg || '#000');
  el.classList.add('ah');

  const fr = document.createElement('iframe');
  const L = showLoading({ delay: 200 });
  let shown = false;
  const ready = () => {
    if (shown) return;
    shown = true;
    L.done();
    fr.classList.add('on');
  };
  // II の画面へ切りかえる（公式サイトの「XEVARION II のアプリ」などのリンク）。ホームやタブの画面・ほかのアプリへ
  const goTo = (route) => {
    const r = String(route || '').replace(/^#?\/?/, '');
    if (!r) { exit(); return; }
    go(r, { replace: true });
  };
  const bridge = makeBridge(a, { exit, ready, go: goTo });
  window.X2 = bridge.api;
  if (!a.site) daily.note('app');   // ミッション「アプリで1回あそぶ」（公式サイトは数えない）

  fr.className = 'ah-frame';
  fr.title = a.name;
  fr.setAttribute('allow', 'autoplay; fullscreen');
  fr.addEventListener('load', () => setTimeout(ready, 2500), { once: true }); // アプリが ready を呼べなくても出す
  fr.src = a.path;
  el.appendChild(fr);

  return () => {
    bridge.leave();
    if (window.X2 === bridge.api) delete window.X2;
    L.done();
    fr.remove();
    if (de.dataset.app === a.id) {
      delete de.dataset.app;
      de.style.removeProperty('--app-bg');
    }
  };
}
