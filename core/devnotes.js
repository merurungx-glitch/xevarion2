// XEVARION II — デベロッパーノートの「読んだ印」（★ 2026-11-25 第7回 DN1。手紙の中身は portal/devnotes-data.js・手紙と一覧は portal/devnotes.js）
// ・dnSeen（flags・アカウントで同期）＝ 読んだ手紙の id。まだ読んでいない新しい手紙は、更新のあとにホームへ来たとき1回ひらく
// ・キーは boot.js でこのファイルを読みこんで、同期の最初の読みこみより前に登録する
import * as store from './store.js';

store.define('dnSeen', { kind: 'flags' });

export const isSeen = (id) => !!store.get('dnSeen')[id];
/** 手紙 id を読んだ */
export function markSeen(id) {
  if (store.userId() && id && !isSeen(id)) store.flag('dnSeen', id);
}
export const onSeen = (fn) => store.on('dnSeen', fn);
