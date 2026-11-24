// XEVARION II — サーバーの時刻（端末の時計のずれをなくす・Firebase の .info/serverTimeOffset）
// ・見張りは1つだけ（はじめて呼ばれたときに始める）。手元の試験（裏方 local）ではずれ 0＝端末の時計
// ・使うところ：部屋（core/rooms.js）・ログボやミッションの日付（core/daily.js）・アプリの X2.now()
// ★ rooms.js から分けた（2026-11-24）：daily.js は起動で読むので、部屋のしくみまで起動で読まないように
import { backend } from './backend/index.js';

let skew = 0;
let skewP = null;
export function serverNow() {
  if (!skewP) skewP = backend().then((be) => { if (be.rt.offset) be.rt.offset((ms) => { skew = Number(ms) || 0; }); }).catch(() => {});
  return Date.now() + skew;
}
