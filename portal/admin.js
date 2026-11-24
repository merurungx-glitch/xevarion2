// XEVARION II — 運営の管理画面（#/admin・段階2・2026-11-24）
// ・運営のアカウント（admins/<uid> が true）だけ。ほかの人には「運営のアカウントではありません」と、自分の uid（運営の印を入れるのに使う）を出す
// ・タブ：お知らせ（news を書く・直す・消す）／メール（みんなへ・ひとりへ・消す）／コード（作る・消す）／合言葉（PC の道具のコマンドを作る）
// ・書けるかどうかは Firebase のルールが決める（この画面は運営にしか出さないだけ）
// ★ 運営だけが見る画面なので、言葉は i18n に入れずにここに置く（起動で読む i18n を軽く保つ・英語にしない）
import * as store from '../core/store.js';
import * as A from '../core/admin.js';
import { normItems, normCode, CODE_RE, refresh as refreshMail } from '../core/mail.js';
import { serverNow } from '../core/clock.js';
import { ID_RULE } from '../core/config.js';
import { ico } from '../ui/icons.js';
import { esc, fmt, loadCSS } from '../ui/dom.js';
import { openSheet, ask } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

const DAY = 86400000;
const TABS = { news: 'お知らせ', mail: 'メール', code: 'コード', pass: '合言葉' };
const NEWS_TABS = { news: 'お知らせ', update: '更新内容', dev: 'デベロッパーノート' };
const ACTS = { '': 'なし', gacha: 'ガチャへ', missions: 'ミッションを見る', logbo: 'ログインボーナス', veteran: 'はじまり特典' };
const ITEM_NAMES = { xeva: 'XEVA', gem: 'ジェム', ticket: 'ガチャチケット' };
const LIMITS = [[0, 'なし'], [7, '7日'], [14, '14日'], [30, '30日'], [60, '60日']];

const pad = (n) => String(n).padStart(2, '0');
const dateOf = (at) => { const d = new Date(Number(at) + 9 * 3600000); return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const itemsText = (it) => Object.entries(normItems(it)).map(([k, n]) => `${ITEM_NAMES[k]} ${fmt(n)}`).join('・') || '—';
const untilText = (u) => (u ? `${dateOf(u)} まで${u <= serverNow() ? '（過ぎた）' : ''}` : '期限なし');
const bodyHTML = (s) => esc(s || '').replace(/\n/g, '<br>');
const errText = (e) => (/permission|denied/i.test(String(e?.code || e?.message || ''))
  ? '書けませんでした（Firebase のルールを貼ったか・admins に運営の印があるかを確かめてください）'
  : `うまくいきませんでした（${String(e?.message || e)}）`);
const seg = (name, cur, opts) => `<div class="x-seg ad-seg" data-seg="${name}">${Object.entries(opts).map(([v, l]) => `<button type="button" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const select = (name, cur, opts) => `<select data-f="${name}">${opts.map(([v, l]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
const itemFields = (it = {}) => `<div class="ad-items">${Object.entries(ITEM_NAMES).map(([k, l]) => `<label class="x-field"><span>${l}</span><input data-item="${k}" type="number" inputmode="numeric" min="0" step="1" value="${it[k] || ''}" placeholder="0"></label>`).join('')}</div>`;
function copy(text) {
  (navigator.clipboard?.writeText(text) || Promise.reject(new Error('no clipboard')))
    .then(() => toast('コピーしました'))
    .catch(() => toast('コピーできませんでした（長押しで選んでコピーしてください）'));
}

/** 入力の板（form）。onSave(api の q) が true を返したら閉じる */
function formSheet({ title, body, ok, onSave }) {
  let busy = false;
  const s = openSheet({
    title,
    body: `<div class="ad-f">${body}<p class="ad-err" aria-live="polite"></p></div>`,
    actions: [{ label: 'やめる', value: false }, { label: ok, kind: 'primary', value: 'go' }],
    onAction: async (a, api) => {
      if (a.value !== 'go') { api.close(null); return; }
      if (busy) return;
      const err = api.el.querySelector('.ad-err');
      const q = (n) => api.el.querySelector(`[data-f="${n}"]`);
      const segv = (n) => api.el.querySelector(`[data-seg="${n}"] .on`)?.dataset.v || '';
      const items = () => {
        const o = {};
        api.el.querySelectorAll('[data-item]').forEach((i) => { o[i.dataset.item] = i.value; });
        return normItems(o);
      };
      busy = true;
      err.textContent = '';
      try {
        const res = await onSave({ q, segv, items, err });
        if (res === true) api.close('ok');
      } catch (e) { err.textContent = errText(e); } finally { busy = false; }
    },
  });
  // 種類などの切りかえ（data-seg）。宛先の「ひとり」だけ ID の欄を出す
  s.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg] button');
    if (!b) return;
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    if (b.parentElement.dataset.seg === 'to') s.el.querySelectorAll('[data-when]').forEach((x) => { x.hidden = x.dataset.when !== b.dataset.v; });
  });
  return s;
}

export async function mount(el, { go }) {
  await loadCSS('portal/admin.css'); // 管理画面の見た目（起動では読まない）
  el.innerHTML = `<header class="x-head"><button type="button" class="ad-back" data-back aria-label="もどる">${ico('back')}</button><h1>ADMIN</h1></header>
    <div class="p-body x-scroll"><div class="ad"><p class="ad-wait">確かめています…</p></div></div>`;
  el.querySelector('[data-back]').addEventListener('click', () => go('menu'));
  const root = el.querySelector('.ad');
  let gone = false;

  if (!(await A.isAdmin())) {
    const uid = store.userId() || '';
    root.innerHTML = `<div class="ad-no">
        <b>運営のアカウントではありません</b>
        <p>このアカウントを運営にするには、Firebase コンソールの Realtime Database（データ）で、<code>admins</code> の下に次の番号（uid）を名前にして <code>true</code> を入れてください。入れたら、この画面を開きなおします。</p>
        <div class="ad-copy"><code>${esc(uid)}</code><button type="button" class="x-btn secondary small" data-copy="${esc(uid)}">コピー</button></div>
      </div>`;
    root.addEventListener('click', (e) => { const c = e.target.closest('[data-copy]'); if (c) copy(c.dataset.copy); });
    return () => { gone = true; };
  }

  let tab = 'news';
  root.innerHTML = `${seg('tab', tab, TABS)}<div class="ad-body"></div>`;
  const body = root.querySelector('.ad-body');
  let seq = 0;

  async function paint() {
    const my = ++seq;
    body.innerHTML = '<p class="ad-wait">読んでいます…</p>';
    let html;
    try { html = await VIEWS[tab](); } catch (e) { html = `<p class="ad-err">${esc(errText(e))}</p>`; }
    if (my === seq && !gone) body.innerHTML = html;
  }

  // ── お知らせ ──
  async function newsView() {
    const v = await A.read('news');
    const rows = Object.entries(v).filter(([, x]) => x && typeof x.title === 'string').sort((a, b) => (Number(b[1].at) || 0) - (Number(a[1].at) || 0));
    return `<button type="button" class="x-btn primary block" data-new="news">${ico('plus')}お知らせを書く</button>
      <p class="ad-note">ここで書いたお知らせは、みんなの「お知らせ」に出ます（開いている人には10分以内）。版といっしょに配るお知らせ（更新内容など）は <code>src/portal/news-data.js</code>。</p>
      ${rows.length ? rows.map(([id, x]) => `<div class="ad-i">
          <div class="ad-m"><span class="x-chip">${NEWS_TABS[x.tab] || 'お知らせ'}</span><small>${dateOf(x.at)}${x.until ? '・' + untilText(Number(x.until)) : ''}${x.act ? '・ボタン「' + (ACTS[x.act] || x.act) + '」' : ''}</small></div>
          <b>${esc(x.title)}</b>${x.body ? `<p>${bodyHTML(x.body)}</p>` : ''}
          <div class="ad-b"><button type="button" class="x-btn secondary small" data-edit-news="${esc(id)}">直す</button><button type="button" class="x-btn secondary small" data-del="news/${esc(id)}" data-what="お知らせ「${esc(x.title)}」">消す</button></div>
        </div>`).join('') : '<p class="ad-empty">まだありません</p>'}`;
  }
  function newsForm(id, x) {
    const limits = x && x.until ? [['keep', `そのまま（${untilText(Number(x.until))}）`], ...LIMITS] : LIMITS;
    formSheet({
      title: id ? 'お知らせを直す' : 'お知らせを書く',
      ok: id ? '直す' : '出す',
      body: `<span class="ad-l">種類</span>${seg('tab', x?.tab || 'news', NEWS_TABS)}
        <label class="x-field"><span>題</span><input data-f="title" maxlength="80" value="${esc(x?.title || '')}"></label>
        <label class="x-field"><span>本文</span><textarea data-f="body" maxlength="2000" rows="6">${esc(x?.body || '')}</textarea><small>改行はそのまま出ます（HTML は文字のまま）</small></label>
        <label class="x-field"><span>ボタン</span>${select('act', x?.act || '', Object.entries(ACTS))}</label>
        <label class="x-field"><span>出す期限</span>${select('limit', x && x.until ? 'keep' : 0, limits)}</label>`,
      onSave: async ({ q, segv, err }) => {
        const title = q('title').value.trim();
        if (!title) { err.textContent = '題を入れてください'; return false; }
        const rec = { at: Number(x?.at) || serverNow(), tab: segv('tab') || 'news', title, body: q('body').value.replace(/\r/g, '').trim() };
        const act = q('act').value;
        if (act) rec.act = act;
        const lim = q('limit').value;
        if (lim === 'keep' && x?.until) rec.until = Number(x.until);
        else if (Number(lim) > 0) rec.until = serverNow() + Number(lim) * DAY;
        await A.write(`news/${id || A.newId()}`, rec);
        toast(id ? 'お知らせを直しました' : 'お知らせを出しました');
        import('./news.js').then((N) => N.refresh({ force: true })).catch(() => {});
        paint();
        return true;
      },
    });
  }

  // ── メール ──
  async function mailView() {
    const [all, to] = await Promise.all([A.read('mail/all'), A.read('mail/to')]);
    const rows = [];
    for (const [mid, m] of Object.entries(all)) rows.push({ path: `mail/all/${mid}`, who: 'みんな', m });
    for (const [id, box] of Object.entries(to)) for (const [mid, m] of Object.entries(box || {})) rows.push({ path: `mail/to/${id}/${mid}`, who: `ID ${id}`, m });
    const list = rows.filter((r) => r.m && typeof r.m.title === 'string').sort((a, b) => (Number(b.m.at) || 0) - (Number(a.m.at) || 0));
    return `<button type="button" class="x-btn primary block" data-new="mail">${ico('mail')}メールを送る</button>
      <p class="ad-note">受け取ったかどうかは、それぞれのアカウントに記録されます（1人1回）。消すと、まだ受け取っていない人は受け取れなくなります。</p>
      ${list.length ? list.map((r) => `<div class="ad-i${r.m.until && Number(r.m.until) <= serverNow() ? ' old' : ''}">
          <div class="ad-m"><span class="x-chip">${esc(r.who)}</span><small>${dateOf(r.m.at)}・${untilText(Number(r.m.until) || 0)}</small></div>
          <b>${esc(r.m.title)}</b><p class="ad-it">${itemsText(r.m.items)}</p>${r.m.body ? `<p>${bodyHTML(r.m.body)}</p>` : ''}
          <div class="ad-b"><button type="button" class="x-btn secondary small" data-del="${esc(r.path)}" data-what="メール「${esc(r.m.title)}」">消す</button></div>
        </div>`).join('') : '<p class="ad-empty">まだありません</p>'}`;
  }
  function mailForm() {
    formSheet({
      title: 'メールを送る',
      ok: '送る',
      body: `<span class="ad-l">宛先</span>${seg('to', 'all', { all: 'みんな', one: 'ひとり（ID）' })}
        <label class="x-field" data-when="one" hidden><span>相手の ID</span><input data-f="id" maxlength="16" autocapitalize="off" autocorrect="off" spellcheck="false"><small>XEVARION II の ID（半角の英小文字・数字・_）</small></label>
        <label class="x-field"><span>題</span><input data-f="title" maxlength="80"></label>
        <label class="x-field"><span>本文</span><textarea data-f="body" maxlength="2000" rows="5"></textarea></label>
        <span class="ad-l">プレゼント（1つ以上）</span>${itemFields()}
        <label class="x-field"><span>受け取り期限</span>${select('limit', 30, LIMITS)}</label>`,
      onSave: async ({ q, segv, items, err }) => {
        const toOne = segv('to') === 'one';
        const id = q('id').value.trim().toLowerCase();
        if (toOne && !ID_RULE.test(id)) { err.textContent = 'ID は半角の英小文字・数字・_ で3〜16文字です'; return false; }
        const title = q('title').value.trim();
        if (!title) { err.textContent = '題を入れてください'; return false; }
        const it = items();
        if (!Object.keys(it).length) { err.textContent = 'プレゼントを1つ以上入れてください'; return false; }
        const who = toOne ? `ID「${id}」` : 'みんな';
        if (!(await ask({ title: 'メールを送る', text: `${esc(who)}に「${esc(title)}」（${esc(itemsText(it))}）を送りますか？`, ok: '送る' }))) return false;
        const rec = { at: serverNow(), title, items: it };
        const b = q('body').value.replace(/\r/g, '').trim();
        if (b) rec.body = b;
        const days = Number(q('limit').value);
        if (days > 0) rec.until = serverNow() + days * DAY;
        await A.write(toOne ? `mail/to/${id}/${A.newId()}` : `mail/all/${A.newId()}`, rec);
        toast('メールを送りました');
        refreshMail({ force: true }); // この端末のメールの数もすぐに
        paint();
        return true;
      },
    });
  }

  // ── コード ──
  async function codeView() {
    const v = await A.read('codes');
    const rows = Object.entries(v).filter(([, x]) => x && typeof x === 'object').sort((a, b) => (Number(b[1].at) || 0) - (Number(a[1].at) || 0));
    return `<button type="button" class="x-btn primary block" data-new="code">${ico('plus')}コードを作る</button>
      <p class="ad-note">コードを知っている人は、メニューの「コード入力」で受け取れます（1つのアカウントで1回）。消すと、それからは受け取れません。</p>
      ${rows.length ? rows.map(([c, x]) => `<div class="ad-i${x.until && Number(x.until) <= serverNow() ? ' old' : ''}">
          <div class="ad-m"><code class="ad-code">${esc(c)}</code><small>${dateOf(x.at)}・${untilText(Number(x.until) || 0)}</small></div>
          ${x.title ? `<b>${esc(x.title)}</b>` : ''}<p class="ad-it">${itemsText(x.items)}</p>
          <div class="ad-b"><button type="button" class="x-btn secondary small" data-copy="${esc(c)}">コピー</button><button type="button" class="x-btn secondary small" data-del="codes/${esc(c)}" data-what="コード ${esc(c)}">消す</button></div>
        </div>`).join('') : '<p class="ad-empty">まだありません</p>'}`;
  }
  function codeForm() {
    const s = formSheet({
      title: 'コードを作る',
      ok: '作る',
      body: `<label class="x-field"><span>コード</span><span class="ad-row"><input data-f="code" maxlength="16" value="${A.randomCode()}" autocapitalize="characters" autocorrect="off" spellcheck="false"><button type="button" class="x-btn secondary small" data-regen>作りなおす</button></span><small>英字と数字の4〜16文字（大文字になります）</small></label>
        <label class="x-field"><span>題（受け取った人に見える）</span><input data-f="title" maxlength="60" placeholder="例：リリース記念"></label>
        <span class="ad-l">プレゼント（1つ以上）</span>${itemFields()}
        <label class="x-field"><span>使える期限</span>${select('limit', 30, LIMITS)}</label>`,
      onSave: async ({ q, items, err }) => {
        const c = normCode(q('code').value);
        if (!CODE_RE.test(c)) { err.textContent = 'コードは英字と数字の4〜16文字です'; return false; }
        const it = items();
        if (!Object.keys(it).length) { err.textContent = 'プレゼントを1つ以上入れてください'; return false; }
        if (Object.keys(await A.read(`codes/${c}`)).length) { err.textContent = 'そのコードはもうあります'; return false; }
        const rec = { at: serverNow(), items: it };
        const title = q('title').value.trim();
        if (title) rec.title = title;
        const days = Number(q('limit').value);
        if (days > 0) rec.until = serverNow() + days * DAY;
        await A.write(`codes/${c}`, rec);
        toast(`コード ${c} を作りました`);
        paint();
        return true;
      },
    });
    s.el.querySelector('[data-regen]').addEventListener('click', () => { s.el.querySelector('[data-f="code"]').value = A.randomCode(); });
  }

  // ── 合言葉の再設定（PC の道具） ──
  async function passView() {
    return `<div class="ad-pass">
        <p class="ad-note">合言葉の再設定は、運営の PC の道具で行います（XEVARION II はサーバーのない作りなので、画面からは変えられません）。変えると、その人のほかの端末はサインアウトされます。</p>
        <label class="x-field"><span>合言葉を変える人の ID</span><input data-pass-id maxlength="16" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <span class="ad-l">XEVARION2 のフォルダで打つコマンド</span>
        <div class="ad-copy"><code data-pass-cmd>python -X utf8 tools/reset_pass.py ID</code><button type="button" class="x-btn secondary small" data-copy-cmd>コピー</button></div>
        <p class="ad-note">新しい合言葉を2回聞かれます（<code>--random</code> を足すと、道具が作って表示します）。新しい合言葉は本人に伝えてください。</p>
        <span class="ad-l">はじめの1回だけ</span>
        <ol class="ad-ol">
          <li>Firebase コンソール → プロジェクトの設定 → サービス アカウント →「新しい秘密鍵を生成」で JSON を保存する。<b>XEVARION2 のフォルダの外</b>に置き、人に渡さない（この鍵があると何でもできる）</li>
          <li>その JSON の場所を、環境変数 <code>XEVARION2_ADMIN_KEY</code> に入れる（または <code>--key 場所</code>）</li>
          <li><code>pip install firebase-admin</code></li>
        </ol>
      </div>`;
  }

  const VIEWS = { news: newsView, mail: mailView, code: codeView, pass: passView };

  root.addEventListener('click', async (e) => {
    const tb = e.target.closest('[data-seg="tab"] button');
    if (tb) {
      tab = tb.dataset.v;
      root.querySelectorAll('[data-seg="tab"] button').forEach((x) => x.classList.toggle('on', x === tb));
      paint();
      return;
    }
    const nw = e.target.closest('[data-new]');
    if (nw) { ({ news: () => newsForm(null, null), mail: mailForm, code: codeForm })[nw.dataset.new](); return; }
    const ed = e.target.closest('[data-edit-news]');
    if (ed) {
      try { newsForm(ed.dataset.editNews, await A.read(`news/${ed.dataset.editNews}`)); } catch (err) { toast(errText(err)); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!(await ask({ title: '消す', text: `${del.dataset.what}を消しますか？（もとにもどせません）`, ok: '消す', danger: true }))) return;
      try {
        await A.write(del.dataset.del, null);
        toast('消しました');
        if (del.dataset.del.startsWith('news/')) import('./news.js').then((N) => N.refresh({ force: true })).catch(() => {});
        if (del.dataset.del.startsWith('mail/')) refreshMail({ force: true });
        paint();
      } catch (err) { toast(errText(err)); }
      return;
    }
    const cp = e.target.closest('[data-copy]');
    if (cp) { copy(cp.dataset.copy); return; }
    if (e.target.closest('[data-copy-cmd]')) copy(root.querySelector('[data-pass-cmd]').textContent);
  });
  root.addEventListener('input', (e) => {
    if (!e.target.matches('[data-pass-id]')) return;
    const id = e.target.value.trim().toLowerCase();
    root.querySelector('[data-pass-cmd]').textContent = `python -X utf8 tools/reset_pass.py ${ID_RULE.test(id) ? id : 'ID'}`;
  });

  paint();
  return () => { gone = true; };
}
