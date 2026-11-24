// XEVARION II — はじまり特典（B1）：初代 XEVARION のアカウント（表示名＋4桁 PIN）を1回確かめた人に
//   ガチャチケット30枚＋30,000 XEVA＋プロフィールの「初代」の印（docs/decisions.md「初代 XEVARION からの引き継ぎ」）
// ・初代のアカウントは読むだけ（書きかえない）。PIN は送らず、この端末の中で初代と同じ形（SHA-256「xevarion-pin:」＋PIN）にして照らし合わせる
// ・初代のアカウント1つにつき1回：受け取った記録を xevarion2 の veteran/<初代の uid> に残す（ルールで1回しか書けない・中は II の uid）
// ・XEVARION II のアカウント1つにつき1回：自分の記録 vet（lww・同期）＝ { old: 初代の uid, name: 初代の表示名, at }
// ・受け取るまえにクラウドの最新を読む（ほかの端末で受け取りずみなら二度もらわない）。書いたらすぐ送る
// ・手元（localhost）は backend/local.js の試験用の初代アカウントだけ（docs/testing.md）。本物の初代も xevarion2 もさわらない
import * as store from './store.js';
import * as wallet from './wallet.js';
import * as sync from './sync.js';
import { backend } from './backend/index.js';
import { serverNow } from './clock.js';

store.define('vet', { kind: 'lww' });

/** 渡すもの（全員同じ）。「初代」の印は vet の記録そのもの */
export const GIFT = { ticket: 30, xeva: 30000 };

/** 受け取っていれば { old, name, at }・まだなら null */
export function mark() {
  const v = store.get('vet');
  return v && typeof v === 'object' && v.old ? v : null;
}
export const onMark = (fn) => store.on('vet', fn);

/** 初代と同じ PIN の形（初代 xevarion-fb.js の hashPw と同じ） */
export async function hashPin(pin) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('xevarion-pin:' + String(pin ?? '')));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
/** 初代で SubtleCrypto が使えなかった端末が保存した形（「f」＋32bit） */
function hashPinOld(pin) {
  const s = String(pin ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return 'f' + (h >>> 0).toString(16);
}
/** 初代の表示名の比べ方（初代 lowerName と同じ） */
export const normName = (n) => String(n ?? '').trim().toLowerCase();
const KEY_OK = /^[^.#$[\]/]{1,128}$/;

/**
 * 確かめて受け取る。
 * @returns {Promise<{ok:true, items:object, name:string}|{ok:false, code:string}>}
 *   code：'done'（この II アカウントは受け取りずみ）・'notfound'・'nopin'（初代で PIN を決めていない）・'badpin'・
 *         'taken'（その初代アカウントはほかの II アカウントで受け取りずみ）・'network'・そのほか
 */
export async function claim(name, pin) {
  const me = store.userId();
  if (!me) return { ok: false, code: 'no-auth' };
  await sync.pullNow().catch(() => false);
  if (mark()) return { ok: false, code: 'done' };
  const lower = normName(name);
  if (!lower) return { ok: false, code: 'notfound' };
  const be = await backend();

  // ① 初代のアカウントを表示名で引く（読むだけ）
  let rows;
  try { rows = await be.oldAccounts(lower); } catch (e) { return { ok: false, code: e?.code || 'network' }; }
  rows = (rows || []).filter((r) => r && KEY_OK.test(r.uid) && normName(r.name) === lower);
  if (!rows.length) return { ok: false, code: 'notfound' };
  const withPin = rows.filter((r) => r.h);
  if (!withPin.length) return { ok: false, code: 'nopin' };
  const h = await hashPin(pin);
  const h2 = hashPinOld(pin);
  const hit = withPin.find((r) => r.h === h || (r.h.length < 20 && r.h === h2));
  if (!hit) return { ok: false, code: 'badpin' };

  // ② 初代のアカウント1つにつき1回（だれも受け取っていなければ自分の uid で書く・自分の記録ならつづきから）
  const path = `veteran/${hit.uid}`;
  let rec = null;
  try {
    rec = (await be.rt.txn(path, (cur) => (cur ? undefined : { uid: me, at: serverNow() }))).value;
  } catch (e) {
    // 書けなかった（ルールで拒否など）：記録が読めれば、それで決める
    try { rec = await be.rt.get(path); } catch { return { ok: false, code: 'network' }; }
    if (!rec) return { ok: false, code: /permission|denied/i.test(String(e?.code || e?.message || '')) ? 'denied' : 'network' };
  }
  if (!rec || rec.uid !== me) return { ok: false, code: 'taken' };

  // ③ 渡す（直前にもう一度だけ最新を読む＝同じアカウントのほかの端末で受け取ったとき）
  await sync.pullNow().catch(() => false);
  if (store.userId() !== me) return { ok: false, code: 'no-auth' };
  if (mark()) return { ok: false, code: 'done' };
  store.set('vet', { old: hit.uid, name: String(hit.name).trim().slice(0, 20), at: serverNow() });
  for (const [k, n] of Object.entries(GIFT)) wallet.add(k, n);
  sync.pushNow().catch(() => {});
  return { ok: true, items: { ...GIFT }, name: String(hit.name).trim() };
}
