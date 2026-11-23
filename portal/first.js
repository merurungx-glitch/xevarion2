// XEVARION II — 最初の10連（リリース記念のチケット10枚で・キャラが1人かならず出る）
import { t } from '../core/i18n.js';
import * as gacha from '../core/gacha.js';
import { CHARS, art, partner } from '../core/chara.js';
import { toast } from '../ui/toast.js';
import { esc } from '../ui/dom.js';
import { earnCard } from '../ui/earn.js';
import { showResult } from './gacha-result.js';

export async function mount(el, { go }) {
  el.classList.add('fs');
  if (gacha.firstTenDone()) { go('home', { replace: true }); return; }
  gacha.grantWelcome(); // 受け取っていなければ（1回だけ）

  el.innerHTML = `
    <div class="p-stars"></div>
    <div class="fs-in x-scroll">
      <div class="fs-kick">${t('first.kick')}</div>
      <h1>${t('first.title')}</h1>
      <div class="fs-gift">
        <div class="fs-tix">${'<i class="x-cur ticket"></i>'.repeat(10)}</div>
        <p>${t('first.gift')}</p>
        <button type="button" class="x-btn white small" data-recv style="margin-top:12px">${t('first.receive')}</button>
      </div>
      <div class="fs-chars">${CHARS.map((c) => `<img src="${art(c.id, 'face-256')}" alt="${esc(c.name)}">`).join('')}</div>
      <p class="fs-lead">${t('first.lead')}</p>
      <button type="button" class="x-btn primary fs-go" data-pull disabled>${t('first.pull')}</button>
    </div>`;

  // リリース記念を受け取る（入手 C：GET! のカード）→ 最初の10連をひけるようになる
  const recv = el.querySelector('[data-recv]');
  const pullBtn = el.querySelector('[data-pull]');
  recv.addEventListener('click', async () => {
    recv.disabled = true;
    await earnCard({ ticket: gacha.GRAND_DEBUT.welcomeTickets }, { sub: t('earn.release') });
    recv.textContent = t('first.received');
    pullBtn.disabled = false;
  });

  pullBtn.addEventListener('click', async () => {
    pullBtn.disabled = true;
    const res = gacha.pull(10);
    if (!res) {
      toast(t('gacha.short', { n: gacha.shortBy(10) }));
      pullBtn.disabled = false;
      return;
    }
    await showResult(res);
    const p = partner();
    el.innerHTML = `
      <div class="p-stars"></div>
      <div class="fs-in">
        <div class="fs-kick">PARTNER</div>
        <h1>${esc(t('first.partner', { name: p ? p.name : '' }))}</h1>
        <div class="fs-partner">${p ? `<img src="${art(p.id, 'full-1024')}" alt="">` : ''}</div>
        <button type="button" class="x-btn primary fs-go" data-home>${t('first.toHome')}</button>
      </div>`;
    el.querySelector('[data-home]').addEventListener('click', () => go('home'));
  });
}
