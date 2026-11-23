/* ============================================================
   MagiShift — はじめの画面と準備（XEVARION II・MagiQuiz と同じ全画面の作り）
   ★ 2026-11-23 XEVARION II へ移すときに作り直し（第4回の相談「パーティーの部品を共通に。
     前画面は MagiQuiz と同じ全画面の形・色はアプリのロゴに合わせる」）。Yacht・GuraPlate の前画面と同じ部品・ロゴの青紫。
   ------------------------------------------------------------
   ・はじめの画面：ロゴ・あそぶ（中断があれば「つづきから」）・前回と同じで始める・ルール・戦績・設定（右上）・左上で II へもどる
   ・準備の2段：① メンバー（2〜8人・名前6文字・アイコン・連携・この端末の本人・CPU を追加）
                ② ルール（ノーマル／タクティクス・CPU の強さ・盤面）→「順番をきめる」で、これまでどおりのカードめくり（shift-ui.js）へ
   ・席の情報と保存は shift-ui.js の setup（x2a.shift.setup）。ここは見た目と操作だけ。
   ・★ Shift の CSS とぶつからないように、ボタンは .fbtn・シートは .fsheet・アイコンのマスは .fpc（駒の svg が .pc）。
     操作の印も data-a ではなく data-f（shift-ui.js が document で data-a を受けているため）
   ============================================================ */
(function (root) {
  'use strict';
  const G = root.MShift, U = root.MShiftUI, A = G.Account;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const setup = U.setup;
  const seats = () => setup.all.slice(0, setup.n);
  const MAXN = G.MAX_PLAYERS;

  /* ══ 見た目の部品 ══ */
  const P = (d) => '<svg class="ic" viewBox="0 0 24 24">' + d + '</svg>';
  const IC = {
    back: P('<path d="M15 5l-7 7 7 7"/>'), next: P('<path d="M9 5l7 7-7 7"/>'), help: P('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 114 2.1c-.8.6-1.6 1-1.6 2"/><circle cx="12" cy="17" r=".6" class="fl"/>'),
    gear: P('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
    link: P('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
    check: P('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), x: P('<path d="M6 6l12 12M18 6L6 18"/>'), plus: P('<path d="M12 5v14M5 12h14"/>'),
    pen: P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), lock: P('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    people: P('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.4a6.2 6.2 0 0 1 12.4 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 13.6a5.6 5.6 0 0 1 3.2 5"/>'),
    book: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>'),
    trophy: P('<path d="M7.4 4.2h9.2v4.4a4.6 4.6 0 0 1-9.2 0z"/><path d="M7.4 5.8H4.6a2.8 2.8 0 0 0 2.9 3.6M16.6 5.8h2.8a2.8 2.8 0 0 1-2.9 3.6"/><path d="M12 13.2v3.4M8.6 20h6.8"/>'),
    again: P('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'), gift: P('<rect x="3.5" y="8.5" width="17" height="12" rx="2"/><path d="M12 8.5v12M3.5 12.5h17"/><path d="M12 8.5c-2-3.6-6-3.6-6-1.2 0 1.2 2 1.2 6 1.2zM12 8.5c2-3.6 6-3.6 6-1.2 0 1.2-2 1.2-6 1.2z"/>'),
    robot: P('<rect x="5" y="8" width="14" height="11" rx="3.5"/><path d="M12 4.5V8M9.2 13.2h.01M14.8 13.2h.01M9.5 16.3h5"/>'),
    board: P('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>'),
    cards: P('<rect x="3.5" y="6" width="11" height="15" rx="2.2"/><path d="M8.5 3.5h9.8a2.2 2.2 0 0 1 2.2 2.2V18"/>')
  };
  const ROBO = '<svg class="robo" viewBox="0 0 24 24"><rect x="5" y="8" width="14" height="11" rx="3.5"/><path d="M12 4.5V8M9.2 13.2h.01M14.8 13.2h.01M9.5 16.3h5"/><circle cx="12" cy="4" r="1.2"/></svg>';
  function avatar(o, cls) {
    const ch = esc(String(o.name || '?').slice(0, 1));
    return '<span class="gav' + (cls ? ' ' + cls : '') + (o.cpu ? ' cpu' : '') + '" style="--c:' + (o.color || '#4c6fff') + '">' +
      (o.cpu ? ROBO : '<i>' + ch + '</i>') +
      (o.img ? '<img src="' + esc(o.img) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }
  const me = () => A.me();
  const nameOf = (p, i) => { const m = me(); return (p.owner && m ? String(m.name).slice(0, 6) : p.name) || U.DEF_NAMES[i] || '?'; };
  function imgOf(p) {
    if (p.type === 'cpu') return '';
    const m = me();
    if (p.owner && m) return A.thumb(m);
    if (p.link && p.link.uid) return A.thumb(p.link);
    return p.pic ? A.thumb({ face: p.pic }) : '';
  }
  const modeName = () => (G.MODES[setup.mode] || G.MODES.normal).nm;
  const cpuCount = () => seats().filter((p) => p.type === 'cpu').length;

  /* ══ ① はじめの画面 ══ */
  function contText(r) {
    const m = r.meta || {};
    return (m.players || []).length + '人・' + (G.MODES[m.mode] || G.MODES.normal).nm + '・' + (m.round || 1) + '周目';
  }
  function showTitle() {
    const list = G.list(), cpus = cpuCount();
    $('titleScr').innerHTML =
      '<button class="t-home" data-f="exit" aria-label="XEVARION II へもどる">' + IC.back + '<span>XEVARION II</span></button>' +
      '<button class="t-gear" data-f="settings" aria-label="設定">' + IC.gear + '</button>' +
      '<div class="t-main">' +
        '<button class="t-logo" data-f="' + (list.length ? 'cont' : 'start') + '" aria-label="あそぶ"><img src="img/logo.webp" alt="MagiShift" width="400" height="400"></button>' +
        '<p class="t-tag">つなげて、動かして、勝ちをつかめ。</p>' +
        '<div class="t-btns">' +
          (list.length
            ? '<button class="buzz lg" data-f="cont"><span>つづきから<small>' + esc(list.length === 1 ? contText(list[0]) : '中断中 ' + list.length + '件') + '</small></span></button>' +
              '<button class="t-last" data-f="start">' + IC.plus + '<span>新しく始める</span></button>'
            : '<button class="buzz lg" data-f="start"><span>あそぶ</span></button>' +
              (setup.played ? '<button class="t-last" data-f="quick">' + IC.again + '<span>前回と同じで始める<small>' + setup.n + '人' + (cpus ? '（CPU ' + cpus + '）' : '') + '・' + esc(modeName()) + '</small></span></button>' : '')) +
          '<div class="t-sub"><button data-f="rules">' + IC.book + '<span>ルール</span></button><button data-f="stats">' + IC.trophy + '<span>戦績</span></button></div>' +
        '</div>' +
        '<p class="t-src">1台で <b>2〜8人</b>・CPU とも遊べる・順位で XEVA・とちゅうで保存</p>' +
      '</div>';
    U.show('titleScr');
  }

  /* ══ ② 準備：① メンバー ② ルール ══ */
  const STEP_NM = ['メンバー', 'ルール'];
  const UI = { step: 1, keep: false, told: false };
  function openSetup(step) {
    if (step) UI.step = step;
    U.show('setupScr');
    renderSetup();
    tellPending();
  }
  /* 前回の連携を「要確認」で引きついだことを、1回だけ知らせる */
  function tellPending() {
    if (UI.told || !setup.restored) return;
    if (!seats().some((p) => p.type !== 'cpu' && !p.owner && p.link && p.link.uid && p.link.confirmed === false)) return;
    UI.told = true;
    setTimeout(() => U.toast('🔗 前回の連携を引きつぎました。<b>（要確認）</b>を押して、合言葉を確かめてください', 3600), 450);
  }
  function renderSetup() {
    const s = UI.step;
    const head = '<div class="su-top"><button class="su-back" data-f="suBack" aria-label="もどる">' + IC.back + '</button>' +
      '<ol class="su-steps">' + STEP_NM.map((t, i) => '<li class="' + (i + 1 === s ? 'on' : i + 1 < s ? 'done' : '') + '"><button data-f="suGo" data-v="' + (i + 1) + '"><i>' + (i + 1 < s ? IC.check : i + 1) + '</i><span>' + t + '</span></button></li>').join('') + '</ol>' +
      '<button class="su-help" data-f="rules" aria-label="ルール">' + IC.help + '</button></div>';
    let body = '', foot = '';
    if (s === 1) { body = stepMembers(); foot = '<button class="buzz wide" data-f="next"><span>つぎへ（ルール）</span></button>'; }
    else {
      body = stepRules();
      const r = U.ruleOf(setup.n), cpus = cpuCount();
      foot = '<p class="su-sum">' + setup.n + '人' + (cpus ? '（CPU ' + cpus + '）' : '') + '・' + esc(modeName()) + '・盤 ' + r.size + '×' + r.size + '・<b>' + r.win + 'つ</b>並べ・順番はカードで</p>' +
        '<button class="buzz wide" data-f="begin"><span>順番をきめる</span></button>';
    }
    const old = $('setupScr').querySelector('.su-body'), y = old ? old.scrollTop : 0;
    $('setupScr').innerHTML = head + '<div class="su-body">' + body + '</div><div class="su-foot">' + foot + '</div>';
    if (UI.keep) { const b = $('setupScr').querySelector('.su-body'); if (b) b.scrollTop = y; UI.keep = false; }
  }
  const repaint = () => { UI.keep = true; renderSetup(); };

  /* メンバー（駒の色と形は席の順。アイコンの右下に小さく出す） */
  function stepMembers() {
    const m = me(), P0 = A.PRIZES();
    const rows = seats().map((p, i) => {
      const c = G.COLORS[i], col = c.color, badge = '<i class="st-pcb">' + U.pieceSVG(c) + '</i>';
      const x = setup.n > 2 ? '<button class="st-x" data-f="del" data-i="' + i + '" aria-label="この人を外す">' + IC.x + '</button>' : '';
      if (p.type === 'cpu') {
        return '<div class="st cpu" data-i="' + i + '" style="--c:' + col + '"><span class="st-avw">' + avatar({ name: p.name, color: col, cpu: 1 }, 'md') + badge + '</span>' +
          '<div class="st-m"><input class="st-nm" maxlength="6" value="' + esc(p.name) + '" aria-label="' + (i + 1) + '人目（CPU）の名前" enterkeyhint="done">' +
          '<div class="st-row"><span class="st-cpu">' + IC.robot + '<span>CPU・' + esc(U.CPU_LV[setup.cpuLevel][0]) + '</span></span></div></div>' + x + '</div>';
      }
      const linked = !p.owner && p.link && p.link.uid, ok = linked && p.link.confirmed !== false;
      const lk = p.owner ? '<span class="st-lk me">' + IC.check + '<span>XEVA 受取</span></span>'
        : !linked ? '<button class="st-lk" data-f="link" data-i="' + i + '">' + IC.link + '<span>連携</span></button>'
        : ok ? '<button class="st-lk on" data-f="link" data-i="' + i + '">' + IC.check + '<span>' + esc(p.link.name) + '</span></button>'
        : '<button class="st-lk wait" data-f="link" data-i="' + i + '">' + IC.lock + '<span>要確認・' + esc(p.link.name) + '</span></button>';
      const av = avatar({ name: nameOf(p, i), color: col, img: imgOf(p) }, 'md');
      return '<div class="st" data-i="' + i + '" style="--c:' + col + '">' +
        '<span class="st-avw">' + (!p.owner && !linked ? '<button class="st-av" data-f="pic" data-i="' + i + '" aria-label="' + (i + 1) + '人目のアイコンをえらぶ">' + av + '<i class="st-ed">' + IC.pen + '</i></button>' : av) + badge + '</span>' +
        '<div class="st-m"><input class="st-nm" maxlength="6" value="' + esc(nameOf(p, i)) + '" aria-label="' + (i + 1) + '人目の名前" enterkeyhint="done"' + (p.owner ? ' readonly' : '') + '>' +
          '<div class="st-row">' + lk +
            (m ? '<label class="st-own' + (p.owner ? ' on' : '') + '"><input type="checkbox" data-f="own" data-i="' + i + '"' + (p.owner ? ' checked' : '') + '><i>' + IC.check + '</i><span>この端末の本人</span></label>' : '') +
          '</div></div>' + x + '</div>';
    }).join('');
    return '<h2 class="su-h">だれが参加する？</h2>' +
      '<div class="st-list">' + rows + '</div>' +
      (setup.n < MAXN ? '<div class="st-adds"><button class="st-add" data-f="add">' + IC.plus + 'プレイヤーを追加</button><button class="st-add" data-f="addCpu">' + IC.robot + 'CPU を追加</button></div>' : '') +
      '<p class="st-cnt">' + setup.n + ' / ' + MAXN + ' 人・駒の色と形は席の順</p>' +
      '<div class="su-tip">' + IC.gift + '<div><b>順位で XEVA がもらえます</b>（1位 ' + P0[0] + '・2位 ' + P0[1] + '・3位 ' + P0[2] + '…）。「この端末の本人」にチェックすると<b>オフラインでも</b>この端末に入ります。ほかの人は<b>アカウント連携</b>（その人の ID と合言葉）すると、本人の XEVARION II のアカウントに届きます（CPU・引き分けはなし）。</div></div>';
  }

  /* ルール */
  function stepRules() {
    const r = U.ruleOf(setup.n), cpus = cpuCount();
    const MODES = [
      ['normal', U.ICON.jump, '置く・動かすだけ。駒は2マス先まで、<b>あいだの駒を飛びこえて</b>動けます。'],
      ['tactics', U.ICON.push, 'ノーマルに<b>押す</b>（となりの相手の駒を1マス押し出す）と<b>ブロック</b>（1周だけの壁・1人2個）を足した、守りの手が多いルール。']
    ];
    return '<h2 class="su-h">ルール</h2>' +
      '<section class="ru-c"><div class="ru"><div class="ru-l">' + IC.book + '<b>あそびかた</b></div>' +
        '<div class="sm-modes">' + MODES.map((o) => '<button class="sm-mode' + (setup.mode === o[0] ? ' on' : '') + '" data-f="mode" data-v="' + o[0] + '"><span class="sm-mt">' + o[1] + esc(G.MODES[o[0]].nm) + '</span><small>' + o[2] + '</small></button>').join('') + '</div></div></section>' +
      (cpus ? '<section class="ru-c"><div class="ru"><div class="ru-l">' + IC.robot + '<b>CPU の強さ</b></div><div class="su-seg">' +
        U.CPU_LV.map((l, k) => '<button class="' + (k === setup.cpuLevel ? 'on' : '') + '" data-f="cpu" data-v="' + k + '"><span>' + esc(l[0]) + '<small>' + esc(l[1]) + '</small></span></button>').join('') + '</div></div></section>' : '') +
      '<section class="ru-c"><div class="ru"><div class="ru-l">' + IC.board + '<b>盤面</b></div>' +
        '<div class="sm-rule"><span>盤 <b>' + r.size + '×' + r.size + '</b></span><span><b>' + r.win + 'つ</b>並べたら勝ち</span><span>駒 1人 <b>' + (r.pieces ? r.pieces + '個' : '上限なし') + '</b></span></div>' +
        '<p class="ru-n">人数で決まります（いまは ' + setup.n + '人）。盤の大きさ・並べる数・駒の数・効果音などは<b>設定</b>で変えられます。</p>' +
        '<div><button class="fbtn sm" data-f="settings">' + IC.gear + '設定をひらく</button></div></div></section>' +
      '<section class="ru-c"><div class="ru"><div class="ru-l">' + IC.cards + '<b>順番</b></div><p class="ru-n">「順番をきめる」で、1人1枚ずつ<b>うら向きのカード</b>をめくります。数字の小さい人から順番です（1 が先攻）。</p></div></section>';
  }

  /* ══ アイコン（II のキャラの顔・名前のまま） ══ */
  function openPic(i) {
    const p = setup.all[i]; if (!p) return;
    const col = G.COLORS[i].color, list = A.faces();
    const cell = (v, inner, nm, on) => '<button class="fpc' + (on ? ' on' : '') + '" data-f="picSet" data-i="' + i + '" data-v="' + esc(v) + '" style="--c:' + col + '">' + inner + '<small>' + esc(nm) + '</small></button>';
    sheet('<h3 class="sh-t">' + IC.people + esc(nameOf(p, i)) + ' のアイコン</h3><p class="sh-p"><b>XEVARION II のキャラ</b>からえらべます（連携していない人用。この端末の本人と連携した人は、その人のパートナーの顔になります）。</p>' +
      '<div class="pgrid">' + cell('', avatar({ name: nameOf(p, i), color: col }, 'md'), '名前のまま', !p.pic) +
      list.map((c) => cell(c.id, '<span class="fpim"><img src="' + esc(c.src) + '" alt="" loading="lazy"></span>', c.name, p.pic === c.id)).join('') + '</div>' +
      '<div class="sh-b"><button class="fbtn" data-f="shClose">とじる</button></div>', 'pick');
  }

  /* ══ アカウント連携（その人の XEVARION II の ID と合言葉）══
     ★ 合言葉は保存しない（この端末にも II にも残さない）。確かめるのは II（X2.party.verify）。
     ★ 合言葉の欄は、ブラウザが「パスワードを保存しますか」と出さないように、type=text＋文字を隠す CSS（使えない端末だけ password） */
  const SECRET_CSS = !!(root.CSS && CSS.supports && CSS.supports('-webkit-text-security', 'disc'));
  const LK = { i: 0, id: '', busy: false, confirm: false, hit: null };
  function openLink(i) {
    const p = setup.all[i];
    if (navigator.onLine === false) { U.toast('オフライン中は連携できません。自分の端末なら「この端末の本人」にチェックするだけで XEVA が入ります', 3000); return; }
    if (p.link && p.link.uid && p.link.confirmed !== false) {
      sheet('<h3 class="sh-t">' + IC.link + esc(p.link.name) + '</h3><p class="sh-p center">連携を解除しますか？</p><div class="sh-b"><button class="fbtn danger" data-f="lkOff" data-i="' + i + '">解除する</button><button class="fbtn" data-f="shClose">そのまま</button></div>', 'lk');
      return;
    }
    Object.assign(LK, { i, id: '', busy: false, confirm: false, hit: null });
    if (p.link && p.link.uid) { LK.id = p.link.id || ''; LK.hit = p.link; LK.confirm = true; }
    paintLink();
  }
  const lkRecent = () => A.recent().filter((r) => r.id && !setup.all.some((p, j) => j < setup.n && p.link && p.link.uid === r.uid));
  function lkRow(r, k) { return '<button class="lk-r" data-f="lkPick" data-k="' + k + '">' + avatar({ name: r.name, img: A.thumb(r), color: '#4c6fff' }, 'sm') + '<b>' + esc(r.name) + '<small class="lk-id">' + esc(r.id) + '</small></b>' + IC.next + '</button>'; }
  function paintLink() {
    const rec = LK.confirm ? [] : lkRecent();
    const who = LK.hit ? '<div class="lk-who">' + avatar({ name: LK.hit.name, img: A.thumb(LK.hit), color: '#4c6fff' }, 'md') + '<div><b>' + esc(LK.hit.name) + '</b><small>' + (LK.confirm ? '前回の連携を引きつぎます。合言葉をもう一度' : 'このアカウントに連携します') + '</small></div></div>' : '';
    sheet('<h3 class="sh-t">' + IC.link + 'アカウント連携</h3>' +
      (who || '<p class="sh-p">順位の XEVA が、その人の <b>XEVARION II</b> のアカウントに届きます。<b>本人に</b> ID と合言葉を入れてもらってください（合言葉はこの端末に保存しません）。</p>') +
      '<div class="lk-f">' +
        '<label><span>ID</span><input id="lkId" type="text" inputmode="latin" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="16" placeholder="英小文字・数字・_" value="' + esc(LK.id) + '"' + (LK.confirm ? ' readonly' : '') + ' enterkeyhint="next"></label>' +
        '<label><span>合言葉</span><input id="lkPw" class="lk-pw" type="' + (SECRET_CSS ? 'text' : 'password') + '" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="64" enterkeyhint="go"></label>' +
      '</div>' +
      '<p class="lk-msg center" id="lkMsg"> </p>' +
      '<div class="sh-b"><button class="fbtn pri" data-f="lkGo">' + IC.link + '連携する</button>' +
        (LK.confirm ? '<button class="fbtn danger" data-f="lkOff" data-i="' + LK.i + '">連携を解除</button>' : '') +
        '<button class="fbtn" data-f="shClose">やめる</button></div>' +
      (rec.length ? '<p class="lk-h">この端末で連携したことのある人（タップで ID が入ります）</p><div class="lk-l">' + rec.slice(0, 6).map((r, k) => lkRow(r, k)).join('') + '</div>' : ''), 'lk');
    const idI = $('lkId'), pwI = $('lkPw');
    idI.addEventListener('input', () => { LK.id = idI.value; });
    idI.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pwI.focus(); } });
    pwI.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lkGo(); } });
  }
  function lkPick(k) {
    const r = lkRecent()[+k]; if (!r) return;
    LK.id = r.id; LK.hit = r; paintLink();
  }
  const LK_ERR = { self: '自分のアカウントは「この端末の本人」にチェックしてください', bad: 'ID か合言葉がちがいます', format: 'ID と合言葉を正しく入れてください', many: '何度も失敗したので、少し待ってからためしてください', net: '通信できませんでした' };
  async function lkGo() {
    if (LK.busy) return;
    const idI = $('lkId'), pwI = $('lkPw'), msgE = $('lkMsg'), go = document.querySelector('#fSheet [data-f="lkGo"]');
    const msg = (t) => { if (msgE) msgE.textContent = t || ' '; };
    const id = String((idI && idI.value) || '').trim().toLowerCase(), pw = pwI ? pwI.value : '';
    if (!id || !pw) { msg('ID と合言葉を入れてください'); return; }
    LK.busy = true; LK.id = id; msg('');
    if (go) { go.disabled = true; go.textContent = '確かめています…'; }
    const r = await A.verify(id, pw);
    LK.busy = false;
    if (pwI) pwI.value = ''; /* 合言葉は画面にも残さない */
    if (!r || !r.acc) {
      if (go) { go.disabled = false; go.innerHTML = IC.link + '連携する'; }
      msg(LK_ERR[r && r.error] || LK_ERR.net);
      if (r && r.error === 'bad') U.sfx('no');
      return;
    }
    const acc = r.acc;
    if (setup.all.some((p, j) => j !== LK.i && j < setup.n && p.link && p.link.uid === acc.uid)) {
      if (go) { go.disabled = false; go.innerHTML = IC.link + '連携する'; }
      msg('そのアカウントはほかの席で使われています'); return;
    }
    const p = setup.all[LK.i];
    p.link = { uid: acc.uid, id: acc.id, name: acc.name, face: acc.face || '', confirmed: true }; p.owner = false; p.type = 'human';
    if (U.DEF_NAMES.indexOf(p.name) >= 0 || !p.name) p.name = String(acc.name).slice(0, 6);
    U.saveSetup(); closeSheet(); repaint(); U.sfx('put');
    U.toast('🔗 <b>' + esc(acc.name) + '</b> を連携しました');
  }
  function setOwner(i, on) {
    const m = me(); if (!m) return;
    setup.all.forEach((p, j) => { if (p.owner) { p.owner = false; if (p.name === String(m.name).slice(0, 6)) p.name = U.DEF_NAMES[j]; } });
    if (on) { const p = setup.all[i]; p.owner = true; p.link = null; p.type = 'human'; p.name = String(m.name).slice(0, 6); }
    U.saveSetup(); repaint();
  }

  /* ══ シート（アイコン・連携。白い札） ══ */
  function sheet(html, cls) { const s = $('fSheet'); s.className = 'fsheet ' + (cls || ''); s.innerHTML = html; s.scrollTop = 0; $('fSheetOv').classList.remove('hidden'); }
  function closeSheet() { $('fSheetOv').classList.add('hidden'); }

  /* ══ 操作 ══ */
  function onClick(e) {
    const b = e.target.closest ? e.target.closest('[data-f]') : null; if (!b || b.disabled) return;
    if (b.tagName === 'INPUT') return;   /* この端末の本人のチェックは change で受ける */
    const a = b.dataset.f, i = +b.dataset.i;
    try { U.ac(); } catch (err) { /* 音が使えない */ }
    if (a === 'exit') { if (root.X2) X2.exit(); }
    else if (a === 'start') openSetup(1);
    else if (a === 'quick') U.begin();
    else if (a === 'cont') { const l = G.list(); if (l.length === 1) U.resume(l[0].gid); else if (l.length) U.openSaves(); else showTitle(); }
    else if (a === 'rules') { closeSheet(); U.openRules(); }
    else if (a === 'stats') U.statsScreen();
    else if (a === 'settings') { closeSheet(); U.openSettings(); }
    else if (a === 'suBack') { if (UI.step > 1) { UI.step--; renderSetup(); } else showTitle(); }
    else if (a === 'suGo') { UI.step = +b.dataset.v || 1; renderSetup(); }
    else if (a === 'next') { UI.step = 2; renderSetup(); }
    else if (a === 'begin') U.begin();
    else if (a === 'add' || a === 'addCpu') {
      if (setup.n >= MAXN) return;
      const p = setup.all[setup.n]; setup.n++;
      if (a === 'addCpu') {
        p.type = 'cpu'; p.owner = false; p.link = null; p.pic = '';
        const k = cpuCount(); p.name = 'CPU' + (k > 1 ? k : '');
      } else {
        if (p.type === 'cpu' || /^CPU\d*$/.test(p.name)) p.name = U.DEF_NAMES[setup.n - 1];
        p.type = 'human';
      }
      U.saveSetup(); repaint();
    } else if (a === 'del') {
      if (setup.n <= 2) return;
      /* 外した人はうしろへ（名前・連携は残す＝次に足したとき戻る） */
      const p = setup.all.splice(i, 1)[0]; setup.all.splice(setup.n - 1, 0, p); setup.n--;
      U.saveSetup(); repaint();
    } else if (a === 'mode') { setup.mode = G.MODES[b.dataset.v] ? b.dataset.v : 'normal'; U.saveSetup(); repaint(); }
    else if (a === 'cpu') { setup.cpuLevel = Math.max(0, Math.min(2, +b.dataset.v || 0)); U.saveSetup(); repaint(); }
    else if (a === 'pic') openPic(i);
    else if (a === 'picSet') { const p = setup.all[i]; if (p) { p.pic = b.dataset.v || ''; U.saveSetup(); } closeSheet(); repaint(); }
    else if (a === 'link') openLink(i);
    else if (a === 'lkGo') lkGo();
    else if (a === 'lkPick') lkPick(b.dataset.k);
    else if (a === 'lkOff') { const p = setup.all[+b.dataset.i]; if (p) { p.link = null; U.saveSetup(); } closeSheet(); repaint(); U.toast('連携を解除しました'); }
    else if (a === 'shClose') closeSheet();
  }
  function init() {
    const F = $('front');
    F.addEventListener('click', onClick);
    $('fSheetOv').addEventListener('click', (e) => { if (e.target === $('fSheetOv')) closeSheet(); });
    F.addEventListener('input', (e) => {
      const t = e.target;
      if (!t.matches || !t.matches('.st-nm')) return;
      const row = t.closest('.st'); if (!row) return;
      const i = +row.dataset.i; setup.all[i].name = t.value.slice(0, 6); U.saveSetup();
      const av = row.querySelector('.gav i'); if (av) av.textContent = t.value.slice(0, 1) || '?';
    });
    F.addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.f === 'own') setOwner(+t.dataset.i, t.checked); });
  }

  root.MShiftFront = { init, showTitle, openSetup, closeSheet };
})(window);
