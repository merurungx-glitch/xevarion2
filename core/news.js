// XEVARION II — お知らせの「読んだ印」（中身と板は portal/news.js・portal/news-data.js）
// ・newsSeen（lww・アカウントで同期）＝ 読んだ中でいちばん新しいお知らせの時刻。これより新しいものに NEW が付く
// ・キーは boot.js でこのファイルを読みこんで、同期の最初の読みこみより前に登録する
import * as store from './store.js';

store.define('newsSeen', { kind: 'lww', def: 0 });

export const seen = () => Number(store.get('newsSeen')) || 0;
/** 時刻 at まで読んだ（前より新しいときだけ書く） */
export function markSeen(at) {
  if (store.userId() && Number(at) > seen()) store.set('newsSeen', Number(at));
}
export const onSeen = (fn) => store.on('newsSeen', fn);
