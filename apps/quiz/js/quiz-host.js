/* ============================================================
   MagiQuiz — quiz-host.js（司会キャラ）
   ★★ 2026-11-08 ご指定「以前の提案の 6 の司会キャラ（オンオフ可能）を追加」
   ------------------------------------------------------------
   ・試合の進行に合わせて、司会のキャラが吹き出しで実況する（始まり・手番・正解・まちがい・爆発・転落・優勝 …）。
     ★★ 2026-11-11 ご指定でカットイン（画面を横切る帯＋大きな絵）は出さない＝どの場面も吹き出しだけ。
   ・★ 2026-11-23 XEVARION II へ移しかえ：司会は <b>II のキャラ（柚葉・水瀬・美月）</b>。初代のキャラ・絵は使わない。
   ・えらべるのは<b>持っている子だけ</b>（II のガチャで1人でも出た子＝X2.owned）。
     「おまかせ」＝II のパートナー（無ければ持っている子の最初）。
   ・設定（MQ.FX.opt）：host（オン／オフ・既定はオン）・hostId（"" ＝おまかせ）。設定の画面の「司会キャラ」から。
   ・話し方は性格ごとに5つ（genki 明るい／teinei ていねい／otona 大人の余裕／shy ひかえめ／sewa 面倒見がいい）。{p}＝プレイヤー・{nm}＝司会の名前・{n}・{f}。
     ★★ 2026-11-25 第7回で性格と話し方が決まった（docs/decisions.md）：柚葉＝genki・水瀬＝shy・美月＝otona（「〜かな」「ふふ」に直した）・
        翠＝teinei（夏のお嬢さま・ていねい語）・愛菜＝sewa（面倒見のいいしっかり者・「〜でしょ」「もう」）。
   ・絵は II の顔の絵（face-256・X2.faceSrc）を丸く使う。読めないときは名前の頭文字。
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const FX = MQ.FX;

  /* ── キャラの台帳：XEVARION II のキャラ。色は属性の色（ui/tokens.css の --flare・--tide・--terra・--void・--nova）── */
  const X2 = window.X2;
  const C = (id, name, color, tone) => ({ id, name, color, tone, src: X2 ? X2.faceSrc(id) : "" });
  const CHARS = [
    C("yuzuha", "柚葉", "#ff5b4a", "genki"),
    C("minase", "水瀬", "#2e9bff", "shy"),
    C("miduki", "美月", "#25b871", "otona"),
    C("sui", "翠", "#8e5cff", "teinei"),
    C("mana", "愛菜", "#f0a91c", "sewa"),
  ];
  const BY = {}; CHARS.forEach((c) => { BY[c.id] = c; });

  /* ── 持っている子（II のガチャで1人でも出た子）── */
  const owned = (id) => { try { return !!(X2 && X2.owned(id)); } catch (e) { return false; } };
  function available() { return CHARS.filter((c) => owned(c.id)); }
  /* おまかせ：II のパートナー → 持っている子の最初 → 柚葉 */
  function autoPick() {
    let p = "";
    try { const m = X2 && X2.me(); p = (m && m.face) || ""; } catch (e) { p = ""; }
    if (p && BY[p] && owned(p)) return BY[p];
    return available()[0] || CHARS[0];
  }
  function current() {
    const id = FX.opt.hostId;
    if (id && available().some((c) => c.id === id)) return BY[id];
    return autoPick();
  }
  const on = () => FX.opt.host !== false && FX.opt.host !== 0;

  /* ── 顔（丸）。初代は立ち絵から顔の位置で切りぬいていた。II の絵（face-256）はもう顔なので、そのまま丸く ── */
  function faceCSS(c) {
    return "background-image:url('" + c.src + "');background-size:cover;background-position:50% 30%";
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  function faceHTML(c, D, cls) {
    return '<span class="mh-f' + (cls ? " " + cls : "") + '" style="--c:' + c.color + ";width:" + D + "px;height:" + D + "px;" + faceCSS(c) + '"><i>' + esc(c.name.slice(0, 1)) + "</i></span>";
  }

  /* ══ セリフ ══ */
  const LINES = {
    genki: {
      start: ["MagiQuiz、スタート！ 司会は{nm}だよ。みんな、がんばろー！", "{nm}が実況するよ！ 準備はいい？ いっくよー！"],
      order: ["順番が決まったよ！ トップバッターは{p}！"],
      turn: ["次は{p}の番！ ファイト！", "{p}、いってみよー！", "さあ{p}、見せちゃって！"],
      ok: ["正解！ さすが{p}！", "ナイス！ ばっちり！", "おみごと〜！"],
      combo: ["{n}問連続正解！ 止まらないね！", "{p}、{n}連続！ ノッてるー！"],
      ng: ["あ〜、おしい！", "ドンマイ！ 次こそ！", "ざんねん！ でも切りかえていこ！"],
      time: ["時間切れ〜！ あせらずいこ！", "タイムアップ！ むずかしかったね！"],
      pass: ["爆弾は{p}へパス！ ドキドキ…！", "{p}にバトンタッチ！ …爆弾だけど！"],
      heart: ["ミスが重なってライフ −1！ 気をつけて！"],
      boom: ["ドカーン！！ {p}、ライフ −1！", "爆発〜！ {p}、だいじょうぶ！？"],
      out: ["{p}、ここでアウト…！ おつかれさま！"],
      climb: ["{f}階へ！ どんどん登ってこー！", "{p}、{f}階到達！"],
      safe: ["チェックポイント通過！ ここより下には落ちないよ！"],
      top: ["てっぺん到達！！ {p}すごすぎ！"],
      fall: ["うわっ、転落〜！ まだまだこれから！"],
      drop: ["ここで降りる！ かしこい選択！"],
      buzz: ["{p}、はやい！", "押したのは{p}！"],
      otetsuki: ["お手つき！ ライフ −1！"],
      none: ["だれも答えられなかった〜！ 解説を見てみよ！"],
      rushwin: ["{p}、先取達成！！ おめでとう！"],
      final: ["優勝は{p}！ おめでとー！！", "{p}の優勝！ みんなおつかれさま！"],
      solo: ["おつかれさま！ いい勝負だったよ！"],
      wait: ["相手が来るのを待ってるよ…！"],
      online: ["オンライン対戦、スタート！ 相手に負けないで！"],
      first: ["{p}がいちばん乗り！"],
    },
    teinei: {
      start: ["MagiQuiz、はじまります。司会は{nm}がつとめますね。……わくわくします。", "本日の司会の{nm}です。どうぞよろしくお願いします。"],
      order: ["順番が決まりました。最初は{p}さんです。"],
      turn: ["{p}さんの番です。落ちついて、どうぞ。", "次は{p}さん。がんばってくださいね。"],
      ok: ["まあ、正解です！ おみごとです。", "{p}さん、正解です。すてきです。"],
      combo: ["{n}問連続で正解です。すばらしいですね。"],
      ng: ["おしいです…。次はきっと大丈夫ですよ。", "ざんねんです。解説をいっしょに見ましょう。"],
      time: ["時間切れです。むずかしい問題でしたね。"],
      pass: ["爆弾は{p}さんへ。……どきどきしますね。"],
      heart: ["ミスが続いて、ライフがひとつ減りました。"],
      boom: ["爆発しました…！ {p}さん、ライフ −1 です。"],
      out: ["{p}さんは、ここでアウトです。おつかれさまでした。"],
      climb: ["{f}階に到着です。その調子です。"],
      safe: ["チェックポイント通過です。ここより下には落ちません。"],
      top: ["てっぺん到達です…！ {p}さん、本当にすごいです。"],
      fall: ["転落してしまいました。まだ取りもどせますよ。"],
      drop: ["ここで降りるのですね。堅実な判断です。"],
      buzz: ["{p}さんが押しました。"],
      otetsuki: ["お手つきです。ライフがひとつ減ります。"],
      none: ["どなたも答えられませんでした。解説を見てみましょう。"],
      rushwin: ["{p}さん、先取達成です。おめでとうございます。"],
      final: ["優勝は{p}さんです。おめでとうございます。", "{p}さんの優勝です。みなさん、おつかれさまでした。"],
      solo: ["おつかれさまでした。よくがんばりましたね。"],
      wait: ["お相手が来るのを、いっしょに待ちましょう。"],
      online: ["オンライン対戦、はじめます。ご健闘をお祈りします。"],
      first: ["いちばん早かったのは{p}さんです。"],
    },
    /* ★ 2026-11-25 美月（落ち着いた大人のお姉さん・少しからかう・「〜かな」「ふふ」）に合わせて直した（前は「〜わよ」） */
    otona: {
      start: ["ふふ、MagiQuiz の時間だよ。司会は{nm}。楽しませてくれるかな？", "{nm}が見ててあげる。……かっこいいところ、見せてね？"],
      order: ["順番が決まったよ。最初は{p}。期待してるね。"],
      turn: ["{p}の番だね。さあ、どうするのかな？", "次は{p}。……緊張してる？ ふふ。"],
      ok: ["正解。やるね。", "ふふ、お見事。{p}、さすがだね。"],
      combo: ["{n}問連続……今日は冴えてるね。"],
      ng: ["ざんねん。次は見せてくれるかな？", "惜しかったね。解説、ちゃんと見ておこうか。"],
      time: ["時間切れ。考えすぎちゃったかな？"],
      pass: ["爆弾は{p}へ。……ふふ、手が汗ばんでない？"],
      heart: ["ミスが重なってライフ −1。気をつけてね。"],
      boom: ["ドカン。……{p}、ライフ −1 だよ。", "あらら、爆発。{p}、だいじょうぶ？"],
      out: ["{p}はここでおしまい。よくがんばったね。"],
      climb: ["{f}階。いい眺めでしょう？", "{p}、{f}階まで来たね。"],
      safe: ["チェックポイント。これで少しは安心かな。"],
      top: ["てっぺん……！ {p}、見直しちゃった。"],
      fall: ["あら、落ちちゃった。まだ終わりじゃないよ。"],
      drop: ["ここで降りるの？ 賢いね。"],
      buzz: ["{p}、早いね。"],
      otetsuki: ["お手つき。あせっちゃだめだよ？"],
      none: ["だれも答えられなかったね。解説を見てみようか。"],
      rushwin: ["{p}が先取。……ふふ、かっこよかったよ。"],
      final: ["優勝は{p}。おめでとう、よくやったね。", "勝ったのは{p}。……ふふ、見てて楽しかった。"],
      solo: ["おつかれさま。いい顔してたよ。"],
      wait: ["相手を待とうか。焦らないの。"],
      online: ["オンライン対戦のはじまりだよ。負けないでね？"],
      first: ["いちばん早かったのは{p}。やるね。"],
    },
    shy: {
      start: ["……MagiQuiz、はじまるよ。司会は……{nm}。よろしくね。", "えっと……司会の{nm}です。がんばって、ね。"],
      order: ["……順番、決まったよ。最初は{p}。"],
      turn: ["{p}の番……がんばって。", "次は{p}。……応援してる。"],
      ok: ["……正解。すごい。", "{p}、正解……！ やった。"],
      combo: ["{n}問連続……ほんとに、すごい。"],
      ng: ["……おしかったね。次は、きっと。", "ざんねん……でも、だいじょうぶ。"],
      time: ["時間切れ……むずかしかったね。"],
      pass: ["爆弾、{p}に……どきどきする。"],
      heart: ["ミスが続いて……ライフ −1。"],
      boom: ["きゃっ……！ {p}、ライフ −1……。"],
      out: ["{p}、ここでアウト……おつかれさま。"],
      climb: ["{f}階……いい感じ。"],
      safe: ["チェックポイント……これで、ひと安心。"],
      top: ["てっぺん……！ {p}、すごい……！"],
      fall: ["……落ちちゃった。でも、まだいけるよ。"],
      drop: ["ここで降りるんだね……うん、いいと思う。"],
      buzz: ["{p}、はやい……！"],
      otetsuki: ["お手つき……ライフ −1。"],
      none: ["だれも……答えられなかったね。解説、見よ。"],
      rushwin: ["{p}、先取……！ おめでとう。"],
      final: ["優勝は……{p}。おめでとう。", "{p}の優勝……すごかった。"],
      solo: ["おつかれさま……がんばってたね。"],
      wait: ["……相手、まだかな。"],
      online: ["オンライン対戦……はじまるよ。"],
      first: ["いちばんは……{p}。"],
    },
    /* ★ 2026-11-25 愛菜（面倒見のいいしっかり者・心配性・「〜でしょ」「もう」） */
    sewa: {
      start: ["MagiQuiz、はじめるよ。司会は{nm}。みんな、無理しないでがんばってね。", "{nm}が司会だよ。お水は飲んだ？ じゃあ、はじめよっか。"],
      order: ["順番が決まったよ。最初は{p}。落ちついてね。"],
      turn: ["{p}の番だよ。深呼吸してからね。", "次は{p}。だいじょうぶ、ちゃんと見てるから。"],
      ok: ["正解！ えらいえらい。", "{p}、正解！ ほらね、できるでしょ。"],
      combo: ["{n}問連続正解！ がんばりすぎてない？"],
      ng: ["あ〜、おしい。次はきっと当たるよ。", "ざんねん。解説、いっしょに見ておこ？"],
      time: ["時間切れ。あせらなくていいからね。"],
      pass: ["爆弾は{p}へ。……もう、見てるこっちがどきどきする。"],
      heart: ["ミスが続いてライフ −1。気をつけてね。"],
      boom: ["きゃっ、爆発！ {p}、ライフ −1……だいじょうぶ？", "もう、びっくりした……{p}、ライフ −1 だよ。"],
      out: ["{p}はここでアウト。よくがんばったね、おつかれさま。"],
      climb: ["{f}階！ いい調子だね。", "{p}、{f}階まで来たよ。"],
      safe: ["チェックポイント通過。これでひと安心でしょ。"],
      top: ["てっぺん到達！ {p}、ほんとにすごいね。"],
      fall: ["落ちちゃった……でも、まだ取りもどせるよ。"],
      drop: ["ここで降りるんだね。無理しないの、えらいよ。"],
      buzz: ["{p}、はやい！"],
      otetsuki: ["お手つき。もう、あわてないの。"],
      none: ["だれも答えられなかったね。解説、見ておこう。"],
      rushwin: ["{p}、先取達成！ おめでとう！"],
      final: ["優勝は{p}！ おめでとう、よくがんばったね。", "{p}の優勝！ みんな、おつかれさま。あったかいもの飲んでね。"],
      solo: ["おつかれさま。今日はゆっくり休んでね。"],
      wait: ["相手が来るまで、ちょっと休憩しよっか。"],
      online: ["オンライン対戦、はじまるよ。みんな、がんばって。"],
      first: ["いちばん早かったのは{p}。すごいね。"],
    },
  };
  /* カットインにする場面 */
  /* ★★ 2026-11-10 ご指定「最後の司会のカットインは要りません」→ ★★ 2026-11-11 ご指定「司会のカットインを消して」＝<b>カットインは出さない</b>（どの場面も吹き出しだけ）。
     cut() は残してある（もどすときは CUT に場面を入れるだけ）。 */
  const CUT = {};
  const lastPick = {};
  function lineFor(ev, c) {
    const T = LINES[c.tone] || LINES.genki, arr = T[ev] || LINES.genki[ev];
    if (!arr || !arr.length) return "";
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && lastPick[ev] === i) i = (i + 1) % arr.length;
    lastPick[ev] = i;
    return arr[i];
  }
  function fill(s, v, c) {
    v = v || {};
    return String(s).replace(/\{(\w+)\}/g, (m, k) => (k === "nm" ? c.name : v[k] != null ? v[k] : ""));
  }

  /* ══ 画面の部品 ══ */
  let box = null, hideT = 0, cutT = 0;
  function ensure() {
    if (box && document.body.contains(box)) return box;
    box = document.createElement("div");
    box.id = "mqHost"; box.className = "mh"; box.setAttribute("aria-live", "polite");
    box.innerHTML = '<span class="mh-fw"></span><div class="mh-b"><b class="mh-n"></b><span class="mh-t"></span></div>';
    box.addEventListener("click", () => hide());
    document.body.appendChild(box);
    return box;
  }
  function hide() { if (!box) return; box.classList.remove("on"); clearTimeout(hideT); }
  /* 吹き出しを出す。ev＝場面のキー・v＝{p,n,f}。o.ms＝出しておく時間・o.force＝オフでも出す（設定の見本） */
  function say(ev, v, o) {
    o = o || {};
    if (!on() && !o.force) return;
    const c = o.char || current(); if (!c) return;
    const raw = o.text || lineFor(ev, c); if (!raw) return;
    const tx = fill(raw, v, c);
    if (CUT[ev] && !o.noCut && !(FX.RM && FX.RM())) { cut(c, tx); return; }   /* ★★ 2026-11-11 o.cut（5問連続）もカットインにしない */
    const b = ensure();
    b.style.setProperty("--c", c.color);
    b.querySelector(".mh-fw").innerHTML = faceHTML(c, 52);
    b.querySelector(".mh-n").textContent = c.name;
    b.querySelector(".mh-t").textContent = tx;
    b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
    clearTimeout(hideT);
    hideT = setTimeout(hide, o.ms || Math.min(5200, 1900 + tx.length * 55));
  }
  /* カットイン：画面を横切る帯＋大きな絵（タップで閉じる） */
  function cut(c, tx) {
    hide();
    const fx = document.getElementById("fxt") || document.body;
    const old = document.querySelector(".mh-cut"); if (old) old.remove();
    const d = document.createElement("div");
    d.className = "mh-cut"; d.style.setProperty("--c", c.color);
    const D = Math.min(240, Math.round(window.innerHeight * 0.3), Math.round(window.innerWidth * 0.36));   /* スマホの縦でも文字が切れないように */
    d.innerHTML = '<i class="mh-cut-band"></i><span class="mh-cut-f" style="width:' + D + "px;height:" + D + "px;" + faceCSS(c) + '"></span>' +
      '<div class="mh-cut-t"><small>' + esc(c.name) + "</small><b>" + esc(tx) + "</b></div>";
    fx.appendChild(d);
    clearTimeout(cutT);
    cutT = setTimeout(() => { d.classList.add("out"); setTimeout(() => d.remove(), 420); }, 2300);
  }

  /* ══ 設定：司会キャラを選ぶ（quiz-ui.js の設定から開く）══ */
  function pickerHTML() {
    const av = available(), cur = FX.opt.hostId || "";
    const auto = autoPick();
    const row = (id, c, label, sub) => '<button class="mh-pk' + (cur === id ? " on" : "") + '" data-a="hostPick" data-v="' + id + '" style="--c:' + c.color + '">' + faceHTML(c, 46) + "<span><b>" + esc(label) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span></button>";
    return '<div class="mh-pks">' + row("", auto, "おまかせ", "いまは " + auto.name) + av.map((c) => row(c.id, c, c.name, X2 && X2.isMax(c.id) ? "完凸" : "")).join("") + "</div>" +
      '<p class="mh-note">持っているキャラ（XEVARION II のガチャで出た子）から選べます。「おまかせ」は II のパートナーです。</p>';
  }
  MQ.Host = { say, cut: (ev, v) => say(ev, v), hide, current, available, on, pickerHTML, faceHTML, CHARS, BY };
})();
