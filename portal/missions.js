// XEVARION II — ミッションの板（毎日3つ＋毎週3つ・2026-11-24 第5回で決定）
// ・達成したものを押して受け取る（XEVA などはお財布へ飛ぶ）。「まとめて受け取る」も
// ・中身・数・数え方は core/daily.js
import { t } from '../core/i18n.js';
import * as daily from '../core/daily.js';
import { openSheet } from '../ui/sheet.js';
import { earnFly } from '../ui/earn.js';
import { esc, fmt } from '../ui/dom.js';
import { ico } from '../ui/icons.js';

const ICON = { xeva: 'assets/ui/xeva-64.webp', gem: 'assets/ui/gem-64.webp', ticket: 'assets/ui/ticket-128.webp' };
const reward = (items) => Object.entries(items || {}).map(([k, n]) => `<span class="ms-rw"><img class="${k}" src="${ICON[k]}" alt="">${k === 'xeva' ? fmt(n) : '×' + n}</span>`).join('');

function btn(m) {
  if (m.claimed) return `<span class="ms-st got">${t('ms.got')}</span>`;
  if (m.done) return `<button type="button" class="x-btn primary small" data-claim="${m.key}">${t('ms.recv')}</button>`;
  return '';
}
/** 1つのミッションの行。今日のもの（withReward）は1つずつ受け取る。
 *  ★ 2026-11-28 ご報告「今週のミッションの受け取りができません」：今週の3つは1つずつには受け取るものがない（3つとも達成で 🎫1）のに、
 *    達成した行にも「受け取る」が出ていて、押しても何も起きなかった（key が無い）→ 今週の行は「達成」の印にして、下の行で受け取る */
function row(m, withReward) {
  const pct = Math.round((100 * m.have) / m.need);
  const right = withReward ? reward(m.items) + btn(m) : m.done ? `<span class="ms-st clear">${ico('check')}${t('ms.clear')}</span>` : '';
  return `<div class="ms-r${m.done ? ' done' : ''}${m.claimed ? ' claimed' : ''}">
    <div class="ms-t"><b>${esc(m.name)}</b><small>${fmt(m.have)} / ${fmt(m.need)}</small></div>
    ${right}
    <div class="ms-bar"><i style="width:${pct}%"></i></div>
  </div>`;
}
function allRow(a, text, left = 0) {
  const tail = a.claimed ? `<span class="ms-st got">${t('ms.got')}</span>`
    : a.done ? `<button type="button" class="x-btn primary small" data-claim="${a.key}">${t('ms.recv')}</button>`
      : left ? `<span class="ms-st left">${t('ms.weekLeft', { n: left })}</span>` : '';
  return `<div class="ms-all${a.done ? ' done' : ''}"><span>${text}</span>${reward(a.items)}${tail}</div>`;
}
function body() {
  const M = daily.missions();
  const wLeft = M.weekly.filter((m) => !m.done).length;
  return `<div class="ms">
    ${M.ready >= 2 ? `<button type="button" class="x-btn primary block" data-claim-all>${t('ms.recvAll', { n: M.ready })}</button>` : ''}
    <div class="ms-h"><b>${t('ms.today')}</b><small>${t('ms.todayNote')}</small></div>
    ${M.daily.map((m) => row(m, true)).join('')}
    ${allRow(M.dailyAll, t('ms.dailyAll'))}
    <div class="ms-h"><b>${t('ms.week')}</b><small>${t('ms.weekNote')}</small></div>
    <p class="ms-hint">${t('ms.weekHint')}</p>
    ${M.weekly.map((m) => row(m, false)).join('')}
    ${allRow(M.weeklyAll, t('ms.weeklyAll'), wLeft)}
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
