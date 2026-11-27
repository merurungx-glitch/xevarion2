// XEVARION II — アプリとして入れる（ホーム画面に追加・インストール）の窓口
// ★ 2026-11-28 ご指定「アプリダウンロードができることを表示してください」
// ・XEVARION II はブラウザで動くアプリ（PWA）。ホーム画面に入れると、アイコンから全画面で開ける・一度ひらけばオフラインでも起動できる
// ・Chrome・Edge（Android・PC）は「インストール」を画面のボタンから出せる（beforeinstallprompt を起動のときに受け取っておく）
//   iPhone・iPad はボタンから出せない（Safari の共有 →「ホーム画面に追加」）→ 板（portal/install.js）で手順を見せる
// ・アプリとして開いているとき（standalone）は案内を出さない
const subs = new Set();
let deferred = null;     // Chrome の「インストール」の出し方（beforeinstallprompt のイベント）
let justInstalled = false;
const emit = () => { for (const fn of subs) { try { fn(); } catch (e) { console.error(e); } } };

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();    // ブラウザの小さな帯は出さず、こちらのボタンから出す
  deferred = e;
  emit();
});
addEventListener('appinstalled', () => { deferred = null; justInstalled = true; emit(); });

/** アプリとして（ホーム画面から）開いているか */
export function standalone() {
  try {
    return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  } catch { return false; }
}
/** 'ios'（iPhone・iPad）・'android'・'pc'。LINE などのアプリの中のブラウザなら inApp も true */
export function platform() {
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const kind = ios ? 'ios' : /Android/i.test(ua) ? 'android' : 'pc';
  return { kind, inApp: /\bLine\/|FBAN|FBAV|Instagram|Twitter/i.test(ua), safari: ios && !/CriOS|FxiOS|EdgiOS/.test(ua) };
}
/** 画面のボタンから「インストール」を出せるか（Chrome・Edge で、まだ入れていないとき） */
export const canPrompt = () => !!deferred;
export const installedNow = () => justInstalled;
/** 「インストール」を出す。入れたら true */
export async function prompt() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  try {
    e.prompt();
    const r = await e.userChoice;
    emit();
    return r && r.outcome === 'accepted';
  } catch (err) {
    console.warn('install', err);
    emit();
    return false;
  }
}
export function onChange(fn) { subs.add(fn); return () => subs.delete(fn); }
