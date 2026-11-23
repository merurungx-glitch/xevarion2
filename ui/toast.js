// XEVARION II — 上に少しだけ出る知らせ
let el, timer;

export function toast(text, ms = 2200) {
  if (!el) {
    el = document.createElement('div');
    el.className = 'x-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = text;
  clearTimeout(timer);
  requestAnimationFrame(() => el.classList.add('show'));
  timer = setTimeout(() => el.classList.remove('show'), ms);
}
