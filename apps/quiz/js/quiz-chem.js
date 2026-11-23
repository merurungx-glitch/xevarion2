/* ============================================================
   MagiQuiz — quiz-chem.js（化学の書式・答えの判定）
   ★ XEVARION II へ移しかえ（2026-11-23）：初代は MagiChemLex の mcl-core.js（window.MCL）をそのまま読んでいた。
     II では MagiQuiz が使う部分だけをここに写した（中身は同じ）。進みぐあい・ごほうびなど ChemLex の仕組みは持ってこない。
   ・書式：{CH4} … 化学式／^{x} … 上つき／_{x} … 下つき
   ・判定：c＝選んだ番号／m＝番号の配列／n＝入力した数（全角・×10^n も読む）
   ============================================================ */
(function () {
  "use strict";

  /* ── 書式：{CH4} … 化学式／^{x} … 上つき／_{x} … 下つき ── */
  function chem(str) {
    const s = String(str);
    let out = "", i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === "^") {
        const m = /^\^(\{[^}]*\}|\d*[+\-−])/.exec(s.slice(i));
        if (m) { let v = m[1]; if (v[0] === "{") v = v.slice(1, -1); out += "<sup>" + v.replace(/-/g, "−") + "</sup>"; i += m[0].length; continue; }
      }
      if (/[0-9]/.test(ch) && i > 0 && /[A-Za-z)\]]/.test(s[i - 1])) {
        let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++;
        out += "<sub>" + s.slice(i, j) + "</sub>"; i = j; continue;
      }
      if ((ch === "+" || ch === "-") && i > 0 && /[A-Za-z0-9)]/.test(s[i - 1]) && (i + 1 >= s.length || /[\s,、と）)]/.test(s[i + 1]))) {
        out += "<sup>" + (ch === "-" ? "−" : "+") + "</sup>"; i++; continue;
      }
      out += ch; i++;
    }
    return out;
  }
  function fmt(s) {
    return String(s == null ? "" : s)
      .replace(/\^\{([^}]*)\}/g, (m, x) => "<sup>" + x.replace(/-/g, "−") + "</sup>")
      .replace(/_\{([^}]*)\}/g, "<sub>$1</sub>")
      .replace(/\{([^{}]+)\}/g, (m, x) => chem(x));
  }
  function fmtOpt(q, s) { return q.chem ? chem(String(s)) : fmt(s); }
  /* 一覧などの短い文：下つき・上つきの数字は Unicode の小さい数字にして残す（CO₂・10⁻⁴） */
  const SUBD = "₀₁₂₃₄₅₆₇₈₉", SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  function plain(s) {
    const h = fmt(s)
      .replace(/<sub>([0-9]+)<\/sub>/g, (m, x) => x.replace(/\d/g, (c) => SUBD[c]))
      .replace(/<sup>([0-9+\-−]+)<\/sup>/g, (m, x) => x.replace(/\d/g, (c) => SUPD[c]).replace(/\+/g, "⁺").replace(/[-−]/g, "⁻"));
    const d = document.createElement("div"); d.innerHTML = h;
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  /* ── 数値の答え ── */
  function parseNum(str) {
    let s = String(str == null ? "" : str).trim();
    s = s.replace(/[０-９．－＋]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[−–—ー]/g, "-").replace(/,/g, "").replace(/\s/g, "");
    s = s.replace(/[×xX*]10\^?\(?([+\-]?\d+)\)?/, "e$1");
    if (/^[+\-]?(\d+\.?\d*|\.\d+)(e[+\-]?\d+)?$/i.test(s)) return Number(s);
    return NaN;
  }
  function judgeNum(q, v) {
    if (!isFinite(v)) return false;
    if (q.abs != null) return Math.abs(v - q.a) <= q.abs + 1e-9;
    const tol = q.tol != null ? q.tol : 0.01;
    return Math.abs(v - q.a) <= Math.abs(q.a) * tol + 1e-12;
  }
  /* ans … c：選んだ番号／m：番号の配列／n：入力した文字 */
  function judge(q, ans) {
    if (ans == null) return false;
    if (q.type === "c") return ans === q.a;
    if (q.type === "m") { const a = (ans || []).slice().sort((x, y) => x - y), b = q.a.slice().sort((x, y) => x - y); return a.length === b.length && a.every((v, i) => v === b[i]); }
    if (q.type === "n") return judgeNum(q, parseNum(ans));
    return false;
  }
  function answerText(q) {
    if (q.type === "c") return fmtOpt(q, q.o[q.a]);
    if (q.type === "m") return q.a.map((i) => fmtOpt(q, q.o[i])).join("<span class=\"sep\">・</span>");
    return fmt(q.as || String(q.a)) + (q.u ? " " + fmt(q.u) : "");
  }

  /* ── 計算問題か（問題に calc:1/0 を書けば上書き）──
     ・数値を入れて答える問題（type n）
     ・選択肢がすべて数で、小数・×10ⁿ・20以上の数をふくむもの（「2〜6個」のような数え上げや酸化数は入れない） */
  function isCalc(q) {
    if (!q) return false;
    if (q.calc != null) return !!q.calc;
    if (q.type === "n") return true;
    if (q.type !== "c" || !Array.isArray(q.o) || q.o.length < 2) return false;
    const t = q.o.map((x) => String(x).replace(/<[^>]+>/g, "").replace(/\s/g, ""));
    const num = /^[−\-+]?\d+(\.\d+)?(×10\^\{?[−\-]?\d+\}?)?[A-Za-z%℃/()·⁻⁰¹²³⁴⁵⁶⁷⁸⁹]*$/;
    if (!t.every((x) => num.test(x))) return false;
    return t.some((x) => /\.|×10/.test(x) || Math.abs(parseFloat(x.replace("−", "-"))) >= 20);
  }

  window.MCL = { chem, fmt, fmtOpt, plain, esc, parseNum, judge, answerText, isCalc };
})();
