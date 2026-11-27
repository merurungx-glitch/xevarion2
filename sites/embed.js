/* XEVARION II — 公式サイト（NGX・ISHIDA Production）を II のアプリの窓（iframe）で開いたときだけ働く
   ★ 2026-11-28 ご指定「NGX と ISHIDA Production のサイトは、ほかのアプリと同じくアプリ内で開くように」
   ・ふつうにブラウザで開いたとき（II の外）は何もしない
   ・html に in-x2 を付ける → 上のバーの左の「もどる」（各サイトの .x2-back）が出る（押すと II にもどる）
   ・II へのリンク（../../index.html・../../index.html#/app/lex など）は、窓の中で II をもう1つ開かず、II の画面の切りかえにする
   ・ほかのサイトへのリンクは新しいタブ
   ・上下の余白：iframe の中では env(safe-area-inset-*) が 0 になるので、II が入れる --x2-st／--x2-sb を各サイトの CSS で使う */
(function () {
  "use strict";
  var X2 = null;
  try { if (window.parent !== window && window.parent.X2 && window.parent.X2.v) X2 = window.parent.X2; } catch (e) { X2 = null; }
  if (!X2) return;
  document.documentElement.classList.add("in-x2");
  try { X2.attach(window); } catch (e) { /* 余白が入らなくても見られる */ }

  var home = new URL("../../", location.href);   // II の index.html のある場所
  function isX2(u) { return u.origin === location.origin && (u.pathname === home.pathname || u.pathname === home.pathname + "index.html"); }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest(".x2-back")) { e.preventDefault(); X2.exit(); return; }
    var a = t.closest("a[href]");
    if (!a) return;
    var u;
    try { u = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
    if (isX2(u)) {
      e.preventDefault();
      var r = (u.hash || "").replace(/^#\/?/, "");
      if (r) X2.go(r); else X2.exit();
    } else if (u.origin !== location.origin) {
      e.preventDefault();
      window.open(u.href, "_blank", "noopener");
    }
  }, true);

  function ready() { try { X2.ready(); } catch (e) {} }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
