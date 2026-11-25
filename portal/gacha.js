// XEVARION II — ガチャの画面（GRAND DEBUT GACHA）
import { t } from '../core/i18n.js';
import * as gacha from '../core/gacha.js';
import * as wallet from '../core/wallet.js';
import * as chara from '../core/chara.js';
import { ico } from '../ui/icons.js';
import { fmt, esc, bindActs } from '../ui/dom.js';
import { openSheet, ask } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { showResult } from './gacha-result.js';
import { headHTML, decoHTML } from './shell.js';

const G = gacha.GRAND_DEBUT;
const pct = (p) => (Math.round(p * 10000) / 100).toFixed(2).replace(/\.?0+$/, '') + '%';
const when = (at) => new Date(at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
/** ★ 2026-11-25 第7回：新しく参戦した子（翠・愛菜）の札。バナーの絵は3人のままなので、顔と名前を重ねる */
function newHTML() {
  const cs = gacha.newChars().map(chara.byId).filter(Boolean);
  if (!cs.length) return '';
  return `<div class="gc-new"><b>NEW</b>${cs.map((c) => `<img src="${chara.art(c.id, 'face-96')}" alt="">`).join('')}<span>${esc(t('gacha.newJoin', { names: cs.map((c) => c.name).join('・') }))}</span></div>`;
}

export async function mount(el) {
  el.classList.add('gc');
  el.innerHTML = `${decoHTML()}
    ${headHTML('gacha', `
      <button type="button" class="x-pill" data-act="wallet" data-earn="gem" aria-label="${t('cur.gem')}"><i class="x-cur gem"></i><span data-v="gem" data-num></span></button>
      <button type="button" class="x-pill" data-act="wallet" data-earn="ticket" aria-label="${t('cur.ticket')}"><i class="x-cur ticket"></i><span data-v="ticket" data-num></span></button>`)}
    <div class="p-body x-scroll"><div class="gc-body">
      <div class="gc-ban"><img src="${G.banner}" alt="${G.name}">${newHTML()}</div>
      <div class="gc-name"><b>${G.name}</b><small>${t('gacha.always')}</small></div>
      <div class="gc-chips"><span>${t('gacha.chipChar', { p: Math.round(G.charRate * 100) })}</span><span>${t('gacha.chipTenth', { p: Math.round(G.tenthRate * 100) })}</span><span>${t('gacha.chipPity', { n: G.pity })}</span></div>
      <div class="gc-pity"><div class="gc-bar"><i></i></div><small><span data-v="orbit"></span><span data-v="toPity"></span></small><div data-v="pityBtn"></div></div>
      <div class="gc-btns">
        <button type="button" class="x-btn white" data-act="pull" data-n="1">${t('gacha.one')}<small data-v="c1"></small></button>
        <button type="button" class="x-btn primary" data-act="pull" data-n="10">${t('gacha.ten')}<small data-v="c10"></small></button>
      </div>
      <div class="gc-links">
        <button type="button" data-act="rates">${t('gacha.rates')}</button>
        <button type="button" data-act="pity">${t('gacha.pity')}</button>
        <button type="button" data-act="log">${t('gacha.log')}</button>
      </div>
    </div></div>`;

  const v = (k) => el.querySelector(`[data-v="${k}"]`);
  const costHTML = (n) => {
    const c = gacha.cost(n);
    const parts = [];
    if (c.tickets) parts.push(`<i class="x-cur ticket"></i>${c.tickets}`);
    if (c.gems) parts.push(`<i class="x-cur gem"></i>${c.gems}`);
    return parts.join(' ＋ ');
  };
  function paint() {
    const w = wallet.get();
    for (const k of ['gem', 'ticket']) if (!v(k).dataset.hold) v(k).textContent = fmt(w[k]); // 入手の演出中は描きなおさない
    const o = gacha.orbit();
    el.querySelector('.gc-bar i').style.width = Math.min(100, (o / G.pity) * 100) + '%';
    v('orbit').textContent = t('gacha.orbit', { n: o, max: G.pity });
    v('toPity').textContent = o >= G.pity ? t('gacha.pityReady') : t('gacha.toPity', { n: G.pity - o });
    v('pityBtn').innerHTML = o >= G.pity ? `<button type="button" class="x-btn primary small block" data-act="pity">${t('gacha.pity')}</button>` : '';
    v('c1').innerHTML = costHTML(1);
    v('c10').innerHTML = costHTML(10);
  }
  paint();

  let busy = false;
  const acts = {
    wallet() { import('./wallet-sheet.js').then((m) => m.openWallet()); },
    async pull(b) {
      if (busy) return;
      const n = +b.dataset.n;
      const short = gacha.shortBy(n);
      if (short > 0) {
        if (await ask({ title: t('gacha.short', { n: short }), text: t('wallet.exchangeLead'), ok: t('gacha.toExchange') })) acts.wallet();
        return;
      }
      const c = gacha.cost(n);
      const pay = [c.tickets ? t('gacha.payTicket', { n: c.tickets }) : '', c.gems ? t('gacha.payGem', { n: c.gems }) : ''].filter(Boolean).join(' ＋ ');
      if (!(await ask({ title: t('gacha.confirmT', { n }), text: esc(pay), ok: n === 1 ? t('gacha.one') : t('gacha.ten') }))) return;
      busy = true;
      try {
        const res = gacha.pull(n);
        if (!res) { toast(t('gacha.short', { n: gacha.shortBy(n) })); return; }
        await showResult(res);
      } finally { busy = false; }
    },
    rates() {
      const R = gacha.rates();
      const rows = chara.CHARS.map((c) => `<tr><td><span class="who"><img src="${chara.art(c.id, 'face-96')}" alt="">${esc(c.name)}</span></td><td class="r">${pct(R.each)}</td><td class="r">${pct(R.eachTenth)}</td></tr>`).join('')
        + `<tr><td>${t('gacha.missRow')}</td><td class="r">${pct(R.miss)}</td><td class="r">${pct(R.missTenth)}</td></tr>`;
      openSheet({
        title: t('gacha.rates'),
        body: `<p style="margin:0 0 8px;font-size:13px;color:var(--text-2)">${t('gacha.ratesLead')}</p>
          <table class="gc-tbl"><tr><th></th><th class="r">ふつう</th><th class="r">10連の10回目</th></tr>${rows}</table>
          <p style="margin:12px 0 4px;font-size:12.5px;color:var(--text-3);line-height:1.7">・1回ひくごとにオービットが1つたまり、${G.pity} で好きなキャラ1人と交換できます（なくなりません）。<br>・最初の10連は、キャラが1人かならず出ます。<br>・完凸（${chara.MAX_COPIES}人目）のあとに出たキャラは、ジェム ${G.overGem} に変わります。</p>`,
      });
    },
    pity() {
      const o = gacha.orbit();
      if (o < G.pity) { toast(t('gacha.toPity', { n: G.pity - o })); return; }
      const s = openSheet({
        title: t('gacha.pickT'),
        body: `<p style="margin:0 0 12px;font-size:13.5px">${t('gacha.pickLead', { n: G.pity })}</p>
          <div class="gc-pick">${chara.CHARS.map((c) => `<button type="button" data-id="${c.id}" ${chara.isMax(c.id) ? 'disabled' : ''}><img src="${chara.art(c.id, 'face-256')}" alt=""${chara.isMax(c.id) ? ' class="p-mx x-fx"' : ''}>${esc(c.name)}<small>${chara.isMax(c.id) ? t('gacha.maxed') : chara.owned(c.id) ? t('chara.awk', { n: chara.awk(c.id) }) : t('chara.notOwned')}</small></button>`).join('')}</div>`,
      });
      s.el.addEventListener('click', async (e) => {
        const b = e.target.closest('.gc-pick button');
        if (!b || b.disabled) return;
        s.close();
        const r = gacha.exchangePity(b.dataset.id);
        if (r) await showResult([r]);
      });
    },
    log() {
      const L = gacha.log();
      const li = (r) => (r.type === 'char'
        ? `<li><img src="${chara.art(r.id, 'face-96')}" alt=""><span>${esc(chara.byId(r.id)?.name || r.id)}${r.pity ? '（天井）' : ''}　${r.over ? t('gacha.over', { n: r.over }) : r.max ? t('gacha.max') : r.isNew ? t('gacha.new') : t('gacha.awk', { n: r.awk })}</span><time>${when(r.at)}</time></li>`
        : `<li><i class="x-cur xeva"></i><span>${t('gacha.itemXeva', { n: fmt(r.n) })}</span><time>${when(r.at)}</time></li>`);
      openSheet({ title: t('gacha.log'), body: L.length ? `<ul class="gc-log">${L.map(li).join('')}</ul>` : `<p>${t('gacha.logEmpty')}</p>` });
    },
  };

  const offs = [wallet.on(paint), chara.onChange(paint), bindActs(el, acts)];
  return () => offs.forEach((f) => f());
}
