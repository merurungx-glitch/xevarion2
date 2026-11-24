// XEVARION II — 運営（管理画面 portal/admin.js とメニューだけが使う・起動では読まない）
// ・運営かどうか＝ admins/<uid> が true（Firebase コンソールの Realtime Database で運営が自分で入れる。ルールで本人だけ読める）
// ・書く場所：お知らせ news/<id>・メール mail/all/<id>／mail/to/<ID>/<id>・コード codes/<コード>（どれもルールで運営だけが書ける）
// ・手元（localhost）は x2dev.rtdb の中だけ（メニューの「試験用：運営にする」で admins/<uid> を入れる）
import * as store from './store.js';
import { backend } from './backend/index.js';
import { serverNow } from './clock.js';

let yes = null; // 運営だと分かった uid（いいえは毎回聞きなおす＝コンソールで入れたあと、すぐ出るように）

/** このアカウントは運営か */
export async function isAdmin() {
  const uid = store.userId();
  if (!uid) return false;
  if (yes === uid) return true;
  try {
    const be = await backend();
    const v = await be.rt.get(`admins/${uid}`);
    if (v === true && store.userId() === uid) { yes = uid; return true; }
  } catch (e) { console.warn('admin: 読めませんでした', e); }
  return false;
}

/** 新しい記録の名前（時刻＋でたらめ・ルールの形 A〜Z a〜z 0〜9 _ - に合う） */
export const newId = () => serverNow().toString(36) + Math.random().toString(36).slice(2, 8);

/** 読む（無ければ {}） */
export async function read(path) {
  const be = await backend();
  const v = await be.rt.get(path);
  return v && typeof v === 'object' ? v : {};
}
/** 書く（null で消す） */
export async function write(path, value) {
  const be = await backend();
  await be.rt.set(path, value);
}

/** コードを作るときの文字（見まちがえやすい 0 O 1 I L はのぞく） */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function randomCode(n = 8) {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return [...a].map((x) => CODE_CHARS[x % CODE_CHARS.length]).join('');
}

/** 試験用（手元だけ）：このアカウントを運営にする／やめる */
export async function devSetAdmin(on) {
  const uid = store.userId();
  if (!uid) return;
  const be = await backend();
  if (be.name !== 'local') throw new Error('手元の試験モードだけ');
  await be.rt.set(`admins/${uid}`, on ? true : null);
  yes = on ? uid : null;
}
