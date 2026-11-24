// XEVARION II — 画面のふちの余白（--sb）と、iPhone・iPad のホーム画面アプリの「短い箱」の手当て
//
// ★ 初代で何度も起きたこと（II でも 2026-11-25「ほとんどのアプリで、特に iPhone で下に隙間」）：
//   iPhone のホーム画面から開くと、position:fixed がぶら下がる箱（表示領域）が画面より短いことがある
//   （初代の実機の実測：画面 852・箱 793・env の上 59 ＝ 足りないぶんは env の上と同じ・足りないのは画面のいちばん下）。
//   fixed の板（#app も）は箱の下端で描画ごと切られ、その下には html の地の色しか塗られない ＝「下の隙間」。
//   → その形のときは html.x2-full を付け、#app と全面の板を absolute で「本当の画面の高さ」（--fullh）に敷く（base.css ほか）。
//     文書が箱より少し長くなるので、文書のスクロールはいつも 0 に留める（pin）。下の余白 --sb は env の下そのまま。
// ★ 付ける／外すを箱の高さで決めると、文書の長さで iOS が箱を変えてループする（初代 2026-09-19 の点滅）
//   → 箱が画面いっぱい（差 0）のときも付けたまま（そのときは見た目が変わらない）。
// ★ 付けないとき：PC のアプリ表示（タスクバーぶん短い）・iPad の分割や窓（幅が画面より狭い）・
//   ステータスバーの下から始まる表示（env の上が 0 なのに短い＝上が短いだけで、下は画面の下端まで届いている）
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);visibility:hidden;pointer-events:none';

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
/** iPhone・iPad（navigator.standalone は iOS の WebKit にだけある・iPad は Mac のふりをする） */
const isIOS = () => typeof navigator.standalone === 'boolean' || /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let last = { t: 0, r: 0, b: 0, l: 0 };
let fullNow = -1;   // いまの --fullh（0＝付けていない）
const subs = new Set();

/** いまの余白（px）。b は --sb と同じ。アプリの窓（iframe）へ渡すのに使う */
export const insets = () => ({ ...last });
export function onChange(fn) { subs.add(fn); return () => subs.delete(fn); }

/** 文字を入れているところ（キーボードが出ている）か。アプリの窓（iframe）の中も見る */
function typing() {
  let a = document.activeElement;
  try { while (a && a.tagName === 'IFRAME' && a.contentDocument) a = a.contentDocument.activeElement; } catch { /* よその窓 */ }
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable) && !a.readOnly;
}

/** 本当の画面の高さ（html.x2-full を付けるときだけ・それ以外は 0） */
function fullHeight(envT) {
  if (!standalone() || !isIOS()) return 0;
  const land = innerWidth > innerHeight;
  const a = screen.width, b = screen.height;
  const sw = land ? Math.max(a, b) : Math.min(a, b);
  const sh = land ? Math.min(a, b) : Math.max(a, b);
  if (Math.abs(sw - innerWidth) > 2) return 0;         // 画面の幅いっぱいでない（iPad の分割・窓）
  const s = sh - innerHeight;                          // 箱が画面よりどれだけ短いか
  if (Math.abs(s) <= 1) return Math.round(sh);         // 画面いっぱい（付けても見た目は同じ・付けたままにしてループさせない）
  // 上はステータスバーの下まで描けている（env の上 > 0）のに箱が短い＝足りないのは下（初代の実機：短いぶん 59＝env の上）。
  // 200 以上は測りちがいとみなす（初代と同じ）
  if (envT > 0 && s > 1 && s < 200) return Math.round(sh);
  return 0;
}

export function fit() {
  if (!probe.isConnected) document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const de = document.documentElement;
  const envT = parseFloat(cs.paddingTop) || 0;
  // キーボードが出ているあいだは iOS が箱を動かすことがあるので、前のまま
  const full = typing() && fullNow >= 0 ? fullNow : fullHeight(envT);
  if (full !== fullNow) {
    fullNow = full;
    if (full > 0) de.style.setProperty('--fullh', full + 'px');
    else de.style.removeProperty('--fullh');
    de.classList.toggle('x2-full', full > 0);
    pin();
  }
  const sb = parseFloat(cs.paddingBottom) || 0;
  de.style.setProperty('--sb', sb + 'px');
  const next = { t: envT, r: parseFloat(cs.paddingRight) || 0, b: sb, l: parseFloat(cs.paddingLeft) || 0 };
  if (next.t !== last.t || next.r !== last.r || next.b !== last.b || next.l !== last.l) {
    last = next;
    for (const fn of subs) { try { fn(insets()); } catch (e) { console.error(e); } }
  }
  return { envT, envB: sb, sb, full, standalone: standalone(), ios: isIOS() };
}

/** html.x2-full のあいだ、文書のスクロールをいつも 0 に（中身はすべて板の中でスクロールする作り）。
 *  入力中（キーボード）は iOS が持ち上げているので触らない。閉じたら戻す */
export function pin() {
  if (!document.documentElement.classList.contains('x2-full')) return;
  if (!scrollX && !scrollY) return;
  if (typing()) return;
  scrollTo(0, 0);
}
/** 入力が終わったあとに、少し待って戻す（キーボードが引っこむのを待つ） */
export function pinLater() { setTimeout(pin, 60); setTimeout(pin, 360); }

export function init() {
  fit();
  addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', () => { fit(); pinLater(); });
  addEventListener('orientationchange', () => setTimeout(fit, 300));
  addEventListener('pageshow', fit);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fit(); });
  addEventListener('scroll', pin, { passive: true });
  document.addEventListener('focusout', pinLater);
}
