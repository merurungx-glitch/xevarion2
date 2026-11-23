// XEVARION II — アイコン（すべて自前の SVG・24×24・線で描く）
// 使い方: ico('home') / ico('lex', 'grad')   ※ grad はロゴのグラデーションで線を塗る

const P = {
  // 下のタブ
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
  gacha: '<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-24 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)"/><circle class="f" cx="12" cy="12" r="1.6"/>',
  chara: '<circle cx="12" cy="8.2" r="3.6"/><path d="M5 20c.9-3.9 3.6-6 7-6s6.1 2.1 7 6"/>',
  menu: '<path d="M5 7h14M5 12h14M5 17h9"/>',
  // アプリ
  lex: '<path d="M12 6.5C9.8 5 7 4.6 4 5.3v12.5c3-.7 5.8-.3 8 1.2 2.2-1.5 5-1.9 8-1.2V5.3c-3-.7-5.8-.3-8 1.2z"/><path d="M12 6.5V19"/>',
  quiz: '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 16h-8l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5z"/><path d="M10 8.6a2.1 2.1 0 1 1 3 1.9c-.6.3-1 .8-1 1.4v.3"/><circle class="f" cx="12" cy="14" r=".9"/>',
  derby: '<path d="M7 4.5 6.2 11a5.8 5.8 0 0 0 11.6 0L17 4.5"/><path d="M5.2 4.5h3.4M15.4 4.5h3.4"/><circle class="f" cx="8.4" cy="9.2" r=".8"/><circle class="f" cx="15.6" cy="9.2" r=".8"/><circle class="f" cx="9.4" cy="13.6" r=".8"/><circle class="f" cx="14.6" cy="13.6" r=".8"/>',
  shift: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle class="f" cx="8" cy="12" r="2"/><path d="M11.5 12h6M15.5 9.5 18 12l-2.5 2.5"/>',
  chain: '<circle cx="6.5" cy="16.5" r="3"/><circle cx="17.5" cy="16.5" r="3"/><circle cx="12" cy="6.5" r="3"/><path d="M8 13.9 10.5 9.1M16 13.9 13.5 9.1M9.5 16.5h5"/>',
  gura: '<path d="M3.5 15.5 20.5 12.2"/><path d="M12 13.9 9.6 19.5h4.8z"/><rect x="6.3" y="9.1" width="4.6" height="4.6" rx="1" transform="rotate(-11 8.6 11.4)"/><rect x="13" y="8.1" width="4.4" height="4.4" rx="1" transform="rotate(-11 15.2 10.3)"/>',
  yacht: '<rect x="3.5" y="8" width="10.5" height="10.5" rx="2.4"/><circle class="f" cx="6.6" cy="11.1" r=".95"/><circle class="f" cx="8.75" cy="13.25" r=".95"/><circle class="f" cx="10.9" cy="15.4" r=".95"/><path d="M12.6 5.4 17.5 4.1a2 2 0 0 1 2.45 1.4l1.3 4.9a2 2 0 0 1-1.4 2.45L16.4 13.8"/><circle class="f" cx="17.4" cy="8.3" r=".9"/>',
  ngx: '<path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z"/><path d="M9 15.6V8.4l6 7.2V8.4"/>',
  ishida: '<rect x="3.5" y="9.5" width="17" height="10.5" rx="1.8"/><path d="M3.8 9.3 4.9 5.6 19.8 4l.4 3.9z"/><path d="M8.3 5.2l1.6 3.3M12.8 4.8l1.6 3.3M17.2 4.4l1.6 3.3"/><path class="f" d="m12 11.6.95 1.95 2.15.31-1.55 1.5.37 2.14L12 16.5l-1.92 1 .37-2.14-1.55-1.5 2.15-.31z"/>',
  // 画面の部品
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  mission: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.5 2.5 5-5.2"/>',
  door: '<path d="M6 20V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V20"/><path d="M4 20h16"/><circle class="f" cx="14.6" cy="12.5" r="1"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  heart: '<path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4z"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  out: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
  bolt: '<path d="M13 3 5.5 13.5H12l-1 7.5 7.5-10.5H12z"/>',
  sync: '<path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9"/><path d="M17.8 3.6v3.6h-3.6M6.2 20.4v-3.6h3.6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle class="f" cx="12" cy="7.8" r="1"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle class="f" cx="4.8" cy="7" r="1.1"/><circle class="f" cx="4.8" cy="12" r="1.1"/><circle class="f" cx="4.8" cy="17" r="1.1"/>',
  // 5属性
  flare: '<path d="M12 3.2c.6 3.2 4.8 4.9 4.8 9.9a4.8 4.8 0 0 1-9.6 0c0-2.3 1.1-3.8 2.3-4.9.1 1.7.8 2.8 1.9 3.3-.5-2.9 0-5.6.6-8.3z"/>',
  tide: '<path d="M12 3.5c3.1 4.1 6 7.3 6 10.6a6 6 0 0 1-12 0c0-3.3 2.9-6.5 6-10.6z"/>',
  terra: '<path d="M5.5 18.5C5.3 10.6 10 5.6 19 5c-.4 8.9-5.4 13.6-13.5 13.5z"/><path d="M5.5 18.5 13.5 10.5"/>',
  nova: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  void: '<path d="M19.5 14.6A7.6 7.6 0 1 1 9.4 4.5a6.1 6.1 0 0 0 10.1 10.1z"/>',
};

export const ico = (name, cls = '') => `<svg class="x-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

/** グラデーションの定義を文書に1回だけ置く（id は x2g… で始めて、ほかとぶつからないようにする） */
export function installIconDefs() {
  if (document.getElementById('x2-icon-defs')) return;
  const d = document.createElement('div');
  d.id = 'x2-icon-defs';
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = `<svg width="0" height="0" aria-hidden="true"><defs>
    <linearGradient id="x2gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22e4ff"/><stop offset=".45" stop-color="#3a6bff"/><stop offset=".8" stop-color="#9a3dff"/><stop offset="1" stop-color="#e35bff"/></linearGradient>
    <linearGradient id="x2gC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff0ff"/><stop offset="1" stop-color="#e35bff"/></linearGradient>
  </defs></svg>`;
  document.body.prepend(d);
}
