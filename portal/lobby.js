// XEVARION II — 完凸ロビー（展望テラス＋全身）
// いまは「呼吸」だけ（CSS）。髪・スカートの揺れ（WebGL）はあとで足す。
// ★ 省電力では止めた絵。1分さわらなければ動きを止める（電池）
import { t } from '../core/i18n.js';
import * as chara from '../core/chara.js';
import * as power from '../core/power.js';
import { ico } from '../ui/icons.js';
import { esc } from '../ui/dom.js';

export async function mount(el, { params, go }) {
  el.classList.add('lb');
  const id = params[0] || chara.partner()?.id;
  const c = chara.byId(id);
  if (!c || !chara.isMax(id)) {
    el.innerHTML = `<div class="p-stars"></div><div class="lb-top"><button type="button" data-back>${ico('back')}</button><b>${t('lobby.lock')}</b></div>`;
    el.querySelector('[data-back]').addEventListener('click', () => history.back());
    return;
  }
  el.innerHTML = `
    <img class="lb-bg" src="assets/lobby/park-940.webp" alt="">
    <img class="lb-st" src="${chara.art(id, 'full-1024')}" alt="${esc(c.name)}">
    <div class="lb-top"><button type="button" data-back aria-label="${t('btn.back')}">${ico('back')}</button><b>${esc(c.name)}</b></div>
    <div class="lb-bubble" aria-live="polite"><small>${esc(c.name)}</small><span></span></div>
    <div class="lb-hint">${t('lobby.tap')}</div>`;
  const st = el.querySelector('.lb-st');
  const bubble = el.querySelector('.lb-bubble');
  const motion = () => st.classList.toggle('breathe', power.profile().lobbyMotion && !power.shortFx());
  motion();

  let hideT = 0;
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) { go('home'); return; }
    bubble.querySelector('span').textContent = chara.randomLine(id);
    bubble.classList.add('show');
    clearTimeout(hideT);
    hideT = setTimeout(() => bubble.classList.remove('show'), 5200);
  });
  const iv = setInterval(() => el.classList.toggle('idle', power.idleMs() > 60000), 3000);
  const off = power.onChange(motion);
  return () => { clearInterval(iv); clearTimeout(hideT); off(); };
}
