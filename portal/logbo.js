// XEVARION II — ログインボーナスの板（7日で1周・2026-11-24 第5回で決定）
// ・その日はじめてホームを開いたときに出る（受け取ると GET! のカード → お財布へ）。メニューからも見られる
// ・何日目か・中身は core/daily.js（休んでも次の日はつづきから）
import { t } from '../core/i18n.js';
import * as daily from '../core/daily.js';
import * as chara from '../core/chara.js';
import { openSheet } from '../ui/sheet.js';
import { earnCard } from '../ui/earn.js';
import { esc, fmt } from '../ui/dom.js';

const ICON = { xeva: 'assets/ui/xeva-64.webp', gem: 'assets/ui/gem-64.webp', ticket: 'assets/ui/ticket-128.webp' };
const label = (k, n) => (k === 'xeva' ? fmt(n) : k === 'gem' ? t('logbo.gem', { n }) : t('logbo.ticket', { n }));

let autoDay = '';
let open = null;

/** 板を開く。auto＝ホームから自動で（受け取りずみ・この日にもう出した なら出さない） */
export function openLogbo({ auto = false } = {}) {
  const s0 = daily.logbo();
  if (auto && (s0.claimed || autoDay === s0.today)) return null;
  if (open) return open;
  autoDay = s0.today;
  const p = chara.partner();
  const tiles = daily.LOGBO.map((it, i) => {
    const [k, n] = Object.entries(it)[0];
    const st = i < s0.idx || (s0.claimed && i === s0.idx) ? 'got' : i === s0.idx ? 'now' : '';
    return `<div class="lg-d ${st}${i === 6 ? ' d7' : ''}"><small>${t('logbo.day', { n: i + 1 })}</small><img class="${k}" src="${ICON[k]}" alt=""><b>${label(k, n)}</b></div>`;
  }).join('');
  const body = `<div class="lg">
      ${p ? `<div class="lg-p"><img src="${chara.art(p.id, 'face-96')}" alt=""><p>${esc(t('logbo.from', { name: p.name }))}</p></div>` : ''}
      <div class="lg-wk">${tiles}</div>
      <p class="lg-note">${s0.claimed ? t('logbo.done') : t('logbo.note')}</p>
    </div>`;
  open = openSheet({
    title: t('logbo.title'),
    body,
    actions: s0.claimed ? [] : [{ label: t('logbo.recv'), kind: 'primary', value: 'recv' }],
    onAction: async (a, api) => {
      api.el.querySelectorAll('.x-sheet-f button').forEach((b) => { b.disabled = true; });
      const got = await daily.claimLogbo();
      api.close('recv');
      if (got) await earnCard(got.items, { sub: t('logbo.sub', { n: got.idx + 1 }) });
    },
  });
  open.closed.then(() => { open = null; });
  return open;
}
