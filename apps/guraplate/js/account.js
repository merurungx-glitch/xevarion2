/* ============================================================
   MagiGura Plate — アカウント・賞金・戦績（ゲーム本体と切りはなす）
   ★ XEVARION II へ移しかえ（2026-11-23）：連携・賞金・アイコンは II のパーティーの部品（window.X2）を使う
   ------------------------------------------------------------
   ・席のつなぎかたは2つ（初代と同じ考え方）：
     ① この端末の本人（チェックだけ）… II でサインインしている人。XEVA はこの端末のお財布へ直接（オフラインでも入る）。
     ② アカウント連携（その人の II の ID と合言葉）… まわりの人の賞金。その人の受け取り箱へ送る。
        送れなかったら II が送り待ちに入れて、通信が戻ったときに送る。★ 合言葉は保存しない（II も覚えない）
   ・賞金は順位そのまま（II の共通表 X2.party.PRIZES＝1位 250・2位 200・3位 150・4位 100・5位 50）。
     同じ順位＝同じ額。人数が2人以上で、全員が2回以上置いた試合だけ（すぐ終わる試合で稼げないように）。
   ・アイコン：II のキャラ（柚葉・水瀬・美月）の顔。本人と連携した人は、その人のパートナーの顔。
   ・戦績はこの端末に（本人と連携した人は "u:<uid>"・ほかは名前ごと）。
   ============================================================ */
(function (root) {
  'use strict';
  const GP = root.GP = root.GP || {};
  const X2 = root.X2;
  const STATS = 'x2a.gura.stats';
  const MIN_TURNS = 2;                     /* 賞金の条件：全員がこの回数以上置いた */

  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境でも遊べる */ } };

  /* この端末で連携したことのある人（II が覚えている・合言葉は無い） */
  function recent() { try { return X2.party.recent() || []; } catch (e) { return []; } }
  /* この端末の本人（II でサインインしている人） */
  function me() {
    try {
      const m = X2.me();
      return m ? { uid: m.uid, id: m.id, name: m.name, face: m.face || '' } : null;
    } catch (e) { return null; }
  }
  /* 小さいアイコン：その人のパートナーの顔（無ければ頭文字） */
  function thumb(acc) { return acc && acc.face ? X2.faceSrc(acc.face) : ''; }
  /* アイコンにえらべるキャラ（II の3人）。初代の UR キャラの一覧と同じ形 { mbId, file, name } で返す */
  function urList() {
    try { return X2.faces().map((c) => ({ mbId: c.id, file: c.src, name: c.name })); } catch (e) { return []; }
  }
  function picSrc(id) { return id ? X2.faceSrc(id) : ''; }

  /* ══ 連携（ID と合言葉）：{ acc } か { error: format|self|bad|net|many } ══ */
  function verify(id, pass) { return X2.party.verify(id, pass).catch(() => ({ error: 'net' })); }

  /* ══ 賞金 ══ */
  const PRIZES = () => X2.party.PRIZES;
  const statId = (p, my) => (p.owner && my ? 'u:' + my.uid : p.uid ? 'u:' + p.uid : 'local:' + p.name);
  function stats() { const s = jget(STATS, {}); return s && typeof s === 'object' ? s : {}; }
  /* 試合の結果：戦績をためて、賞金を配る。
     rows＝[{ name, uid, owner, rank, left, turns }]（順位は同じ数なら同じ順位）
     opt＝{ gid }  戻り値＝{ prizes:[{ rank, name, amount, kind:"me"|"cloud"|"wait" }], short } */
  async function report(rows, opt) {
    opt = opt || {};
    const out = { prizes: [], short: false };
    const my = me();
    try {
      const st = stats();
      rows.forEach((p) => {
        const id = statId(p, my);
        const r = st[id] || { name: p.name, games: 0, wins: 0, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (p.rank === 1) r.wins++;
        st[id] = r;
      });
      jset(STATS, st);
    } catch (e) { /* 戦績が書けなくても賞金は配る */ }

    const short = rows.length < 2 || rows.some((p) => (p.turns || 0) < MIN_TURNS);
    if (short) { out.short = true; return out; }
    const P = PRIZES();
    const pay = rows.map((p, k) => {
      if ((!p.owner && !p.uid) || (p.owner && !my)) return null;
      const amt = P[p.rank - 1];
      return amt ? { p, k, amt, why: p.rank + '位 賞金（MagiGura Plate）' } : null;
    }).filter(Boolean);
    if (!pay.length) return out;
    let res = [];
    try {
      res = await X2.party.award(pay.map((x) => ({ uid: x.p.owner ? my.uid : x.p.uid, amt: x.amt, why: x.why, key: (opt.gid || Date.now()) + '_' + x.k })));
    } catch (e) { res = []; }
    pay.forEach((x) => {
      const uid = x.p.owner ? my.uid : x.p.uid;
      const r = res.find((z) => z.uid === uid);
      out.prizes.push({ rank: x.p.rank, name: x.p.name, amount: x.amt, kind: r ? r.kind : 'wait' });
    });
    return out;
  }

  GP.Account = { recent, me, thumb, urList, picSrc, verify, report, stats, statId, PRIZES, MIN_TURNS };
})(window);
