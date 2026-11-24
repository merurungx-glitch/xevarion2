// XEVARION II — サインイン／アカウントを作る（ID＋合言葉）
import { t } from '../core/i18n.js';
import * as store from '../core/store.js';
import * as account from '../core/account.js';
import * as router from '../core/router.js';
import { firstTenDone } from '../core/gacha.js';
import { ico } from '../ui/icons.js';
import { esc } from '../ui/dom.js';
import { decoHTML } from './shell.js';

export async function mount(el, { go }) {
  el.classList.add('au');
  let up = !store.get('lastId'); // 前回の ID が無ければ「アカウントを作る」から

  const field = (name, label, hint, attrs) => `
    <label class="x-field" data-f="${name}"><span>${label}</span><input name="${name}" ${attrs}><small>${hint}</small></label>`;

  function render() {
    el.innerHTML = `${decoHTML()}
      <button type="button" class="au-back" data-back aria-label="${t('btn.back')}">${ico('back')}</button>
      <div class="au-scroll x-scroll">
        <div class="au-logo"><img class="mk" src="assets/brand/mark-256.webp" alt=""><img class="wm" src="assets/brand/wordmark-navy-560.webp" alt="XEVARION II"></div>
        <form class="au-card" novalidate>
          <div class="x-seg" role="tablist">
            <button type="button" data-mode="in" class="${up ? '' : 'on'}">${t('auth.signin')}</button>
            <button type="button" data-mode="up" class="${up ? 'on' : ''}">${t('auth.signup')}</button>
          </div>
          ${field('id', t('auth.id'), t('auth.idHint'), `autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="16" value="${up ? '' : esc(store.get('lastId') || '')}"`)}
          ${up ? field('name', t('auth.name'), t('auth.nameHint'), 'autocomplete="nickname" maxlength="24"') : ''}
          ${field('pass', t('auth.pass'), up ? t('auth.passHint') : '', `type="password" autocomplete="${up ? 'new-password' : 'current-password'}" maxlength="64"`)}
          ${up ? field('pass2', t('auth.pass2'), '', 'type="password" autocomplete="new-password" maxlength="64"') : ''}
          <p class="au-err" role="alert"></p>
          <button type="submit" class="x-btn primary block">${up ? t('auth.create') : t('auth.go')}</button>
          <p class="au-note">${up ? t('auth.forgot') : t('auth.toSignup') + '<br>' + t('auth.forgot')}</p>
        </form>
      </div>`;
  }
  render();

  el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) { up = m.dataset.mode === 'up'; render(); return; }
    if (e.target.closest('[data-back]')) go('title');
  });

  let busy = false;
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const f = e.target;
    const v = (n) => (f.elements[n] ? f.elements[n].value : '');
    const errEl = f.querySelector('.au-err');
    const btn = f.querySelector('[type="submit"]');
    errEl.textContent = '';
    f.querySelectorAll('.x-field.err').forEach((x) => x.classList.remove('err'));
    // その場で分かるまちがいは欄に印を付ける
    const id = v('id').trim().toLowerCase();
    const bad = [['id', account.checkId(id)]];
    if (up) bad.push(['name', account.checkName(v('name'))], ['pass', account.checkPass(v('pass'))], ['pass2', v('pass') === v('pass2') ? '' : t('err.passMismatch')]);
    const first = bad.find(([, m]) => m);
    if (first) {
      f.querySelector(`[data-f="${first[0]}"]`)?.classList.add('err');
      errEl.textContent = first[1];
      return;
    }
    busy = true;
    btn.disabled = true;
    try {
      if (up) {
        await account.signUp({ id, pass: v('pass'), pass2: v('pass2'), name: v('name') });
        go('first');
      } else {
        await account.signIn({ id, pass: v('pass') });
        go(firstTenDone() ? router.takePending() || 'home' : 'first');
      }
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      busy = false;
      if (btn.isConnected) btn.disabled = false;
    }
  });
}
