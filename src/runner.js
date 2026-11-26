/* 叢林疾行 — 忍者必須死式橫向自動跑酷（獨立模組，純 Canvas2D、零外部資源）
   - 守護者自動向右奔跑：點畫面/跳躍鈕/空白鍵＝跳，空中再按一次＝二段跳；爪擊鈕/J 鍵＝衝刺爪擊（擊碎倒木、驅逐入侵種、打首領）
   - 坑洞、倒木、刺藤、樹樁、入侵種（福壽螺/斑腿樹蛙/多線南蜥/埃及聖䴉），守護之光收集；速度隨距離提升；每 500 m 首領登場
   - 美術：熱帶原始叢林 — 多層視差（遠景霧中樹影→中景樹幹垂藤→近景蕨類）、樹冠透下的暖色光束、低空飄霧（全部程式繪製並預先算成圖層）
   - 粒子/投射物皆為固定大小物件池（硬上限＋回收）
   - 最高紀錄存在新鍵 localStorage["shoutu_runner_best"]（不動 shoutu_unlocked）
   - 角色：優先用 assets/run/<key>_N.png 奔跑影格，沒有影格時用 window.__drawCreature（簽名不變）
   對外：window.__runner = { start(key), exit(), debug() } */
(() => {
  "use strict";
  const BEST_KEY = "shoutu_runner_best";
  const VH = 540;                       // 邏輯高度（虛擬座標），寬度依螢幕比例
  const GROUND = 438;                   // 地面高度（腳底 y）
  const PX_PER_M = 40;                  // 40 px = 1 公尺
  const BOSS_EVERY = 500;               // 每 500 m 首領登場
  const GRAV = 2700, JUMP_V = 960, JUMP2_V = 860;
  const MAX_PARTS = 160, MAX_WAVES = 6, MAX_SHOTS = 10;

  const $ = (id) => document.getElementById(id);
  const isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || "");
  const sfx = (n) => { try { if (window.__sfx) window.__sfx.play(n); } catch (e) {} };

  /* ---------- 圖片（皆為 repo 內本地資產，已在 sw.js ASSETS 中預快取） ---------- */
  const IMG = {};
  function img(src) { if (IMG[src]) return IMG[src]; const im = new Image(); im.onerror = () => {}; im.src = src; IMG[src] = im; return im; }
  const ok = (im) => im && im.complete && im.naturalWidth > 0;
  const RUN_FRAMES = {};
  function runFrames(k) { if (RUN_FRAMES[k]) return RUN_FRAMES[k]; const a = []; for (let i = 0; i < 4; i++) a.push(img("assets/run/" + k + "_" + i + ".png")); RUN_FRAMES[k] = a; return a; }
  function frameOf(k, t, fps) { const a = runFrames(k).filter(ok); if (!a.length) return null; return a[Math.floor(t * (fps || 10)) % a.length]; }

  /* ---------- 亂數 ---------- */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let rnd = Math.random;
  const R = (a, b) => a + rnd() * (b - a);

  /* ---------- DOM ---------- */
  let root, cv, ctx, resEl;
  function buildDom() {
    if (root) return;
    const st = document.createElement("style");
    st.textContent = `
#runner{position:fixed;inset:0;z-index:60;background:#0d1f14;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden}
#runner.hide{display:none}
#runner.rot{inset:auto;top:50%;left:50%;width:100vh;height:100vw;transform:translate(-50%,-50%) rotate(90deg);transform-origin:center}
#runner canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#runner .rbtn{position:absolute;bottom:max(16px,env(safe-area-inset-bottom));width:min(23vh,128px);height:min(23vh,128px);border-radius:50%;border:3px solid rgba(255,255,255,.55);
  color:#fff;font-weight:900;font-size:clamp(18px,3.6vh,26px);line-height:1.1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  box-shadow:0 6px 0 rgba(0,0,0,.35),inset 0 0 18px rgba(255,255,255,.18);text-shadow:0 2px 4px rgba(0,0,0,.6);touch-action:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
#runner .rbtn i{font-style:normal;font-size:1.5em}
#runner .rbtn:active,#runner .rbtn.on{transform:translateY(3px) scale(.96)}
#rJump{left:max(18px,env(safe-area-inset-left));background:radial-gradient(circle at 40% 35%,rgba(129,199,132,.92),rgba(46,125,50,.88))}
#rAtk{right:max(18px,env(safe-area-inset-right));background:radial-gradient(circle at 40% 35%,rgba(255,183,77,.95),rgba(216,67,21,.9))}
#rAtk.cd{filter:grayscale(.6) brightness(.8)}
#rExit{position:absolute;top:max(10px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));width:46px;height:46px;border-radius:12px;border:2px solid rgba(255,255,255,.4);
  background:rgba(0,0,0,.45);color:#fff;font-size:22px;font-weight:900;cursor:pointer;touch-action:none}
#rHint{position:absolute;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);color:#fff;font-weight:800;font-size:clamp(14px,2.8vh,19px);
  background:rgba(0,0,0,.45);padding:8px 16px;border-radius:20px;pointer-events:none;white-space:nowrap;transition:opacity .6s}
#rResult{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(4,12,7,.86);backdrop-filter:blur(3px);z-index:3}
#rResult.hide{display:none}
#rResult .rcard{display:block;background:linear-gradient(180deg,rgba(24,48,30,.97),rgba(10,24,15,.97));border:2px solid rgba(165,214,167,.45);border-radius:20px;padding:22px 30px;min-width:min(440px,86%);
  text-align:center;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.6)}
#rResult h1{font-size:clamp(26px,5.4vh,38px);color:#ffd54f;margin:0 0 4px;text-shadow:0 3px 12px rgba(255,213,79,.35)}
#rResult .sub{color:#c8e6c9;font-size:clamp(14px,2.8vh,18px);margin-bottom:12px}
#rResult .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:6px 0 14px;font-size:clamp(15px,3vh,20px);text-align:left}
#rResult .grid b{float:right;color:#fff59d}
#rResult .best{font-size:clamp(15px,3vh,20px);color:#80cbc4;font-weight:800;margin-bottom:14px}
#rResult .row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
#rResult button{border:none;border-radius:24px;padding:12px 26px;font-size:clamp(16px,3.2vh,21px);font-weight:900;color:#fff;cursor:pointer;background:#43a047;box-shadow:0 4px 0 #2e7d32}
#rResult button.sec{background:#546e7a;box-shadow:0 4px 0 #37474f}`;
    document.head.appendChild(st);
    root = document.createElement("div"); root.id = "runner"; root.className = "hide";
    root.innerHTML = `<canvas id="rCv"></canvas>
<button id="rJump" class="rbtn" aria-label="跳躍"><i>⤴</i>跳躍</button>
<button id="rAtk" class="rbtn" aria-label="爪擊"><i>⚔</i>爪擊</button>
<button id="rExit" aria-label="離開">✕</button>
<div id="rHint">點畫面或「跳躍」跳，空中再點＝二段跳｜「爪擊」擊碎倒木與入侵種</div>
<div id="rResult" class="hide"><div class="rcard">
  <h1 id="rResT">叢林疾行結束</h1><div class="sub" id="rResS"></div>
  <div class="grid"><div>🏃 距離<b id="rResD">0 m</b></div><div>✨ 守護之光<b id="rResO">0</b></div>
  <div>🐌 驅逐入侵種<b id="rResK">0</b></div><div>👑 擊退首領<b id="rResB">0</b></div></div>
  <div class="best" id="rResBest"></div>
  <div class="row"><button id="rRetry">🔁 再跑一次</button><button id="rMenu" class="sec">↩ 返回選單</button></div>
</div></div>`;
    document.body.appendChild(root);
    cv = $("rCv"); ctx = cv.getContext("2d"); resEl = $("rResult");
    const tap = (id, fn) => { const e = $(id); if (e) e.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); fn(); }, { passive: false }); };
    tap("rJump", () => input.jump = true);
    tap("rAtk", () => input.atk = true);
    tap("rExit", () => exit());
    tap("rRetry", () => begin());
    tap("rMenu", () => exit());
    cv.addEventListener("pointerdown", (e) => { e.preventDefault(); if (state === "run" || state === "count") input.jump = true; }, { passive: false });
    window.addEventListener("keydown", (e) => {
      if (!active) return;
      const k = e.key;
      if (k === " " || k === "ArrowUp" || k === "w" || k === "W") { input.jump = true; e.preventDefault(); }
      else if (k === "j" || k === "J" || k === "k" || k === "K" || k === "x" || k === "X" || k === "Shift" || k === "Enter") { if (state === "over" && k === "Enter") begin(); else input.atk = true; e.preventDefault(); }
      else if (k === "Escape") exit();
    });
    window.addEventListener("resize", () => { if (active) resize(); });
    window.addEventListener("orientationchange", () => setTimeout(() => { if (active) resize(); }, 80));
  }

  /* ---------- 尺寸 ---------- */
  let W = 960, S = 1, dpr = 1, VW = 960, rot = false;
  function resize() {
    const iw = window.innerWidth, ih = window.innerHeight;
    rot = isMobileDevice() && ih > iw; root.classList.toggle("rot", rot);
    const w = rot ? ih : iw, h = rot ? iw : ih;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    S = cv.height / VH; VW = Math.max(720, Math.min(1400, cv.width / S)); W = VW;
    const need = Math.round(VW);
    if (!layers || layers.w !== need || layers.s !== S) buildLayers(need);
  }

  /* =====================================================================
     美術：預先算好的視差圖層（熱帶原始叢林）
     ===================================================================== */
  let layers = null;
  function mk(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * S)); c.height = Math.max(1, Math.round(h * S)); const g = c.getContext("2d"); g.scale(S, S); return [c, g]; }
  function wrapDraw(tw, x, fn) { fn(x); if (x < 160) fn(x + tw); if (x > tw - 160) fn(x - tw); }

  // 蕨類羽葉：沿彎曲葉軸，兩側交錯小羽片，尖端漸細
  function frond(g, x, y, len, ang, curl, col, col2, wid) {
    const steps = 18; let px = x, py = y, a = ang;
    g.lineCap = "round";
    for (let i = 0; i < steps; i++) {
      const t = i / steps, seg = len / steps; a += curl / steps;
      const nx = px + Math.cos(a) * seg, ny = py + Math.sin(a) * seg;
      const lw = (wid || 1) * len * 0.2 * (1 - t * 0.85);
      g.strokeStyle = col2; g.lineWidth = Math.max(0.8, len * 0.012); g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      g.fillStyle = (i % 3 === 0) ? col2 : col;
      for (const sd of [-1, 1]) {
        const pa = a + sd * (1.15 - t * 0.3);
        g.beginPath(); g.ellipse(nx + Math.cos(pa) * lw * 0.5, ny + Math.sin(pa) * lw * 0.5, lw * 0.55, Math.max(0.8, lw * 0.16), pa, 0, 7); g.fill();
      }
      px = nx; py = ny;
    }
  }
  function fernClump(g, x, y, size, cols, light) {
    const n = 7 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, sp = (i / n);
      const ang = -Math.PI / 2 + side * (0.25 + sp * 1.15) + R(-0.15, 0.15);
      const c = cols[Math.floor(rnd() * cols.length)];
      frond(g, x + R(-6, 6), y, size * R(0.65, 1.05), ang, side * R(0.7, 1.3), c, light || c, R(0.9, 1.2));
    }
  }
  // 棕櫚/樹蕨剪影：細長樹幹＋頂端放射羽葉
  function treeFern(g, x, y, h, col, col2) {
    g.strokeStyle = col2; g.lineWidth = h * 0.035; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + h * 0.06, y - h * 0.5, x + R(-10, 10), y - h); g.stroke();
    const tx = x, ty = y - h;
    for (let i = 0; i < 11; i++) { const a = -Math.PI / 2 + (i - 5) * 0.33 + R(-0.1, 0.1); frond(g, tx, ty, h * R(0.35, 0.5), a, (i < 5 ? -1 : 1) * 1.2, col, col2, 0.8); }
  }
  // 寫實樹幹：基部板根、縱向樹皮紋、苔蘚、邊緣受光
  function trunk(g, x, w, top, bot, base, dark, moss, rimCol) {
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, dark); gr.addColorStop(0.35, base); gr.addColorStop(0.7, base); gr.addColorStop(1, dark);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - w / 2, top); g.lineTo(x + w / 2, top);
    g.bezierCurveTo(x + w * 0.5, bot - 60, x + w * 0.9, bot - 18, x + w * 1.5, bot);
    g.lineTo(x - w * 1.5, bot); g.bezierCurveTo(x - w * 0.9, bot - 18, x - w * 0.5, bot - 60, x - w / 2, top); g.fill();
    g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 1.2;
    for (let i = 0; i < w / 4; i++) { const bx = x - w / 2 + R(2, w - 2); g.beginPath(); g.moveTo(bx, top); let yy = top; let xx = bx; while (yy < bot - 20) { yy += R(20, 60); xx += R(-1.5, 1.5); g.lineTo(xx, yy); } g.stroke(); }
    // 苔蘚斑塊
    g.fillStyle = moss;
    for (let i = 0; i < w / 6; i++) { g.globalAlpha = R(0.25, 0.6); g.beginPath(); g.ellipse(x + R(-w / 2, w / 2), R(top, bot - 10), R(3, w * 0.22), R(6, 22), 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // 左側受光邊（光束方向）
    if (rimCol) { g.fillStyle = rimCol; g.globalAlpha = 0.35; g.fillRect(x - w / 2, top, Math.max(1.5, w * 0.08), bot - top - 30); g.globalAlpha = 1; }
  }
  function vine(g, x, y0, len, col, leaf) {
    g.strokeStyle = col; g.lineWidth = R(1.2, 2.6); g.beginPath(); g.moveTo(x, y0);
    const sw = R(-24, 24); g.bezierCurveTo(x + sw, y0 + len * 0.3, x - sw, y0 + len * 0.7, x + sw * 0.3, y0 + len); g.stroke();
    g.fillStyle = leaf;
    for (let t = 0.1; t < 1; t += R(0.06, 0.12)) { const lx = x + sw * 0.3 * t + Math.sin(t * 6) * sw * 0.4, ly = y0 + len * t; g.beginPath(); g.ellipse(lx + R(-4, 4), ly, R(3, 6), R(1.6, 3), R(-1, 1), 0, 7); g.fill(); }
  }
  function canopyBlob(g, x, y, r, col) { g.fillStyle = col; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + R(-r, r), y + R(-r * 0.5, r * 0.5), r * R(0.35, 0.7), 0, 7); g.fill(); } }

  function buildLayers(tw) {
    rnd = mulberry(20261126);
    const L = { w: tw, s: S };
    // 0) 天空/遠方霧光
    { const [c, g] = mk(tw, VH); const gr = g.createLinearGradient(0, 0, 0, VH);
      gr.addColorStop(0, "#1d3a26"); gr.addColorStop(0.25, "#6f9a78"); gr.addColorStop(0.5, "#b9d2b0"); gr.addColorStop(0.75, "#7fa27e"); gr.addColorStop(1, "#2c4a32");
      g.fillStyle = gr; g.fillRect(0, 0, tw, VH);
      const rg = g.createRadialGradient(tw * 0.32, VH * 0.36, 10, tw * 0.32, VH * 0.36, tw * 0.55); rg.addColorStop(0, "rgba(255,244,205,.55)"); rg.addColorStop(1, "rgba(255,244,205,0)");
      g.fillStyle = rg; g.fillRect(0, 0, tw, VH); L.sky = c; }
    // 1) 遠景：霧中樹影（淡藍綠）
    { const [c, g] = mk(tw, VH);
      for (let i = 0; i < 26; i++) { const x = R(0, tw), w = R(6, 16); wrapDraw(tw, x, (xx) => { g.fillStyle = "rgba(78,112,92,.55)"; g.fillRect(xx - w / 2, 40, w, VH); canopyBlob(g, xx, R(40, 120), R(40, 80), "rgba(70,104,84,.5)"); }); }
      for (let i = 0; i < 9; i++) { const x = R(0, tw); wrapDraw(tw, x, (xx) => treeFern(g, xx, 400, R(160, 230), "rgba(74,108,86,.6)", "rgba(66,96,78,.6)")); }
      const mg = g.createLinearGradient(0, 200, 0, VH); mg.addColorStop(0, "rgba(200,220,200,0)"); mg.addColorStop(0.6, "rgba(205,224,204,.55)"); mg.addColorStop(1, "rgba(190,210,190,.7)");
      g.fillStyle = mg; g.fillRect(0, 200, tw, VH); L.far = c; }
    // 2) 中遠景：樹幹與樹蕨，半透霧
    { const [c, g] = mk(tw, VH);
      for (let i = 0; i < 12; i++) { const x = R(0, tw), w = R(14, 30); wrapDraw(tw, x, (xx) => trunk(g, xx, w, -10, 440, "#46604c", "#2f4434", "#5d7d4f", "#d8e7b8")); }
      for (let i = 0; i < 8; i++) { const x = R(0, tw); wrapDraw(tw, x, (xx) => treeFern(g, xx, 445, R(150, 210), "#3f6544", "#2e4a33")); }
      for (let i = 0; i < 16; i++) { const x = R(0, tw); wrapDraw(tw, x, (xx) => fernClump(g, xx, 446, R(40, 70), ["#4a7350", "#3f6646", "#56825a"])); }
      const mg = g.createLinearGradient(0, 250, 0, 460); mg.addColorStop(0, "rgba(170,200,170,0)"); mg.addColorStop(1, "rgba(170,200,170,.45)"); g.fillStyle = mg; g.fillRect(0, 250, tw, 220);
      L.mid = c; }
    // 3) 近景：粗大樹幹、板根、垂藤
    { const tw3 = Math.round(tw * 1.5); const [c, g] = mk(tw3, VH);
      for (let i = 0; i < 6; i++) { const x = (i + R(0.1, 0.9)) * tw3 / 6, w = R(34, 62); wrapDraw(tw3, x, (xx) => {
        trunk(g, xx, w, -10, 452, "#3b3322", "#1d1a10", "#4f6b2e", "#ffe7a8");
        for (let v = 0; v < 3; v++) vine(g, xx + R(-w, w), R(-5, 40), R(150, 330), "#2f3f1e", "#4d7a32"); }); }
      for (let i = 0; i < 14; i++) { const x = R(0, tw3); wrapDraw(tw3, x, (xx) => vine(g, xx, -5, R(120, 290), "#33442a", "#5b8a3c")); }
      L.near = c; L.nearW = tw3; }
    // 4) 樹冠頂（暗綠葉叢，壓住畫面上緣＝密林感）
    { const [c, g] = mk(tw, 170);
      for (let i = 0; i < 60; i++) { const x = R(0, tw), y = R(-30, 60); wrapDraw(tw, x, (xx) => canopyBlob(g, xx, y, R(26, 60), ["#0f2414", "#163019", "#1d3a1f", "#24461f"][i % 4])); }
      for (let i = 0; i < 40; i++) { const x = R(0, tw); wrapDraw(tw, x, (xx) => { g.fillStyle = "#2e5a26"; g.beginPath(); g.ellipse(xx, R(40, 110), R(8, 18), R(3, 6), R(-1, 1), 0, 7); g.fill(); }); }
      L.canopy = c; }
    // 5) 前景蕨類（畫面最下緣，比玩家還前面，視差 1.3）
    { const tw5 = Math.round(tw * 1.3); const [c, g] = mk(tw5, 140);
      for (let i = 0; i < 18; i++) { const x = R(0, tw5); wrapDraw(tw5, x, (xx) => fernClump(g, xx, 150, R(55, 95), ["#1f3d1e", "#244a22", "#2c5527", "#1a331a"], "#152b15")); }
      L.fore = c; L.foreW = tw5; }
    // 6) 地面材質：腐植土、根系、落葉、苔面
    { const gw = 512, [c, g] = mk(gw, 110);
      const gr = g.createLinearGradient(0, 0, 0, 110); gr.addColorStop(0, "#3a2d1b"); gr.addColorStop(0.4, "#2a2013"); gr.addColorStop(1, "#140f09"); g.fillStyle = gr; g.fillRect(0, 0, gw, 110);
      for (let i = 0; i < 260; i++) { g.fillStyle = ["#4a3a22", "#2f2414", "#5a4428", "#1d160c"][i % 4]; g.globalAlpha = R(0.3, 0.8); const x = R(0, gw), y = R(8, 110); g.beginPath(); g.ellipse(x, y, R(1, 5), R(0.8, 3), R(0, 3), 0, 7); g.fill(); }
      g.globalAlpha = 1;
      for (let i = 0; i < 9; i++) { g.strokeStyle = "rgba(92,70,40,.8)"; g.lineWidth = R(2, 5); g.beginPath(); let x = R(0, gw), y = R(10, 40); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += R(10, 40); y += R(-4, 12); g.lineTo(x, y); } g.stroke(); }
      // 落葉
      for (let i = 0; i < 40; i++) { g.fillStyle = ["#7a5a26", "#5c6b2a", "#8a4f1e", "#4b5d26"][i % 4]; const x = R(0, gw); g.beginPath(); g.ellipse(x, R(4, 18), R(4, 8), R(2, 3.5), R(-0.6, 0.6), 0, 7); g.fill(); }
      // 苔面草緣
      g.fillStyle = "#3d6b2a"; g.fillRect(0, 0, gw, 5);
      for (let x = 0; x < gw; x += 3) { g.strokeStyle = ["#4f8a33", "#3c6e27", "#6aa443"][(x / 3) % 3 | 0]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, 6); g.lineTo(x + R(-3, 3), R(-9, 0)); g.stroke(); }
      L.ground = c; L.groundW = gw; }
    // 7) 霧團（柔邊）
    { const [c, g] = mk(420, 140); const rg = g.createRadialGradient(210, 70, 5, 210, 70, 200);
      rg.addColorStop(0, "rgba(225,238,222,.55)"); rg.addColorStop(1, "rgba(225,238,222,0)"); g.save(); g.scale(1, 0.35); g.fillStyle = rg; g.fillRect(0, 0, 420, 400); g.restore(); L.mist = c; }
    layers = L; rnd = Math.random;
  }

  /* =====================================================================
     遊戲狀態
     ===================================================================== */
  let active = false, state = "idle", raf = 0, lastT = 0, T = 0, countT = 0;
  const input = { jump: false, atk: false };
  let heroKey = "leopard";
  let P, camX, dist, speed, hearts, orbs, kills, bosses, score, nextBossM, banner, bannerT, shake, hitstop;
  let segs, ents, genX, boss, nextHeartM;
  const parts = []; for (let i = 0; i < MAX_PARTS; i++) parts.push({ on: false });
  const waves = []; for (let i = 0; i < MAX_WAVES; i++) waves.push({ on: false });
  const shots = []; for (let i = 0; i < MAX_SHOTS; i++) shots.push({ on: false });
  const motes = []; for (let i = 0; i < 40; i++) motes.push({ x: Math.random(), y: Math.random(), v: 0.2 + Math.random() * 0.6, p: Math.random() * 6 });

  function emit(x, y, vx, vy, life, size, col, grav, kind) {
    let p = null; for (let i = 0; i < MAX_PARTS; i++) if (!parts[i].on) { p = parts[i]; break; }
    if (!p) { p = parts[0]; let o = 1e9; for (const q of parts) if (q.t < o) { o = q.t; p = q; } }   // 池滿＝回收最舊的
    p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.l0 = life; p.size = size; p.col = col; p.g = grav || 0; p.kind = kind || 0; p.t = T; p.r = Math.random() * 6;
  }
  function burst(x, y, n, cols, spd, kind) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = spd * (0.3 + Math.random()); emit(x, y, Math.cos(a) * v, Math.sin(a) * v - spd * 0.3, 0.5 + Math.random() * 0.5, 3 + Math.random() * 4, cols[i % cols.length], 900, kind); } }

  function getBest() { try { return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }

  function begin() {
    resEl.classList.add("hide");
    P = { x: 0, y: GROUND, vy: 0, ground: true, jumps: 0, inv: 0, dashT: 0, atkCd: 0, scrX: 0, squash: 0, runT: 0 };
    camX = 0; dist = 0; speed = 300; hearts = 3; orbs = 0; kills = 0; bosses = 0; score = 0;
    nextBossM = BOSS_EVERY; nextHeartM = 300; banner = ""; bannerT = 0; shake = 0; hitstop = 0; boss = null;
    segs = [{ x0: -600, x1: 1400 }]; ents = []; genX = 1400;
    for (const p of parts) p.on = false; for (const w of waves) w.on = false; for (const s of shots) s.on = false;
    state = "count"; countT = 3.2; input.jump = input.atk = false;
    const h = $("rHint"); if (h) { h.style.opacity = "1"; setTimeout(() => { if (h) h.style.opacity = "0"; }, 6500); }
    sfx("beep");
  }

  /* ---------- 關卡生成（在鏡頭前方持續產生） ---------- */
  function generate() {
    const ahead = camX + VW * 2.2;
    while (genX < ahead) {
      const m = genX / PX_PER_M;
      const bossZone = boss || (m > nextBossM - 40 && m < nextBossM + 10);
      // 坑洞（首領戰期間不出坑）
      if (!bossZone && m > 25 && rnd() < 0.55) {
        const pw = Math.min(90 + rnd() * 70 + speed * 0.12, speed * 0.55);
        // 坑上方放一道守護之光弧線，引導跳躍
        for (let i = 0; i < 5; i++) { const t = i / 4; ents.push({ type: "orb", x: genX + pw * t, y: GROUND - 70 - Math.sin(t * Math.PI) * 90, r: 13 }); }
        genX += pw;
      }
      const len = bossZone ? 900 : Math.max(420, 1000 - speed * 0.6 + rnd() * 400);
      const x0 = genX, x1 = genX + len; segs.push({ x0, x1 });
      if (!bossZone && m > 12) {
        // 在平地上配置障礙/敵人/收集物
        let x = x0 + 160;
        while (x < x1 - 140) {
          const r = rnd();
          if (r < 0.2) ents.push({ type: "log", x, y: GROUND, w: 92, h: 44, hp: 1 });
          else if (r < 0.34) ents.push({ type: "thorn", x, y: GROUND, w: 70, h: 46 });
          else if (r < 0.42 && m > 120) ents.push({ type: "stump", x, y: GROUND, w: 62, h: 92 });
          else if (r < 0.56) ents.push({ type: "enemy", k: "snail", x, y: GROUND, w: 74, h: 44, vx: -30, hp: 1 });
          else if (r < 0.66 && m > 60) ents.push({ type: "enemy", k: "frog", x, y: GROUND, w: 58, h: 46, vx: -60, hp: 1, hop: rnd() * 2 });
          else if (r < 0.74 && m > 90) ents.push({ type: "enemy", k: "skink", x: x + 200, y: GROUND, w: 70, h: 30, vx: -170, hp: 1 });
          else if (r < 0.82 && m > 150) ents.push({ type: "enemy", k: "ibis", x: x + 120, y: GROUND - 150, baseY: GROUND - 150, w: 70, h: 56, vx: -120, hp: 1, fly: true, ph: rnd() * 6 });
          else { const n = 4 + (rnd() * 4 | 0), hy = rnd() < 0.5 ? 40 : 130; for (let i = 0; i < n; i++) ents.push({ type: "orb", x: x + i * 42, y: GROUND - hy, r: 13 }); }
          if (m > nextHeartM && hearts < 3 && rnd() < 0.3) { ents.push({ type: "heart", x: x + 60, y: GROUND - 150, r: 18 }); nextHeartM = m + 350; }
          x += Math.max(220, 520 - speed * 0.35) + rnd() * 260;
        }
      }
      genX = x1;
    }
    // 回收離開畫面的地面段與物件
    while (segs.length > 2 && segs[0].x1 < camX - 200) segs.shift();
    ents = ents.filter((e) => !e.dead && e.x > camX - 220);
  }
  function groundAt(x) { for (const s of segs) if (x >= s.x0 && x <= s.x1) return true; return false; }

  /* ---------- 首領 ---------- */
  const BOSSES = [
    { k: "python", name: "緬甸蟒", img: "assets/bosses/python.png", col: "#8bc34a" },
    { k: "canetoad", name: "海蟾蜍", img: "assets/bosses/canetoad.png", col: "#cddc39" },
    { k: "iguana", name: "綠鬣蜥", img: "assets/bosses/iguana.png", col: "#66bb6a" },
    { k: "ibis", name: "埃及聖䴉", img: "assets/bosses/ibis.png", col: "#eeeeee" },
  ];
  function spawnBoss() {
    const d = BOSSES[bosses % BOSSES.length];
    const hp = 8 + bosses * 4;
    boss = { ...d, hp, maxHp: hp, sx: VW + 200, bob: 0, atkT: 2.2, tele: 0, flash: 0, life: 32, dying: 0 };
    banner = "⚠ 首領登場：" + d.name; bannerT = 2.6; shake = 0.4; sfx("boss");
  }
  function bossShoot() {
    let s = null; for (const q of shots) if (!q.on) { s = q; break; } if (!s) return;
    const high = Math.random() < 0.38;
    s.on = true; s.x = camX + boss.sx - 80; s.y = high ? GROUND - 128 : GROUND - 22; s.vx = -(260 + bosses * 40); s.r = high ? 20 : 22; s.high = high; s.spin = 0;
  }

  /* ---------- 傷害/得分 ---------- */
  function hurt() {
    if (P.inv > 0 || state !== "run") return;
    hearts--; P.inv = 1.4; shake = 0.35; hitstop = 0.08; sfx("bighit");
    burst(P.x + 10, P.y - 40, 14, ["#ef5350", "#ffcdd2", "#fff"], 360);
    if (hearts <= 0) gameOver();
  }
  function killEnt(e, bonus) {
    e.dead = true; kills++; score += bonus || 50; sfx("hit");
    const cols = e.type === "log" ? ["#6d4c2b", "#a1774a", "#3e2a14"] : ["#c5e1a5", "#fff59d", "#a5d6a7"];
    burst(e.x, e.y - e.h / 2, 16, cols, 420);
  }
  function gameOver() {
    state = "over"; sfx("defeat");
    const m = Math.floor(dist / PX_PER_M);
    const total = m + orbs * 10 + kills * 50 + bosses * 500;
    const best = getBest(), isNew = total > best; if (isNew) setBest(total);
    // 回饋到大廳經濟（保育值/經驗），只在現有 API 存在時呼叫
    try { const eco = Math.max(1, Math.floor(total / 120)); if (window.__awardEco) window.__awardEco(eco); if (window.__awardXP) window.__awardXP(heroKey, Math.floor(m / 10)); } catch (e) {}
    setTimeout(() => {
      $("rResT").textContent = isNew ? "🏆 新紀錄！" : "叢林疾行結束";
      $("rResS").textContent = "總分 " + total + "　—　" + (m >= 1000 ? "你是真正的叢林守護者！" : m >= 400 ? "跑得好！再挑戰更遠的首領吧" : "熟悉一下節奏，再跑一次！");
      $("rResD").textContent = m + " m"; $("rResO").textContent = orbs; $("rResK").textContent = kills; $("rResB").textContent = bosses;
      $("rResBest").textContent = "最佳紀錄：" + Math.max(best, total) + " 分";
      resEl.classList.remove("hide");
    }, 650);
  }

  /* =====================================================================
     更新
     ===================================================================== */
  function update(dt) {
    T += dt;
    for (const mo of motes) { mo.y -= mo.v * dt * 0.03; mo.x -= dt * 0.01 * mo.v; if (mo.y < 0) mo.y = 1; if (mo.x < 0) mo.x = 1; }
    if (state === "count") {
      const before = Math.ceil(countT); countT -= dt; const after = Math.ceil(countT);
      if (after !== before && after > 0) sfx("beep");
      if (countT <= 0) { state = "run"; sfx("go"); }
      input.jump = input.atk = false; P.runT += dt * 0.4; return;
    }
    if (state !== "run" && state !== "over") return;
    if (hitstop > 0) { hitstop -= dt; return; }
    const m = dist / PX_PER_M;
    if (state === "run") {
      const target = Math.min(660, 300 + m * 0.32) * (boss ? 0.85 : 1);
      speed += (target - speed) * Math.min(1, dt * 1.5);
    } else speed *= Math.pow(0.05, dt);
    const dx = speed * dt; dist += dx; P.x += dx; P.runT += dt * (speed / 300);
    // 跳躍
    if (input.jump && state === "run") {
      if (P.ground) { P.vy = -JUMP_V; P.ground = false; P.jumps = 1; P.squash = 0.12; sfx("tap"); burst(P.x - 10, P.y, 6, ["#8d6e63", "#a1887f"], 160); }
      else if (P.jumps < 2) { P.vy = -JUMP2_V; P.jumps = 2; sfx("skill"); for (let i = 0; i < 10; i++) { const a = Math.PI * (0.2 + i / 12); emit(P.x, P.y - 10, Math.cos(a) * 200, Math.sin(a) * 120, 0.4, 4, "#e6ffd0", 0); } }
    }
    input.jump = false;
    // 爪擊衝刺
    P.atkCd -= dt; P.dashT -= dt;
    if (input.atk && state === "run" && P.atkCd <= 0) {
      P.atkCd = 0.42; P.dashT = 0.24; sfx("hit");
      let w = null; for (const q of waves) if (!q.on) { w = q; break; }
      if (w) { w.on = true; w.x = P.x + 40; w.y = P.y - 42; w.life = 0.55; w.hitBoss = false; }
      if (!P.ground && P.vy > 0) P.vy *= 0.4;   // 空中爪擊短暫滯空（忍者感）
    }
    input.atk = false;
    const ra = $("rAtk"); if (ra) ra.classList.toggle("cd", P.atkCd > 0);
    P.scrX += ((P.dashT > 0 ? 46 : 0) - P.scrX) * Math.min(1, dt * 14);
    // 重力與著地
    P.vy += GRAV * dt; const prevY = P.y; P.y += P.vy * dt;
    const onSeg = groundAt(P.x - 18) || groundAt(P.x + 18);
    if (P.y >= GROUND && prevY <= GROUND + 4 && onSeg) { if (!P.ground) { P.squash = 0.1; burst(P.x, GROUND, 5, ["#6d4c41", "#8d6e63"], 120); } P.y = GROUND; P.vy = 0; P.ground = true; P.jumps = 0; }
    else if (P.y < GROUND || !onSeg) P.ground = false;
    if (P.y > VH + 120 && state === "run") {   // 墜入坑洞：扣一顆心，守護之力把你送到下一段地面
      P.inv = 0; hurt();
      if (state === "run") { let nx = P.x; for (const s of segs) if (s.x0 > P.x - 400 && s.x1 > P.x) { nx = Math.max(P.x, s.x0 + 40); break; } const shift = nx - P.x; P.x = nx; dist += shift; P.y = GROUND - 220; P.vy = 0; P.jumps = 1; P.inv = 1.6; }
    }
    if (P.squash > 0) P.squash -= dt; if (P.inv > 0) P.inv -= dt;
    camX = P.x - VW * 0.26;
    // 奔跑揚塵
    if (P.ground && state === "run" && Math.random() < dt * 14) emit(P.x - 24, GROUND - 2, -speed * 0.2 - 40, -60 - Math.random() * 60, 0.45, 3 + Math.random() * 3, "rgba(120,96,70,.7)", 300);

    // 首領
    if (!boss && m >= nextBossM - 5 && state === "run") spawnBoss();
    if (boss) {
      boss.bob += dt; const targetX = VW * 0.8;
      if (boss.dying > 0) { boss.dying -= dt; boss.sx += dt * 260; if (boss.dying <= 0) { boss = null; nextBossM = Math.floor(m) + BOSS_EVERY; } }
      else {
        boss.sx += (targetX - boss.sx) * Math.min(1, dt * 1.6);
        boss.life -= dt; if (boss.flash > 0) boss.flash -= dt;
        if (boss.tele > 0) { boss.tele -= dt; if (boss.tele <= 0) bossShoot(); }
        else { boss.atkT -= dt; if (boss.atkT <= 0) { boss.tele = 0.45; boss.atkT = Math.max(0.9, 1.9 - bosses * 0.2) + Math.random() * 0.6; } }
        if (boss.life <= 0) { banner = boss.name + " 逃回林中…"; bannerT = 2; boss.dying = 1.2; boss.hp = -1; }
        // 衝刺貼身也能打到首領
        if (P.dashT > 0 && P.scrX > 30 && Math.abs((camX + boss.sx) - P.x) < 150 && !boss.dashHit) { boss.dashHit = true; damageBoss(2); }
        if (P.dashT <= 0) boss.dashHit = false;
      }
    }
    // 首領投射物
    for (const s of shots) { if (!s.on) continue; s.x += s.vx * dt; s.spin += dt * 10;
      if (s.x < camX - 100) { s.on = false; continue; }
      const px = P.x + P.scrX, py = P.y - 40;
      if (Math.abs(s.x - px) < s.r + 22 && Math.abs(s.y - py) < s.r + 34) { s.on = false; if (P.dashT > 0) { burst(s.x, s.y, 10, ["#cddc39", "#fff"], 300); score += 20; } else hurt(); } }
    // 爪擊波
    for (const w of waves) { if (!w.on) continue; w.x += (speed + 760) * dt; w.life -= dt; if (w.life <= 0) { w.on = false; continue; }
      for (const e of ents) { if (e.dead || (e.type !== "enemy" && e.type !== "log")) continue; const ey = e.y - e.h / 2; if (Math.abs(e.x - w.x) < e.w / 2 + 26 && Math.abs(ey - w.y) < e.h / 2 + 46) { killEnt(e, e.type === "log" ? 30 : 60); w.life = Math.min(w.life, 0.08); } }
      if (boss && boss.hp > 0 && !w.hitBoss && Math.abs((camX + boss.sx) - w.x) < 110) { w.hitBoss = true; w.on = false; damageBoss(1); }
    }
    // 物件
    const px = P.x + P.scrX, pTop = P.y - 70, pBot = P.y;
    for (const e of ents) {
      if (e.dead) continue;
      if (e.type === "enemy") {
        e.x += e.vx * dt;
        if (e.k === "frog") { e.hop += dt; const ph = e.hop % 1.6; e.y = GROUND - (ph < 0.6 ? Math.sin(ph / 0.6 * Math.PI) * 70 : 0); }
        if (e.fly) { e.ph += dt * 3; e.y = e.baseY + Math.sin(e.ph) * 26; }
      }
      if (e.type === "orb" || e.type === "heart") {
        if (Math.abs(e.x - (px + 12)) < e.r + 38 && e.y > pTop - e.r && e.y < pBot + e.r) {
          e.dead = true;
          if (e.type === "orb") { orbs++; score += 10; sfx("coin"); for (let i = 0; i < 5; i++) emit(e.x, e.y, (Math.random() - 0.5) * 160, -Math.random() * 160, 0.4, 3, "#fff59d", 200, 1); }
          else { hearts = Math.min(3, hearts + 1); sfx("pickup"); burst(e.x, e.y, 12, ["#ff8a80", "#fff"], 260); }
        }
        continue;
      }
      // 實體碰撞（AABB，略縮）
      const eL = e.x - e.w / 2 + 8, eR = e.x + e.w / 2 - 8, eT = e.y - e.h + 6, eB = e.y;
      const pL = px - 22, pR = px + 44 + (P.dashT > 0 ? 34 : 0);   // 奔跑影格頭在右側，判定框往前偏
      if (pR > eL && pL < eR && pBot > eT && pTop < eB) {
        if (e.type === "enemy" && P.vy > 120 && prevY <= eT + 16) {   // 踩頭
          killEnt(e, 80); P.vy = -JUMP_V * 0.72; P.jumps = 1; sfx("combo"); continue; }
        if (P.dashT > 0 && (e.type === "enemy" || e.type === "log")) { killEnt(e, e.type === "log" ? 30 : 60); continue; }
        hurt();
      }
    }
    // 粒子
    for (const p of parts) { if (!p.on) continue; p.life -= dt; if (p.life <= 0) { p.on = false; continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    if (bannerT > 0) bannerT -= dt; if (shake > 0) shake -= dt;
    generate();
  }
  function damageBoss(n) {
    if (!boss || boss.hp <= 0) return;
    boss.hp -= n; boss.flash = 0.15; hitstop = 0.05; score += 40 * n; sfx("bighit");
    burst(camX + boss.sx, GROUND - 110, 12, [boss.col, "#fff", "#ffd54f"], 380);
    if (boss.hp <= 0) { bosses++; score += 500; banner = "👑 擊退首領 " + boss.name + "！ +500"; bannerT = 2.4; boss.dying = 1.2; shake = 0.5; sfx("victory");
      for (const s of shots) s.on = false; burst(camX + boss.sx, GROUND - 120, 40, ["#ffd54f", "#fff", boss.col], 560); }
  }

  /* =====================================================================
     繪製
     ===================================================================== */
  function tile(c, tw, par, y, h) {
    if (!c) return; const off = ((camX * par) % tw + tw) % tw;
    const dw = c.width / S;
    for (let x = -off; x < VW; x += tw) ctx.drawImage(c, x, y, dw, h || c.height / S);
  }
  function drawRays() {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const base = ((i * 260 - camX * 0.18) % (VW + 400) + VW + 400) % (VW + 400) - 200;
      const sway = Math.sin(T * 0.35 + i * 1.7) * 18, a = 0.06 + 0.04 * Math.sin(T * 0.6 + i * 2.3);
      const top = base + sway, w0 = 26 + i * 7, w1 = 150 + i * 22;
      const g = ctx.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, "rgba(255,236,170," + (a * 2.4).toFixed(3) + ")"); g.addColorStop(0.6, "rgba(255,226,150," + (a * 1.2).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,226,150,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(top, 0); ctx.lineTo(top + w0, 0); ctx.lineTo(top + w0 + 230 + w1, GROUND + 10); ctx.lineTo(top + 230, GROUND + 10); ctx.fill();
    }
    ctx.restore();
  }
  function drawMist(yBase, par, alpha, n, spd) {
    if (!layers.mist) return; ctx.save(); ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) { const span = VW + 500; const x = ((i * 330 - camX * par - T * spd * (1 + i % 3 * 0.3)) % span + span) % span - 400; const y = yBase + Math.sin(T * 0.4 + i) * 8 + (i % 2) * 18;
      ctx.drawImage(layers.mist, x, y - 70, 520, 160); }
    ctx.restore();
  }
  function drawGround() {
    const pat = ctx.createPattern(layers.ground, "repeat");
    if (pat && pat.setTransform) pat.setTransform(new DOMMatrix().translateSelf(-((camX % layers.groundW) + layers.groundW) % layers.groundW, GROUND).scaleSelf(1 / S, 1 / S));
    // 坑洞：深不見底的暗谷（先鋪滿，地面段再蓋上去）
    const ab = ctx.createLinearGradient(0, GROUND - 30, 0, VH); ab.addColorStop(0, "rgba(10,22,14,.75)"); ab.addColorStop(0.35, "#07110a"); ab.addColorStop(1, "#020604");
    ctx.fillStyle = ab; ctx.fillRect(0, GROUND - 6, VW, VH - GROUND + 6);
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i], x0 = s.x0 - camX, x1 = s.x1 - camX; if (x1 < -20 || x0 > VW + 20) continue;
      const gapL = !(i > 0 && segs[i - 1].x1 >= s.x0 - 1), gapR = !(i < segs.length - 1 && segs[i + 1].x0 <= s.x1 + 1);
      ctx.fillStyle = pat || "#2a2013"; ctx.fillRect(x0, GROUND, x1 - x0 + (gapR ? 0 : 1), VH - GROUND);
      // 坑邊（只在真的有坑的那側）：陰影與垂根
      ctx.strokeStyle = "#5d4a2c"; ctx.lineWidth = 2;
      for (const [ex, has, dir] of [[x0 + 3, gapL, -1], [x1 - 3, gapR, 1]]) { if (!has) continue;
        ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(dir < 0 ? x0 : x1 - 10, GROUND, 10, VH - GROUND);
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(ex, GROUND + 10 + k * 14); ctx.quadraticCurveTo(ex + dir * 8, GROUND + 40 + k * 20, ex + (k - 1) * 3, GROUND + 70 + k * 12); ctx.stroke(); } }
    }
    // 坑洞深處霧氣
    const g = ctx.createLinearGradient(0, GROUND + 20, 0, VH); g.addColorStop(0, "rgba(8,16,10,0)"); g.addColorStop(1, "rgba(8,16,10,.6)");
    ctx.fillStyle = g; ctx.fillRect(0, GROUND + 20, VW, VH - GROUND);
  }
  function drawLog(x, y, w, h) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 2, w * 0.55, 7, 0, 0, 7); ctx.fill();
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, "#8a6a42"); g.addColorStop(0.45, "#5b4127"); g.addColorStop(1, "#2e2013");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = "rgba(30,18,8,.6)"; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 10, -h + 8 + i * 7); ctx.lineTo(w / 2 - 14, -h + 10 + i * 7 + (i % 2) * 3); ctx.stroke(); }
    ctx.fillStyle = "#4f7a2e"; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(-8, -h + 3, w * 0.3, 5, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "#b08a5a"; ctx.beginPath(); ctx.ellipse(w / 2 - 8, -h / 2, 9, h / 2 - 1, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#7a5a34"; ctx.lineWidth = 1.2; for (let r = 3; r < h / 2 - 2; r += 4) { ctx.beginPath(); ctx.ellipse(w / 2 - 8, -h / 2, r * 0.4, r, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
  }
  function drawThorn(x, y, w, h) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = "#3b4a1e"; ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + i * w / 4, 0); ctx.quadraticCurveTo(-w / 2 + i * w / 4 + 12, -h * 0.8, -w / 2 + i * w / 4 + (i % 2 ? 18 : -10), -h); ctx.stroke(); }
    ctx.fillStyle = "#e0d6a8";
    for (let i = 0; i < 22; i++) { const px = -w / 2 + (i * 37 % w), py = -(i * 23 % h) - 4, a = (i % 2 ? 1 : -1) * 0.9 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); ctx.lineTo(px + Math.cos(a + 1.6) * 2.5, py + Math.sin(a + 1.6) * 2.5); ctx.lineTo(px + Math.cos(a - 1.6) * 2.5, py + Math.sin(a - 1.6) * 2.5); ctx.fill(); }
    ctx.fillStyle = "#4a6b25"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(-w / 2 + i * w / 6, -h * 0.5 - (i % 3) * 10, 7, 3.5, i, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawStump(x, y, w, h) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, "#2a1f12"); g.addColorStop(0.4, "#5c4429"); g.addColorStop(1, "#22180d");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w / 2 - 12, 0); ctx.lineTo(-w / 2, -h); ctx.lineTo(w / 2, -h + 6); ctx.lineTo(w / 2 + 12, 0); ctx.fill();
    ctx.fillStyle = "#a07f52"; ctx.beginPath(); ctx.ellipse(0, -h + 3, w / 2, 8, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#6b5233"; for (let r = 3; r < w / 2; r += 5) { ctx.beginPath(); ctx.ellipse(0, -h + 3, r, r * 0.16, 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = "#4f7a2e"; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(-w / 4, -h * 0.45, 8, 18, 0.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawSprite(im, x, y, h, flip, alpha) {
    if (!ok(im)) return false; const w = h * im.naturalWidth / im.naturalHeight;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore(); return true;
  }
  function shadow(x, y, w) { ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.beginPath(); ctx.ellipse(x, y + 2, w, 6, 0, 0, 7); ctx.fill(); }
  function drawEnemy(e, x) {
    const H = { snail: 50, frog: 52, skink: 38, ibis: 78 }[e.k] || 50;
    if (!e.fly) shadow(x, GROUND, e.w * 0.45); else shadow(x, GROUND, 18);
    const im = frameOf(e.k, T + (e.x % 7), e.k === "snail" ? 5 : 11);
    if (!drawSprite(im, x, e.y + 2, H, true)) { ctx.fillStyle = "#8d6e63"; ctx.beginPath(); ctx.ellipse(x, e.y - H / 2, e.w / 2, H / 2, 0, 0, 7); ctx.fill(); }
  }
  function drawPlayer() {
    const x = P.x - camX + P.scrX, y = P.y;
    if (P.inv > 0 && Math.floor(P.inv * 14) % 2 === 0 && state === "run") return;
    const air = !P.ground;
    if (y <= GROUND + 2 && groundAt(P.x)) shadow(x, GROUND, 30 * Math.max(0.4, 1 - (GROUND - y) / 300));
    // 衝刺殘影
    if (P.dashT > 0) { const im0 = frameOf(heroKey, P.runT, 14); for (let k = 1; k <= 3; k++) { if (im0) drawSprite(im0, x - k * 22, y, 74, false, 0.22 / k); } }
    const sq = P.squash > 0 ? 1 - P.squash * 1.2 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 / sq, sq); if (air) ctx.rotate(P.vy < 0 ? -0.12 : 0.1);
    const im = air ? frameOf(heroKey, 0.25, 4) : frameOf(heroKey, P.runT, 14);
    if (!drawSprite(im, 0, 0, heroKey === "leopard" ? 66 : 80, false)) {
      // 沒有奔跑影格的守護者：用大廳的 drawCreature（簽名不變）
      try { if (window.__drawCreature) window.__drawCreature(ctx, heroKey, 0, -38, 34, { t: T, mood: "happy" }); } catch (e) {}
    }
    ctx.restore();
  }
  function drawBoss() {
    if (!boss) return; const x = boss.sx, y = GROUND + Math.sin(boss.bob * 2) * 6;
    shadow(x, GROUND, 90);
    if (boss.tele > 0) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 40); ctx.fillStyle = "rgba(255,82,82,.35)"; ctx.beginPath(); ctx.arc(x - 70, GROUND - 90, 70, 0, 7); ctx.fill(); ctx.restore(); }
    const im = img(boss.img);
    ctx.save(); if (boss.flash > 0) ctx.filter = "brightness(2.2)";
    if (!drawSprite(im, x, y + 18, 250, true)) { ctx.fillStyle = "#4e6b2a"; ctx.beginPath(); ctx.ellipse(x, y - 90, 100, 90, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawHUD() {
    const m = Math.floor(dist / PX_PER_M);
    const u = VH / Math.max(1, cv.height / dpr);            // 1 CSS px 等於多少虛擬單位（小螢幕上 DOM 按鈕相對較大）
    const padL = 44 * u + 22, padR = 74 * u + 8;             // 避開左上全螢幕鈕與右上 ✕
    ctx.save(); ctx.textBaseline = "middle";
    // 左上：生命（避開左上角全螢幕鈕）
    for (let i = 0; i < 3; i++) heart(padL + i * 40, 34, 15, i < hearts);
    // 中上：距離
    ctx.textAlign = "center"; ctx.font = "900 40px system-ui,'PingFang TC','Noto Sans TC',sans-serif";
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.strokeText(m + " m", VW / 2, 34); ctx.fillStyle = "#fff"; ctx.fillText(m + " m", VW / 2, 34);
    ctx.font = "800 17px system-ui,sans-serif"; const nb = boss ? "首領戰中！" : "下一個首領 " + Math.max(0, nextBossM - m) + " m";
    ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 4; ctx.strokeText(nb, VW / 2, 66); ctx.fillStyle = boss ? "#ff8a80" : "#c8e6c9"; ctx.fillText(nb, VW / 2, 66);
    // 右上：守護之光 + 分數（留位置給 ✕）
    ctx.textAlign = "right"; ctx.font = "900 24px system-ui,sans-serif";
    const live = m + orbs * 10 + kills * 50 + bosses * 500;
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.strokeText("✨ " + orbs, VW - padR, 28); ctx.fillStyle = "#fff59d"; ctx.fillText("✨ " + orbs, VW - padR, 28);
    ctx.strokeText("分數 " + live, VW - padR, 58); ctx.fillStyle = "#fff"; ctx.fillText("分數 " + live, VW - padR, 58);
    // 首領血條
    if (boss && boss.hp > 0) { const bw = Math.min(460, VW * 0.5), bx = VW / 2 - bw / 2, by = 88;
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.beginPath(); ctx.roundRect(bx - 4, by - 4, bw + 8, 26, 8); ctx.fill();
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, "#e53935"); g.addColorStop(1, "#ff8a65");
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 18, 6); ctx.fill();
      ctx.textAlign = "center"; ctx.font = "900 15px system-ui,sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText("👑 " + boss.name, VW / 2, by + 9); }
    // 橫幅
    if (bannerT > 0 && banner) { ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.textAlign = "center"; ctx.font = "900 34px system-ui,sans-serif";
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, VH * 0.3 - 30, VW, 60); ctx.fillStyle = "#ffd54f"; ctx.fillText(banner, VW / 2, VH * 0.3); ctx.globalAlpha = 1; }
    // 倒數
    if (state === "count") { const n = Math.ceil(countT); ctx.textAlign = "center"; ctx.font = "900 120px system-ui,sans-serif";
      ctx.lineWidth = 10; ctx.strokeStyle = "rgba(0,0,0,.5)"; const s = n > 0 ? String(n) : "出發！"; ctx.strokeText(s, VW / 2, VH * 0.42); ctx.fillStyle = "#fff"; ctx.fillText(s, VW / 2, VH * 0.42);
      ctx.font = "800 22px system-ui,sans-serif"; ctx.fillStyle = "#e8f5e9"; ctx.fillText("🏃 叢林疾行・穿越原始林，驅逐入侵種！", VW / 2, VH * 0.42 + 84); }
    ctx.restore();
  }
  function heart(x, y, r, full) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(0, r * 0.9);
    ctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.7, -r * 1.3, 0, -r * 0.45); ctx.bezierCurveTo(r * 0.7, -r * 1.3, r * 1.6, -r * 0.2, 0, r * 0.9);
    ctx.fillStyle = full ? "#ef5350" : "rgba(0,0,0,.45)"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.restore();
  }
  function render() {
    ctx.setTransform(S, 0, 0, S, 0, 0);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 12 * shake / 0.4, (Math.random() - 0.5) * 10 * shake / 0.4);
    const L = layers;
    ctx.drawImage(L.sky, 0, 0, VW, VH);
    tile(L.far, L.w, 0.12, 0, VH);
    drawMist(300, 0.2, 0.55, 5, 10);
    tile(L.mid, L.w, 0.35, 0, VH);
    drawRays();
    drawMist(390, 0.45, 0.5, 6, 18);
    tile(L.near, L.nearW, 0.62, 0, VH);
    // 林間浮塵（光束中的微粒）
    ctx.fillStyle = "rgba(255,245,200,.7)";
    for (const mo of motes) { const x = mo.x * VW, y = 80 + mo.y * 340; ctx.globalAlpha = 0.25 + 0.35 * Math.sin(T * 2 + mo.p); ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1;
    drawGround();
    // 物件
    for (const e of ents) { if (e.dead) continue; const x = e.x - camX; if (x < -120 || x > VW + 120) continue;
      if (e.type === "log") drawLog(x, e.y, e.w, e.h);
      else if (e.type === "thorn") drawThorn(x, e.y, e.w, e.h);
      else if (e.type === "stump") drawStump(x, e.y, e.w, e.h);
      else if (e.type === "enemy") drawEnemy(e, x);
      else if (e.type === "orb") { const y = e.y + Math.sin(T * 4 + e.x) * 3; const g = ctx.createRadialGradient(x, y, 1, x, y, e.r * 1.6); g.addColorStop(0, "rgba(255,255,230,1)"); g.addColorStop(0.35, "rgba(255,236,120,.95)"); g.addColorStop(1, "rgba(255,200,60,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, e.r * 1.6, 0, 7); ctx.fill(); }
      else if (e.type === "heart") heart(x, e.y + Math.sin(T * 3) * 5, 14, true);
    }
    drawBoss();
    for (const s of shots) { if (!s.on) continue; const x = s.x - camX; ctx.save(); ctx.translate(x, s.y); ctx.rotate(-s.spin);
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, s.r); g.addColorStop(0, "#f4ff81"); g.addColorStop(0.6, s.high ? "#7cb342" : "#9e9d24"); g.addColorStop(1, "rgba(51,105,30,.2)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s.r * 0.6, 0, 3); ctx.stroke(); ctx.restore(); }
    drawPlayer();
    // 爪擊波：三道弧形爪痕
    for (const w of waves) { if (!w.on) continue; const x = w.x - camX; ctx.save(); ctx.globalAlpha = Math.min(1, w.life * 3); ctx.strokeStyle = "#fff8e1"; ctx.shadowColor = "#ffcc80"; ctx.shadowBlur = 12; ctx.lineWidth = 5; ctx.lineCap = "round";
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(x - 20, w.y + k * 16, 34, -0.9, 0.9); ctx.stroke(); } ctx.restore(); }
    for (const p of parts) { if (!p.on) continue; const a = p.life / p.l0; ctx.globalAlpha = a; ctx.fillStyle = p.col; const x = p.x - camX;
      if (p.kind === 1) { ctx.beginPath(); ctx.arc(x, p.y, p.size * a + 1, 0, 7); ctx.fill(); } else ctx.fillRect(x - p.size / 2, p.y - p.size / 2, p.size, p.size); } ctx.globalAlpha = 1;
    // 前景：低霧＋蕨類＋樹冠
    drawMist(452, 0.9, 0.35, 5, 26);
    tile(L.fore, L.foreW, 1.3, VH - 120, 140);
    tile(L.canopy, L.w, 0.5, -10, 170);
    // 暗角
    const vg = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.35, VW / 2, VH * 0.55, VW * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,10,4,.55)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    drawHUD();
  }

  function loop(t) {
    if (!active) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (t - (lastT || t)) / 1000)); lastT = t;
    if (document.hidden) return;
    try { update(dt); render(); } catch (e) { console.warn("runner", e); }
  }

  function start(key) {
    buildDom();
    heroKey = key || (window.__featuredKey && window.__featuredKey()) || "leopard";
    runFrames(heroKey); ["snail", "frog", "skink", "ibis"].forEach(runFrames); BOSSES.forEach((b) => img(b.img));
    const mp = $("mpick"); if (mp) mp.classList.add("hide");
    root.classList.remove("hide"); active = true; resize(); begin();
    lastT = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function exit() {
    active = false; state = "idle"; cancelAnimationFrame(raf);
    if (root) root.classList.add("hide");
    const mp = $("mpick"); if (mp) mp.classList.remove("hide");
    try { if (window.__lobbyRefresh) window.__lobbyRefresh(); } catch (e) {}
  }
  window.__runner = { start, exit,
    debug: () => ({ state, dist: Math.floor(dist / PX_PER_M), speed: Math.round(speed || 0), hearts, orbs, kills, bosses, boss: boss ? { name: boss.name, hp: boss.hp } : null,
      parts: parts.filter((p) => p.on).length, ents: ents ? ents.length : 0, best: getBest() }),
    // QA 用：直接推進距離（無頭測試驗收首領/結算）
    _warp: (m) => { if (!P) return; const d = m * PX_PER_M; P.x += d; dist += d; camX = P.x - VW * 0.26; segs = [{ x0: P.x - 600, x1: P.x + 1400 }]; ents = []; genX = P.x + 1400; },
    _die: () => { if (state === "run") { hearts = 1; P.inv = 0; hurt(); } } };
})();
