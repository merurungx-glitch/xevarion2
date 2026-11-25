// XEVARION II — Service Worker（1本だけ）
//
// ★ ここ（src/sw.js）は「ひな形」。tools/release.py が BUILD とファイルの一覧を入れて release/sw.js に書き出す。
//   手元の src（試験用サーバー 8800）では登録しない（core/swc.js：BUILD が 'dev' のときは使わない）
//
// ・一覧 FILES＝{ パス: [中身のハッシュ, 組] }。組：
//     shell   … 入れたときに保存する（起動に要るプログラムと、タイトルまでの絵）
//     app:<x> … そのアプリを初めて開いたときに、アプリのファイルをまとめて保存する（次からオフラインで遊べる）
//     lazy    … 表示したときに保存する（大きな絵など）
// ・保存は1つの箱（x2-files）。中身ごとにハッシュの札（x2-h）を付けておき、新しい版ではハッシュが変わったものだけ取り直す
//   （新しい版は、待っているあいだ別の箱に集め、入れかわるときに移す＝遊んでいる途中で古い版と混ざらない）
// ・新しい版は「待機」する。画面で「更新する」を押す（message 'skip'）と入れかわる。初めて入るときだけ、すぐ動く
// ・ほかのサイトで保存するのは Google Fonts と Firebase の SDK（版つきの URL）だけ。データ・サインインの通信はさわらない
const BUILD = '2026-11-26-1';
const FILES = {"apps/chainparty/css/front.css":["0f745e6dd75b","app:chainparty"],"apps/chainparty/css/style.css":["9fb466727779","app:chainparty"],"apps/chainparty/img/logo.webp":["5a0e87fa4c2a","app:chainparty"],"apps/chainparty/index.html":["5d1165c6810b","app:chainparty"],"apps/chainparty/js/chain-front.js":["214d43eb7e16","app:chainparty"],"apps/chainparty/js/game.js":["258a816f275f","app:chainparty"],"apps/chainparty/js/online.js":["2b4e5da86333","app:chainparty"],"apps/derby/css/md.css":["5e430a0ab9d7","app:derby"],"apps/derby/index.html":["34781d61b7a7","app:derby"],"apps/derby/js/md-bet.js":["ad0015f17aa5","app:derby"],"apps/derby/js/md-data.js":["7146f2ef25df","app:derby"],"apps/derby/js/md-help.js":["7a880283baf3","app:derby"],"apps/derby/js/md-intro.js":["b6048f5d31a3","app:derby"],"apps/derby/js/md-net.js":["ce85600134a5","app:derby"],"apps/derby/js/md-race.js":["13c2f0d78733","app:derby"],"apps/derby/js/md-ui.js":["776e200bee8c","app:derby"],"apps/guraplate/css/style.css":["c8fa3f7977fd","app:guraplate"],"apps/guraplate/css/xevarion.css":["3726635d2464","app:guraplate"],"apps/guraplate/img/logo.webp":["b188470c5663","app:guraplate"],"apps/guraplate/index.html":["a9f3a82fba8c","app:guraplate"],"apps/guraplate/js/account.js":["f5976c39805a","app:guraplate"],"apps/guraplate/js/audio.js":["67b9050447e4","app:guraplate"],"apps/guraplate/js/bgm.js":["859a0a07ef67","app:guraplate"],"apps/guraplate/js/game.js":["21ae6a773005","app:guraplate"],"apps/guraplate/js/physics.js":["cd8bca61f143","app:guraplate"],"apps/guraplate/js/render.js":["78f562474033","app:guraplate"],"apps/guraplate/js/setup.js":["c1a090c86c62","app:guraplate"],"apps/lex/css/mcl.css":["d21400f54bad","app:lex"],"apps/lex/index.html":["47e9a3c298e8","app:lex"],"apps/lex/js/mcl-bingo.js":["fe9b105523f3","app:lex"],"apps/lex/js/mcl-core.js":["66f5fefee769","app:lex"],"apps/lex/js/mcl-data.js":["f5982558ddaa","app:lex"],"apps/lex/js/mcl-data10.js":["7c47db3aba21","app:lex"],"apps/lex/js/mcl-data11.js":["ad96327ff3e8","app:lex"],"apps/lex/js/mcl-data12.js":["012a25b3c03c","app:lex"],"apps/lex/js/mcl-data2.js":["b4f5cea5c21c","app:lex"],"apps/lex/js/mcl-data3.js":["926d445c6556","app:lex"],"apps/lex/js/mcl-data4.js":["21b3444494bb","app:lex"],"apps/lex/js/mcl-data5.js":["5c8e19f3f947","app:lex"],"apps/lex/js/mcl-data6.js":["2a62a4517cd3","app:lex"],"apps/lex/js/mcl-data7.js":["fd3e640d26d7","app:lex"],"apps/lex/js/mcl-data8.js":["2644e5dacf6d","app:lex"],"apps/lex/js/mcl-data9.js":["59718e1eaec7","app:lex"],"apps/lex/js/mcl-fig.js":["bf8ddfaf38d0","app:lex"],"apps/lex/js/mcl-fig2.js":["32c8e53f217c","app:lex"],"apps/lex/js/mcl-fig3.js":["3e37a0dc11d7","app:lex"],"apps/lex/js/mcl-fig4.js":["a1df08634259","app:lex"],"apps/lex/js/mcl-fig5.js":["7a2fbdabd867","app:lex"],"apps/lex/js/mcl-route.js":["0ddabbd4825f","app:lex"],"apps/lex/js/mcl-ui.js":["2b8795c97f9f","app:lex"],"apps/quiz/css/quiz.css":["d60c6dfd02c8","app:quiz"],"apps/quiz/index.html":["4b742e3292ef","app:quiz"],"apps/quiz/js/quiz-account.js":["0154498e9e6d","app:quiz"],"apps/quiz/js/quiz-chem.js":["cbd9ec64f1db","app:quiz"],"apps/quiz/js/quiz-data.js":["c675bf1d1e88","app:quiz"],"apps/quiz/js/quiz-fx.js":["f2b9cac841c6","app:quiz"],"apps/quiz/js/quiz-host.js":["866b33b2a22f","app:quiz"],"apps/quiz/js/quiz-online.js":["799ada45040e","app:quiz"],"apps/quiz/js/quiz-pad.js":["e370b433677e","app:quiz"],"apps/quiz/js/quiz-play.js":["4ea81ae358a7","app:quiz"],"apps/quiz/js/quiz-qdata.js":["19bf090cfc81","app:quiz"],"apps/quiz/js/quiz-result.js":["6cd8c4e35542","app:quiz"],"apps/quiz/js/quiz-ui.js":["cedf1771256c","app:quiz"],"apps/shift/css/front.css":["88430bfa6ecf","app:shift"],"apps/shift/css/shift.css":["0de56e73ff00","app:shift"],"apps/shift/img/logo.webp":["802fd7023848","app:shift"],"apps/shift/index.html":["82368494de98","app:shift"],"apps/shift/js/shift-account.js":["7b874321c5f2","app:shift"],"apps/shift/js/shift-ai.js":["09c009dffcf5","app:shift"],"apps/shift/js/shift-core.js":["aae085c32804","app:shift"],"apps/shift/js/shift-front.js":["35c554857154","app:shift"],"apps/shift/js/shift-ui.js":["18f15fc45194","app:shift"],"apps/yacht/css/yacht.css":["006827a44435","app:yacht"],"apps/yacht/img/logo.webp":["51a371f1e61b","app:yacht"],"apps/yacht/index.html":["843fcfadff8a","app:yacht"],"apps/yacht/js/account.js":["c4deb14a4dff","app:yacht"],"apps/yacht/js/audio.js":["f1a626c4ba9c","app:yacht"],"apps/yacht/js/bgm.js":["cb4e1127da33","app:yacht"],"apps/yacht/js/dice3d.js":["d04741b54fc5","app:yacht"],"apps/yacht/js/game.js":["c85ce6c4d51c","app:yacht"],"apps/yacht/js/howto.js":["e51466acdb96","app:yacht"],"apps/yacht/js/rules.js":["08d367552cf3","app:yacht"],"apps/yacht/js/setup.js":["b45b7aeb9195","app:yacht"],"assets/apps/chain-192.webp":["c5d28091aa43","shell"],"assets/apps/chain-96.webp":["e12e6d1192a4","lazy"],"assets/apps/derby-192.webp":["7544ebdea210","shell"],"assets/apps/derby-96.webp":["4365a8d90f5f","lazy"],"assets/apps/gura-192.webp":["44d449381c31","shell"],"assets/apps/gura-96.webp":["58f59c96f850","lazy"],"assets/apps/ishida-192.webp":["b81f90f48638","shell"],"assets/apps/ishida-96.webp":["451d97a0b744","lazy"],"assets/apps/lex-192.webp":["5b16e9bb67cc","shell"],"assets/apps/lex-96.webp":["e02e75b83497","lazy"],"assets/apps/ngx-192.webp":["5f3628004818","shell"],"assets/apps/ngx-96.webp":["ccc338883c9a","lazy"],"assets/apps/quiz-192.webp":["5545f6217910","shell"],"assets/apps/quiz-96.webp":["15f70040ff76","lazy"],"assets/apps/shift-192.webp":["40779b3fc3bc","shell"],"assets/apps/shift-96.webp":["6d110a0d3ac4","lazy"],"assets/apps/yacht-192.webp":["f336b7d097c1","shell"],"assets/apps/yacht-96.webp":["956dcc826265","lazy"],"assets/brand/icon-180.png":["5063710eeaf2","shell"],"assets/brand/icon-192.png":["9affce6d319f","lazy"],"assets/brand/icon-32.png":["7886122da28c","lazy"],"assets/brand/icon-512.png":["a2301da38e31","lazy"],"assets/brand/icon-64.png":["993243f9a4e3","shell"],"assets/brand/icon-maskable-512.png":["6d363c08107f","lazy"],"assets/brand/ishida-on-dark-480.webp":["1a0a6dde74d5","shell"],"assets/brand/logo-640.webp":["f1e41b376b6f","shell"],"assets/brand/mark-256.webp":["3170d05eb494","shell"],"assets/brand/mark-512.webp":["82a042348d92","shell"],"assets/brand/ngx-on-dark-480.webp":["c635de09d51e","shell"],"assets/brand/wordmark-navy-560.webp":["d4547b8cfa58","shell"],"assets/brand/wordmark-white-560.webp":["a53b9f348bda","shell"],"assets/chara/mana/banner-470.webp":["3eda2d3b155c","lazy"],"assets/chara/mana/banner-940.webp":["20a8badc0e01","lazy"],"assets/chara/mana/face-256.webp":["f776fcfda97d","shell"],"assets/chara/mana/face-96.webp":["aa6daa44737d","shell"],"assets/chara/mana/full-1024.webp":["dc7dc39e8f77","shell"],"assets/chara/mana/full-512.webp":["35070bc73694","lazy"],"assets/chara/miduki/banner-470.webp":["5f5c6b9c05b0","lazy"],"assets/chara/miduki/banner-940.webp":["6f1888c42daf","lazy"],"assets/chara/miduki/face-256.webp":["ff4fc2407a30","shell"],"assets/chara/miduki/face-96.webp":["25cbbb5bd92c","shell"],"assets/chara/miduki/full-1024.webp":["35add0c39d50","shell"],"assets/chara/miduki/full-512.webp":["cb74f0b888f4","lazy"],"assets/chara/minase/banner-470.webp":["c857c390abc8","lazy"],"assets/chara/minase/banner-940.webp":["a87dfde7d1ea","lazy"],"assets/chara/minase/face-256.webp":["50b4760dcd33","shell"],"assets/chara/minase/face-96.webp":["6678ccada7fc","shell"],"assets/chara/minase/full-1024.webp":["0d5a0fd398c5","shell"],"assets/chara/minase/full-512.webp":["d978157a716a","lazy"],"assets/chara/sui/banner-470.webp":["8ae9a1d51e7f","lazy"],"assets/chara/sui/banner-940.webp":["1d20e9cf53db","lazy"],"assets/chara/sui/face-256.webp":["56972eec0229","shell"],"assets/chara/sui/face-96.webp":["508ddc098668","shell"],"assets/chara/sui/full-1024.webp":["91dbf7c2fbe0","shell"],"assets/chara/sui/full-512.webp":["190157868264","lazy"],"assets/chara/yuzuha/banner-470.webp":["c6c5edc085fb","lazy"],"assets/chara/yuzuha/banner-940.webp":["72b337edd235","lazy"],"assets/chara/yuzuha/face-256.webp":["600e27b82d2c","shell"],"assets/chara/yuzuha/face-96.webp":["6de40b9548d7","shell"],"assets/chara/yuzuha/full-1024.webp":["497798d37294","shell"],"assets/chara/yuzuha/full-512.webp":["e88b177de59a","lazy"],"assets/gacha/grand-debut-1200.webp":["ec37d99a1579","lazy"],"assets/gacha/grand-debut-600.webp":["e10a1961cb3d","lazy"],"assets/lobby/park-940.webp":["3100ce215035","lazy"],"assets/lobby/terrace-470.webp":["d078e2450e3a","shell"],"assets/lobby/terrace-940.webp":["6f84f7a4bc0b","lazy"],"assets/sites/apps/magiabyss-192.webp":["66ebf6f50b11","lazy"],"assets/sites/apps/magiarena-192.webp":["c4277b546098","lazy"],"assets/sites/apps/magibattle-192.webp":["f5b1e7d8b133","lazy"],"assets/sites/apps/magibocciarush-192.webp":["75b9d3c46f09","lazy"],"assets/sites/apps/magiburst-192.webp":["880173dd0303","lazy"],"assets/sites/apps/magichemlex-192.webp":["725f645eaac7","lazy"],"assets/sites/apps/magicounter-192.webp":["301a19878857","lazy"],"assets/sites/apps/magicraft-192.webp":["de43563063ac","lazy"],"assets/sites/apps/magidominiongrid-192.webp":["e53fad4d298a","lazy"],"assets/sites/apps/magiempire-192.webp":["b9ca23fe7470","lazy"],"assets/sites/apps/magifocus-192.webp":["bfa1bc638052","lazy"],"assets/sites/apps/magijackpot-192.webp":["ea66129e37c0","lazy"],"assets/sites/apps/magilink-192.webp":["b1ae6b5f967f","lazy"],"assets/sites/apps/magilotto-192.webp":["26f67454a98e","lazy"],"assets/sites/apps/magimanor-192.webp":["80e6aae9f0b9","lazy"],"assets/sites/apps/magimusic-192.webp":["0607420505b5","lazy"],"assets/sites/apps/magiportfolio-192.webp":["535a793908e2","lazy"],"assets/sites/apps/magirail-192.webp":["b091f3b198c2","lazy"],"assets/sites/apps/magiranking-192.webp":["13950b605194","lazy"],"assets/sites/apps/magiscope-192.webp":["f9b00cc7402b","lazy"],"assets/sites/apps/magitier-192.webp":["9855d1e32f67","lazy"],"assets/sites/apps/ordyxis-192.webp":["60a8e7aa3780","lazy"],"assets/sites/apps/ordyxis-512.webp":["e03e4d63a4e4","lazy"],"assets/sites/apps/xevarion-192.webp":["153b1b46d2ad","lazy"],"assets/sites/apps/xevynar-192.webp":["cefc2b7db6fd","lazy"],"assets/sites/brand/ishida-540.webp":["b1c14dd0549b","lazy"],"assets/sites/brand/kawagani-540.webp":["6bcf183f9de7","lazy"],"assets/sites/brand/magicalfuture-540.webp":["c118a9072e02","lazy"],"assets/sites/brand/ngx-540.webp":["07bd4c920355","lazy"],"assets/sites/brand/studiodoga-540.webp":["1a07a4cc5179","lazy"],"assets/sites/brand/yra-540.webp":["04a3e3ab90aa","lazy"],"assets/title/miduki-940.webp":["195a08f55e3c","shell"],"assets/title/miduki-blur.webp":["f1164d64720b","shell"],"assets/ui/gem-64.webp":["48a86ae1660b","shell"],"assets/ui/ticket-128.webp":["d4375810a002","shell"],"assets/ui/ticket-640.webp":["2dbeecd9d7aa","lazy"],"assets/ui/xeva-64.webp":["871d3213ba48","shell"],"core/account.js":["f885ee9d122a","shell"],"core/admin.js":["d3037de904b5","shell"],"core/appdata.js":["c2337dde2b85","shell"],"core/backend/firebase.js":["95b07781cade","shell"],"core/backend/index.js":["18bde72a7c61","shell"],"core/backend/local.js":["47f081f57f6e","shell"],"core/boot.js":["de3878646d24","shell"],"core/chara.js":["b62ee1628189","shell"],"core/clock.js":["214ded9aaec5","shell"],"core/config.js":["52cb64f91ae3","shell"],"core/daily.js":["c619ce437a13","shell"],"core/devnotes.js":["8f7a1b7734f6","shell"],"core/gacha.js":["f55b0a927143","shell"],"core/i18n.js":["7c4ee0fbba73","shell"],"core/mail.js":["88962dd93724","shell"],"core/merge.js":["326190402c9d","shell"],"core/news.js":["c9c0de8db6cc","shell"],"core/party.js":["52083adc7b8b","shell"],"core/power.js":["2a86245ee727","shell"],"core/rooms.js":["ce16be1072a5","shell"],"core/router.js":["6e63fb643c4a","shell"],"core/store.js":["9f9eb9fd754e","shell"],"core/swc.js":["a45ff94638d7","shell"],"core/sync.js":["801fae0ec1e5","shell"],"core/veteran.js":["698a18a0004a","shell"],"core/viewport.js":["1b6589c1a80c","shell"],"core/wallet.js":["b412cd88f9bc","shell"],"index.html":["21a7592e1b7c","shell"],"manifest.webmanifest":["a0aafc90a917","shell"],"portal/admin.css":["828326ff8adf","shell"],"portal/admin.js":["efdcd61d5b18","shell"],"portal/app-host.js":["067c67b69d51","shell"],"portal/apps.js":["fe355cca9c7c","shell"],"portal/auth.js":["6d5eb7849bdf","shell"],"portal/bridge.js":["c23bc13b466c","shell"],"portal/chara.js":["f324c73fe19b","shell"],"portal/derby-sign.js":["64e3374c8e77","shell"],"portal/devnotes-data.js":["b506a118541a","shell"],"portal/devnotes.css":["44aeb1db2f9d","shell"],"portal/devnotes.js":["87b40fd76069","shell"],"portal/first.js":["61dde3689753","shell"],"portal/fx.css":["4416d112caa6","shell"],"portal/gacha-result.js":["e933a9b94e81","shell"],"portal/gacha.js":["8512f0273cd0","shell"],"portal/home.js":["dc858de1c006","shell"],"portal/intro.js":["17a10c8d5350","shell"],"portal/live-rigs.js":["f17f1bccc64b","shell"],"portal/live.js":["7e253f94b186","shell"],"portal/lobby.js":["5189aa96e22e","shell"],"portal/lobbyset.js":["3552f59ff0cd","shell"],"portal/logbo.js":["caba66a6883f","shell"],"portal/mail.js":["b81035e60850","shell"],"portal/menu.js":["dafcd1854312","shell"],"portal/missions.js":["611e442d6b98","shell"],"portal/news-data.js":["5730f867f212","shell"],"portal/news.js":["d12762dc0b53","shell"],"portal/portal.css":["fc5da2d5548c","shell"],"portal/routes.js":["dae5249775fd","shell"],"portal/shell.js":["e7af3465026a","shell"],"portal/title.js":["24a625a48370","shell"],"portal/veteran.js":["ea90a3a5f19c","shell"],"portal/wallet-sheet.js":["23bfa8996930","shell"],"sites/ishida/css/style.css":["322fca0de961","lazy"],"sites/ishida/index.html":["30532d5c1c11","lazy"],"sites/ishida/js/main.js":["bfecf3637426","lazy"],"sites/ngx/index.html":["3bc407905d2f","lazy"],"ui/base.css":["3f4b4e3f7869","shell"],"ui/components.css":["8d8180720498","shell"],"ui/dom.js":["b85ababa534d","shell"],"ui/earn.js":["395fb07d33a2","shell"],"ui/fx.js":["fb48f46ddba4","shell"],"ui/icons.js":["094744d6a64e","shell"],"ui/loading.js":["911eaace79b6","shell"],"ui/sheet.js":["35d70025a610","shell"],"ui/toast.js":["b580dc2809b3","shell"],"ui/tokens.css":["c54ccc9ec099","shell"]};

const LIVE = 'x2-files';
const STAGE = 'x2-stage-' + BUILD;
const EXT = 'x2-ext';
const EXT_MAX = 60;
const BASE = new URL('./', self.location).href;
const BASE_PATH = new URL(BASE).pathname;

/** URL → 一覧のパス（? と # は見ない。「…/」は「…/index.html」） */
function rel(href) {
  const u = new URL(href);
  let p = decodeURIComponent(u.pathname);
  if (!p.startsWith(BASE_PATH)) return null;
  p = p.slice(BASE_PATH.length);
  if (p === '' || p.endsWith('/')) p += 'index.html';
  return p;
}
const hashOf = (res) => (res ? res.headers.get('x2-h') : null);
const groupOf = (p) => (FILES[p] ? FILES[p][1] : '');

/** 同時に n 本まで */
async function pool(list, n, fn) {
  let i = 0;
  const run = async () => { while (i < list.length) { const k = i++; try { await fn(list[k]); } catch (e) { /* 1つ失敗してもほかは続ける */ } } };
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, run));
}

/** 取ってきて、ハッシュの札を付ける（★ GitHub Pages の10分のキャッシュは使わない＝いつも確かめる） */
async function fetchFile(p) {
  const res = await fetch(BASE + p, { cache: 'no-cache' });
  if (!res.ok) throw new Error(p + ' ' + res.status);
  const headers = new Headers(res.headers);
  headers.set('x2-h', FILES[p][0]);
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers });
}

// ---- 入れる：shell のうち、変わったものだけを待機の箱へ ----
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const live = await caches.open(LIVE);
    const stage = await caches.open(STAGE);
    const want = Object.keys(FILES).filter((p) => groupOf(p) === 'shell');
    let bad = 0;
    await pool(want, 6, async (p) => {
      const old = await live.match(BASE + p);
      if (old && hashOf(old) === FILES[p][0]) return;
      const st = await stage.match(BASE + p);
      if (st && hashOf(st) === FILES[p][0]) return;
      try { await stage.put(BASE + p, await fetchFile(p)); } catch (err) { bad++; throw err; }
    });
    if (bad) throw new Error('shell: ' + bad + ' 件を取れませんでした');   // 足りないまま入らない（次の機会にやり直す）
    if (!self.registration.active) self.skipWaiting();   // 初めて入るときは、すぐ動く
  })());
});

// ---- 入れかわる：待機の箱を移して、古いものを消す ----
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const live = await caches.open(LIVE);
    const stage = await caches.open(STAGE);
    for (const req of await stage.keys()) await live.put(req, await stage.match(req));
    for (const req of await live.keys()) {
      const p = rel(req.url);
      const f = p && FILES[p];
      if (!f) { await live.delete(req); continue; }
      if (hashOf(await live.match(req)) !== f[0]) await live.delete(req);
    }
    for (const k of await caches.keys()) if (k.startsWith('x2-stage-')) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.t === 'skip') self.skipWaiting();
});

// ---- 出す ----
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    const p = rel(url.href);
    if (!p || !FILES[p]) return;   // 一覧に無いもの（sw.js など）は SW を通さない
    e.respondWith(serve(p, e));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || /^https:\/\/www\.gstatic\.com\/firebasejs\//.test(url.href)) {
    e.respondWith(ext(e, url));
  }
});

async function serve(p, e) {
  const f = FILES[p];
  const live = await caches.open(LIVE);
  const hit = await live.match(BASE + p);
  const app = f[1].startsWith('app:') ? f[1] : '';
  if (hit && hashOf(hit) === f[0]) {
    if (app) e.waitUntil(warm(app));
    return hit;
  }
  try {
    const res = await fetchFile(p);
    await live.put(BASE + p, res.clone());
    if (app) e.waitUntil(warm(app));
    return res;
  } catch (err) {
    if (hit) return hit;   // 古い版のものでも、無いよりは出す
    if (e.request.mode === 'navigate') return offlinePage(p);
    return Response.error();
  }
}

/** アプリを初めて開いたとき：そのアプリのファイルをまとめて保存（この SW が動いているあいだに1回） */
const warmed = new Set();
async function warm(g) {
  if (warmed.has(g)) return;
  warmed.add(g);
  const live = await caches.open(LIVE);
  const list = Object.keys(FILES).filter((p) => FILES[p][1] === g);
  await pool(list, 4, async (p) => {
    const old = await live.match(BASE + p);
    if (old && hashOf(old) === FILES[p][0]) return;
    await live.put(BASE + p, await fetchFile(p));
  });
}

/** Google Fonts・Firebase の SDK：フォントの本体と SDK は版つき＝保存したものをそのまま。フォントの CSS は保存したものを出して裏で新しく */
async function ext(e, url) {
  const c = await caches.open(EXT);
  const hit = await c.match(e.request);
  const keep = url.hostname !== 'fonts.googleapis.com';
  if (hit && keep) return hit;
  const net = fetch(e.request).then(async (res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      await c.put(e.request, res.clone());
      const keys = await c.keys();
      for (let i = 0; i < keys.length - EXT_MAX; i++) await c.delete(keys[i]);
    }
    return res;
  }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await net) || Response.error();
}

/** 通信できないうえに保存も無いとき（まだ開いたことのないアプリなど） */
function offlinePage(p) {
  const inApp = p.startsWith('apps/');
  const html = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>オフライン</title><style>html,body{margin:0;height:100%;background:#0b0e1f;color:#eef1ff;font-family:system-ui,-apple-system,"Hiragino Sans",sans-serif}' +
    'main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box;text-align:center}' +
    'b{font-size:18px}p{margin:0;color:#aab2d6;font-size:14px;line-height:1.8;max-width:420px}' +
    'button{margin-top:6px;padding:12px 26px;border:0;border-radius:99px;background:linear-gradient(90deg,#3a6bff,#9a3dff 62%,#e35bff);color:#fff;font:inherit;font-weight:800;font-size:15px}</style></head><body><main>' +
    '<b>オフラインです</b>' +
    (inApp
      ? '<p>このアプリは、まだこの端末に入っていません。通信できるときに一度ひらくと、次からはオフラインでも遊べます。</p><button onclick="try{parent.X2.exit()}catch(e){history.back()}">もどる</button>'
      : '<p>通信できるときに、もう一度ひらいてください。一度ひらくと、次からはオフラインでも起動できます。</p><button onclick="location.reload()">もう一度ためす</button>') +
    '</main></body></html>';
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
