// XEVARION II — 起動
// 順番：見た目の準備 → 動作モード → 画面の枠 → 画面の切りかえ開始 → アカウント（裏で準備）
import { IS_DEV } from './config.js';
import * as store from './store.js';
import * as power from './power.js';
import * as viewport from './viewport.js';
import * as account from './account.js';
import * as router from './router.js';
import { firstTenDone } from './gacha.js';
import { t } from './i18n.js';
import { installIconDefs } from '../ui/icons.js';
import { showLoading } from '../ui/loading.js';
import * as party from './party.js';
import './appdata.js'; // アプリの同期する記録（MagiLex・MagiDerby）のキーを、同期の最初の読みこみより前に登録する
import './daily.js';   // ログボ・ミッション・今日のチケットのキーも同じく（appdata のあと：ミッションが MagiLex の記録を読む）
import './news.js';    // お知らせの読んだ印（newsSeen）も同じく
import './devnotes.js'; // デベロッパーノートの読んだ印（dnSeen）も同じく
import './veteran.js'; // はじまり特典の記録（vet＝プロフィールの「初代」の印）も同じく
import './mail.js';    // メール・コードの受け取った印（mailgot・codegot）も同じく
import { toast } from '../ui/toast.js';
import { fmt } from '../ui/dom.js';
import * as swc from './swc.js';
import { buildShell, onRoute } from '../portal/shell.js';
import { ROUTES, appById } from '../portal/routes.js';

installIconDefs();
viewport.init();
power.init();
buildShell(document.getElementById('app'));

if (IS_DEV) {
  const bar = document.createElement('div');
  bar.className = 'x-devbar';
  bar.textContent = t('dev.bar');
  document.body.appendChild(bar);
}

router.configure({
  routes: ROUTES,
  onShow: (name, R) => {
    onRoute(name, R);
    if (updGo) setTimeout(showUpdate, 600); // 新しい版の知らせ：アプリからもどったときなどに
  },
  loading: () => showLoading({ delay: 400 }), // 画面の読みこみが 0.4 秒をこえたらロード画面（C）
  guard(name, params) {
    const R = ROUTES[name];
    const signed = !!account.current();
    if (!R.public && !signed) {
      if (name !== 'title') router.setPending([name, ...params].join('/'));
      return 'title';
    }
    if (name === 'auth' && signed) return 'home';
    if (signed && (R.tab || R.app) && !firstTenDone()) return 'first'; // 最初の10連をひくまではホームにもアプリにも入らない
    return null;
  },
});

// パーティーの賞金：送り待ちを送る・自分あての受け取り箱を取り出す（サインインのあと・画面にもどったとき）
party.init();
party.onGift(({ sum, apps }) => {
  const names = apps.map((id) => appById(id)?.name || id).join('・') || 'XEVARION II';
  toast(t('party.got', { n: fmt(sum), apps: names }));
  import('../ui/earn.js').then((m) => m.earnFly({ xeva: sum })).catch(() => {});
});

// オフライン（Service Worker）：配った版だけ。新しい版が待っていたら「更新する／あとで」を聞く
// ★ アプリで遊んでいるあいだ・タイトルより前は聞かない（もどったときに聞く）。「あとで」なら、この起動のあいだはもう聞かない
let updGo = null;
let updAsked = false;
function showUpdate() {
  const name = router.currentName();
  if (!updGo || updAsked || name === 'app' || name === 'title' || name === 'auth' || name === '') return;
  updAsked = true;
  import('../ui/sheet.js').then(({ openSheet }) => openSheet({
    title: t('upd.title'),
    body: `<p style="margin:2px 0 6px;font-size:14.5px;line-height:1.7">${t('upd.body')}</p>`,
    actions: [{ label: t('upd.later'), kind: 'secondary', value: false }, { label: t('upd.go'), kind: 'primary', value: true }],
  }).closed).then((v) => { if (v === true) updGo(); });
}

router.start();
account.start().then(() => {
  // 利用状況の送信は、起動が落ちついてから（公開版で、設定がオンのときだけ）
  if (!IS_DEV && store.get('analytics') !== false) setTimeout(() => account.analytics(true), 8000);
  // Service Worker は起動が落ちついてから（最初の画面の読みこみとぶつけない）
  setTimeout(() => swc.start((go) => { updGo = go; showUpdate(); }), 2500);
});

// サインアウトしたら（別のタブ・期限切れなども）タイトルへ
account.onChange((u) => {
  if (!u && account.isReady() && !ROUTES[router.currentName()]?.public) router.go('title', { replace: true });
});
