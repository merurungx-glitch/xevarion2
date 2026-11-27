// XEVARION II — 「アプリとして入れる」の板（★ 2026-11-28 ご指定「アプリダウンロードができることを表示してください」）
// ・タイトルの右上の札・メニューの「この端末」から開く
// ・Chrome・Edge は「インストール」のボタン（core/install.js が起動のときに受け取ったもの）。iPhone・iPad は Safari の手順を絵つきで
// ・入れたアプリ（ホーム画面から開く XEVARION II）は、ブラウザとは保存が別なので、同じ ID と合言葉でサインインし直す（記録はクラウドから届く）
import { t } from '../core/i18n.js';
import * as install from '../core/install.js';
import { ico } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const step = (n, icon, main, sub = '') => `<li><i class="ia-n">${n}</i>${icon ? `<span class="ia-ic">${ico(icon)}</span>` : ''}<div><b>${main}</b>${sub ? `<small>${sub}</small>` : ''}</div></li>`;

function steps(P) {
  if (install.canPrompt()) {
    return `<button type="button" class="x-btn primary block ia-go" data-ia="go">${ico('install')}${t('ia.go')}</button>
      <p class="ia-sub">${t('ia.goNote')}</p>`;
  }
  if (P.kind === 'ios') {
    return `${P.inApp ? `<p class="ia-warn">${t('ia.inApp')}</p>` : !P.safari ? `<p class="ia-warn">${t('ia.notSafari')}</p>` : ''}
      <ol class="ia-steps">
        ${step(1, 'share', t('ia.ios1'), t('ia.ios1s'))}
        ${step(2, 'addbox', t('ia.ios2'), t('ia.ios2s'))}
        ${step(3, '', t('ia.ios3'))}
      </ol>`;
  }
  if (P.kind === 'android') {
    return `${P.inApp ? `<p class="ia-warn">${t('ia.inAppA')}</p>` : ''}
      <ol class="ia-steps">
        ${step(1, 'dots', t('ia.and1'))}
        ${step(2, 'install', t('ia.and2'), t('ia.and2s'))}
        ${step(3, '', t('ia.and3'))}
      </ol>`;
  }
  return `<ol class="ia-steps">
      ${step(1, 'install', t('ia.pc1'), t('ia.pc1s'))}
      ${step(2, '', t('ia.pc2'))}
    </ol>`;
}

function body() {
  const st = install.standalone();
  const P = install.platform();
  return `<div class="ia">
    <div class="ia-hero">
      <img src="assets/brand/app-icon-256.webp" alt="" decoding="async">
      <div><b>XEVARION II</b><small>NGX × ISHIDA Production</small><span class="ia-free">${t('ia.free')}</span></div>
    </div>
    ${st ? `<p class="ia-ok">${ico('check')}${t('ia.already')}</p>` : `<p class="ia-lead">${t('ia.lead')}</p>`}
    <ul class="ia-why">
      <li>${ico('phone')}<span>${t('ia.why1')}</span></li>
      <li>${ico('expand')}<span>${t('ia.why2')}</span></li>
      <li>${ico('install')}<span>${t('ia.why3')}</span></li>
    </ul>
    ${st ? '' : steps(P)}
    <p class="ia-note">${t('ia.note')}</p>
  </div>`;
}

let open = null;
export function openInstall() {
  if (open) return open;
  open = openSheet({ title: t('ia.title'), body: body() });
  const b = open.el.querySelector('.x-sheet-b');
  const paint = () => { b.innerHTML = body(); };
  open.el.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-ia="go"]')) return;
    const ok = await install.prompt();
    if (ok) { toast(t('ia.done')); open?.close(); } else paint();
  });
  const off = install.onChange(paint);
  open.closed.then(() => { off(); open = null; });
  return open;
}
