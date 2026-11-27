// XEVARION II — オフライン（Service Worker）の窓口
// ・release/ から配った版（BUILD が 'dev' でない）だけで使う。手元の src（試験用サーバー 8800）では登録しない
//   ＝直したものがいつもそのまま出る（初代では SW の古い保存で何度も悩んだ）
// ・新しい版が届いて待っているときは onUpdate(go) を呼ぶ。画面で「更新する」を押したら go() → 入れかわって読みなおす
// ・画面が見えたとき、前に見に行ってから30分たっていたら、新しい版を見に行く（起動のたびにも自動で見に行く）
// ★ 2026-11-28 ご指定「自分の端末の更新状況やダウンロード状況を見られるように」（メニューの「更新とダウンロード」＝portal/device.js）
//   info()（いまの状態）・onState(fn)・checkNow()（新しい版を確かめる）・applyUpdate()（更新する）・latest()（配っている版＝version.json）
//   ask(msg, onProgress)：動いている SW に聞く（{t:'status'} 入っているもの・{t:'get', groups} ダウンロード）。答えは MessageChannel で
import { BUILD } from './config.js';
import * as power from './power.js';

let want = false;
let lastCheck = 0;   // 前に見に行った時刻（30分ごとの間引き）
let lastOk = 0;      // うまく確かめられた時刻（画面に出す）
let reg = null;
let checking = false;
let failed = false;
const subs = new Set();
const emit = () => { for (const fn of subs) { try { fn(); } catch (e) { console.error(e); } } };

export const enabled = () => BUILD !== 'dev' && 'serviceWorker' in navigator;

/** いまの状態：{ enabled, dev, ready（登録できた）, waiting（新しい版が待っている）, installing（受け取り中）, checking, failed, lastOk（うまく確かめた時刻）, build } */
export function info() {
  return {
    enabled: enabled(), dev: BUILD === 'dev', ready: !!reg, build: BUILD,
    waiting: !!(reg && reg.waiting && navigator.serviceWorker.controller),
    installing: !!(reg && reg.installing), checking, failed, lastOk,
  };
}
export function onState(fn) { subs.add(fn); return () => subs.delete(fn); }

export function start(onUpdate) {
  if (!enabled()) return;
  // 入れかわったら読みなおす（★ 自分で「更新する」を押したときだけ。初めて入ったときは読みなおさない）
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (want) location.reload(); else emit(); });
  navigator.serviceWorker.register('sw.js').then((r) => {
    reg = r;
    const ready = () => {
      emit();
      if (!reg.waiting || !navigator.serviceWorker.controller) return;
      onUpdate(applyUpdate);
    };
    ready();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      emit();
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') ready(); else emit(); });
    });
    lastCheck = Date.now();
    if (navigator.onLine !== false) lastOk = lastCheck;   // 登録のときにも新しい版を見に行っている（通信があれば）
    power.onVisible((v) => {
      if (v && Date.now() - lastCheck > 30 * 60 * 1000) checkNow();
    });
    emit();
  }).catch((e) => console.warn('sw: 登録できませんでした', e));
}

/** 新しい版を今すぐ確かめる（メニューの「新しい版を確かめる」・30分ごと）。確かめられたら true */
export async function checkNow() {
  if (!reg || checking) return false;
  checking = true;
  emit();
  try {
    await reg.update();
    failed = false;
    lastOk = Date.now();
    return true;
  } catch (e) {
    failed = true;
    return false;
  } finally {
    checking = false;
    lastCheck = Date.now();
    emit();
  }
}

/** 待っている新しい版に入れかえて読みなおす（「更新する」） */
export function applyUpdate() {
  if (!reg || !reg.waiting) return false;
  want = true;
  reg.waiting.postMessage({ t: 'skip' });
  return true;
}

/** 配っている版（サーバーの version.json）。読めなければ null */
export async function latest() {
  try {
    const r = await fetch('version.json', { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

/** 動いている SW に聞く。onProgress があれば途中の知らせ（{t:'progress'}）も受ける。答えがなければ null（30秒・ダウンロードは10分） */
export function ask(msg, onProgress) {
  const ctl = enabled() && navigator.serviceWorker.controller;
  if (!ctl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const limit = setTimeout(() => { ch.port1.close(); resolve(null); }, msg.t === 'get' ? 600000 : 30000);
    ch.port1.onmessage = (e) => {
      const d = e.data || {};
      if (d.t === 'progress') { if (onProgress) onProgress(d); return; }
      clearTimeout(limit);
      ch.port1.close();
      resolve(d);
    };
    ctl.postMessage(msg, [ch.port2]);
  });
}
