// XEVARION II — 更新とダウンロード（メニューの「この端末の状態」から）
// ★ 2026-11-28 ご指定「自分の端末の更新状況やダウンロード状況を見られるようにしてください」
// ・版：この端末の版（VER と日付の版）・いちばん新しい版（サーバーの version.json）・状態（最新／受け取り中／準備できた→「更新する」）・「新しい版を確かめる」
// ・アプリとして：ホーム画面から開いているか（入れ方の板へ）
// ・この端末に入っているもの：本体・アプリ7本・大きな絵などが、オフラインで使えるだけ入っているか（Service Worker の保存）。
//   アプリごとに「ダウンロード」・「すべてダウンロード」（sw.js の message 'status'／'get'・core/swc.js の ask）
// ・手元の試験（8800・BUILD 'dev'）では SW を使わないので、版と「手元の試験モード」だけを出す
import { t } from '../core/i18n.js';
import { VERSION, BUILD } from '../core/config.js';
import * as swc from '../core/swc.js';
import * as install from '../core/install.js';
import { APPS } from './routes.js';
import { ico } from '../ui/icons.js';
import { esc } from '../ui/dom.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const size = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB');
const hhmm = (ms) => new Date(ms).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
/** 日付の版（2026-11-28-2）を比べられる数の並びに */
const bkey = (b) => String(b || '').split('-').map((x) => Number(x) || 0);
const newer = (a, b) => { const x = bkey(a), y = bkey(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };

/** 表に出す組（本体 → アプリ7本 → 大きな絵など）。SW の一覧にある組だけ */
function rowsOf(groups) {
  const rows = [{ g: 'shell', name: t('dv.g.shell'), icon: 'home' }];
  for (const a of APPS) {
    if (!a.path) continue;
    rows.push({ g: 'app:' + a.path.split('/')[1], name: a.name, img: `assets/apps/${a.id}-96.webp` });
  }
  rows.push({ g: 'lazy', name: t('dv.g.lazy'), icon: 'chara' });
  return rows.filter((r) => groups[r.g]);
}

let open = null;
export function openDevice() {
  if (open) return open;
  let latest = null;        // サーバーの version.json
  let latestTried = false;
  let st = null;            // SW の答え（入っているもの）
  let noCtl = false;
  const busy = {};          // ダウンロード中の組 → 0〜1
  let est = null;           // 保存の使用量

  function verPart() {
    const I = swc.info();
    let cls = 'ok';
    let msg = t('dv.st.latest');
    if (I.dev) { cls = 'dev'; msg = t('dv.st.dev'); }
    else if (!I.enabled) { cls = 'dev'; msg = t('dv.st.none'); }
    else if (I.waiting) { cls = 'new'; msg = t('dv.st.waiting'); }
    else if (I.installing) { cls = 'busy'; msg = t('dv.st.installing'); }
    else if (I.checking) { cls = 'busy'; msg = t('dv.checking'); }
    else if (latest && newer(latest.build, BUILD)) { cls = 'busy'; msg = t('dv.st.behind', { b: latest.build }); }
    else if (I.failed || (latestTried && !latest && navigator.onLine === false)) { cls = 'off'; msg = t('dv.st.offline'); }
    const icon = { ok: 'check', new: 'star', busy: 'sync', off: 'info', dev: 'info' }[cls];
    return `<div class="dv-sec">
      <div class="dv-ver">
        <div><small>${t('dv.here')}</small><b>VER ${esc(VERSION)}</b><span>${BUILD === 'dev' ? '（手元）' : esc(BUILD)}</span></div>
        <div><small>${t('dv.latest')}</small><b>${I.dev ? '—' : latest ? esc(latest.build) : latestTried ? '—' : '…'}</b><span>${latest && latest.at ? esc(String(latest.at).slice(0, 16).replace('T', ' ')) : ''}</span></div>
      </div>
      <p class="dv-st ${cls}">${ico(icon)}<span>${msg}</span></p>
      ${I.waiting ? `<button type="button" class="x-btn primary block" data-dv="apply">${ico('sync')}${t('dv.go')}</button>` : ''}
      ${I.enabled && !I.dev ? `<button type="button" class="x-btn secondary block small" data-dv="check" ${I.checking ? 'disabled' : ''}>${I.checking ? t('dv.checking') : t('dv.check')}</button>
        ${I.lastOk ? `<p class="mn-note">${t('dv.checked', { t: hhmm(I.lastOk) })}</p>` : ''}` : ''}
    </div>`;
  }

  function appPart() {
    const on = install.standalone();
    return `<div class="dv-sec"><div class="x-row">${ico(on ? 'check' : 'phone')}<div><b>${t('dv.app')}</b><small>${on ? t('dv.appOn') : t('dv.appOff')}</small></div>
      ${on ? '' : `<button type="button" class="x-btn primary small" data-dv="install">${t('menu.instGo')}</button>`}</div></div>`;
  }

  function dlPart() {
    const I = swc.info();
    const head = `<div class="dv-h"><b>${t('dv.dl')}</b></div><p class="mn-note dv-lead">${t('dv.dlNote')}</p>`;
    if (I.dev || !I.enabled) return `<div class="dv-sec">${head}<p class="dv-st dev">${ico('info')}<span>${t('dv.devNote')}</span></p></div>`;
    if (!st) return `<div class="dv-sec">${head}${noCtl ? `<p class="dv-st off">${ico('info')}<span>${t('dv.noCtl')}</span></p>` : '<div class="dv-wait"><div class="x-spin"></div></div>'}</div>`;
    const G = st.groups || {};
    let restB = 0;
    const list = rowsOf(G).map((r) => {
      const s = G[r.g];
      const full = s.have >= s.n;
      const pct = s.n ? Math.round((100 * s.have) / s.n) : 100;
      if (!full) restB += Math.max(0, s.bytes - s.haveBytes);
      const b = busy[r.g];
      const right = b !== undefined ? `<span class="dv-pct">${Math.round(b * 100)}%</span>`
        : full ? `<span class="dv-in">${ico('check')}${t('dv.in')}</span>`
          : `<button type="button" class="x-btn secondary small" data-dv="get" data-g="${esc(r.g)}">${ico('install')}${t('dv.get')}</button>`;
      const state = b !== undefined ? t('dv.getting', { p: Math.round(b * 100) }) : full ? t('dv.in') : s.have ? t('dv.part', { n: pct }) : t('dv.notyet');
      const bar = b !== undefined ? b * 100 : pct;
      return `<div class="dv-r${full ? ' full' : ''}">
        ${r.img ? `<img src="${r.img}" alt="" loading="lazy">` : `<span class="dv-ic">${ico(r.icon)}</span>`}
        <div class="dv-t"><b>${esc(r.name)}</b><small>${size(s.bytes)}・${state}</small><i class="dv-bar"><i style="width:${bar}%"></i></i></div>
        ${right}
      </div>`;
    }).join('');
    const anyBusy = Object.keys(busy).length > 0;
    const all = restB > 0
      ? `<button type="button" class="x-btn primary block" data-dv="all" ${anyBusy ? 'disabled' : ''}>${ico('install')}${t('dv.all', { mb: size(restB) })}</button>`
      : `<p class="dv-st ok">${ico('check')}<span>${t('dv.allDone')}</span></p>`;
    const use = est && est.quota ? `<p class="mn-note">${t('dv.use', { u: size(est.usage || 0), q: size(est.quota) })}</p>` : '';
    return `<div class="dv-sec">${head}${list}${all}${use}</div>`;
  }

  const body = () => `<div class="dv">${verPart()}${appPart()}${dlPart()}</div>`;
  open = openSheet({ title: t('dv.title'), body: body() });
  const b = open.el.querySelector('.x-sheet-b');
  let alive = true;
  const paint = () => { if (alive) b.innerHTML = body(); };

  async function loadStatus() {
    if (!swc.info().enabled) return;
    const r = await swc.ask({ t: 'status' });
    if (!alive) return;
    if (r && r.groups) { st = r; noCtl = false; } else if (!r) noCtl = true;
    try { est = await navigator.storage?.estimate?.(); } catch { est = null; }
    paint();
  }
  async function loadLatest() {
    if (swc.info().dev) return;
    latest = await swc.latest();
    latestTried = true;
    paint();
  }
  async function get(groups) {
    for (const g of groups) busy[g] = 0;
    paint();
    const r = await swc.ask({ t: 'get', groups }, (p) => {
      const v = p.total ? p.done / p.total : 1;
      for (const g of groups) busy[g] = v;
      paint();
    });
    for (const g of groups) delete busy[g];
    if (r && r.groups) st = r;
    if (!r || r.t === 'error' || r.bad) toast(t('dv.fail'), 3200);
    try { est = await navigator.storage?.estimate?.(); } catch {}
    paint();
  }

  open.el.addEventListener('click', async (e) => {
    const x = e.target.closest('[data-dv]');
    if (!x) return;
    const k = x.dataset.dv;
    if (k === 'apply') swc.applyUpdate();
    if (k === 'check') { await swc.checkNow(); await loadLatest(); }
    if (k === 'install') import('./install.js').then((m) => m.openInstall());
    if (k === 'get' && busy[x.dataset.g] === undefined) get([x.dataset.g]);
    if (k === 'all' && st) get(Object.entries(st.groups).filter(([, s]) => s.have < s.n).map(([g]) => g));
  });
  const offs = [swc.onState(paint), install.onChange(paint)];
  open.closed.then(() => { alive = false; offs.forEach((f) => f()); open = null; });
  loadStatus();
  loadLatest();
  return open;
}
