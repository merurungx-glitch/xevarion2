// XEVARION II — メニュー（アカウント・お財布・設定・この端末の状態）
import { t } from '../core/i18n.js';
import { VERSION, BUILD, IS_DEV } from '../core/config.js';
import * as store from '../core/store.js';
import * as power from '../core/power.js';
import * as account from '../core/account.js';
import * as sync from '../core/sync.js';
import * as wallet from '../core/wallet.js';
import { ico } from '../ui/icons.js';
import { esc, fmt, bindActs } from '../ui/dom.js';
import { openSheet, ask } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { balancesHTML, openWallet } from './wallet-sheet.js';

const kb = (n) => (n >= 1024 * 1024 ? (n / 1048576).toFixed(1) + 'MB' : Math.round(n / 1024) + 'KB');

/** 起動の読み込み量（タイトルが「TAP TO START」になるまでに読んだもの）→ { code: プログラム, all: 絵もふくむ全部 } */
function startupBytes() {
  const until = window.__x2ready || performance.now();
  const size = (e) => e.encodedBodySize || e.transferSize || 0;
  const isCode = (u) => /\.(js|css|html|webmanifest)(\?|#|$)/.test(u) || /\/(\?|#|$)/.test(u);
  let all = 0;
  let code = 0;
  for (const e of performance.getEntriesByType('navigation')) { all += size(e); code += size(e); }
  for (const e of performance.getEntriesByType('resource')) {
    if (e.startTime > until) continue;
    all += size(e);
    if (isCode(e.name)) code += size(e);
  }
  return { all, code };
}

const seg = (key, cur, opts) => `<div class="x-seg" data-seg="${key}">${opts.map(([v, label, sub]) => `<button type="button" data-v="${v}" class="${v === cur ? 'on' : ''}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`;

export async function mount(el, { go }) {
  el.innerHTML = `<header class="x-head"><h1>${t('menu.title')}</h1></header><div class="p-body x-scroll"><div class="mn-body"></div></div>`;
  const body = el.querySelector('.mn-body');
  let fpsText = '—';

  function paint() {
    const u = account.current();
    const modeNames = { high: t('menu.power.high'), balanced: t('menu.power.balanced'), saver: t('menu.power.saver') };
    const syncText = account.backendName() === 'local' ? t('menu.sync.local') : t('menu.sync.' + sync.getStatus());
    body.innerHTML = `
      <div class="mn-h">${t('menu.account')}</div>
      <div class="x-card">
        <div class="x-row">${ico('user')}<div><b>${esc(account.profile().name)}</b><small>ID ${esc(u ? u.id : '')}</small></div><button type="button" class="x-btn secondary small" data-act="rename">変える</button></div>
        <div class="x-row">${ico('out')}<div><b>${t('menu.signout')}</b></div><button type="button" class="x-btn secondary small" data-act="signout">${t('menu.signout')}</button></div>
      </div>

      <div class="mn-h">${t('menu.wallet')}</div>
      <div class="x-card">${balancesHTML()}<button type="button" class="x-btn secondary block small" data-act="exchange">${ico('swap')}${t('menu.exchange')}</button></div>

      <div class="mn-h">${t('menu.daily')}</div>
      <div class="x-card">
        <div class="x-row">${ico('mission')}<div><b>${t('ms.title')}</b><small>${t('menu.msNote')}</small></div><button type="button" class="x-btn secondary small" data-act="missions">${t('menu.open')}</button></div>
        <div class="x-row">${ico('star')}<div><b>${t('logbo.title')}</b><small>${t('menu.lbNote')}</small></div><button type="button" class="x-btn secondary small" data-act="logbo">${t('menu.open')}</button></div>
      </div>

      <div class="mn-h">${t('menu.settings')}</div>
      <div class="x-card">
        <span class="mn-seg-l">${t('menu.power')}</span>
        ${seg('power', power.setting(), [['auto', t('menu.power.auto'), 'おすすめ'], ['high', t('menu.power.high'), '60fps'], ['balanced', t('menu.power.balanced'), '60fps'], ['saver', t('menu.power.saver'), '30fps']])}
        <p class="mn-note">${power.setting() === 'auto' ? t('menu.power.autoNote', { mode: modeNames[power.currentMode()], why: power.reason() }) + '<br>' : ''}${t('menu.power.note')}</p>
        <span class="mn-seg-l">${t('menu.theme')}</span>
        ${seg('theme', power.theme(), [['auto', t('menu.theme.auto')], ['light', t('menu.theme.light')], ['dark', t('menu.theme.dark')]])}
        <div class="x-row" style="margin-top:8px"><div><b>${t('menu.shortFx')}</b><small>${t('menu.shortFxNote')}</small></div><button type="button" class="x-switch ${store.get('shortFx') ? 'on' : ''}" data-act="shortFx" aria-label="${t('menu.shortFx')}"></button></div>
        ${IS_DEV ? '' : `<div class="x-row"><div><b>${t('menu.analytics')}</b></div><button type="button" class="x-switch ${store.get('analytics') ? 'on' : ''}" data-act="analytics" aria-label="${t('menu.analytics')}"></button></div>`}
      </div>

      <div class="mn-h">${t('menu.device')}</div>
      <div class="x-card">
        <div class="mn-meter">
          <div><b data-m="fps">${fpsText}</b><small>${t('menu.fps')}</small></div>
          <div><b>${kb(startupBytes().code)}</b><small>${t('menu.load')}（絵をふくむと ${kb(startupBytes().all)}）</small></div>
          <div><b>${kb(store.usedBytes())}</b><small>${t('menu.saved')}</small></div>
          <div><b style="font-size:13px">${esc(syncText)}</b><small>${t('menu.sync')}</small></div>
        </div>
        <button type="button" class="x-btn secondary block small" style="margin-top:10px" data-act="fps">${ico('bolt')}コマ数をはかる（5秒）</button>
        <p class="mn-note">${t('menu.version')} ${VERSION}${BUILD === 'dev' ? '（手元）' : '・' + BUILD}</p>
      </div>

      ${IS_DEV ? `
      <div class="mn-h">${t('menu.dev')}</div>
      <div class="x-card mn-dev">
        <button type="button" class="x-btn secondary block small" data-act="devGive">${t('menu.devGive')}</button>
        <button type="button" class="x-btn secondary block small" style="margin-top:8px" data-act="devReset">${t('menu.devReset')}</button>
      </div>` : ''}`;
  }
  paint();

  let stopFps = null;
  const acts = {
    rename() {
      const s = openSheet({
        title: t('auth.name'),
        body: `<label class="x-field"><span>${t('auth.name')}</span><input maxlength="24" value="${esc(account.profile().name)}"><small>${t('auth.nameHint')}</small></label>`,
        actions: [{ label: t('btn.cancel'), value: false }, { label: t('btn.ok'), kind: 'primary', value: true }],
        onAction: async (a, api) => {
          if (!a.value) { api.close(); return; }
          try { await account.rename(api.el.querySelector('input').value); api.close(); paint(); } catch (e) { toast(e.message); }
        },
      });
      setTimeout(() => s.el.querySelector('input')?.focus(), 300);
    },
    async signout() {
      if (await ask({ title: t('menu.signout'), text: t('menu.signoutAsk'), ok: t('menu.signout') })) await account.signOut();
    },
    exchange() { openWallet(); },
    missions() { import('./missions.js').then((m) => m.openMissions()); },
    logbo() { import('./logbo.js').then((m) => m.openLogbo()); },
    shortFx() { power.setShortFx(!store.get('shortFx')); paint(); },
    analytics() {
      const on = !store.get('analytics');
      store.set('analytics', on);
      if (on) account.analytics(true);
      toast(on ? '利用状況の送信をオンにしました' : '次の起動から送らなくなります');
      paint();
    },
    fps() {
      if (stopFps) return;
      toast('5秒はかります');
      stopFps = power.loop(() => {});
      setTimeout(() => {
        fpsText = power.fps + ' fps';
        stopFps?.();
        stopFps = null;
        paint();
      }, 5000);
    },
    devGive() {
      wallet.add('xeva', 10000);
      wallet.add('gem', 100);
      import('../ui/earn.js').then((m) => m.earnCard({ xeva: 10000, gem: 100 }, { sub: t('earn.dev') }));
    },
    async devReset() {
      if (await ask({ title: t('menu.devReset'), text: t('menu.devResetAsk'), ok: '消す' })) {
        await account.devDelete();
        go('title');
      }
    },
  };

  const onSeg = (e) => {
    const b = e.target.closest('[data-seg] button');
    if (!b) return;
    const k = b.closest('[data-seg]').dataset.seg;
    if (k === 'power') power.setSetting(b.dataset.v);
    if (k === 'theme') power.setTheme(b.dataset.v);
    paint();
  };
  el.addEventListener('click', onSeg);
  const offs = [bindActs(el, acts), wallet.on(paint), power.onChange(paint), sync.onStatus(paint), store.on('profile', paint)];
  return () => { stopFps?.(); offs.forEach((f) => f()); el.removeEventListener('click', onSeg); };
}
