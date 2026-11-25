// XEVARION II — ロビー（テラス＋動くキャラ）
// ★ 2026-11-25 第7回 M2：完凸を待たずに、持っている子ならだれでも会える。キャラは portal/live.js で動く
//   （呼吸・髪・スカート・頭・胸・重心・押すとはずんで話す＝初代の完凸ロビーと同じしくみ）。背景は LD背景（テラス）
// ★ 同日ご指定：凸で見た目は変えない（完凸の金の光・きらきら・完凸バナーのボタンはやめた。完凸はアイコンが光るだけ）
//   ロビーはホームのメインを大きく見る場所＝LD（全身・背景なし）の絵を使う数少ない画面
// ★ 省電力では止めた絵。見えていない・1分さわらないときは止める（live.js）
import { t } from '../core/i18n.js';
import * as chara from '../core/chara.js';
import { ico } from '../ui/icons.js';
import { esc } from '../ui/dom.js';

const BG = 'assets/lobby/terrace-940.webp';

export async function mount(el, { params, go }) {
  el.classList.add('lb');
  const id = params[0] || chara.partner()?.id;
  const c = chara.byId(id);
  if (!c || !chara.owned(id)) {
    el.innerHTML = `<div class="p-stars"></div><div class="lb-top"><button type="button" data-back aria-label="${t('btn.back')}">${ico('back')}</button><b>${t('lobby.lock')}</b></div>`;
    el.querySelector('[data-back]').addEventListener('click', () => history.back());
    return;
  }
  el.style.setProperty('--lb-c', `var(--${c.el})`);
  el.innerHTML = `
    <div class="lb-stage" style="background-image:url(${BG})"><img class="still" src="${chara.art(id, 'full-1024')}" alt="${esc(c.name)}"></div>
    <div class="lb-top">
      <button type="button" data-back aria-label="${t('btn.back')}">${ico('back')}</button>
      <b>${esc(c.name)}</b>
    </div>
    <div class="lb-bubble" aria-live="polite"><small>${esc(c.name)}</small><span></span></div>
    <div class="lb-hint">${t('lobby.tap')}</div>`;
  const stage = el.querySelector('.lb-stage');
  const bubble = el.querySelector('.lb-bubble');
  let live = null, gone = false, hideT = 0;
  import('./live.js').then((L) => {
    if (gone) return;
    live = L.mountLive(stage, id, { view: 'normal', padT: 70, padB: 96, grid: 8 });
  }).catch((e) => console.warn('live', e));

  const say = () => {
    bubble.querySelector('span').textContent = chara.randomLine(id);
    bubble.classList.add('show');
    clearTimeout(hideT);
    hideT = setTimeout(() => bubble.classList.remove('show'), 5200);
  };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) { go('home'); return; }
    if (live && live.hitAt(e.clientX, e.clientY)) live.poke(2400);
    say();
  });
  // はじめに1回あいさつ
  const helloT = setTimeout(say, 700);
  return () => { gone = true; clearTimeout(hideT); clearTimeout(helloT); live?.destroy(); };
}
