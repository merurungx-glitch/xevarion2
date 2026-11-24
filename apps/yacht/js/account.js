/* ============================================================
   MagiYacht — アカウント・賞金・記録（ゲーム本体と切りはなす）
   ★ XEVARION II へ移しかえ（2026-11-20）：連携・賞金・アイコンは II のパーティーの部品（window.X2）を使う
   ------------------------------------------------------------
   ・つなぎかたは2つ（初代と同じ考え方）：
     ① この端末の本人（チェックだけ）… II でサインインしている人。XEVA はこの端末のお財布へ直接（オフラインでも入る）。
     ② アカウント連携（その人の II の ID と合言葉）… まわりの人の賞金。その人の受け取り箱へ送る。
        送れなかったら II が送り待ちに入れて、通信が戻ったときに送る。★ 合言葉は保存しない（II も覚えない）
   ・賞金：2人以上（CPU も数える）＝順位そのまま（II の共通表 X2.party.PRIZES＝★ 2026-11-24 第6回で 500・350・250・175・125・90・60・40）。
     同じ点＝同じ順位＝同じ額。CPU とリタイアした人はもらえない（順位には入る。リタイアは最後）。
     ひとりで遊んだとき＝点数で（100点から・20点ごとに 10 XEVA・最大 150）。
     12回を最後まで遊んだ人だけ（途中でやめた試合・リタイアした人はなし）。
   ・アイコン：II のキャラ（柚葉・水瀬・美月）の顔。本人と連携した人は、その人のパートナーの顔。
   ・記録はこの端末に（本人と連携した人は "u:<uid>"・ほかは名前ごと）：試合・勝ち・最高点・合計・ヨットの数。
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY = root.MY || {};
  const X2 = root.X2;
  const STATS = 'x2a.yacht.stats';

  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境でも遊べる */ } };

  /* この端末で連携したことのある人（II が覚えている・合言葉は無い） */
  function recent() { try { return X2.party.recent() || []; } catch (e) { return []; } }
  function forget(uid) { try { X2.party.forget(uid); } catch (e) { /* なし */ } }
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
  const SOLO_MIN = 100, SOLO_MAX = 150;
  const soloPrize = (total) => (total >= SOLO_MIN ? Math.min(SOLO_MAX, Math.floor(total / 20) * 10) : 0);
  const statId = (p, my) => (p.owner && my ? 'u:' + my.uid : p.uid ? 'u:' + p.uid : 'local:' + p.name);

  function stats() { const s = jget(STATS, {}); return s && typeof s === 'object' ? s : {}; }
  /* 試合の結果：記録をためて、賞金を配る。
     rows＝[{ m, name, uid, owner, cpu, rank, total, retired, yachts }]（rank は同じ点なら同じ順位）
     opt＝{ gid }  戻り値＝{ prizes:[{ rank, name, amount, kind:"me"|"cloud"|"wait" }], solo } */
  async function report(rows, opt) {
    opt = opt || {};
    const out = { prizes: [], solo: rows.length === 1 };
    const my = me();
    try {
      const st = stats();
      rows.forEach((p) => {
        if (p.cpu) return;
        const id = statId(p, my);
        const r = st[id] || { name: p.name, games: 0, wins: 0, best: 0, sum: 0, yachts: 0, at: 0 };
        r.name = p.name; r.games++; r.at = Date.now();
        if (!p.retired) {
          if (p.rank === 1 && rows.length > 1) r.wins++;
          r.best = Math.max(r.best || 0, p.total || 0);
          r.sum = (r.sum || 0) + (p.total || 0); r.fin = (r.fin || 0) + 1;
        }
        r.yachts = (r.yachts || 0) + (p.yachts || 0);
        st[id] = r;
      });
      jset(STATS, st);
    } catch (e) { /* 記録が書けなくても賞金は配る */ }

    const P = PRIZES();
    const pay = rows.map((p, k) => {
      if (p.cpu || p.retired || (!p.owner && !p.uid) || (p.owner && !my)) return null;
      const amt = out.solo ? soloPrize(p.total || 0) : P[p.rank - 1];
      return amt ? { p, k, amt, why: out.solo ? 'ひとりで ' + p.total + '点（MagiYacht）' : p.rank + '位 賞金（MagiYacht）' } : null;
    }).filter(Boolean);
    if (!pay.length) return out;
    let res = [];
    try {
      res = await X2.party.award(pay.map((x) => ({ uid: x.p.owner ? my.uid : x.p.uid, amt: x.amt, why: x.why, key: (opt.gid || Date.now()) + '_' + (x.p.m != null ? x.p.m : x.k) })));
    } catch (e) { res = []; }
    pay.forEach((x) => {
      const uid = x.p.owner ? my.uid : x.p.uid;
      const r = res.find((z) => z.uid === uid);
      out.prizes.push({ rank: x.p.rank, name: x.p.name, amount: x.amt, kind: r ? r.kind : 'wait' });
    });
    return out;
  }

  MY.Account = { recent, forget, me, thumb, urList, picSrc, verify, report, stats, statId, PRIZES, soloPrize, SOLO_MIN, SOLO_MAX };
})(window);
