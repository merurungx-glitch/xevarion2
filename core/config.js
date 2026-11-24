// XEVARION II — 全体の設定（版・どこで動いているか・Firebase）

export const VERSION = '0.1.0';
/** 配った版（tools/release.py が release/ に書き出すときに入れる）。src のままは 'dev'＝Service Worker を使わない（直したものがいつもそのまま出る） */
export const BUILD = '2026-11-24-2';

const host = location.hostname;
/** 手元（localhost）で動いているか。★ 手元では本物のデータに書かない（試験用の置き場を使う） */
export const IS_DEV = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');

/** 保存のキーの頭（同じ GitHub Pages に置く初代 XEVARION・XEVORA・XEVARIX と混ざらないように） */
export const KEY = 'x2.';

/** 使う裏方：手元＝local（この端末の中だけで動く試験用）／公開＝firebase */
export const BACKEND = IS_DEV ? 'local' : 'firebase';

export const FIREBASE = {
  sdk: '12.16.0', // ★ 版は1つに固定（変えるときはここだけ）
  config: {
    apiKey: 'AIzaSyCBELmwYmF1ABvxt2GHLIoSessSeYF34Aw',
    authDomain: 'xevarion2.firebaseapp.com',
    databaseURL: 'https://xevarion2-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'xevarion2',
    storageBucket: 'xevarion2.firebasestorage.app',
    messagingSenderId: '160668199047',
    appId: '1:160668199047:web:54c3359f5553beb181b022',
    measurementId: 'G-998TCK4TEP',
  },
};

/** ID＋合言葉を Firebase の「メール／パスワード」で使うための、中だけのメールの形（メールは送らない） */
export const ID_MAIL_DOMAIN = 'id.xevarion2.example';

export const ID_RULE = /^[a-z0-9_]{3,16}$/;
export const PASS_MIN = 6;
export const NAME_MAX = 12;
