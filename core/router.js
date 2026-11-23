// XEVARION II — 画面の切りかえ（#/home のようなハッシュ）
// 画面は開くときにだけ読み込む（import）。各画面は mount(要素, ctx) を持ち、片づけの関数を返す。
let routes = {};
let guard = null;
let onShow = null;
let loadingFn = null;
let cur = null;
let seq = 0;
let pending = '';

/** タイトルを通る前に開こうとした画面（タップしたあとにそこへ行く） */
export const setPending = (p) => { pending = p; };
export function takePending() {
  const p = pending;
  pending = '';
  return p;
}

export function configure(o) {
  routes = o.routes;
  guard = o.guard || null;
  onShow = o.onShow || null;
  loadingFn = o.loading || null; // 画面の読みこみが長いときのロード画面
}

export function parse() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: p[0] || '', params: p.slice(1) };
}
export const currentName = () => (cur ? cur.name : '');

/** 画面へ行く（'home'・'chara/yuzuha' など） */
export function go(path, { replace = false } = {}) {
  const h = '#/' + String(path).replace(/^#?\/?/, '');
  if (location.hash === h) render();
  else if (replace) { history.replaceState(null, '', h); render(); }
  else location.hash = h;
}

async function render() {
  const my = ++seq;
  let { name, params } = parse();
  if (!routes[name]) name = 'title';
  const redirect = guard ? guard(name, params) : null;
  if (redirect && redirect !== name) {
    history.replaceState(null, '', '#/' + redirect);
    name = redirect;
    params = [];
  }
  const R = routes[name];
  let mod;
  const L = loadingFn ? loadingFn() : null;
  try { mod = await R.load(); } catch (e) { console.error('画面を読めませんでした', name, e); return; } finally { L?.done(); }
  if (my !== seq) return;

  const screen = document.getElementById('screen');
  const el = document.createElement('section');
  el.className = 'x-page';
  el.dataset.screen = name;
  screen.appendChild(el);
  if (onShow) onShow(name, R);

  let cleanup = null;
  try { cleanup = await mod.mount(el, { params, go }); } catch (e) { console.error('画面を開けませんでした', name, e); }
  if (my !== seq) { try { cleanup?.(); } catch {} el.remove(); return; }

  const old = cur;
  cur = { name, el, cleanup };
  if (old) {
    try { old.cleanup?.(); } catch (e) { console.error(e); }
    old.el.remove();
  }
}

export function start() {
  addEventListener('hashchange', render);
  render();
}
