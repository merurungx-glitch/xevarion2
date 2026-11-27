// XEVARION II — Service Worker（1本だけ）
//
// ★ ここ（src/sw.js）は「ひな形」。tools/release.py が BUILD とファイルの一覧を入れて release/sw.js に書き出す。
//   手元の src（試験用サーバー 8800）では登録しない（core/swc.js：BUILD が 'dev' のときは使わない）
//
// ・一覧 FILES＝{ パス: [中身のハッシュ, 組, 大きさ（バイト・2026-11-28〜）] }。組：
//     shell   … 入れたときに保存する（起動に要るプログラムと、タイトルまでの絵）
//     app:<x> … そのアプリを初めて開いたときに、アプリのファイルをまとめて保存する（次からオフラインで遊べる）
//     lazy    … 表示したときに保存する（大きな絵など）
// ・保存は1つの箱（x2-files）。中身ごとにハッシュの札（x2-h）を付けておき、新しい版ではハッシュが変わったものだけ取り直す
//   （新しい版は、待っているあいだ別の箱に集め、入れかわるときに移す＝遊んでいる途中で古い版と混ざらない）
// ・新しい版は「待機」する。画面で「更新する」を押す（message 'skip'）と入れかわる。初めて入るときだけ、すぐ動く
// ・ほかのサイトで保存するのは Google Fonts と Firebase の SDK（版つきの URL）だけ。データ・サインインの通信はさわらない
const BUILD = '2026-11-28-1';
const FILES = {"apps/chainparty/css/front.css":["0f745e6dd75b","app:chainparty",23677],"apps/chainparty/css/style.css":["9fb466727779","app:chainparty",43517],"apps/chainparty/img/logo.webp":["5a0e87fa4c2a","app:chainparty",47792],"apps/chainparty/index.html":["5d1165c6810b","app:chainparty",13031],"apps/chainparty/js/chain-front.js":["214d43eb7e16","app:chainparty",26209],"apps/chainparty/js/game.js":["258a816f275f","app:chainparty",87423],"apps/chainparty/js/online.js":["2b4e5da86333","app:chainparty",4035],"apps/derby/css/md.css":["5e430a0ab9d7","app:derby",77804],"apps/derby/index.html":["34781d61b7a7","app:derby",6044],"apps/derby/js/md-bet.js":["ad0015f17aa5","app:derby",38778],"apps/derby/js/md-data.js":["7146f2ef25df","app:derby",10803],"apps/derby/js/md-help.js":["7a880283baf3","app:derby",17827],"apps/derby/js/md-intro.js":["b6048f5d31a3","app:derby",24730],"apps/derby/js/md-net.js":["ce85600134a5","app:derby",17502],"apps/derby/js/md-race.js":["13c2f0d78733","app:derby",32346],"apps/derby/js/md-ui.js":["776e200bee8c","app:derby",112287],"apps/guraplate/css/style.css":["c8fa3f7977fd","app:guraplate",9865],"apps/guraplate/css/xevarion.css":["3726635d2464","app:guraplate",28532],"apps/guraplate/img/logo.webp":["b188470c5663","app:guraplate",45022],"apps/guraplate/index.html":["a9f3a82fba8c","app:guraplate",6812],"apps/guraplate/js/account.js":["f5976c39805a","app:guraplate",5245],"apps/guraplate/js/audio.js":["67b9050447e4","app:guraplate",5338],"apps/guraplate/js/bgm.js":["859a0a07ef67","app:guraplate",10723],"apps/guraplate/js/game.js":["21ae6a773005","app:guraplate",36278],"apps/guraplate/js/physics.js":["cd8bca61f143","app:guraplate",30128],"apps/guraplate/js/render.js":["78f562474033","app:guraplate",27479],"apps/guraplate/js/setup.js":["c1a090c86c62","app:guraplate",37940],"apps/lex/css/mcl.css":["d21400f54bad","app:lex",156135],"apps/lex/index.html":["47e9a3c298e8","app:lex",7253],"apps/lex/js/mcl-bingo.js":["fe9b105523f3","app:lex",37276],"apps/lex/js/mcl-core.js":["66f5fefee769","app:lex",56728],"apps/lex/js/mcl-data.js":["f5982558ddaa","app:lex",117579],"apps/lex/js/mcl-data10.js":["7c47db3aba21","app:lex",63359],"apps/lex/js/mcl-data11.js":["ad96327ff3e8","app:lex",54439],"apps/lex/js/mcl-data12.js":["012a25b3c03c","app:lex",71425],"apps/lex/js/mcl-data2.js":["b4f5cea5c21c","app:lex",117622],"apps/lex/js/mcl-data3.js":["926d445c6556","app:lex",110368],"apps/lex/js/mcl-data4.js":["21b3444494bb","app:lex",87644],"apps/lex/js/mcl-data5.js":["5c8e19f3f947","app:lex",92289],"apps/lex/js/mcl-data6.js":["2a62a4517cd3","app:lex",98181],"apps/lex/js/mcl-data7.js":["fd3e640d26d7","app:lex",108461],"apps/lex/js/mcl-data8.js":["2644e5dacf6d","app:lex",104877],"apps/lex/js/mcl-data9.js":["59718e1eaec7","app:lex",95024],"apps/lex/js/mcl-fig.js":["bf8ddfaf38d0","app:lex",25996],"apps/lex/js/mcl-fig2.js":["32c8e53f217c","app:lex",18074],"apps/lex/js/mcl-fig3.js":["3e37a0dc11d7","app:lex",14331],"apps/lex/js/mcl-fig4.js":["a1df08634259","app:lex",18285],"apps/lex/js/mcl-fig5.js":["7a2fbdabd867","app:lex",15740],"apps/lex/js/mcl-route.js":["0ddabbd4825f","app:lex",92536],"apps/lex/js/mcl-ui.js":["2b8795c97f9f","app:lex",184000],"apps/quiz/css/quiz.css":["d60c6dfd02c8","app:quiz",81345],"apps/quiz/index.html":["4b742e3292ef","app:quiz",4501],"apps/quiz/js/quiz-account.js":["0154498e9e6d","app:quiz",6244],"apps/quiz/js/quiz-chem.js":["cbd9ec64f1db","app:quiz",5122],"apps/quiz/js/quiz-data.js":["c675bf1d1e88","app:quiz",10266],"apps/quiz/js/quiz-fx.js":["f2b9cac841c6","app:quiz",23754],"apps/quiz/js/quiz-host.js":["866b33b2a22f","app:quiz",19470],"apps/quiz/js/quiz-online.js":["799ada45040e","app:quiz",43633],"apps/quiz/js/quiz-pad.js":["e370b433677e","app:quiz",20042],"apps/quiz/js/quiz-play.js":["4ea81ae358a7","app:quiz",58529],"apps/quiz/js/quiz-qdata.js":["19bf090cfc81","app:quiz",304200],"apps/quiz/js/quiz-result.js":["6cd8c4e35542","app:quiz",20462],"apps/quiz/js/quiz-ui.js":["cedf1771256c","app:quiz",53160],"apps/shift/css/front.css":["88430bfa6ecf","app:shift",22138],"apps/shift/css/shift.css":["0de56e73ff00","app:shift",55691],"apps/shift/img/logo.webp":["802fd7023848","app:shift",33834],"apps/shift/index.html":["82368494de98","app:shift",9367],"apps/shift/js/shift-account.js":["7b874321c5f2","app:shift",4468],"apps/shift/js/shift-ai.js":["09c009dffcf5","app:shift",12683],"apps/shift/js/shift-core.js":["aae085c32804","app:shift",27195],"apps/shift/js/shift-front.js":["35c554857154","app:shift",26233],"apps/shift/js/shift-ui.js":["18f15fc45194","app:shift",85380],"apps/yacht/css/yacht.css":["006827a44435","app:yacht",66515],"apps/yacht/img/logo.webp":["51a371f1e61b","app:yacht",79040],"apps/yacht/index.html":["843fcfadff8a","app:yacht",5595],"apps/yacht/js/account.js":["c4deb14a4dff","app:yacht",6011],"apps/yacht/js/audio.js":["f1a626c4ba9c","app:yacht",5992],"apps/yacht/js/bgm.js":["cb4e1127da33","app:yacht",11465],"apps/yacht/js/dice3d.js":["d04741b54fc5","app:yacht",82669],"apps/yacht/js/game.js":["c85ce6c4d51c","app:yacht",35972],"apps/yacht/js/howto.js":["e51466acdb96","app:yacht",10368],"apps/yacht/js/rules.js":["08d367552cf3","app:yacht",13058],"apps/yacht/js/setup.js":["b45b7aeb9195","app:yacht",35526],"assets/apps/chain-192.webp":["c5d28091aa43","shell",16204],"assets/apps/chain-96.webp":["e12e6d1192a4","lazy",5034],"assets/apps/derby-192.webp":["7544ebdea210","shell",17290],"assets/apps/derby-96.webp":["4365a8d90f5f","lazy",5224],"assets/apps/gura-192.webp":["44d449381c31","shell",14676],"assets/apps/gura-96.webp":["58f59c96f850","lazy",4786],"assets/apps/ishida-192.webp":["b81f90f48638","shell",2106],"assets/apps/ishida-96.webp":["451d97a0b744","lazy",922],"assets/apps/lex-192.webp":["5b16e9bb67cc","shell",5372],"assets/apps/lex-96.webp":["e02e75b83497","lazy",2052],"assets/apps/ngx-192.webp":["5f3628004818","shell",2448],"assets/apps/ngx-96.webp":["ccc338883c9a","lazy",1006],"assets/apps/quiz-192.webp":["5545f6217910","shell",5754],"assets/apps/quiz-96.webp":["15f70040ff76","lazy",2486],"assets/apps/shift-192.webp":["40779b3fc3bc","shell",11558],"assets/apps/shift-96.webp":["6d110a0d3ac4","lazy",4112],"assets/apps/yacht-192.webp":["f336b7d097c1","shell",15904],"assets/apps/yacht-96.webp":["956dcc826265","lazy",5220],"assets/brand/app-icon-256.webp":["51e1e04149d4","shell",13946],"assets/brand/icon-180.png":["dc772935ee57","shell",39608],"assets/brand/icon-192.png":["85b47459352c","lazy",46270],"assets/brand/icon-32.png":["7be66e515bf5","lazy",2402],"assets/brand/icon-512.png":["429093f46af9","lazy",272212],"assets/brand/icon-64.png":["5d518b1c4b39","shell",7381],"assets/brand/icon-maskable-512.png":["f05e32b172c1","lazy",191466],"assets/brand/ishida-on-dark-480.webp":["1a0a6dde74d5","shell",24584],"assets/brand/logo-card-640.webp":["35d9653f5309","lazy",20350],"assets/brand/mark-256.webp":["af6928b6057c","shell",17616],"assets/brand/mark-512.webp":["06a3881d57eb","shell",39950],"assets/brand/ngx-on-dark-480.webp":["c635de09d51e","shell",27050],"assets/brand/wordmark-navy-560.webp":["5c6cc35f2d11","shell",13468],"assets/chara/mana/banner-470.webp":["3eda2d3b155c","lazy",50134],"assets/chara/mana/banner-940.webp":["20a8badc0e01","lazy",145596],"assets/chara/mana/face-256.webp":["f776fcfda97d","shell",15502],"assets/chara/mana/face-96.webp":["aa6daa44737d","shell",2576],"assets/chara/mana/full-1024.webp":["dc7dc39e8f77","shell",62600],"assets/chara/mana/full-512.webp":["35070bc73694","lazy",21438],"assets/chara/miduki/banner-470.webp":["5f5c6b9c05b0","lazy",69930],"assets/chara/miduki/banner-940.webp":["6f1888c42daf","lazy",209616],"assets/chara/miduki/face-256.webp":["ff4fc2407a30","shell",20006],"assets/chara/miduki/face-96.webp":["25cbbb5bd92c","shell",3346],"assets/chara/miduki/full-1024.webp":["35add0c39d50","shell",87802],"assets/chara/miduki/full-512.webp":["cb74f0b888f4","lazy",28154],"assets/chara/minase/banner-470.webp":["c857c390abc8","lazy",56438],"assets/chara/minase/banner-940.webp":["a87dfde7d1ea","lazy",166918],"assets/chara/minase/face-256.webp":["50b4760dcd33","shell",17356],"assets/chara/minase/face-96.webp":["6678ccada7fc","shell",2646],"assets/chara/minase/full-1024.webp":["0d5a0fd398c5","shell",86268],"assets/chara/minase/full-512.webp":["d978157a716a","lazy",26926],"assets/chara/sui/banner-470.webp":["8ae9a1d51e7f","lazy",71342],"assets/chara/sui/banner-940.webp":["1d20e9cf53db","lazy",218640],"assets/chara/sui/face-256.webp":["56972eec0229","shell",17392],"assets/chara/sui/face-96.webp":["508ddc098668","shell",2620],"assets/chara/sui/full-1024.webp":["91dbf7c2fbe0","shell",144964],"assets/chara/sui/full-512.webp":["190157868264","lazy",46454],"assets/chara/yuzuha/banner-470.webp":["c6c5edc085fb","lazy",47186],"assets/chara/yuzuha/banner-940.webp":["72b337edd235","lazy",136748],"assets/chara/yuzuha/face-256.webp":["600e27b82d2c","shell",14980],"assets/chara/yuzuha/face-96.webp":["6de40b9548d7","shell",2340],"assets/chara/yuzuha/full-1024.webp":["497798d37294","shell",61050],"assets/chara/yuzuha/full-512.webp":["e88b177de59a","lazy",20572],"assets/gacha/grand-debut-1200.webp":["ec37d99a1579","lazy",213180],"assets/gacha/grand-debut-600.webp":["e10a1961cb3d","lazy",60158],"assets/lobby/park-940.webp":["3100ce215035","lazy",248480],"assets/lobby/terrace-470.webp":["d078e2450e3a","shell",76804],"assets/lobby/terrace-940.webp":["6f84f7a4bc0b","lazy",215152],"assets/sites/apps/magiabyss-192.webp":["66ebf6f50b11","lazy",18974],"assets/sites/apps/magiarena-192.webp":["c4277b546098","lazy",13496],"assets/sites/apps/magibattle-192.webp":["f5b1e7d8b133","lazy",6258],"assets/sites/apps/magibocciarush-192.webp":["75b9d3c46f09","lazy",15744],"assets/sites/apps/magiburst-192.webp":["880173dd0303","lazy",17294],"assets/sites/apps/magichemlex-192.webp":["725f645eaac7","lazy",8432],"assets/sites/apps/magicounter-192.webp":["301a19878857","lazy",17504],"assets/sites/apps/magicraft-192.webp":["de43563063ac","lazy",16848],"assets/sites/apps/magidominiongrid-192.webp":["e53fad4d298a","lazy",14898],"assets/sites/apps/magiempire-192.webp":["b9ca23fe7470","lazy",7094],"assets/sites/apps/magifocus-192.webp":["bfa1bc638052","lazy",11696],"assets/sites/apps/magijackpot-192.webp":["ea66129e37c0","lazy",18496],"assets/sites/apps/magilink-192.webp":["b1ae6b5f967f","lazy",4644],"assets/sites/apps/magilotto-192.webp":["26f67454a98e","lazy",19392],"assets/sites/apps/magimanor-192.webp":["80e6aae9f0b9","lazy",9438],"assets/sites/apps/magimusic-192.webp":["0607420505b5","lazy",12948],"assets/sites/apps/magiportfolio-192.webp":["535a793908e2","lazy",6078],"assets/sites/apps/magirail-192.webp":["b091f3b198c2","lazy",14352],"assets/sites/apps/magiranking-192.webp":["13950b605194","lazy",5792],"assets/sites/apps/magiscope-192.webp":["f9b00cc7402b","lazy",12922],"assets/sites/apps/magitier-192.webp":["9855d1e32f67","lazy",5694],"assets/sites/apps/ordyxis-192.webp":["60a8e7aa3780","lazy",2628],"assets/sites/apps/ordyxis-512.webp":["e03e4d63a4e4","lazy",8216],"assets/sites/apps/xevarion-192.webp":["153b1b46d2ad","lazy",2732],"assets/sites/apps/xevynar-192.webp":["cefc2b7db6fd","lazy",2554],"assets/sites/brand/ishida-540.webp":["b1c14dd0549b","lazy",6168],"assets/sites/brand/kawagani-540.webp":["6bcf183f9de7","lazy",6322],"assets/sites/brand/magicalfuture-540.webp":["c118a9072e02","lazy",12102],"assets/sites/brand/ngx-540.webp":["07bd4c920355","lazy",6580],"assets/sites/brand/studiodoga-540.webp":["1a07a4cc5179","lazy",6152],"assets/sites/brand/yra-540.webp":["04a3e3ab90aa","lazy",7596],"assets/title/miduki-940.webp":["a6bb4b583380","shell",268424],"assets/title/miduki-blur.webp":["fabda055058b","shell",2946],"assets/ui/gem-64.webp":["48a86ae1660b","shell",3380],"assets/ui/ticket-128.webp":["d4375810a002","shell",6904],"assets/ui/ticket-640.webp":["2dbeecd9d7aa","lazy",62894],"assets/ui/xeva-64.webp":["871d3213ba48","shell",3198],"core/account.js":["b7bb4317687a","shell",5629],"core/admin.js":["d3037de904b5","shell",2498],"core/appdata.js":["c2337dde2b85","shell",2157],"core/backend/firebase.js":["56d8b03493db","shell",9460],"core/backend/index.js":["18bde72a7c61","shell",525],"core/backend/local.js":["3c090c5d0cf4","shell",9573],"core/boot.js":["57ac44d4c466","shell",4808],"core/chara.js":["b62ee1628189","shell",8721],"core/clock.js":["214ded9aaec5","shell",814],"core/config.js":["7ce00610c156","shell",2611],"core/daily.js":["c619ce437a13","shell",8911],"core/devnotes.js":["8f7a1b7734f6","shell",810],"core/gacha.js":["f55b0a927143","shell",5997],"core/i18n.js":["e2c2da26acd2","shell",23442],"core/install.js":["bf39bad5cea6","shell",2803],"core/mail.js":["88962dd93724","shell",7706],"core/merge.js":["326190402c9d","shell",10822],"core/news.js":["c9c0de8db6cc","shell",787],"core/party.js":["52083adc7b8b","shell",8603],"core/power.js":["2a86245ee727","shell",5230],"core/rooms.js":["ce16be1072a5","shell",10454],"core/router.js":["6e63fb643c4a","shell",2542],"core/store.js":["9f9eb9fd754e","shell",7105],"core/swc.js":["3c1b6ebd1c17","shell",5145],"core/sync.js":["801fae0ec1e5","shell",3349],"core/veteran.js":["698a18a0004a","shell",5197],"core/viewport.js":["1b6589c1a80c","shell",6328],"core/wallet.js":["b412cd88f9bc","shell",1170],"index.html":["21a7592e1b7c","shell",1300],"manifest.webmanifest":["a0aafc90a917","shell",590],"portal/admin.css":["828326ff8adf","shell",3154],"portal/admin.js":["efdcd61d5b18","shell",20694],"portal/app-host.js":["24e3a26973ae","shell",2896],"portal/apps.js":["f0a33e5bb228","shell",2597],"portal/auth.js":["6d5eb7849bdf","shell",3988],"portal/bridge.js":["3d3817175bdc","shell",10819],"portal/chara.js":["f324c73fe19b","shell",9698],"portal/derby-sign.js":["64e3374c8e77","shell",6522],"portal/device.js":["d62c754dc6a2","shell",8996],"portal/devnotes-data.js":["d485e8ef3bc0","shell",11691],"portal/devnotes.css":["44aeb1db2f9d","shell",5934],"portal/devnotes.js":["87b40fd76069","shell",7007],"portal/first.js":["61dde3689753","shell",2894],"portal/fx.css":["491f3f38359f","shell",16278],"portal/gacha-result.js":["e933a9b94e81","shell",9259],"portal/gacha.js":["8512f0273cd0","shell",7824],"portal/home.js":["dc858de1c006","shell",12317],"portal/install.js":["a96e8e386bf9","shell",3340],"portal/intro.js":["17a10c8d5350","shell",2820],"portal/live-rigs.js":["185ecf0ecfd7","shell",5576],"portal/live.js":["7e253f94b186","shell",19778],"portal/lobby.js":["5189aa96e22e","shell",2883],"portal/lobbyset.js":["3552f59ff0cd","shell",2974],"portal/logbo.js":["caba66a6883f","shell",2771],"portal/mail.js":["b81035e60850","shell",5741],"portal/menu.js":["3cdb34246edb","shell",15631],"portal/missions.js":["292579c7873c","shell",4061],"portal/news-data.js":["b510130397d2","shell",15776],"portal/news.js":["ab18f4c6319d","shell",7689],"portal/portal.css":["9e051d9b7479","shell",58959],"portal/routes.js":["48d30b1d5f6e","shell",3105],"portal/shell.js":["e7af3465026a","shell",6015],"portal/title.js":["a7501b4d7ac5","shell",5854],"portal/veteran.js":["ea90a3a5f19c","shell",3831],"portal/wallet-sheet.js":["23bfa8996930","shell",2861],"sites/embed.js":["c578d5ded8d6","lazy",2252],"sites/ishida/css/style.css":["8f58ce28b5ec","lazy",23459],"sites/ishida/index.html":["6a98c7bebd68","lazy",39606],"sites/ishida/js/main.js":["bfecf3637426","lazy",4833],"sites/ngx/index.html":["b774d3ed08fd","lazy",47302],"ui/base.css":["3f4b4e3f7869","shell",3824],"ui/components.css":["8d8180720498","shell",14806],"ui/dom.js":["b85ababa534d","shell",1779],"ui/earn.js":["395fb07d33a2","shell",5273],"ui/fx.js":["fb48f46ddba4","shell",4969],"ui/icons.js":["8fde1bceb68e","shell",7754],"ui/loading.js":["911eaace79b6","shell",1592],"ui/sheet.js":["35d70025a610","shell",3071],"ui/toast.js":["b580dc2809b3","shell",439],"ui/tokens.css":["c54ccc9ec099","shell",5804]};

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

// ---- 画面からの知らせ ----
//   'skip'   … 「更新する」：待っている新しい版に入れかわる
//   'status' … この端末に入っているもの（★ 2026-11-28 メニューの「更新とダウンロード」）→ { t:'status', build, groups: { 組: { n, have, bytes, haveBytes } } }
//   'get'    … 組（groups: ['app:lex', 'lazy', …]）をまとめてダウンロード → 途中 { t:'progress', done, total }・終わり { t:'done', bad, …status }
//   ★ 答えは e.ports[0]（MessageChannel）へ。core/swc.js の ask()
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.t === 'skip') { self.skipWaiting(); return; }
  const port = e.ports && e.ports[0];
  if (!port) return;
  if (d.t === 'status') e.waitUntil(status().then((s) => port.postMessage(s)).catch(() => port.postMessage({ t: 'error' })));
  if (d.t === 'get') {
    e.waitUntil((async () => {
      const want = new Set(Array.isArray(d.groups) ? d.groups : []);
      const r = await fill(Object.keys(FILES).filter((p) => want.has(FILES[p][1])), (done, total) => port.postMessage({ t: 'progress', done, total }));
      for (const g of want) if (g.startsWith('app:')) warmed.add(g);
      port.postMessage({ ...(await status()), t: 'done', bad: r.bad });
    })().catch(() => port.postMessage({ t: 'error' })));
  }
});

/** この端末に入っているもの（組ごとの数と大きさ）。一覧のハッシュと同じものだけを「入っている」と数える */
async function status() {
  const live = await caches.open(LIVE);
  const groups = {};
  await pool(Object.keys(FILES), 8, async (p) => {
    const [h, g, size] = FILES[p];
    const s = (groups[g] ||= { n: 0, have: 0, bytes: 0, haveBytes: 0 });
    s.n++;
    s.bytes += size || 0;
    const hit = await live.match(BASE + p);
    if (hit && hashOf(hit) === h) { s.have++; s.haveBytes += size || 0; }
  });
  return { t: 'status', build: BUILD, groups };
}

/** list のうち、入っていない（または古い）ものを取ってくる。1つ終わるたびに progress(done, total) */
async function fill(list, progress) {
  const live = await caches.open(LIVE);
  const need = [];
  for (const p of list) {
    const old = await live.match(BASE + p);
    if (!(old && hashOf(old) === FILES[p][0])) need.push(p);
  }
  let done = 0;
  let bad = 0;
  progress(0, need.length);
  await pool(need, 4, async (p) => {
    try { await live.put(BASE + p, await fetchFile(p)); } catch (err) { bad++; }
    progress(++done, need.length);
  });
  return { bad, total: need.length };
}

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
