// XEVARION II — オフライン（Service Worker）の窓口
// ・release/ から配った版（BUILD が 'dev' でない）だけで使う。手元の src（試験用サーバー 8800）では登録しない
//   ＝直したものがいつもそのまま出る（初代では SW の古い保存で何度も悩んだ）
// ・新しい版が届いて待っているときは onUpdate(go) を呼ぶ。画面で「更新する」を押したら go() → 入れかわって読みなおす
// ・画面が見えたとき、前に見に行ってから30分たっていたら、新しい版を見に行く（起動のたびにも自動で見に行く）
import { BUILD } from './config.js';
import * as power from './power.js';

let want = false;
let lastCheck = 0;

export const enabled = () => BUILD !== 'dev' && 'serviceWorker' in navigator;

export function start(onUpdate) {
  if (!enabled()) return;
  // 入れかわったら読みなおす（★ 自分で「更新する」を押したときだけ。初めて入ったときは読みなおさない）
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (want) location.reload(); });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const ready = () => {
      if (!reg.waiting || !navigator.serviceWorker.controller) return;
      onUpdate(() => {
        want = true;
        if (reg.waiting) reg.waiting.postMessage({ t: 'skip' });
      });
    };
    ready();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') ready(); });
    });
    lastCheck = Date.now();
    power.onVisible((v) => {
      if (v && Date.now() - lastCheck > 30 * 60 * 1000) {
        lastCheck = Date.now();
        reg.update().catch(() => {});
      }
    });
  }).catch((e) => console.warn('sw: 登録できませんでした', e));
}
