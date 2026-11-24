// XEVARION II — はじまり特典の板（初代 XEVARION のアカウントの表示名＋4桁 PIN を確かめて受け取る）
// ・確かめ方・渡すものは core/veteran.js。受け取ると GET! のカード → プロフィールに「初代」の印
// ・お知らせ（portal/news.js）とメニューから開く
import { t } from '../core/i18n.js';
import * as vet from '../core/veteran.js';
import { openSheet } from '../ui/sheet.js';
import { earnCard } from '../ui/earn.js';
import { toast } from '../ui/toast.js';
import { esc, fmt } from '../ui/dom.js';

const ICON = { xeva: 'assets/ui/xeva-64.webp', ticket: 'assets/ui/ticket-128.webp' };
const ERR = { done: 'vet.already', notfound: 'vet.notfound', nopin: 'vet.nopin', badpin: 'vet.badpin', taken: 'vet.taken', network: 'err.network' };
const msg = (code) => (ERR[code] ? t(ERR[code]) : t('err.unknown', { code }));

const gifts = () => `<div class="vr-gifts">
    <div><img class="ticket" src="${ICON.ticket}" alt=""><b>×${vet.GIFT.ticket}</b><small>${t('cur.ticket')}</small></div>
    <div><img class="xeva" src="${ICON.xeva}" alt=""><b>${fmt(vet.GIFT.xeva)}</b><small>${t('cur.xeva')}</small></div>
    <div><i class="p-vet big">${t('vet.badge')}</i><b>${t('vet.markShort')}</b><small>${t('vet.markNote')}</small></div>
  </div>`;

let open = null;
/** 板を開く（受け取りずみなら、どの初代アカウントで受け取ったかだけを見せる） */
export function openVeteran() {
  if (open) return open;
  const m = vet.mark();
  const body = m
    ? `<div class="vr"><div class="vr-done"><i class="p-vet big">${t('vet.badge')}</i><p>${esc(t('vet.done', { name: m.name }))}</p></div>${gifts()}</div>`
    : `<div class="vr">
        <p class="vr-lead">${t('vet.lead')}</p>
        ${gifts()}
        <p class="vr-once">${t('vet.once')}</p>
        <label class="x-field"><span>${t('vet.name')}</span><input data-vr="name" maxlength="20" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <label class="x-field"><span>${t('vet.pin')}</span><input data-vr="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></label>
        <p class="vr-err" aria-live="polite"></p>
        <p class="vr-note">${t('vet.note')}</p>
      </div>`;
  let busy = false;
  open = openSheet({
    title: t('vet.title'),
    body,
    actions: m ? [] : [{ label: t('btn.cancel'), value: false }, { label: t('vet.go'), kind: 'primary', value: 'go' }],
    onAction: async (a, api) => {
      if (a.value !== 'go') { api.close(null); return; }
      if (busy) return;
      const q = (k) => api.el.querySelector(`[data-vr="${k}"]`);
      const err = api.el.querySelector('.vr-err');
      const name = q('name').value;
      const pin = q('pin').value.trim();
      if (!name.trim()) { err.textContent = t('vet.errName'); q('name').focus(); return; }
      if (!/^\d{4}$/.test(pin)) { err.textContent = t('vet.errPin'); q('pin').focus(); return; }
      busy = true;
      const btns = [...api.el.querySelectorAll('.x-sheet-f button')];
      const go = btns[btns.length - 1];
      btns.forEach((b) => { b.disabled = true; });
      go.textContent = t('vet.busy');
      err.textContent = '';
      let r;
      try { r = await vet.claim(name, pin); } catch (e) { r = { ok: false, code: e?.code || 'unknown' }; }
      busy = false;
      if (r.ok) {
        api.close('ok');
        await earnCard(r.items, { sub: t('earn.veteran') });
        toast(t('vet.gotMark'));
        return;
      }
      btns.forEach((b) => { b.disabled = false; });
      go.textContent = t('vet.go');
      err.textContent = msg(r.code);
      if (r.code === 'badpin') { q('pin').value = ''; q('pin').focus(); }
    },
  });
  open.closed.then(() => { open = null; });
  return open;
}
