// XEVARION II — アプリの一覧（移しかえずみのアプリは #/app/<id> で開く。まだのものは「準備中」）
import { t } from '../core/i18n.js';
import { esc, bindActs } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { APPS, SITES, appById } from './routes.js';
import { onSign, leftStr } from './derby-sign.js';

const row = (a) => `
  <button type="button" class="ap-row" data-act="open" data-id="${a.id}" data-name="${esc(a.name)}">
    <img class="x-appic" src="assets/apps/${a.id}-192.webp" alt="" loading="lazy" decoding="async">
    <div><b>${esc(a.name)}</b><small>${t('app.' + a.id)}</small>${a.id === 'derby' ? '<span class="ds-chips"></span>' : ''}</div>
    ${a.path ? `<span class="x-chip play">${t('apps.play')}</span>` : `<span class="x-chip">${t('apps.soon')}</span>`}
  </button>`;

export async function mount(el, { go }) {
  el.innerHTML = `
    <header class="x-head"><h1>${t('apps.title')}</h1></header>
    <div class="p-body x-scroll"><div class="ap-list">
      <div class="ap-h">${t('apps.games')}</div>${APPS.map(row).join('')}
      <div class="ap-h">${t('apps.sitesTitle')}</div>${SITES.map(row).join('')}
    </div></div>`;

  // MagiDerby の札（portal/derby-sign.js）：発売中・締切間近・結果
  const chips = el.querySelector('.ap-row[data-id="derby"] .ds-chips');
  const ic = el.querySelector('.ap-row[data-id="derby"] .x-appic');
  let sig = '';
  const paintDerby = (s) => {
    if (!chips || s.sig === sig) return;
    sig = s.sig;
    const sale = s.sale;
    ic?.classList.toggle('ds-ring', !!sale && !sale.soon);
    ic?.classList.toggle('ds-ring-soon', !!(sale && sale.soon));
    chips.innerHTML =
      (sale ? `<span class="x-chip ds-c ${sale.soon ? 'soon' : 'sale'}">${esc(sale.soon ? t('derby.rowSoon', { name: sale.short, t: leftStr(sale.left) }) : t('derby.rowSale', { name: sale.short }))}</span>` : '') +
      (s.res ? `<span class="x-chip ds-c res">${esc(t('derby.rowRes', { n: s.res }))}</span>` : '');
  };

  const offs = [
    onSign(paintDerby),
    bindActs(el, {
      open(b) {
        if (appById(b.dataset.id)?.path) go('app/' + b.dataset.id);
        else toast(t('soon', { name: b.dataset.name }));
      },
    }),
  ];
  return () => offs.forEach((f) => f());
}
