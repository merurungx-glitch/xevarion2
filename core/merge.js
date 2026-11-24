// XEVARION II — 同期のときの「合わせ方」（端末とクラウドで同じ計算を使う）
//
// 1件の記録は { v: 値, t: 書いた時刻(ms) }。合わせ方は3種類：
//   lww     … 新しく書いたほうが勝つ（パートナー・設定など）
//   counter … 端末ごとの「足した合計 p」と「引いた合計 n」を持ち、端末ごとに大きいほうを残す。
//             値は Σ(p − n)。★ 2台で同時に増やしても減らしても、どちらも消えない（XEVA・ジェム・凸など）
//   flags   … 一度 true になったら戻らない印の集まり（最初の10連をひいた・特典を受け取った など）
//   lex     … MagiLex（初代 MagiChemLex）の学習の記録。新しく書いたほうを土台に、問題ごと・印ごとに合わせる（下の mergeLex）
//   derby   … MagiDerby の馬券の記録。★ 値は JSON の文字のまま（Firebase が買い目の配列や空の配列を崩さない）。
//             新しく書いたほうを土台に、馬券ごとに合わせる（下の mergeDerby）

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
/** derby の値（JSON の文字）を読む。読めなければ null */
const readJ = (v) => {
  if (typeof v !== 'string') return isObj(v) ? JSON.parse(JSON.stringify(v)) : null;
  try { const o = JSON.parse(v); return isObj(o) ? o : null; } catch { return null; }
};

export function mergeRec(kind, a, b) {
  if (!a) return b || null;
  if (!b) return a;
  if (kind === 'derby') {
    const newer = (b.t || 0) > (a.t || 0) ? b : a;
    const older = newer === a ? b : a;
    const v = mergeDerby(readJ(newer.v), readJ(older.v));
    return { v: v ? JSON.stringify(v) : newer.v ?? older.v ?? null, t: Math.max(a.t || 0, b.t || 0) };
  }
  if (kind === 'lex') {
    const newer = (b.t || 0) > (a.t || 0) ? b : a;
    const older = newer === a ? b : a;
    const v = mergeLex(JSON.parse(JSON.stringify(newer.v ?? null)), JSON.parse(JSON.stringify(older.v ?? null)));
    return { v: v ?? newer.v ?? null, t: Math.max(a.t || 0, b.t || 0) };
  }
  if (kind === 'counter') {
    const v = {};
    const devs = new Set([...Object.keys(a.v || {}), ...Object.keys(b.v || {})]);
    for (const d of devs) {
      const x = (a.v || {})[d] || {};
      const y = (b.v || {})[d] || {};
      const out = {};
      for (const f of new Set([...Object.keys(x), ...Object.keys(y)])) {
        const px = x[f] || [0, 0];
        const py = y[f] || [0, 0];
        out[f] = [Math.max(px[0], py[0]), Math.max(px[1], py[1])];
      }
      v[d] = out;
    }
    return { v, t: Math.max(a.t || 0, b.t || 0) };
  }
  if (kind === 'flags') {
    const v = { ...(isObj(a.v) ? a.v : {}) };
    for (const [k, on] of Object.entries(isObj(b.v) ? b.v : {})) if (on) v[k] = true;
    return { v, t: Math.max(a.t || 0, b.t || 0) };
  }
  // lww：時刻が同じなら a（手元）を残す
  return (b.t || 0) > (a.t || 0) ? b : a;
}

/** counter の記録から合計を出す → { フィールド: 数 } */
export function counterTotals(rec) {
  const out = {};
  for (const fields of Object.values((rec && rec.v) || {})) {
    for (const [f, pn] of Object.entries(fields || {})) out[f] = (out[f] || 0) + (pn[0] || 0) - (pn[1] || 0);
  }
  return out;
}

export const sameRec = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * MagiLex の学習の記録を合わせる（初代 xeva-cloud.js の mergeChem を写したもの）。W＝新しいほう・Lo＝古いほう（どちらも写し）。W を返す
 * 記録の形：{ q:{id:{n,ok,ng,lv,due,last,at,…}}, days:{日付:数}, runs:[…], bm:{id:時刻}, dm:{id:外した時刻}, memo:{id:{t,at}},
 *            rw:{ごほうびの印}, xp, best:{…}, cf:{セット:{…}}, rq/rr:{リセットの墓標}, set:{設定}, at }
 * ・リセットの墓標（rq・rr）より前の記録・印は、両側から捨ててから混ぜる（捨てないと、回数の多いほう・印の和で元にもどる）
 * ・問題＝解いた回数の多いほう（同じなら新しいほう）・印＝和（早いほうの時刻）・日ごと＝大きいほう・メモ＝新しいほう
 * ★ Firebase は空の {} と [] を残さない・配列を {0:…} にすることがある → どちらでも読めるように
 */
export function mergeLex(W, Lo) {
  const obj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(W) || !obj(Lo)) return null;
  const num = (v) => Number(v) || 0;
  const arr = (v) => (Array.isArray(v) ? v : obj(v) ? Object.values(v) : []);
  const tomb = (a, b) => { const o = {}; [a, b].forEach((m) => { if (obj(m)) Object.keys(m).forEach((k) => { o[k] = Math.max(num(o[k]), num(m[k])); }); }); return o; };
  const RQ = tomb(W.rq, Lo.rq), RR = tomb(W.rr, Lo.rr);
  W.rq = RQ; W.rr = RR;
  const qT = (id) => Math.max(num(RQ[id]), num(RQ['*']));
  const mT = (k) => num(RR[k]);
  const runT = (setId) => Math.max(num(RR['run:' + setId]), num(RR['run:*']));
  [W, Lo].forEach((X) => {
    if (obj(X.q)) Object.keys(X.q).forEach((id) => { const t = qT(id); if (t && num(X.q[id] && X.q[id].at) <= t) delete X.q[id]; });
    if (obj(X.rw)) Object.keys(X.rw).forEach((k) => { const t = mT(k), v = X.rw[k]; if (t && (typeof v !== 'number' || v <= t)) delete X.rw[k]; });
    X.runs = arr(X.runs).filter((r) => !(r && num(r.at) <= runT(r.set)));
    if (obj(X.memo) && num(RR['memo:*'])) Object.keys(X.memo).forEach((id) => { if (num(X.memo[id] && X.memo[id].at) <= num(RR['memo:*'])) delete X.memo[id]; });
    if (obj(X.bm) && num(RR['bm:*'])) Object.keys(X.bm).forEach((id) => { if (num(X.bm[id]) <= num(RR['bm:*'])) delete X.bm[id]; });
    if (obj(X.days) && num(RR['days:*'])) { const d0 = new Date(num(RR['days:*'])); d0.setHours(0, 0, 0, 0); Object.keys(X.days).forEach((d) => { if (new Date(d + 'T00:00:00').getTime() < d0.getTime()) delete X.days[d]; }); }
    if (obj(X.cf)) Object.keys(X.cf).forEach((g) => { const t = mT('cf:' + g); if (t && num(X.cf[g] && X.cf[g].at) <= t) delete X.cf[g]; });
  });
  W.cf = obj(W.cf) ? W.cf : {};
  if (obj(Lo.cf)) Object.keys(Lo.cf).forEach((g) => { const l = Lo.cf[g], w = W.cf[g]; if (!obj(l)) return; if (!obj(w) || num(l.at) > num(w.at)) W.cf[g] = l; });
  W.q = obj(W.q) ? W.q : {};
  if (obj(Lo.q)) Object.keys(Lo.q).forEach((id) => { const l = Lo.q[id], w = W.q[id]; if (!obj(l)) return; if (!obj(w) || num(l.n) > num(w.n) || (num(l.n) === num(w.n) && num(l.at) > num(w.at))) W.q[id] = l; });
  const runs = W.runs.slice();
  const seen = {}; runs.forEach((r) => { if (r && r.id) seen[r.id] = 1; });
  Lo.runs.forEach((r) => { if (r && r.id && !seen[r.id]) { seen[r.id] = 1; runs.push(r); } });
  runs.sort((a, b) => num(b && b.at) - num(a && a.at)); W.runs = runs.slice(0, 60);
  W.days = obj(W.days) ? W.days : {};
  if (obj(Lo.days)) Object.keys(Lo.days).forEach((d) => { W.days[d] = Math.max(num(W.days[d]), num(Lo.days[d])); });
  W.bm = obj(W.bm) ? W.bm : {}; const dm = obj(W.dm) ? W.dm : {};
  if (obj(Lo.bm)) Object.keys(Lo.bm).forEach((id) => { if (W.bm[id]) return; if (num(dm[id]) > num(Lo.bm[id])) return; W.bm[id] = Lo.bm[id]; });
  W.memo = obj(W.memo) ? W.memo : {};
  if (obj(Lo.memo)) Object.keys(Lo.memo).forEach((id) => { const l = Lo.memo[id], w = W.memo[id]; if (!obj(l)) return; if (!obj(w) || num(l.at) > num(w.at)) W.memo[id] = l; });
  W.rw = unionMarks(W.rw || {}, Lo.rw || {});
  W.xp = Math.max(num(W.xp), num(Lo.xp));
  if (obj(Lo.best)) { W.best = obj(W.best) ? W.best : {}; Object.keys(Lo.best).forEach((k) => { W.best[k] = Math.max(num(W.best[k]), num(Lo.best[k])); }); }
  return W;
}
/**
 * MagiDerby の馬券の記録を合わせる（初代 xeva-cloud.js の mergeDerby を写したもの）。W＝新しいほう・Lo＝古いほう（どちらも写し）。W を返す
 * 記録の形：{ tk:{ 馬券id:{ st:'open'|'ready'|'hit'|'miss'|'refund'|'void', cost, pay, done, … } }, st:{ bet, ret, n, hit, best }, mk:{ race_id:{ 馬id:印 } }, fav:{}, opt:{}, at }
 * ・馬券 … id で和。同じ馬券なら open（結果待ち）＜ ready（結果を計算ずみ・まだ確かめていない）＜ 確かめずみ（払い戻しずみ）の強いほう
 *          ＝ほかの端末で払い戻した券を、こちらでもう一度払い戻さない。どちらも確かめずみなら done（確かめた時刻）の早いほう
 * ・集計 st … 数は大きいほう・最高払戻は大きいほう（rf＝返還の合計は II で足した。返還で bet を減らすと、ここで元に戻っていた）
 *   予想の印 mk … レースごとに新しいほう（無いレースは古いほうから足す）／設定 … 新しいほう
 * ★ 両方が同じなら、W をそのまま返す（キーの並びも変えない＝同期で書き直しをくり返さない）
 */
export function mergeDerby(W, Lo) {
  const obj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(W)) return obj(Lo) ? Lo : null;
  if (!obj(Lo)) return W;
  const num = (v) => Number(v) || 0;
  W.tk = obj(W.tk) ? W.tk : {};
  if (obj(Lo.tk)) Object.keys(Lo.tk).forEach((id) => {
    const l = Lo.tk[id], w = W.tk[id];
    if (!obj(l)) return;
    if (!obj(w)) { W.tk[id] = l; return; }
    const rk = (t) => (t.st === 'open' ? 0 : t.st === 'ready' ? 1 : 2);
    const lr = rk(l), wr = rk(w);
    if (lr > wr) W.tk[id] = l;
    else if (lr === 2 && wr === 2 && num(l.done) && num(l.done) < num(w.done)) W.tk[id] = l;
  });
  const S = obj(W.st) ? W.st : {}, L = obj(Lo.st) ? Lo.st : {};
  ['bet', 'ret', 'n', 'hit', 'rf'].forEach((k) => {
    if (!(k in S) && !(k in L)) return;   // rf の無い記録に rf:0 を足さない（同じ記録は形も変えない）
    const m = Math.max(num(S[k]), num(L[k]));
    if (S[k] !== m) S[k] = m;
  });
  if (obj(L.best) && (!obj(S.best) || num(L.best.pay) > num(S.best.pay))) S.best = L.best;
  W.st = S;
  W.mk = obj(W.mk) ? W.mk : {};
  if (obj(Lo.mk)) Object.keys(Lo.mk).forEach((rid) => { if (!obj(W.mk[rid])) W.mk[rid] = Lo.mk[rid]; });
  W.fav = obj(W.fav) ? W.fav : {};
  if (obj(Lo.fav)) Object.keys(Lo.fav).forEach((k) => { if (!(k in W.fav)) W.fav[k] = Lo.fav[k]; });
  return W;
}

/* { id: 印 } を和で混ぜる（片方にしか無い印も残す。両方にあれば早いほうの時刻） */
function unionMarks(a, b) {
  const out = {};
  [b, a].forEach((src) => {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return;
    Object.keys(src).forEach((id) => {
      const v = src[id];
      if (!v) { if (!(id in out)) out[id] = v; return; }
      const cur = out[id];
      if (!cur) { out[id] = v; return; }
      if (typeof cur === 'number' && typeof v === 'number') out[id] = Math.min(cur, v);
    });
  });
  return out;
}
