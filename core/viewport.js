// XEVARION II — 画面の下の余白（ホームバー）を実測で決めて --sb に入れる
//
// ★ 初代で何度も起きたこと：iPhone のホーム画面から開くと、表示領域が画面より短いことがある
//   （足りないぶんは画面のいちばん下＝ホームバーのあたり）。そのまま env(safe-area-inset-bottom) を
//   余白にすると「外にあるホームバーのぶん」と二重になり、下のバーが浮いて見える。
//   → 余白 = max(0, env の下 − 足りないぶん)。足りないぶんは「画面の高さ − 表示領域の高さ」（アプリ表示のときだけ）。
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);visibility:hidden;pointer-events:none';

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let last = { t: 0, r: 0, b: 0, l: 0 };
const subs = new Set();

/** いまの余白（px）。b は --sb と同じ（足りないぶんを引いたもの）。アプリの窓（iframe）へ渡すのに使う */
export const insets = () => ({ ...last });
export function onChange(fn) { subs.add(fn); return () => subs.delete(fn); }

export function fit() {
  if (!probe.isConnected) document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const envB = parseFloat(cs.paddingBottom) || 0;
  const landscape = innerWidth > innerHeight;
  const screenH = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  let short = 0;
  if (standalone()) {
    const s = screenH - innerHeight;
    if (s > 0 && s < 200) short = s;
  }
  const sb = Math.max(0, envB - short);
  document.documentElement.style.setProperty('--sb', sb + 'px');
  const next = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: sb, l: parseFloat(cs.paddingLeft) || 0 };
  if (next.t !== last.t || next.r !== last.r || next.b !== last.b || next.l !== last.l) {
    last = next;
    for (const fn of subs) { try { fn(insets()); } catch (e) { console.error(e); } }
  }
  return { envB, short, sb, standalone: standalone() };
}

export function init() {
  fit();
  addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 300));
  addEventListener('pageshow', fit);
}
