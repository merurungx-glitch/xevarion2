// XEVARION II — 画面の言葉（ぜんぶここに置く。英語版はあとで en を足す）
// 使い方: t('home.lobby') / t('gacha.toPity', { n: 73 })

const ja = {
  'app.name': 'XEVARION II',
  'tab.home': 'ホーム', 'tab.apps': 'アプリ', 'tab.gacha': 'ガチャ', 'tab.chara': 'キャラ', 'tab.menu': 'メニュー',
  'cur.xeva': 'XEVA', 'cur.gem': 'ジェム', 'cur.ticket': 'ガチャチケット',
  'btn.close': 'とじる', 'btn.cancel': 'やめる', 'btn.ok': 'OK', 'btn.back': 'もどる', 'btn.next': 'つぎへ',
  'dev.bar': '手元の試験モード',
  'soon': '{name} は準備中です',

  'title.tap': 'TAP TO START',
  'title.credit': 'NGX × ISHIDA PRODUCTION',
  'title.loading': '準備しています…',

  'auth.signin': 'サインイン', 'auth.signup': 'アカウントを作る',
  'auth.id': 'ID', 'auth.idHint': '半角の英小文字・数字・_（3〜16文字）。あとから変えられません',
  'auth.pass': '合言葉', 'auth.passHint': '6文字以上。人に教えないでください',
  'auth.pass2': '合言葉（もう一度）',
  'auth.name': '表示名', 'auth.nameHint': 'みんなに見える名前（1〜12文字）。あとで変えられます',
  'auth.go': 'サインイン', 'auth.create': 'アカウントを作る',
  'auth.forgot': '合言葉を忘れたときは運営に連絡してください（メールアドレスは使いません）。',
  'auth.toSignup': 'はじめての方は「アカウントを作る」から',
  'err.idFormat': 'ID は半角の英小文字・数字・_ で3〜16文字にしてください',
  'err.idTaken': 'その ID はもう使われています',
  'err.passShort': '合言葉は6文字以上にしてください',
  'err.passMismatch': '合言葉が1回目と合いません',
  'err.nameLen': '表示名は1〜12文字にしてください',
  'err.badLogin': 'ID か合言葉がちがいます',
  'err.network': '通信できません。電波のよいところでもう一度ためしてください',
  'err.notEnabled': 'サインインの方式がまだ有効になっていません（運営の設定待ち）',
  'err.tooMany': '何度も失敗したので、少し待ってからためしてください',
  'err.unknown': 'うまくいきませんでした（{code}）',

  'first.kick': 'WELCOME',
  'first.title': 'ようこそ XEVARION II へ',
  'first.gift': 'リリース記念として ガチャチケット10枚 をプレゼント！',
  'first.lead': '最初の10連では、キャラが1人かならず出ます。出た子があなたのパートナーになります。',
  'first.pull': '最初の10連をひく',
  'first.partner': '{name} があなたのパートナーになりました',
  'first.toHome': 'ホームへ',

  'home.apps': 'APPS', 'home.sites': '公式サイト',
  'home.lobby': 'ロビーへ', 'home.lobbyLock': '完凸でロビー',
  'home.partner': 'PARTNER', 'home.maxBanner': 'MAX BANNER',
  'home.news': 'GRAND DEBUT GACHA 開催中！',
  'home.noPartner': 'ガチャでパートナーを迎えよう',

  'apps.title': 'APPS', 'apps.games': 'アプリ', 'apps.sitesTitle': '公式サイト', 'apps.soon': '準備中', 'apps.play': 'あそぶ',
  'party.got': '賞金 +{n} XEVA が届きました（{apps}）',
  'upd.title': '新しい版があります', 'upd.body': '更新すると、最新の XEVARION II になります（数秒で終わります）。',
  'upd.go': '更新する', 'upd.later': 'あとで',
  'app.lex': '化学の問題集', 'app.quiz': '見えない爆弾・早押しバトルほか', 'app.derby': '実際の GⅠ を XEVA で予想',
  'app.shift': 'コマを押し出す対戦ボードゲーム', 'app.chain': '2〜5人の連鎖の陣取り', 'app.gura': '1台を囲むパーティーゲーム',
  'app.yacht': 'サイコロで役をそろえる', 'app.ngx': 'NGX の公式サイト', 'app.ishida': 'ISHIDA Production の公式サイト',

  'gacha.title': 'GACHA',
  'gacha.always': 'いつでも',
  'gacha.one': '1回ひく', 'gacha.ten': '10回ひく',
  'gacha.rates': '提供割合', 'gacha.pity': '天井で交換', 'gacha.log': 'ひいた記録',
  'gacha.orbit': 'オービット {n} / {max}', 'gacha.toPity': '天井まで あと {n}回', 'gacha.pityReady': '天井で好きな子と交換できます',
  'gacha.chipChar': 'キャラ {p}%', 'gacha.chipTenth': '10回目 {p}%', 'gacha.chipPity': '天井 {n}',
  'gacha.confirmT': '{n}回ひきますか？',
  'gacha.payTicket': 'ガチャチケット {n}枚', 'gacha.payGem': 'ジェム {n}',
  'gacha.short': 'ジェムが足りません（あと {n}）', 'gacha.toExchange': '両替する',
  'gacha.result': 'RESULT', 'gacha.new': 'NEW', 'gacha.awk': '{n}凸', 'gacha.max': '完凸', 'gacha.over': 'ジェム +{n}',
  'gacha.pickT': '天井で交換', 'gacha.pickLead': '好きなキャラを1人選んでください（オービット {n} を使います）',
  'gacha.maxed': '完凸ずみ',
  'gacha.logEmpty': 'まだひいていません',
  'gacha.ratesLead': '3人とも同じ確率です。10連の10回目はキャラの確率が上がります。',
  'gacha.itemXeva': '{n} XEVA',
  'gacha.skip': 'スキップ ›',
  'gacha.tapNext': 'タップで次へ',

  'first.receive': '受け取る',
  'first.received': '受け取りました',
  'earn.release': 'リリース記念',
  'earn.dev': '試験用',

  'tip.1': '完凸（5人目）すると、ロビーでその子に会えます',
  'tip.2': 'オービットが100たまると、好きなキャラと交換できます',
  'tip.3': '設定の「動作モード」で、電池のもちをよくできます',
  'tip.4': 'XEVA は 200 でジェム 1 に両替できます',
  'tip.5': '10連の10回目は、キャラが出やすくなっています',

  'chara.title': 'CHARACTERS',
  'chara.notOwned': '未所持', 'chara.partner': 'パートナー',
  'chara.setPartner': 'パートナーにする', 'chara.lobby': 'ロビーで会う', 'chara.bannerLock': '完凸で開放',
  'chara.awk': '{n}凸', 'chara.max': '完凸', 'chara.toMax': '完凸まで あと {n}人',
  'chara.partnerSet': '{name} をパートナーにしました',

  'lobby.tap': 'タップで話す', 'lobby.lock': '完凸で開放されます',

  'menu.title': 'MENU',
  'menu.account': 'アカウント', 'menu.signout': 'サインアウト', 'menu.signoutAsk': 'サインアウトしますか？ この端末に残ったデータは、次にサインインしたときに使われます。',
  'menu.wallet': 'お財布', 'menu.exchange': '両替（200 XEVA → ジェム 1）',
  'menu.settings': '設定',
  'menu.power': '動作モード', 'menu.power.auto': '自動', 'menu.power.high': '高画質', 'menu.power.balanced': 'バランス', 'menu.power.saver': '省電力',
  'menu.power.autoNote': 'いまは「{mode}」で動いています（{why}）',
  'menu.power.note': '省電力：コマ数を30に・演出を短く・ロビーは止めた絵に',
  'menu.theme': '中身の色', 'menu.theme.auto': '自動', 'menu.theme.light': '明るい', 'menu.theme.dark': '暗い',
  'menu.shortFx': '演出を短くする', 'menu.shortFxNote': 'ガチャなどの演出を短い版にします',
  'menu.device': 'この端末の状態',
  'menu.fps': 'コマ数', 'menu.load': '起動の読み込み', 'menu.saved': '保存', 'menu.version': '版', 'menu.sync': '同期',
  'menu.sync.idle': '同期ずみ', 'menu.sync.busy': '同期中…', 'menu.sync.offline': '通信なし（あとで送ります）', 'menu.sync.local': '手元の試験モード',
  'menu.dev': '試験用（手元だけに出ます）', 'menu.devGive': 'XEVA +10,000・ジェム +100', 'menu.devReset': 'このアカウントの試験データを消す',
  'menu.devResetAsk': '手元の試験用のアカウントとデータを消します。本物のデータには影響しません。',

  'wallet.title': 'お財布', 'wallet.exchangeLead': 'XEVA をジェムに両替します（200 XEVA → ジェム 1・ジェムから XEVA には戻せません）',
  'wallet.exDone': 'ジェム {n} に両替しました', 'wallet.exShort': 'XEVA が足りません',
};

let dict = ja;

export function t(key, vars) {
  let s = dict[key] ?? ja[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
  return s;
}
