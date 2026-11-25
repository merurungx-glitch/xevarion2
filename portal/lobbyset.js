// XEVARION II — ロビー設定（★ 2026-11-25 ご指定：ホームに出すキャラ＝メイン1人・サブ2人を選ぶ。初代の「ロビーに設定」の II 版）
// ・メイン＝ホームのいちばん大きな板で動く子（MY PARTNER・LD の全身）。サブ＝右の小さな2枚（LD なしの絵）。サブは「おまかせ」もできる
// ・選べるのは持っている子だけ。メインとサブ・サブどうしを入れかえるときは自動で入れかわる（core/chara.js の setPartner・setSub）
// ・開くところ：ホームのパートナーの行の入れかえボタン・図鑑の「ロビー設定」
// ・完凸の子の顔は光る（.p-mx）
import { t } from '../core/i18n.js';
import * as chara from '../core/chara.js';
import { ico } from '../ui/icons.js';
import { esc } from '../ui/dom.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

let open = null;
export function openLobbySet() {
  if (open) return open;
  const html = () => {
    const own = chara.CHARS.filter((c) => chara.owned(c.id));
    const p = chara.partner();
    const s = chara.subsChosen();
    const face = (c, on, attrs, tag = '') => `<button type="button" class="ls-f${on ? ' on' : ''}" ${attrs} aria-pressed="${on}">
        <span class="ls-i ${c.el}${chara.isMax(c.id) ? ' p-mx x-fx' : ''}"><img src="${chara.art(c.id, 'face-96')}" alt=""></span><small>${esc(c.name)}</small>${tag ? `<em>${tag}</em>` : ''}</button>`;
    const auto = (k) => `<button type="button" class="ls-f${s[k] ? '' : ' on'}" data-ls-sub="${k}" data-id="" aria-pressed="${!s[k]}">
        <span class="ls-i auto">${ico('sync')}</span><small>${t('ls.auto')}</small></button>`;
    return `<div class="ls">
      <p class="ls-lead">${t('ls.lead')}</p>
      <div class="ls-h">${t('ls.main')}<small>${t('ls.mainNote')}</small></div>
      <div class="ls-row x-scroll">${own.map((c) => face(c, p?.id === c.id, `data-ls-main data-id="${c.id}"`)).join('')}</div>
      ${[0, 1].map((k) => `<div class="ls-h">${t('ls.sub', { n: k + 1 })}<small>${t('ls.subNote')}</small></div>
        <div class="ls-row x-scroll">${auto(k)}${own.map((c) => face(c, s[k] === c.id, `data-ls-sub="${k}" data-id="${c.id}"`, p?.id === c.id ? t('ls.main') : '')).join('')}</div>`).join('')}
    </div>`;
  };
  open = openSheet({ title: t('ls.title'), body: html() });
  const sheet = open;
  const b = sheet.el.querySelector('.x-sheet-b');
  const paint = () => { const y = b.scrollTop; b.innerHTML = html(); b.scrollTop = y; };
  sheet.el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-ls-main]');
    if (m) { chara.setPartner(m.dataset.id); return; }
    const sb = e.target.closest('[data-ls-sub]');
    if (sb && !chara.setSub(Number(sb.dataset.lsSub), sb.dataset.id || null)) toast(t('ls.cant'));
  });
  const off = chara.onChange(paint);
  sheet.closed.then(() => { off(); open = null; });
  return sheet;
}
