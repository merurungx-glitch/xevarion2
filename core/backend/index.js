// XEVARION II — 裏方（アカウントとクラウド）の入口
// 手元（localhost）＝ local.js（この端末の中だけで動く試験用）／公開＝ firebase.js
// ★ 手元から本物の Firebase に書かない作りにしてある（初代で試験中に本物のデータを消した反省）
import { BACKEND } from '../config.js';

let mod = null;
export async function backend() {
  if (!mod) mod = BACKEND === 'local' ? await import('./local.js') : await import('./firebase.js');
  return mod;
}
