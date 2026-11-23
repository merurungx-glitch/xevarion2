// XEVARION II — 軽さと電池
// ・動作モード：自動／高画質／バランス／省電力（この端末だけの設定）
// ・動くものはすべて loop() で登録する → 1本の requestAnimationFrame で回し、コマ数の上限をかける
// ・画面が見えていない間は全部止める（描画・音・同期の待ち受けは onVisible で各自止める）
// ・「自動」：OS の「視差効果を減らす」・端末の性能・電池（読める端末だけ）・実際のコマ落ちで下げる
import * as store from './store.js';

store.define('power', { scope: 'device', def: 'auto' });
store.define('theme', { scope: 'device', def: 'auto' });
store.define('shortFx', { scope: 'device', def: false });

const PROFILES = {
  high: { fps: 60, particles: 1, lobbyMotion: true },
  balanced: { fps: 60, particles: 0.5, lobbyMotion: true },
  saver: { fps: 30, particles: 0, lobbyMotion: false },
};

const listeners = new Set();
const visListeners = new Set();
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
let mode = 'balanced';
let why = '';
let battery = null;
let dropped = false;

const weakDevice = () => {
  const m = navigator.deviceMemory;
  const c = navigator.hardwareConcurrency;
  return (m && m <= 2) || (c && c <= 2);
};

function decide() {
  const s = setting();
  if (s !== 'auto') {
    mode = s;
    why = '';
  } else {
    mode = 'balanced';
    why = 'ふつう';
    if (weakDevice()) { mode = 'saver'; why = '端末の性能'; }
    if (battery && !battery.charging && battery.level <= 0.2) { mode = 'saver'; why = '電池が少ない'; }
    if (dropped) { mode = 'saver'; why = 'コマ落ち'; }
  }
  const root = document.documentElement;
  root.dataset.power = mode;
  root.dataset.motion = mqReduce.matches || store.get('shortFx') ? 'reduced' : 'full';
  for (const fn of listeners) fn(mode);
}

export const setting = () => store.get('power') || 'auto';
export function setSetting(v) { store.set('power', v); dropped = false; decide(); }
export const currentMode = () => mode;
export const reason = () => why;
export const profile = () => PROFILES[mode];
/** 演出を短くするか（省電力・動きを減らす・設定の「演出を短く」） */
export const shortFx = () => mode === 'saver' || document.documentElement.dataset.motion === 'reduced';
export function setShortFx(on) { store.set('shortFx', !!on); decide(); }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---- 1本で回す描画のループ ----
const loops = new Set();
let raf = 0;
let last = 0;
let frames = 0;
let fpsT = 0;
let slow = 0;
export let fps = 0;

/** 動くものを登録する。止めるときは返ってきた関数を呼ぶ */
export function loop(fn) {
  const L = { fn };
  loops.add(L);
  kick();
  return () => loops.delete(L);
}
function kick() {
  if (!raf && loops.size && !document.hidden) {
    last = fpsT = performance.now();
    frames = 0;
    raf = requestAnimationFrame(tick);
  }
}
function tick(now) {
  raf = 0;
  if (document.hidden || !loops.size) return;
  const cap = profile().fps;
  const dt = now - last;
  if (dt >= 1000 / cap - 2) {
    last = now;
    frames++;
    if (now - fpsT >= 1000) {
      fps = Math.round((frames * 1000) / (now - fpsT));
      frames = 0;
      fpsT = now;
      watch(cap);
    }
    for (const L of [...loops]) {
      try { L.fn(Math.min(dt, 100), now); } catch (e) { console.error(e); loops.delete(L); }
    }
  }
  raf = requestAnimationFrame(tick);
}
// 自動のとき：5秒続けて上限の6割を下回ったら省電力へ
function watch(cap) {
  if (setting() !== 'auto' || mode === 'saver') { slow = 0; return; }
  slow = fps < cap * 0.6 ? slow + 1 : 0;
  if (slow >= 5) { dropped = true; slow = 0; decide(); }
}

// ---- 見えていない間は止める ----
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else kick();
  for (const fn of visListeners) { try { fn(!document.hidden); } catch (e) { console.error(e); } }
});
export function onVisible(fn) { visListeners.add(fn); return () => visListeners.delete(fn); }

// ---- 最後にさわってからの時間（ロビーを止めるのに使う） ----
let lastInput = performance.now();
for (const t of ['pointerdown', 'keydown', 'wheel']) addEventListener(t, () => { lastInput = performance.now(); }, { passive: true, capture: true });
export const idleMs = () => performance.now() - lastInput;

// ---- 中身の色（自動／明るい／暗い） ----
export const theme = () => store.get('theme') || 'auto';
export function setTheme(v) { store.set('theme', v); applyTheme(); }
function applyTheme() {
  const t = theme();
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export async function init() {
  applyTheme();
  mqReduce.addEventListener?.('change', decide);
  decide();
  try {
    if (navigator.getBattery) {
      battery = await navigator.getBattery();
      battery.addEventListener('levelchange', decide);
      battery.addEventListener('chargingchange', decide);
      decide();
    }
  } catch {}
}
