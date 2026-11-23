/* ============================================================
   MagiShift — アカウント・賞金・戦績（ゲーム本体と切りはなす）
   ★ XEVARION II へ移しかえ（2026-11-23）：連携・賞金・アイコンは II のパーティーの部品（window.X2）を使う
   ------------------------------------------------------------
   ・席のつなぎかたは2つ（Yacht・GuraPlate と同じ）：
     ① この端末の本人（チェックだけ）… II でサインインしている人。XEVA はこの端末のお財布へ直接（オフラインでも入る）。
     ② アカウント連携（その人の II の ID と合言葉）… まわりの人の賞金。その人の受け取り箱へ送る。
        送れなかったら II が送り待ちに入れて、通信が戻ったときに送る。★ 合言葉は保存しない（II も覚えない）
   ・賞金は順位そのまま（II の共通表 X2.party.PRIZES＝1位 250・2位 200・3位 150・4位 100・5位 50）。
     同じ順位＝同じ額。CPU（途中から CPU にした席も）・連携なし・引き分けはなし。
   ・アイコン：II のキャラ（柚葉・水瀬・美月）の顔。本人と連携した人は、その人のパートナーの顔。
   ・戦績はこの端末に（本人と連携した人は "u:<uid>"・ほかは名前ごと・CPU はためない）。
   ============================================================ */
(function () {
  "use strict";
  const MS = (window.MShift = window.MShift || {});
  const X2 = window.X2;
  const STATS = "x2a.shift.stats";

  /* この端末の本人（II でサインインしている人） */
  function me() {
    try {
      const m = X2.me();
      return m ? { uid: m.uid, id: m.id, name: m.name, face: m.face || "" } : null;
    } catch (e) { return null; }
  }
  /* この端末で連携したことのある人（II が覚えている・合言葉は無い） */
  function recent() { try { return X2.party.recent() || []; } catch (e) { return []; } }
  /* 顔の絵（その人のパートナー・えらんだキャラ）。無ければ "" */
  const thumb = (p) => (p && p.face && X2 ? X2.faceSrc(p.face) : "");
  /* アイコンにえらべるキャラ（II の3人） */
  function faces() { try { return X2.faces(); } catch (e) { return []; } }
  /* 連携（ID と合言葉）：{ acc } か { error: format|self|bad|net|many } */
  function verify(id, pass) { return X2.party.verify(id, pass).catch(() => ({ error: "net" })); }
  const PRIZES = () => (X2 && X2.party.PRIZES) || [250, 200, 150, 100, 50];

  /* 試合の結果：戦績をためて、賞金を配る。
     standings＝shift-core の standings（順位つきの席）。戻り値＝{ prizes:[{ rank, name, amount, kind:"me"|"cloud"|"wait" }] } */
  async function report(state, standings) {
    const out = { prizes: [], saved: false };
    const draw = !!(state && state.draw);
    try {
      const st = stats();
      standings.forEach((p) => {
        if (p.type === "cpu") return;
        const id = p.uid ? "u:" + p.uid : "local:" + p.name;
        const r = st[id] || { name: p.name, games: 0, wins: 0, best: 99, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (!draw && p.rank === 1) r.wins++;
        if (!draw && p.rank < r.best) r.best = p.rank;
        st[id] = r;
      });
      localStorage.setItem(STATS, JSON.stringify(st));
      out.saved = true;
    } catch (e) { /* 戦績が書けなくても賞金は配る */ }
    if (draw) return out;
    const P = PRIZES();
    const pay = standings.filter((p) => p.type !== "cpu" && p.uid && P[p.rank - 1]);
    if (!pay.length) return out;
    let res = [];
    try {
      res = await X2.party.award(pay.map((p, k) => ({ uid: p.uid, amt: P[p.rank - 1], why: p.rank + "位 賞金（MagiShift）", key: (state.gid || Date.now()) + "_" + (p.slot != null ? p.slot : k) })));
    } catch (e) { res = []; }
    out.prizes = pay.map((p) => {
      const r = res.find((z) => z.uid === p.uid);
      return { rank: p.rank, name: p.name, amount: P[p.rank - 1], kind: r ? r.kind : "wait" };
    });
    return out;
  }

  function stats() {
    try { const s = JSON.parse(localStorage.getItem(STATS) || "{}"); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; }
  }

  MS.Account = { me, recent, thumb, faces, verify, report, stats, PRIZES };
})();
