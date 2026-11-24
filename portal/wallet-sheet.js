// XEVARION II — お財布（残高と両替・ショップの今日のチケット）
// ★ ショップは両替＋今日のチケット（ガチャチケットを1日1枚まで 800 XEVA・2026-11-24 第5回で決定）。お財布の中に置く
import { t } from '../core/i18n.js';
import * as wallet from '../core/wallet.js';
import * as daily from '../core/daily.js';
import { fmt } from '../ui/dom.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

export function balancesHTML() {
  const w = wallet.get();
  return `<div class="mn-wal">
    <div><span><i class="x-cur xeva"></i>${t('cur.xeva')}</span><b>${fmt(w.xeva)}</b></div>
    <div><span><i class="x-cur gem"></i>${t('cur.gem')}</span><b>${fmt(w.gem)}</b></div>
    <div><span><i class="x-cur ticket"></i>チケット</span><b>${fmt(w.ticket)}</b></div>
  </div>`;
}

export function openWallet() {
  const body = () => {
    const w = wallet.get();
    const opt = (x, label) => `<button type="button" data-x="${x}" ${w.xeva < Math.max(wallet.RATE, x === 'all' ? 0 : x) ? 'disabled' : ''}>${label}<small>→ ${t('cur.gem')} ${fmt(Math.floor((x === 'all' ? w.xeva : x) / wallet.RATE))}</small></button>`;
    const dt = daily.dailyTicket();
    return `${balancesHTML()}
      <div class="wl-dt">
        <img src="assets/ui/ticket-128.webp" alt="">
        <div><b>${t('shop.dt')}</b><small>${t('shop.dtNote')}</small></div>
        <button type="button" class="x-btn ${dt.bought ? 'secondary' : 'primary'} small" data-dt ${dt.bought || w.xeva < dt.price ? 'disabled' : ''}>${dt.bought ? t('shop.dtDone') : t('shop.dtBuy', { n: fmt(dt.price) })}</button>
      </div>
      <p class="mn-note">${t('wallet.exchangeLead')}</p>
      <div class="wl-ex">${opt(200, '200 XEVA')}${opt(1000, '1,000 XEVA')}${opt(10000, '10,000 XEVA')}${opt('all', 'ぜんぶ')}</div>`;
  };
  const s = openSheet({ title: t('wallet.title'), body: body() });
  const b = s.el.querySelector('.x-sheet-b');
  let busy = false;
  s.el.addEventListener('click', async (e) => {
    const dt = e.target.closest('[data-dt]');
    if (dt && !dt.disabled && !busy) {
      busy = true;
      dt.disabled = true;
      try {
        const r = await daily.buyDailyTicket();
        toast(r === 'ok' ? t('shop.dtOk') : r === 'done' ? t('shop.dtDone') : t('wallet.exShort'));
      } finally { busy = false; b.innerHTML = body(); }
      return;
    }
    const x = e.target.closest('[data-x]');
    if (!x || x.disabled) return;
    const amt = x.dataset.x === 'all' ? wallet.get().xeva : +x.dataset.x;
    const g = wallet.exchange(amt);
    toast(g ? t('wallet.exDone', { n: fmt(g) }) : t('wallet.exShort'));
  });
  const offs = [wallet.on(() => { b.innerHTML = body(); }), daily.onChange(() => { b.innerHTML = body(); })];
  s.closed.then(() => offs.forEach((f) => f()));
  return s;
}
