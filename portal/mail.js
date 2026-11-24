// XEVARION II — メールの板（受け取り期限つき）とコード入力の板（段階2・2026-11-24）
// ・中身・受け取り方は core/mail.js。受け取ると GET! のカード（メールやコードは大きいもの）
// ・メールはホームの「メール」の行とメニューから・コード入力はメニューから
import { t } from '../core/i18n.js';
import * as mail from '../core/mail.js';
import { serverNow } from '../core/clock.js';
import { openSheet } from '../ui/sheet.js';
import { earnCard } from '../ui/earn.js';
import { toast } from '../ui/toast.js';
import { ico } from '../ui/icons.js';
import { esc, fmt } from '../ui/dom.js';

const ICON = { xeva: 'assets/ui/xeva-64.webp', gem: 'assets/ui/gem-64.webp', ticket: 'assets/ui/ticket-128.webp' };
const reward = (items) => Object.entries(items).map(([k, n]) => `<span class="ml-rw"><img class="${k}" src="${ICON[k]}" alt="">${k === 'xeva' ? fmt(n) : '×' + fmt(n)}</span>`).join('');
const dateOf = (at) => {
  const d = new Date(at + 9 * 3600000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
};
function leftText(until) {
  if (!until) return t('ml.noLimit');
  const ms = until - serverNow();
  return ms < 86400000 ? t('ml.leftH', { n: Math.max(1, Math.ceil(ms / 3600000)) }) : t('ml.left', { n: Math.ceil(ms / 86400000) });
}

function card(m) {
  const soon = m.until && m.until - serverNow() < 3 * 86400000;
  return `<article class="ml-i${m.claimed ? ' got' : ''}">
      <div class="ml-h"><span class="ml-ic">${ico('gift')}</span><div><b>${esc(m.title)}</b><small>${dateOf(m.at)}${m.to ? `・<em class="ml-you">${t('ml.toYou')}</em>` : ''}・<span class="${soon && !m.claimed ? 'ml-soon' : ''}">${leftText(m.until)}</span></small></div></div>
      ${m.body ? `<p>${esc(m.body).replace(/\n/g, '<br>')}</p>` : ''}
      <div class="ml-f"><div class="ml-rws">${reward(m.items)}</div>${m.claimed ? `<span class="ml-st">${t('ml.got')}</span>` : `<button type="button" class="x-btn primary small" data-ml="${esc(m.key)}">${t('ml.recv')}</button>`}</div>
    </article>`;
}

let open = null;
/** メールの板を開く */
export function openMail() {
  if (open) return open;
  const html = () => {
    const l = mail.list();
    const n = mail.ready(l);
    return `<div class="ml">
        ${n >= 2 ? `<button type="button" class="x-btn primary block ml-all" data-ml-all>${t('ml.recvAll', { n })}</button>` : ''}
        ${l.length ? l.map(card).join('') : `<p class="ml-empty">${t('ml.empty')}</p>`}
        <p class="ml-note">${t('ml.note')}</p>
      </div>`;
  };
  open = openSheet({ title: t('ml.title'), body: html() });
  const sheet = open;
  const b = sheet.el.querySelector('.x-sheet-b');
  const paint = () => { b.innerHTML = html(); };
  let busy = false;
  sheet.el.addEventListener('click', async (e) => {
    const one = e.target.closest('[data-ml]');
    const all = e.target.closest('[data-ml-all]');
    if ((!one && !all) || busy) return;
    busy = true;
    (one || all).disabled = true;
    try {
      const m = one ? mail.list().find((x) => x.key === one.dataset.ml) : null;
      const got = one ? await mail.claim(one.dataset.ml) : await mail.claimAll();
      paint();
      if (got && Object.keys(got).length) await earnCard(got, { sub: esc(m ? m.title : t('ml.title')) });
      else toast(t('ml.gone'));
    } finally { busy = false; }
  });
  const off = mail.onChange(paint);
  mail.refresh({ force: true }); // 開いたときは今すぐ読む（ホームの行は5分に1回まで）
  sheet.closed.then(() => { off(); open = null; });
  return sheet;
}

const CODE_ERR = { format: 'code.errFormat', done: 'code.done', notfound: 'code.notfound', expired: 'code.expired', network: 'err.network' };
let openC = null;
/** コード入力の板を開く */
export function openCode() {
  if (openC) return openC;
  let busy = false;
  openC = openSheet({
    title: t('code.title'),
    body: `<div class="cd">
        <p class="cd-lead">${t('code.lead')}</p>
        <label class="x-field"><span>${t('code.label')}</span><input data-cd maxlength="24" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="done"></label>
        <p class="cd-err" aria-live="polite"></p>
      </div>`,
    actions: [{ label: t('btn.cancel'), value: false }, { label: t('code.go'), kind: 'primary', value: 'go' }],
    onAction: async (a, api) => {
      if (a.value !== 'go') { api.close(null); return; }
      if (busy) return;
      const input = api.el.querySelector('[data-cd]');
      const err = api.el.querySelector('.cd-err');
      const btns = [...api.el.querySelectorAll('.x-sheet-f button')];
      const go = btns[btns.length - 1];
      busy = true;
      btns.forEach((x) => { x.disabled = true; });
      go.textContent = t('code.busy');
      err.textContent = '';
      let r;
      try { r = await mail.redeem(input.value); } catch (e) { r = { ok: false, code: e?.code || 'unknown' }; }
      busy = false;
      if (r.ok) {
        api.close('ok');
        await earnCard(r.items, { sub: esc(r.title || t('code.title')) });
        return;
      }
      btns.forEach((x) => { x.disabled = false; });
      go.textContent = t('code.go');
      err.textContent = CODE_ERR[r.code] ? t(CODE_ERR[r.code]) : t('err.unknown', { code: r.code });
      input.focus();
    },
  });
  const sheet = openC;
  const input = sheet.el.querySelector('[data-cd]');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sheet.el.querySelector('.x-sheet-f .primary')?.click(); }
  });
  sheet.closed.then(() => { openC = null; });
  return sheet;
}
