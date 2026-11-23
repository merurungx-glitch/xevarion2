/* ============================================================
   MagiQuiz — アカウント・賞金・戦績（ゲーム本体と切りはなす）
   ★★ 2026-11-05 全面作り直し → ★ 2026-11-23 XEVARION II へ移しかえ：連携・賞金・アイコンは II のパーティーの部品（window.X2）
   ------------------------------------------------------------
   ・席のつなぎかたは2つ（Yacht・GuraPlate・Shift・ChainParty と同じ）：
     ① この端末の本人（チェックだけ）… II でサインインしている人。XEVA はこの端末のお財布へ直接（オフラインでも入る）。
     ② アカウント連携（その人の II の ID と合言葉）… まわりの人の賞金。その人の受け取り箱へ送る。
        送れなかったら II が送り待ちに入れて、通信が戻ったときに送る。★ 合言葉は保存しない（II も覚えない）
   ・賞金は順位そのまま（初代と同じ額：1位 1,000・2位 700・3位 500・4位 350・5位 250・6位 180・7位 120・8位 80 XEVA＝quiz-data.js の RULE.PRIZES）。
     チーム戦はチームの順位をメンバー全員に。同じ順位＝同じ額。★ 3問以上答えた人だけ（RULE.PRIZE_MIN_ANS）。ひとりで遊んだときは 正解数×40（最大400）。
     2台で対戦（quiz-online.js）は、それぞれの端末が自分の分だけ report する（owner）。
   ・アイコン：II のキャラ（柚葉・水瀬・美月）の顔。本人と連携した人は、その人のパートナーの顔。
   ・戦績はこの端末に（本人は "me"・連携した人は uid ごと・ほかは名前ごと）。x2a.quiz.stats
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const X2 = window.X2;
  const STATS = "x2a.quiz.stats";

  /* この端末の本人（II でサインインしている人） */
  function me() {
    try {
      const m = X2.me();
      return m ? { uid: m.uid, id: m.id, name: m.name, face: m.face || "" } : null;
    } catch (e) { return null; }
  }
  /* この端末で連携したことのある人（II が覚えている・合言葉は無い） */
  function recent() { try { return X2.party.recent() || []; } catch (e) { return []; } }
  /* 初代の名残（連携した人は II が覚える）。呼ばれても何もしない */
  function remember() {}
  /* 顔の絵（その人のパートナー・えらんだキャラ）。無ければ "" */
  const thumb = (acc) => (acc && acc.face && X2 ? X2.faceSrc(acc.face) : "");
  /* アイコンにえらべるキャラ（II の3人）[{ id, name, src }] */
  function faces() { try { return X2.faces(); } catch (e) { return []; } }
  /* 連携（ID と合言葉）：{ acc } か { error: format|self|bad|net|many } */
  function verify(id, pass) { return X2.party.verify(id, pass).catch(() => ({ error: "net" })); }
  /* 初代は連携した人の名前と絵を取り直していた。II の連携は確かめたときの名前と顔を使う */
  function refresh() { return Promise.resolve(null); }

  const PRIZES = () => (MQ.Data && MQ.Data.RULE && MQ.Data.RULE.PRIZES) || [1000, 700, 500, 350, 250, 180, 120, 80];

  /* 試合の結果：戦績をためて、賞金を配る。
     rows＝[{ id, uid, owner, name, rank, ok, n, pt, score, boom, fields:{f:{ok,n}}, topics:{t:{ok,n}} }]（チーム戦はメンバー1人ずつ）
     opt＝{ solo, mode, gid }  戻り値＝{ prizes:[{rank,name,amount,kind:"me"|"cloud"|"wait"}], short } */
  async function report(rows, opt) {
    opt = opt || {};
    const out = { prizes: [] };
    const m = me();
    try {
      const st = stats();
      rows.forEach((p) => {
        const id = p.owner ? "me" : p.uid ? p.uid : "local:" + p.name;
        const r = st[id] || { name: p.name, games: 0, wins: 0, ok: 0, n: 0, best: 0, bestS: 0, boom: 0, fields: {}, topics: {}, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (p.rank === 1 && rows.length > 1) r.wins++;
        r.ok += p.ok || 0; r.n += p.n || 0; r.boom = (r.boom || 0) + (p.boom || 0);
        if (opt.mode === "tower" && (p.pt || 0) > (r.best || 0)) r.best = p.pt;
        if (opt.mode === "score" && (p.score || 0) > (r.bestS || 0)) r.bestS = p.score;
        r.fields = r.fields || {}; r.topics = r.topics || {};
        Object.keys(p.fields || {}).forEach((k) => { const a = r.fields[k] || (r.fields[k] = { ok: 0, n: 0 }); a.ok += p.fields[k].ok; a.n += p.fields[k].n; });
        Object.keys(p.topics || {}).forEach((k) => { const a = r.topics[k] || (r.topics[k] = { ok: 0, n: 0 }); a.ok += p.topics[k].ok; a.n += p.topics[k].n; });
        st[id] = r;
      });
      localStorage.setItem(STATS, JSON.stringify(st));
    } catch (e) { /* 戦績が書けなくても賞金は配る */ }

    const RULE = MQ.Data.RULE, P = PRIZES();
    const pay = rows.map((p) => {
      const uid = p.owner ? (m && m.uid) : p.uid;
      if (!uid) return null;
      if (opt.solo) { const amt = Math.min(RULE.SOLO_MAX, (p.ok || 0) * RULE.SOLO_PER_OK); return amt > 0 ? { p, uid, amt, why: "MagiQuiz ひとりプレイ" } : null; }
      if ((p.played != null ? p.played : p.n || 0) < RULE.PRIZE_MIN_ANS) { out.short = true; return null; }
      const amt = P[p.rank - 1];
      return amt ? { p, uid, amt, why: p.rank + "位 賞金（MagiQuiz）" } : null;
    }).filter(Boolean);
    if (!pay.length) return out;

    let res = [];
    const gid = String(opt.gid || Date.now());
    try {
      res = await X2.party.award(pay.map((x, k) => ({ uid: x.uid, amt: x.amt, why: x.why, key: gid + "_" + (x.p.id != null ? x.p.id : k) })));
    } catch (e) { res = []; }
    out.prizes = pay.map((x) => {
      const r = res.find((z) => z.uid === x.uid);
      return { rank: x.p.rank, name: x.p.name, amount: x.amt, kind: r ? r.kind : "wait" };
    });
    return out;
  }
  function stats() {
    try { const s = JSON.parse(localStorage.getItem(STATS) || "{}"); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; }
  }

  MQ.Account = { recent, remember, me, thumb, faces, refresh, verify, report, stats, PRIZES };
})();
