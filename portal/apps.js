// XEVARION II — アプリの一覧（移しかえずみのアプリは #/app/<id> で開く。まだのものは「準備中」）
// 公式サイト（SITES の url）は新しいタブで開く（2026-11-24 ご回答・src/sites/<id>/）
import { t } from '../core/i18n.js';
import { esc, bindActs } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { APPS, SITES, appById, siteById } from './routes.js';
import { onSign, leftStr } from './derby-sign.js';
import { headHTML, decoHTML } from './shell.js';

const chip = (a) => (a.path ? `<span class="x-chip play">${t('apps.play')}</span>`
  : a.url ? `<span class="x-chip site">${t('apps.site')}</span>`
    : `<span class="x-chip">${t('apps.soon')}</span>`);
const row = (a) => `
  <button type="button" class="ap-row" data-act="open" data-id="${a.id}" data-name="${esc(a.name)}">
    <img class="x-appic" src="assets/apps/${a.id}-192.webp" alt="" loading="lazy" decoding="async">
    <div><b>${esc(a.name)}</b><small>${t('app.' + a.id)}</small>${a.id === 'derby' ? '<span class="ds-chips"></span>' : ''}</div>
    ${chip(a)}
  </button>`;

/** 公式サイトを新しいタブで開く（iPhone のホーム画面のアプリからは Safari などで開く） */
export function openSite(id) {
  const s = siteById(id);
  if (!s) return false;
  window.open(s.url, '_blank', 'noopener');
  return true;
}

export async function mount(el, { go }) {
  el.innerHTML = `${decoHTML()}
    ${headHTML('apps')}
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
        else if (!openSite(b.dataset.id)) toast(t('soon', { name: b.dataset.name }));
      },
    }),
  ];
  return () => offs.forEach((f) => f());
}
