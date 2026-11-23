// XEVARION II — お財布（残高と両替）
import { t } from '../core/i18n.js';
import * as wallet from '../core/wallet.js';
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
    return `${balancesHTML()}
      <p class="mn-note">${t('wallet.exchangeLead')}</p>
      <div class="wl-ex">${opt(200, '200 XEVA')}${opt(1000, '1,000 XEVA')}${opt(10000, '10,000 XEVA')}${opt('all', 'ぜんぶ')}</div>`;
  };
  const s = openSheet({ title: t('wallet.title'), body: body() });
  const b = s.el.querySelector('.x-sheet-b');
  s.el.addEventListener('click', (e) => {
    const x = e.target.closest('[data-x]');
    if (!x || x.disabled) return;
    const amt = x.dataset.x === 'all' ? wallet.get().xeva : +x.dataset.x;
    const g = wallet.exchange(amt);
    toast(g ? t('wallet.exDone', { n: fmt(g) }) : t('wallet.exShort'));
  });
  const off = wallet.on(() => { b.innerHTML = body(); });
  s.closed.then(off);
  return s;
}
