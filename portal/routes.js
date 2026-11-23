// XEVARION II — 画面の一覧（public＝サインインしなくても開ける・tab＝下のタブに出る画面）
export const ROUTES = {
  title: { public: true, load: () => import('./title.js') },
  auth: { public: true, load: () => import('./auth.js') },
  first: { load: () => import('./first.js') },
  home: { tab: 'home', load: () => import('./home.js') },
  apps: { tab: 'apps', load: () => import('./apps.js') },
  gacha: { tab: 'gacha', load: () => import('./gacha.js') },
  chara: { tab: 'chara', load: () => import('./chara.js') },
  menu: { tab: 'menu', load: () => import('./menu.js') },
  lobby: { load: () => import('./lobby.js') },
  app: { app: true, load: () => import('./app-host.js') }, // #/app/<id>（アプリの窓）
};

/**
 * アプリの台帳。path があるものは移しかえずみ（#/app/<id> で開く）。無いものは「準備中」
 * bg＝アプリの地の色（開いているあいだの html の色・iPhone の下の帯）・roomMax＝部屋（X2.rooms）の人数の上限（無ければ 6）
 */
export const APPS = [
  { id: 'lex', name: 'MagiLex' },
  { id: 'quiz', name: 'MagiQuiz', path: 'apps/quiz/index.html', bg: '#6704dc', roomMax: 4 },
  { id: 'derby', name: 'MagiDerby' },
  { id: 'shift', name: 'MagiShift', path: 'apps/shift/index.html', bg: '#f5f7fc' },
  { id: 'chain', name: 'MagiChainParty', short: 'ChainParty', path: 'apps/chainparty/index.html', bg: '#f6f7fd' },
  { id: 'gura', name: 'MagiGuraPlate', short: 'GuraPlate', path: 'apps/guraplate/index.html', bg: '#090b1c' },
  { id: 'yacht', name: 'MagiYacht', path: 'apps/yacht/index.html', bg: '#0c2c8c' },
];
export const appById = (id) => APPS.find((a) => a.id === id) || null;
export const SITES = [
  { id: 'ngx', name: 'NGX' },
  { id: 'ishida', name: 'ISHIDA Production' },
];
