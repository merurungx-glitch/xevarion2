// XEVARION II — 動くキャラ（2026-11-25 第7回 M2：ホームのパートナーの板・ロビー）
// 初代 XEVARION の完凸ロビー（XEVARION/home-lobby.js）と同じしくみ：
//   全身の絵（背景なし）を格子に分け、髪・スカート（色と範囲＝live-rigs.js）・頭・胸・体の重心をばねでゆらす。押すと小さくはずむ。
// ・絵は chara.art(id, 'full-1024')。格子と骨組みは元の絵（941×1672）の座標で持ち、読んだ絵の画素はその割合で引く
// ・電池：見えていない（IntersectionObserver）・タブが裏・1分さわらない → 止める。省電力（power の lobbyMotion が false）→ 動かさない
// ・WebGL が使えない・失敗した・とちゅうで失われた → 止めた絵のまま（呼ぶ側が stage の中に img.still を置いておく。動き出すと stage に .lv-on）
import * as chara from '../core/chara.js';
import * as power from '../core/power.js';
import { RIGS, RIG_SIZE } from './live-rigs.js';

const smooth = (e0, e1, x) => { let t = (x - e0) / (e1 - e0); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx / 255];
}
const inR = (v, r) => !r || (r[0] <= r[1] ? v >= r[0] && v <= r[1] : v >= r[0] || v <= r[1]);
const inBox = (b, x, y) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
function bustW(x, y, b) {
  if (!b) return 0;
  if (b.cut && b.cut.some((c) => inBox(c, x, y))) return 0;
  let w = 0;
  for (const c of [b.l, b.r]) { const d = Math.hypot((x - c[0]) / b.R, (y - c[1]) / (b.R * (b.ry || 1))); w = Math.max(w, 1 - smooth(0.3, 1, d)); }
  return w;
}
const loadImg = (src) => new Promise((ok, ng) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = ng; i.src = src; });
const reduced = () => { try { return power.shortFx() || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

class Live {
  constructor(stage, id, o) {
    this.stage = stage; this.id = id; this.def = RIGS[id]; this.rig = this.def.rig;
    this.view = o.view || 'normal'; this.padT = o.padT ?? 20; this.padB = o.padB ?? 16;
    this.grid = o.grid || 8; this.fpsCap = o.fps || 60; this.dprMax = o.dpr || 2;
    this.t = Math.random() * 10; this.seed = Math.random() * 100;
    this.hop = { y: 0, v: 0 }; this.jolt = { x: 0, v: 0 }; this.bs = { x: 0, y: 0, vx: 0, vy: 0 }; this.prevHopV = 0;
    this.talkUntil = 0; this.frame = null; this.frameTo = null; this.dead = false; this.visible = true; this.on = false;
  }

  /* 色で髪・スカートを見分ける（7×7 の範囲の 16点の割合）。座標は骨組みの座標・画素は読んだ絵の割合で引く */
  labelAt(x, y) {
    const D = this.px, IW = this.IW, IH = this.IH, k = this.k, hr = this.def.hair, cr = this.def.cloth;
    let hairN = 0, clothN = 0, n = 0;
    for (let j = -3; j <= 3; j += 2) for (let i = -3; i <= 3; i += 2) {
      const xx = x + i, yy = y + j;
      const px = Math.max(0, Math.min(IW - 1, Math.round(xx * k))), py = Math.max(0, Math.min(IH - 1, Math.round(yy * k)));
      const q = (py * IW + px) * 4; if (D[q + 3] < 40) continue;
      n++;
      const [h, s, v] = hsv(D[q], D[q + 1], D[q + 2]);
      if (hr) {
        let ok = inR(s, hr.sat) && inR(v, hr.val) && (!hr.hue || inR(h, hr.hue));
        if (ok && hr.boxes) ok = hr.boxes.some((b) => inBox(b, xx, yy));
        if (ok && hr.cut) ok = !hr.cut.some((b) => inBox(b, xx, yy));
        if (ok && hr.noFace) { const f = hr.noFace; if (((xx - f[0]) / f[2]) ** 2 + ((yy - f[1]) / f[3]) ** 2 < 1) ok = false; }
        if (ok) hairN++;
      }
      if (cr) {
        let ok = inR(h, cr.hue) && inR(s, cr.sat) && inR(v, cr.val) && yy >= cr.y0 && yy <= cr.y1;
        if (ok && cr.boxes) ok = cr.boxes.some((b) => inBox(b, xx, yy));
        if (ok && cr.cut) ok = !cr.cut.some((b) => inBox(b, xx, yy));
        if (ok) clothN++;
      }
    }
    return n ? [hairN / n, clothN / n] : [0, 0];
  }

  alphaAt(x, y) {
    const px = Math.max(0, Math.min(this.IW - 1, Math.round(x * this.k))), py = Math.max(0, Math.min(this.IH - 1, Math.round(y * this.k)));
    return this.px[(py * this.IW + px) * 4 + 3];
  }

  buildMesh() {
    const [W, H] = RIG_SIZE, S = this.grid, r = this.rig;
    const cols = Math.ceil(W / S), rows = Math.ceil(H / S);
    const idx = new Int32Array((cols + 1) * (rows + 1)).fill(-1);
    const rest = [], tris = [];
    const V = (i, j) => { const q = j * (cols + 1) + i; if (idx[q] < 0) { idx[q] = rest.length / 2; rest.push(Math.min(i * S, W), Math.min(j * S, H)); } return idx[q]; };
    const step = Math.max(2, S / 4);
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      let any = false;
      for (let y = cy * S - 1; y <= cy * S + S && !any; y += step) for (let x = cx * S - 1; x <= cx * S + S; x += step) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue; if (this.alphaAt(x, y) > 4) { any = true; break; }
      }
      if (!any) continue;
      const a = V(cx, cy), b = V(cx + 1, cy), c = V(cx + 1, cy + 1), d = V(cx, cy + 1);
      tris.push(a, b, c, a, c, d);
    }
    const n = rest.length / 2;
    this.rest = new Float32Array(rest); this.pos = new Float32Array(rest.length);
    this.uv = new Float32Array(rest.length); this.tris = n > 65535 ? new Uint32Array(tris) : new Uint16Array(tris);
    const hair = new Float32Array(n), cloth = new Float32Array(n), bust = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = rest[i * 2], y = rest[i * 2 + 1];
      this.uv[i * 2] = x / W; this.uv[i * 2 + 1] = y / H;
      const [h, c] = this.labelAt(x, y); hair[i] = h; cloth[i] = c;
      bust[i] = bustW(x, y, this.def.bust);
    }
    // となりと平均を何回か取って、境目をなだらかに（髪・スカートだけが動いて三角形がのびるのを防ぐ）
    const nb = new Array(n);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const q = idx[j * (cols + 1) + i]; if (q < 0) continue;
      const list = [];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii > cols || jj > rows) continue;
        const qq = idx[jj * (cols + 1) + ii]; if (qq >= 0) list.push(qq);
      }
      nb[q] = list;
    }
    const relax = (arr, passes) => {
      let cur = arr, nxt = new Float32Array(n);
      for (let p = 0; p < passes; p++) {
        for (let i = 0; i < n; i++) {
          const L = nb[i]; if (!L || !L.length) { nxt[i] = cur[i]; continue; }
          let sum = 0; for (let q = 0; q < L.length; q++) sum += cur[L[q]];
          nxt[i] = cur[i] * 0.5 + (sum / L.length) * 0.5;
        }
        const t = cur; cur = nxt; nxt = t;
      }
      return cur;
    };
    // 格子があらいときは、ならす回数を減らす（同じ距離をならす）
    const pf = 8 / S;
    const hairS = relax(hair, Math.max(2, Math.round((this.def.hairBlur || 7) * pf))), clothS = relax(cloth, Math.max(2, Math.round(8 * pf))), bustS = this.def.bust ? relax(bust, Math.max(1, Math.round(4 * pf))) : bust;
    this.w = new Array(n);
    for (let i = 0; i < n; i++) {
      const y = rest[i * 2 + 1];
      const fall = smooth(r.neck[1] - 80, r.neck[1] + 300, y);
      this.w[i] = {
        head: smooth(r.neck[1] + 40, r.neck[1] - 34, y),
        torso: smooth(r.waistY, r.shoulderY, y),
        hip: smooth(r.pivot[1], r.waistY, y),
        hair: Math.min(1, hairS[i] * 1.25) * (0.25 + 0.75 * fall),
        cloth: Math.min(1, clothS[i] * 1.3) * smooth(r.waistY - 20, r.hemY + 10, y),
        bust: bustS[i],
      };
    }
    // 押した所がキャラの上か（16px ごとの alpha）
    const gw = Math.ceil(W / 16), gh = Math.ceil(H / 16), hit = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) hit[j * gw + i] = this.alphaAt(Math.min(W - 1, i * 16 + 8), Math.min(H - 1, j * 16 + 8)) > 40 ? 1 : 0;
    this.hitMap = hit; this.hitW = gw; this.hitH = gh;
    this.vcount = n;
  }

  deform(x, y, w, o) {
    const r = this.rig;
    let qx = x, qy = y;
    qy -= o.breath * w.torso;
    qy += this.hop.y * w.hip;
    if (w.bust) { qx += o.bustX * w.bust; qy += o.bustY * w.bust; }
    if (w.head > 0) {
      const ang = (o.tilt + this.jolt.x) * w.head * Math.PI / 180;
      const nx = r.neck[0], ny = r.neck[1] - o.breath + this.hop.y;
      const dx = qx - nx, dy = qy - ny, cs = Math.cos(ang), sn = Math.sin(ang);
      qx = nx + dx * cs - dy * sn; qy = ny + dx * sn + dy * cs;
    }
    qx += o.hairX * w.hair; qy += Math.abs(o.hairX) * 0.15 * w.hair;
    qx += o.clothX * w.cloth; qy += Math.abs(o.clothX) * 0.1 * w.cloth;
    qx += o.hipX * w.hip;
    if (o.lean) {
      const la = o.lean * Math.PI / 180, dx = qx - r.pivot[0], dy = qy - r.pivot[1], cs = Math.cos(la), sn = Math.sin(la);
      qx = r.pivot[0] + dx * cs - dy * sn; qy = r.pivot[1] + dx * sn + dy * cs;
    }
    return [qx, qy];
  }

  update(dt) {
    const t = (this.t += dt), amp = reduced() ? 0.45 : 1, sd = this.seed;
    const breath = (1 - Math.cos(t * 2 * Math.PI / 4.4)) * 0.5;
    this.hop.v += (-this.hop.y * 60 - this.hop.v * 7) * dt; this.hop.y += this.hop.v * dt;
    this.jolt.v += (-this.jolt.x * 50 - this.jolt.v * 6.5) * dt; this.jolt.x += this.jolt.v * dt;
    const talk = performance.now() < this.talkUntil ? 1 : 0;
    const o = {
      breath: breath * 3.6 * amp,
      tilt: (0.8 * Math.sin(t * 0.52 + sd) + 0.3 * Math.sin(t * 1.21) + talk * 0.7 * Math.sin(t * 7.3)) * amp,
      hairX: (7 * Math.sin(t * 0.74 + sd) + 2.8 * Math.sin(t * 1.73 + 1)) * amp,
      clothX: (3 * Math.sin(t * 0.9 + 2) + 1.2 * Math.sin(t * 2.1)) * amp,
      hipX: 2.2 * Math.sin(t * 0.33 + sd) * amp,
      lean: 0.25 * Math.sin(t * 0.41 + sd) * amp,
      bustX: 0, bustY: 0,
    };
    const bd = this.def.bust;
    if (bd) {
      const B = this.bs, a = bd.amt == null ? 1 : bd.amt;
      const dv = this.hop.v - this.prevHopV; this.prevHopV = this.hop.v;
      B.vy -= dv * 1.85; B.vx += this.jolt.v * 0.04;
      const anchorY = -o.breath * 0.5;
      B.vx += (-B.x * 70 - B.vx * 4.6) * dt; B.vy += (-(B.y - anchorY) * 58 - B.vy * 3.6) * dt;
      B.x += B.vx * dt; B.y += B.vy * dt;
      B.x = Math.max(-7, Math.min(7, B.x)); B.y = Math.max(-14, Math.min(14, B.y));
      o.bustX = B.x * a * amp; o.bustY = B.y * a * amp;
    }
    const R = this.rest, Q = this.pos;
    for (let i = 0; i < this.vcount; i++) {
      const q = this.deform(R[i * 2], R[i * 2 + 1], this.w[i], o);
      Q[i * 2] = q[0]; Q[i * 2 + 1] = q[1];
    }
  }

  initGL(canvas) {
    const opt = { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', opt);
    const v2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', opt);
    if (!gl) return false;
    this.gl = gl;
    const vs = 'attribute vec2 p;attribute vec2 u;uniform vec2 s;uniform vec2 o;varying vec2 vu;void main(){vu=u;gl_Position=vec4(p*s+o,0.,1.);}';
    const fs = 'precision mediump float;varying vec2 vu;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,vu);}';
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    this.loc = { p: gl.getAttribLocation(pr, 'p'), u: gl.getAttribLocation(pr, 'u'), s: gl.getUniformLocation(pr, 's'), o: gl.getUniformLocation(pr, 'o') };
    if (this.tris instanceof Uint32Array && !v2 && !gl.getExtension('OES_element_index_uint')) return false;
    this.bPos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferData(gl.ARRAY_BUFFER, this.rest, gl.DYNAMIC_DRAW);
    this.bUv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv); gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
    this.bIdx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.tris, gl.STATIC_DRAW);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (v2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  /* 舞台のどこに映すか：panel＝頭〜腰の下（ホームの板）／normal＝頭〜ひざ／up＝頭〜すそ／full＝足もとまで */
  layout() {
    const st = this.stage.getBoundingClientRect();
    if (!st.width || !st.height) return;
    const r = this.rig, v = this.view;
    const y0 = r.headTop[1] - 20;
    const y1 = v === 'panel' ? r.waistY + 300 : v === 'up' ? r.hemY + 30 : v === 'full' ? r.pivot[1] + 14 : r.kneeY + 60;
    const s = Math.max(60, st.height - this.padT - this.padB) / (y1 - y0);
    this.frameTo = { s, ox: st.width / 2 - (r.centerX ?? r.pivot[0]) * s, oy: this.padT - y0 * s };
    if (!this.frame) this.frame = { ...this.frameTo };
    // 止めた絵（img.still）も同じ大きさ・位置に（動き出す前・省電力・WebGL が使えないときも、映り方がそろう）
    const still = this.stage.querySelector('img.still');
    if (still) Object.assign(still.style, { left: this.frameTo.ox + 'px', top: this.frameTo.oy + 'px', width: RIG_SIZE[0] * s + 'px', height: 'auto', translate: 'none' });
  }

  draw(dt) {
    const gl = this.gl, cv = this.canvas;
    const dpr = Math.min(this.dprMax, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (!cw || !ch) return;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; this.layout(); }
    if (!this.frameTo) return;
    const F = this.frame, T = this.frameTo, q = 1 - Math.exp(-dt * 6);
    F.s += (T.s - F.s) * q; F.ox += (T.ox - F.ox) * q; F.oy += (T.oy - F.oy) * q;
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.loc.s, (2 * F.s) / W, (-2 * F.s) / H);
    gl.uniform2f(this.loc.o, (2 * F.ox) / W - 1, 1 - (2 * F.oy) / H);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos);
    gl.enableVertexAttribArray(this.loc.p); gl.vertexAttribPointer(this.loc.p, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv);
    gl.enableVertexAttribArray(this.loc.u); gl.vertexAttribPointer(this.loc.u, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.drawElements(gl.TRIANGLES, this.tris.length, this.tris instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
  }

  /** 押した所がキャラの上か（画面の座標） */
  hitAt(clientX, clientY) {
    const b = this.stage.getBoundingClientRect(), F = this.frame;
    if (!F || !this.hitMap) return false;
    const i = Math.floor((clientX - b.left - F.ox) / F.s / 16), j = Math.floor((clientY - b.top - F.oy) / F.s / 16);
    return i >= 0 && j >= 0 && i < this.hitW && j < this.hitH && !!this.hitMap[j * this.hitW + i];
  }

  /** 押したとき：小さくはずんで、話しているあいだ小さくうなずく */
  poke(talkMs = 1800) {
    this.hop.v -= 95; this.jolt.v += (Math.random() < 0.5 ? -1 : 1) * 26;
    this.talkUntil = performance.now() + talkMs;
  }

  canRun() { return !this.dead && this.on && this.visible && !document.hidden && power.idleMs() < 60000; }

  async start() {
    if (this.dead || this.on || !this.def || !power.profile().lobbyMotion) return false;
    try {
      if (!this.px) {
        const img = await loadImg(chara.art(this.id, 'full-1024'));
        if (this.dead) return false;
        const IW = img.naturalWidth, IH = img.naturalHeight;
        const c = document.createElement('canvas'); c.width = IW; c.height = IH;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
        this.img = img; this.IW = IW; this.IH = IH; this.k = IW / RIG_SIZE[0];
        this.px = x.getImageData(0, 0, IW, IH).data;
        this.buildMesh();
      }
      const cv = document.createElement('canvas');
      cv.className = 'lv-cv';
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.stop(); });
      this.stage.appendChild(cv);
      this.canvas = cv;
      if (!this.initGL(cv)) { this.stop(); return false; }
      this.on = true;
      this.layout();
      this.stage.classList.add('lv-on');
      this.loop();
      return true;
    } catch (e) {
      console.warn('live: 動かせませんでした', e);
      this.stop();
      return false;
    }
  }

  loop() {
    let last = performance.now(), acc = 0;
    const tick = (now) => {
      if (this.dead || !this.on) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!this.canRun()) { this.sleepT = setTimeout(() => { last = performance.now(); this.raf = requestAnimationFrame(tick); }, 500); return; }
      acc += dt;
      const minDt = 1 / Math.min(this.fpsCap, power.profile().fps || 60) - 0.004;
      if (acc >= minDt) { this.update(acc); this.draw(acc); acc = 0; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** 止めた絵にもどす（GL を捨てる・骨組みは残すので、また start できる） */
  stop() {
    this.on = false;
    cancelAnimationFrame(this.raf); clearTimeout(this.sleepT);
    try { this.gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* なし */ }
    this.gl = null;
    this.canvas?.remove(); this.canvas = null;
    this.stage.classList.remove('lv-on');
  }

  destroy() {
    this.stop();
    this.dead = true;
    this.io?.disconnect(); this.offPower?.(); this.ro?.disconnect();
  }
}

/** stage（position:relative の箱）の中でキャラを動かす。stage には止めた絵（img.still）を先に置いておく。
 *  opts：view（'panel'|'normal'|'up'|'full'）・padT・padB（上下のあき px）・grid（格子の目・既定 8）・fps（上限）・dpr（上限）
 *  返すもの：{ poke(ms), hitAt(x, y), setView(v), destroy() } */
export function mountLive(stage, id, opts = {}) {
  if (!RIGS[id]) return null;
  const L = new Live(stage, id, opts);
  L.io = new IntersectionObserver((es) => { L.visible = es.some((e) => e.isIntersecting); }, { threshold: 0.01 });
  L.io.observe(stage);
  L.ro = new ResizeObserver(() => L.layout());
  L.ro.observe(stage);
  // 動作モードが変わったら：省電力なら止めた絵に・もどったらまた動かす
  L.offPower = power.onChange(() => { if (!power.profile().lobbyMotion) L.stop(); else if (!L.on) L.start(); });
  L.layout();
  L.start();
  return {
    poke: (ms) => L.poke(ms),
    hitAt: (x, y) => L.hitAt(x, y),
    setView(v) { L.view = v; L.layout(); },
    destroy: () => L.destroy(),
  };
}
