// XEVARION II — ミッションの板（毎日3つ＋毎週3つ・2026-11-24 第5回で決定）
// ・達成したものを押して受け取る（XEVA などはお財布へ飛ぶ）。「まとめて受け取る」も
// ・中身・数・数え方は core/daily.js
import { t } from '../core/i18n.js';
import * as daily from '../core/daily.js';
import { openSheet } from '../ui/sheet.js';
import { earnFly } from '../ui/earn.js';
import { esc, fmt } from '../ui/dom.js';

const ICON = { xeva: 'assets/ui/xeva-64.webp', gem: 'assets/ui/gem-64.webp', ticket: 'assets/ui/ticket-128.webp' };
const reward = (items) => Object.entries(items || {}).map(([k, n]) => `<span class="ms-rw"><img class="${k}" src="${ICON[k]}" alt="">${k === 'xeva' ? fmt(n) : '×' + n}</span>`).join('');

function btn(m) {
  if (m.claimed) return `<span class="ms-st got">${t('ms.got')}</span>`;
  if (m.done) return `<button type="button" class="x-btn primary small" data-claim="${m.key}">${t('ms.recv')}</button>`;
  return '';
}
function row(m, withReward) {
  const pct = Math.round((100 * m.have) / m.need);
  return `<div class="ms-r${m.done ? ' done' : ''}${m.claimed ? ' claimed' : ''}">
    <div class="ms-t"><b>${esc(m.name)}</b><small>${fmt(m.have)} / ${fmt(m.need)}</small></div>
    ${withReward ? reward(m.items) : ''}${btn(m)}
    <div class="ms-bar"><i style="width:${pct}%"></i></div>
  </div>`;
}
function allRow(a, text) {
  return `<div class="ms-all${a.done ? ' done' : ''}"><span>${text}</span>${reward(a.items)}${a.claimed ? `<span class="ms-st got">${t('ms.got')}</span>` : a.done ? `<button type="button" class="x-btn primary small" data-claim="${a.key}">${t('ms.recv')}</button>` : ''}</div>`;
}
function body() {
  const M = daily.missions();
  return `<div class="ms">
    ${M.ready >= 2 ? `<button type="button" class="x-btn primary block" data-claim-all>${t('ms.recvAll', { n: M.ready })}</button>` : ''}
    <div class="ms-h"><b>${t('ms.today')}</b><small>${t('ms.todayNote')}</small></div>
    ${M.daily.map((m) => row(m, true)).join('')}
    ${allRow(M.dailyAll, t('ms.dailyAll'))}
    <div class="ms-h"><b>${t('ms.week')}</b><small>${t('ms.weekNote')}</small></div>
    ${M.weekly.map((m) => row(m, false)).join('')}
    ${allRow(M.weeklyAll, t('ms.weeklyAll'))}
  </div>`;
}

let open = null;
export function openMissions() {
  if (open) return open;
  open = openSheet({ title: t('ms.title'), body: body() });
  const b = open.el.querySelector('.x-sheet-b');
  const paint = () => { b.innerHTML = body(); };
  let busy = false;
  open.el.addEventListener('click', async (e) => {
    const one = e.target.closest('[data-claim]');
    const all = e.target.closest('[data-claim-all]');
    if ((!one && !all) || busy) return;
    busy = true;
    const from = (one || all).getBoundingClientRect();
    try {
      const got = one ? await daily.claimMission(one.dataset.claim) : await daily.claimAllMissions();
      paint();
      if (got && Object.keys(got).length) earnFly(got, { from: { x: from.left + from.width / 2, y: from.top + from.height / 2 } });
    } finally { busy = false; }
  });
  const off = daily.onChange(paint);
  open.closed.then(() => { off(); open = null; });
  return open;
}
