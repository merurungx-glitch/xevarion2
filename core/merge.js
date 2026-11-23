// XEVARION II — 同期のときの「合わせ方」（端末とクラウドで同じ計算を使う）
//
// 1件の記録は { v: 値, t: 書いた時刻(ms) }。合わせ方は3種類：
//   lww     … 新しく書いたほうが勝つ（パートナー・設定など）
//   counter … 端末ごとの「足した合計 p」と「引いた合計 n」を持ち、端末ごとに大きいほうを残す。
//             値は Σ(p − n)。★ 2台で同時に増やしても減らしても、どちらも消えない（XEVA・ジェム・凸など）
//   flags   … 一度 true になったら戻らない印の集まり（最初の10連をひいた・特典を受け取った など）

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

export function mergeRec(kind, a, b) {
  if (!a) return b || null;
  if (!b) return a;
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
