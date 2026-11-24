/* ============================================================
   MagiChainParty ONLINE — 部屋番号でつながるオンライン対戦
   ★ XEVARION II へ移しかえ（2026-11-23）
   ・部屋は II の部品（window.X2.rooms＝src/core/rooms.js）：Firebase xevarion2 の rooms/chain/<4桁>（手元は試験用の x2dev.rtdb）
     初代のように別の Firebase（だれでも書ける）は使わない。入れるのは XEVARION II にサインインしている人だけ
   ・参加する人＝その端末の II のアカウント（名前・パートナーの顔）。合言葉はいらない
   ・「いま手番のプレイヤーの端末」が連鎖を計算して盤面を書き、ほかの端末はそれを受け取って描きなおす（初代と同じ）
   ・賞金：ホストが1回だけ（rewarded の印）、II のパーティーの部品で配る（ホスト＝お財布へ・ほかの人＝その人の受け取り箱へ）
   window.MCPOnline として、初代と同じ名前の関数を出す（game.js はほぼそのまま）。
   ============================================================ */
(function () {
  "use strict";
  const X2 = window.X2;
  const R = X2.rooms;
  const MAX_PLAYERS = R.MAX_PLAYERS || 6;
  /* オンライン対戦の順位賞金（XEVA）。★ 2026-11-24 第6回：1台のときと同じ II の共通の表（X2.party.PRIZES＝1位 500〜8位 40）。
     前はオンラインだけ初代の別の表（1位 300・200・150・100・50・6位 25）だった */
  const ONLINE_PRIZES = X2.party.PRIZES;

  /* 部屋をつくる（ホスト＝0番の席）。profile は使わない（II のアカウントで入る） */
  function createRoom(profile, opts) { return R.create({ size: (opts && opts.size) || 8, roundLimit: (opts && opts.roundLimit) || 0 }); }
  /* 部屋に入る（4桁） */
  function joinRoom(code, profile) { return R.join(code); }

  /* ホストが順位賞金を1回だけ配る。ranked＝順位順の {uid,name,rank}（rank＝同じ成績なら同じ順位・無ければ並び順）。戻り値 [{rank,name,amount,kind}]
     key は「部屋番号＋配った時刻＋並び順」：部屋番号は使い回されるので、番号と順位だけだと前の試合の賞金（未受取）と同じ印になる。
     ★ 同じ順位の人がいるので、印は順位ではなく並び順（順位だと2人目が同じ印になり、送り待ちで1人分にまとめられてしまう） */
  async function awardOnce(ranked) {
    if (!(await R.awardOnce())) return [];
    const list = ranked.map((r, i) => {
      const rank = r && r.rank ? r.rank : i + 1;
      return r && r.uid && ONLINE_PRIZES[rank - 1] ? { uid: r.uid, name: r.name, rank, pos: i, amt: ONLINE_PRIZES[rank - 1] } : null;
    }).filter(Boolean);
    if (!list.length) return [];
    const stamp = Date.now().toString(36);
    let res = [];
    try {
      res = await X2.party.award(list.map((x) => ({ uid: x.uid, amt: x.amt, why: x.rank + "位 賞金（MagiChainParty オンライン）", key: (R.code() || "room") + "_" + stamp + "_" + x.pos })));
    } catch (e) { res = []; }
    return list.map((x) => {
      const r = res.find((z) => z.uid === x.uid);
      return { rank: x.rank, name: x.name, amount: x.amt, kind: r ? r.kind : "wait" };
    });
  }

  window.MCPOnline = {
    ready: true, MAX_PLAYERS, ONLINE_PRIZES,
    createRoom, joinRoom, awardOnce,
    leaveRoom: () => R.leave(),
    watchRoom: (cb) => R.watchRoom(cb),
    watchState: (cb) => R.watchState(cb),
    watchConnected: (cb) => R.watchConnected(cb),
    setReady: (v) => R.setReady(v),
    setOptions: (o) => R.setOptions(o),
    startGame: (state, slots) => R.startGame(state, slots),
    pushState: (state) => R.pushState(state),
    finish: () => R.finish(),
    isHost: (room) => R.isHost(room),
    myUid: () => R.myUid(),
    code: () => R.code(),
    inRoom: () => R.inRoom(),
  };
  try { window.dispatchEvent(new Event("mcponline:ready")); } catch (e) {}
})();
