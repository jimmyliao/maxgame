/* 棲地基地 — 經營/養成（全新性質玩法，非即時戰鬥）
   真實場景畫面（非棋盤格）：清除入侵種、種下「真實台灣特有種植物」，
   植物依真實時間成長、離線也會長大，回來收成保育值。
   4 種棲地類型可切換，各對應一種真實物種、且畫風彼此不同（睡蓮/圓冠喬木/針葉巨木/紅樹林）。
   模擬天氣／晝夜循環（不需外部 API）。獨立模組，不影響單機對戰／MOBA／好友連線。 */
(() => {
  "use strict";
  const N = 16;
  const SPROUT_S = 60, SAPLING_S = 300, MATURE_S = 900;   // 生長門檻（秒，基準值）
  const INVADE_S = 240;                                     // 空地超過 4 分鐘 → 入侵種
  const TRICKLE_S = 30, TRICKLE_CAP = 20;                   // 成熟後累積速度／上限
  const WEATHER_PERIOD_MS = 3*60*1000;

  const REGION_INFO = {
    paddy:   { label:"稻田",  plant:"台灣萍蓬草", shape:"lily",
               fact:"台灣特有水生植物，僅存於桃園、南投等少數埤塘濕地，是台灣原生睡蓮科植物中最稀有的一種。",
               sky:["#7fa8c9","#e8dfa8"], nightSky:["#1c2440","#33305a"], ground:["#8a9659","#5a6a39"] },
    hill:    { label:"淺山",  plant:"台灣欒樹", shape:"round",
               fact:"台灣特有種喬木，秋天開黃花、結紅色蒴果，是淺山生態系的重要指標樹種，也是許多昆蟲的蜜源植物。",
               sky:["#bcdcee","#eaf1d6"], nightSky:["#151d2e","#232e2a"], ground:["#6b7d3f","#45591f"] },
    stream:  { label:"溪流",  plant:"台灣杉", shape:"conifer",
               fact:"台灣特有種，是唯一以「台灣」命名的針葉巨木，生長在中海拔溪谷雲霧帶，為台灣森林的珍貴象徵。",
               sky:["#a9d6ec","#e3f1e6"], nightSky:["#131f2c","#1c2c30"], ground:["#5d7e3a","#3a5626"] },
    wetland: { label:"濕地",  plant:"水筆仔", shape:"mangrove",
               fact:"台灣原生紅樹林植物，胎生苗會直接在母株上發芽，是淡水河口濕地重要的護岸與棲地植物。",
               sky:["#f4b483","#9fb1c8"], nightSky:["#211a2c","#2d2436"], ground:["#6f7e88","#3a525c"] },
    alpine:  { label:"高山寒原", icon:"🏔", plant:"玉山圓柏", shape:"juniper", unlockLv:5,
               fact:"台灣特有種，生長於海拔3000公尺以上的高山稜線，常年強風吹成匍匐狀的「風衝矮林」，是台灣特有種高山山椒魚重要的棲息環境。",
               sky:["#c9d9ea","#f2ecdf"], nightSky:["#10182c","#232244"], ground:["#8b8a7c","#5c5b4e"] },
    estuary: { label:"濕地河口", icon:"🦩", plant:"欖李", shape:"heron", unlockLv:10,
               fact:"台灣原生紅樹林四大樹種之一，多生長在河口高鹽度泥灘，是黑面琵鷺等度冬水鳥重要的覓食與棲息濕地。",
               sky:["#f7c896","#a9c6d6"], nightSky:["#251c2a","#1e2c38"], ground:["#8a8562","#4f5a44"] },
  };

  const REGION_KEYS = Object.keys(REGION_INFO);                 // 全部 6 區（含未解鎖）：資料層一律備妥田地，UI 層再決定是否顯示分頁
  const BASE_REGIONS = ["paddy","hill","stream","wetland"];      // 恆常可見的 4 區
  const LOCKED_REGIONS = REGION_KEYS.filter(k=>!BASE_REGIONS.includes(k));
  // 生態走廊：把新棲地跟既有棲地「串」起來，串通後分頁才會出現、代表守護者真的走得過去
  const CORRIDORS = [
    { a:"hill", b:"alpine", cost:150, label:"淺山 ↔ 高山寒原", desc:"讓石虎能沿山稜遷移到高山寒原，串起石虎與台灣山椒魚的族群交流路徑。", reward:40 },
    { a:"wetland", b:"estuary", cost:220, label:"濕地 ↔ 濕地河口", desc:"串聯淡水濕地與河口紅樹林，讓候鳥與洄游魚苗的路徑重新暢通。", reward:60 },
  ];
  function corridorId(a,b){ return [a,b].sort().join("-"); }
  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  /* ---------- 資料 / 成長邏輯（純時間函數，離線正確、不需模擬 tick） =====
     每個地區各自獨立一塊 16 格田地，成長與收成互不干擾——要輪流照顧四個地區。 */
  function freshTiles(){ const t=now(); const tiles=[];
    for(let i=0;i<N;i++){ if(i%5===0) tiles.push({state:"invasive"}); else tiles.push({state:"unplanted", emptySince:t}); }
    return tiles; }
  function load(){ try{ const raw=localStorage.getItem("shoutu_habitat_v2"); if(raw){ const d=JSON.parse(raw);
      if(d && d.regions && REGION_KEYS.every(k=>Array.isArray(d.regions[k]) && d.regions[k].length===N)){ if(!d.current) d.current="paddy"; return d; } } }catch(e){}
    const regions={}; for(const k of REGION_KEYS) regions[k]=freshTiles();
    return { regions, current:"paddy" };
  }
  function save(d){ try{ localStorage.setItem("shoutu_habitat_v2", JSON.stringify(d)); }catch(e){} }
  let data = load();
  function curTiles(){ return data.regions[data.current]; }

  /* ---------- 保育等級（優先用 legacy.js 掛勾，沒有就從保育值粗估，做好容錯） ---------- */
  function conservationLevel(){
    if(typeof window.__conservationLevel==="function"){ try{ const v=window.__conservationLevel(); if(typeof v==="number" && !isNaN(v)) return Math.max(1,Math.floor(v)); }catch(e){} }
    try{ const v=parseInt(localStorage.getItem("shoutu_ecoearned"),10); if(!isNaN(v)) return Math.max(1,Math.floor(v/100)+1); }catch(e){}
    return 1;
  }
  function isRegionLocked(key){ const info=REGION_INFO[key]; return !!(info && info.unlockLv); }   // 「鎖」＝需要等級門檻的新棲地（跟走廊是否建成分開判斷）
  function levelUnlocked(key){ const info=REGION_INFO[key]; if(!info || !info.unlockLv) return true; return conservationLevel()>=info.unlockLv; }

  /* ---------- 生態走廊（localStorage 永久記錄，串聯後才在分頁顯示對應新棲地） ---------- */
  function loadCorridors(){ try{ const raw=localStorage.getItem("shoutu_corridors"); const a=raw?JSON.parse(raw):[]; return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function saveCorridors(a){ try{ localStorage.setItem("shoutu_corridors", JSON.stringify(a)); }catch(e){} }
  function corridorBuilt(a,b){ return loadCorridors().includes(corridorId(a,b)); }
  // 新棲地要「顯示在分頁上」＝等級已解鎖 且 至少有一條走廊把它跟既有棲地串起來
  function regionVisible(key){ if(BASE_REGIONS.includes(key)) return true;
    if(!levelUnlocked(key)) return false;
    return CORRIDORS.some(c=> (c.a===key||c.b===key) && corridorBuilt(c.a,c.b)); }

  function weatherNow(){ const t=Math.floor(now()/WEATHER_PERIOD_MS); const pat=["sunny","sunny","rain","cloudy","sunny","rain"]; return pat[((t%pat.length)+pat.length)%pat.length]; }
  function isNight(){ const h=new Date().getHours(); return h<6||h>=18; }
  function growMult(){ return weatherNow()==="rain" ? 0.8 : 1; }
  function trickleMult(){ return weatherNow()==="rain" ? 0.75 : 1; }

  function stageOf(tile){
    if(tile.state==="invasive") return "invasive";
    if(tile.state==="unplanted"){
      if((now()-tile.emptySince)/1000 > INVADE_S){ tile.state="invasive"; delete tile.emptySince; return "invasive"; }
      return "empty";
    }
    const el=(now()-tile.plantedAt)/1000, m=growMult();
    if(el<SPROUT_S*m) return "sprout";
    if(el<SAPLING_S*m) return "sapling";
    return "mature";
  }
  function storedOf(tile){ if(stageOf(tile)!=="mature") return 0;
    const el=Math.max(0,(now()-(tile.lastCollect||tile.plantedAt))/1000);
    return Math.min(TRICKLE_CAP, Math.floor(el/(TRICKLE_S*trickleMult()))); }

  const WMETA={ sunny:{icon:"☀️",txt:"晴天"}, cloudy:{icon:"☁️",txt:"陰天"}, rain:{icon:"🌧️",txt:"下雨中・生長加速！"} };

  /* ---------- 畫布場景 ---------- */
  const cv=$("habCanvas");
  const ctx=cv && cv.getContext("2d");
  let VW=0, VH=0, dpr=1, running=false, raf=0, rot=false;
  function resize(){ if(!cv) return; const iw=window.innerWidth, ih=window.innerHeight;
    rot = ih>iw;                               // 直握手機 → 旋轉成橫向填滿螢幕（跟 MOBA 同一套做法）
    const root=$("habitat"); if(root) root.classList.toggle("rot", rot);
    VW = rot? ih : iw; VH = rot? iw : ih;
    dpr=Math.min(window.devicePixelRatio||1,2); cv.width=Math.round(VW*dpr); cv.height=Math.round(VH*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  window.addEventListener("orientationchange",()=>{ if(running) setTimeout(resize,60); });
  window.addEventListener("resize",()=>{ if(running) resize(); });

  // 自然散佈的種植點（非棋盤格）：決定式偽亂數，位置固定但看起來自然
  function hash(i,seed){ const s=Math.sin(i*12.9898+seed*78.233)*43758.5453; return s-Math.floor(s); }
  function spotPos(i){ const row=Math.floor(i/4), col=i%4;
    const jx=hash(i,1)-0.5, jy=hash(i,2)-0.5;
    const bx=(col+0.5)/4 + jx*0.16, by=0.30 + (row/3)*0.62 + jy*0.09;
    const x=VW*clamp(bx,0.04,0.96), y=VH*clamp(by,0.30,0.94);
    const depth=(by-0.30)/0.62;  // 0=遠 1=近
    return { x, y, scale: 0.55+depth*0.75, depth };
  }
  const spots = Array.from({length:N},(_,i)=>({ i, popT:0, sway:hash(i,3)*6.28 }));

  function paintBackground(t){
    const info=REGION_INFO[data.current]||REGION_INFO.paddy, night=isNight(), w=weatherNow();
    const pal= night? info.nightSky : info.sky;
    const sky=ctx.createLinearGradient(0,0,0,VH*0.34); sky.addColorStop(0,pal[0]); sky.addColorStop(1,pal[1]);
    ctx.fillStyle=sky; ctx.fillRect(0,0,VW,VH*0.36);
    // 太陽／月亮
    const sx=VW*0.76, sy=VH*0.12;
    ctx.fillStyle= night? "rgba(230,230,255,0.9)" : "rgba(255,240,180,0.95)";
    ctx.beginPath(); ctx.arc(sx,sy,VH*0.045,0,7); ctx.fill();
    const glow=ctx.createRadialGradient(sx,sy,2,sx,sy,VH*0.22); glow.addColorStop(0,night?"rgba(200,200,255,0.25)":"rgba(255,235,150,0.3)"); glow.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=glow; ctx.fillRect(0,0,VW,VH*0.36);
    // 雲（陰天／一般都飄一點）
    const cloudN = w==="cloudy"?5:2;
    for(let i=0;i<cloudN;i++){ const cx=((i*0.37+t*0.01)%1.3-0.15)*VW, cy=VH*(0.08+i*0.05), cw=VW*0.18; ctx.fillStyle="rgba(255,255,255,"+(w==="cloudy"?0.4:0.22)+")";
      ctx.beginPath(); ctx.ellipse(cx,cy,cw,cw*0.32,0,0,7); ctx.fill(); }
    // 遠山剪影
    ctx.fillStyle=night?"rgba(10,14,26,0.85)":"rgba(255,255,255,0.16)";
    ctx.beginPath(); ctx.moveTo(0,VH*0.34); for(let x=0;x<=VW;x+=VW/8){ ctx.lineTo(x, VH*0.34 - VH*0.05*Math.sin(x/VW*3.14+0.6)); } ctx.lineTo(VW,VH*0.4); ctx.lineTo(0,VH*0.4); ctx.fill();
    // 地面
    const ga=(night? shade(info.ground[0],-40): info.ground[0]), gb=(night? shade(info.ground[1],-40): info.ground[1]);
    const g=ctx.createLinearGradient(0,VH*0.30,0,VH); g.addColorStop(0,ga); g.addColorStop(1,gb); ctx.fillStyle=g; ctx.fillRect(0,VH*0.30,VW,VH*0.70);
    // 各地區專屬地貌特徵（不只換色，要看得出是哪種棲地）
    drawTerrain(data.current, night);
    // 天氣色調
    if(w==="rain") ctx.fillStyle="rgba(60,90,130,0.16)"; else if(w==="cloudy") ctx.fillStyle="rgba(80,80,90,0.12)"; else ctx.fillStyle="rgba(255,220,140,0.05)";
    ctx.fillRect(0,0,VW,VH);
    if(night){ ctx.fillStyle="rgba(0,0,20,0.28)"; ctx.fillRect(0,0,VW,VH); }
    // 雨滴
    if(w==="rain"){ ctx.strokeStyle="rgba(200,220,255,0.5)"; ctx.lineWidth=1.4;
      for(let i=0;i<26;i++){ const rx=(i*37+  (t*220)% (VW+60)) % (VW+60) - 30; const ry=((i*53 + t*380) % (VH+40)) - 20;
        ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-4,ry+12); ctx.stroke(); } }
    // 光束（晴天/陰天太陽穿透感）+ 環境飄浮粒子（白天花粉光點／夜晚螢火蟲），營造電影感氛圍
    if(!night && w!=="rain"){ ctx.save(); ctx.globalCompositeOperation="lighter";
      for(let i=0;i<3;i++){ const a=-1.35+i*0.14; ctx.strokeStyle="rgba(255,244,200,0.05)"; ctx.lineWidth=VW*0.05;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+Math.cos(a)*VH*1.4,sy+Math.sin(a)*VH*1.4); ctx.stroke(); } ctx.restore(); }
    drawAmbientMotes(t,night,w);
  }
  // 環境粒子：硬上限 26 顆、位置由固定亂數種子決定（不用陣列動態 push，天生就有上限，零回收成本）
  function drawAmbientMotes(t,night,w){
    if(w==="rain") return; const n=night?18:26;
    ctx.save(); ctx.globalCompositeOperation="lighter";
    for(let i=0;i<n;i++){ const sp=0.06+ghash(i,20)*0.05, ph=ghash(i,21)*6.28;
      const bx=ghash(i,22)*VW, by=VH*(0.15+ghash(i,23)*0.75);
      const dy=Math.sin(t*sp*20+ph)*VH*0.03, dx=Math.sin(t*sp*13+ph*1.7)*VW*0.015;
      const tw=0.35+0.35*Math.sin(t*(night?2.2:1.1)+ph*3);
      const x=bx+dx, y=by+dy-((t*8+i*37)%(VH*1.1));
      const yy= y< -20 ? y+VH*1.1+20 : y;
      ctx.globalAlpha=tw; ctx.fillStyle= night? "rgba(200,255,160,0.9)" : "rgba(255,250,220,0.75)";
      ctx.beginPath(); ctx.arc(x,yy,night?1.8:1.1,0,7); ctx.fill();
      if(night){ ctx.globalAlpha=tw*0.4; ctx.beginPath(); ctx.arc(x,yy,4.2,0,7); ctx.fill(); } }
    ctx.restore(); ctx.globalAlpha=1;
  }
  // 各棲地的招牌地貌：讓人一眼認出「這是稻田／淺山／溪流／濕地」，不是只換底色
  function ghash(i,seed){ const s=Math.sin(i*91.7+seed*13.1)*43758.5453; return s-Math.floor(s); }
  function drawTerrain(region,night){
    if(region==="paddy"){ // 水田：分區田埂 + 灌水倒影 + 稻穗剪影
      for(let row=0;row<3;row++){ const yy=VH*(0.40+row*0.19);
        ctx.fillStyle=night?"rgba(60,90,110,0.35)":"rgba(140,190,210,0.32)"; ctx.fillRect(0,yy,VW,VH*0.15);
        ctx.strokeStyle="rgba(90,70,40,0.55)"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,yy); ctx.lineTo(VW,yy); ctx.stroke();
        ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=1;
        for(let k=0;k<3;k++){ const ly=yy+VH*0.04+k*VH*0.04; ctx.beginPath(); ctx.moveTo(VW*0.05,ly); ctx.lineTo(VW*0.95,ly); ctx.stroke(); } }
      ctx.strokeStyle="rgba(90,120,50,0.6)"; ctx.lineWidth=1.3;
      for(let i=0;i<34;i++){ const bx=ghash(i,4)*VW, by=VH*(0.42+ghash(i,5)*0.5); if(by>VH*0.9) continue;
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+2,by-7); ctx.stroke(); } }
    else if(region==="hill"){ // 淺山：起伏草坡 + 遠方樹叢剪影
      ctx.fillStyle=night?"rgba(10,30,14,0.5)":"rgba(20,55,22,0.35)";
      ctx.beginPath(); ctx.moveTo(0,VH*0.5); ctx.quadraticCurveTo(VW*0.3,VH*0.42,VW*0.55,VH*0.5); ctx.quadraticCurveTo(VW*0.8,VH*0.58,VW,VH*0.46); ctx.lineTo(VW,VH); ctx.lineTo(0,VH); ctx.fill();
      ctx.fillStyle=night?"rgba(6,20,10,0.8)":"rgba(8,30,12,0.55)";
      for(const bx of [0.08,0.22,0.72,0.88]){ const x=VW*bx, y=VH*0.5, r=VH*0.055;
        ctx.beginPath(); ctx.arc(x-r*0.5,y,r*0.7,0,7); ctx.arc(x+r*0.5,y,r*0.7,0,7); ctx.arc(x,y-r*0.3,r*0.8,0,7); ctx.fill(); } }
    else if(region==="stream"){ // 溪流：對角河道 + 岸邊礫石
      ctx.save(); ctx.strokeStyle=night?"rgba(60,90,110,0.6)":"rgba(140,200,220,0.55)"; ctx.lineWidth=VH*0.16; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(-10,VH*0.44); ctx.quadraticCurveTo(VW*0.45,VH*0.62,VW+10,VH*0.5); ctx.stroke();
      ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=3;
      for(let i=0;i<3;i++){ const off=Math.sin(performance.now()/700+i)*4; ctx.beginPath(); ctx.moveTo(-10,VH*0.44+off); ctx.quadraticCurveTo(VW*0.45,VH*0.62+off,VW+10,VH*0.5+off); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle="rgba(120,120,120,0.6)";
      for(let i=0;i<10;i++){ const bx=ghash(i,6)*VW, by=VH*(0.36+ghash(i,7)*0.15); ctx.beginPath(); ctx.ellipse(bx,by,VH*0.018,VH*0.012,0,0,7); ctx.fill(); } }
    else if(region==="wetland"){ // 濕地：泥灘水塘 + 蘆葦叢
      ctx.fillStyle=night?"rgba(20,30,30,0.45)":"rgba(70,90,90,0.32)";
      for(const p of [[0.2,0.55,0.16],[0.7,0.68,0.13],[0.45,0.8,0.1]]){ ctx.beginPath(); ctx.ellipse(VW*p[0],VH*p[1],VW*p[2],VH*p[2]*0.4,0,0,7); ctx.fill(); }
      ctx.strokeStyle=night?"rgba(70,90,60,0.6)":"rgba(120,140,80,0.7)"; ctx.lineWidth=1.4;
      for(let i=0;i<20;i++){ const bx=ghash(i,8)*VW, by=VH*(0.38+ghash(i,9)*0.5); if(by>VH*0.92) continue; const sway=Math.sin(performance.now()/900+i)*4;
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx+sway,by-10,bx+sway*1.6,by-16); ctx.stroke(); } }
    else if(region==="alpine"){ // 高山寒原：稜線裸岩 + 殘雪 + 碎石坡
      ctx.fillStyle=night?"rgba(20,24,40,0.55)":"rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.moveTo(0,VH*0.42); ctx.lineTo(VW*0.32,VH*0.34); ctx.lineTo(VW*0.5,VH*0.44); ctx.lineTo(VW*0.78,VH*0.32); ctx.lineTo(VW,VH*0.4); ctx.lineTo(VW,VH*0.34); ctx.lineTo(0,VH*0.34); ctx.fill();
      ctx.fillStyle=night?"rgba(60,60,70,0.55)":"rgba(150,148,138,0.5)";
      ctx.beginPath(); ctx.moveTo(0,VH*0.5); ctx.lineTo(VW*0.28,VH*0.4); ctx.lineTo(VW*0.55,VH*0.5); ctx.lineTo(VW*0.82,VH*0.4); ctx.lineTo(VW,VH*0.48); ctx.lineTo(VW,VH); ctx.lineTo(0,VH); ctx.fill();
      ctx.fillStyle="rgba(140,138,126,0.6)";
      for(let i=0;i<16;i++){ const bx=ghash(i,10)*VW, by=VH*(0.44+ghash(i,11)*0.46); if(by>VH*0.92) continue;
        ctx.beginPath(); ctx.ellipse(bx,by,VH*0.02,VH*0.013,ghash(i,12)*3,0,7); ctx.fill(); } }
    else if(region==="estuary"){ // 濕地河口：寬闊泥灘水色 + 潮溝 + 遠方水鳥剪影
      ctx.fillStyle=night?"rgba(24,30,36,0.5)":"rgba(160,170,150,0.38)";
      ctx.fillRect(0,VH*0.38,VW,VH*0.62);
      ctx.strokeStyle=night?"rgba(60,90,110,0.55)":"rgba(140,190,210,0.5)"; ctx.lineWidth=VH*0.03; ctx.lineCap="round";
      for(const yy of [0.5,0.62,0.76]){ ctx.beginPath(); ctx.moveTo(-10,VH*yy); ctx.quadraticCurveTo(VW*0.5,VH*(yy+0.05),VW+10,VH*(yy-0.03)); ctx.stroke(); }
      ctx.fillStyle=night?"rgba(10,14,20,0.7)":"rgba(30,30,30,0.5)";
      for(const p of [[0.18,0.34],[0.24,0.33],[0.7,0.32]]){ ctx.save(); ctx.translate(VW*p[0],VH*p[1]);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(4,-6,10,-4); ctx.quadraticCurveTo(4,-3,2,2); ctx.fill(); ctx.restore(); } }
  }
  function shade(hex,amt){ const n=parseInt(hex.slice(1),16); const r=clamp((n>>16)+amt,0,255), g=clamp(((n>>8)&255)+amt,0,255), b=clamp((n&255)+amt,0,255); return "rgb("+r+","+g+","+b+")"; }
  function mix(a,b,t){ const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16); const ar=A>>16,ag=(A>>8)&255,ab=A&255, br=B>>16,bg=(B>>8)&255,bb=B&255;
    return "rgb("+Math.round(ar+(br-ar)*t)+","+Math.round(ag+(bg-ag)*t)+","+Math.round(ab+(bb-ab)*t)+")"; }

  /* ---------- 植物繪製：每個地區畫風完全不同 ---------- */
  function drawInvasive(x,y,s,sway){ ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(sway)*0.06);
    ctx.strokeStyle="#8d3b2a"; ctx.lineWidth=2.2*s; ctx.lineCap="round";
    for(const a of [-0.7,-0.2,0.3,0.8]){ ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(Math.sin(a)*10*s,-14*s,Math.sin(a)*16*s,-22*s); ctx.stroke(); }
    ctx.fillStyle="#c0473a"; for(const a of [-0.6,0.1,0.7]){ ctx.beginPath(); ctx.arc(Math.sin(a)*14*s,-20*s,2.4*s,0,7); ctx.fill(); }
    ctx.restore(); }
  function drawEmpty(x,y,s){ const info=REGION_INFO[data.current]||REGION_INFO.paddy;   // 依地區土壤色調做一點點差異，其餘畫法通用
    ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(x,y,12*s,4*s,0,0,7); ctx.fill();
    ctx.fillStyle=shade(info.ground[1],30); ctx.globalAlpha=0.55; ctx.beginPath(); ctx.ellipse(x,y-1,9*s,3.2*s,0,0,7); ctx.fill(); ctx.globalAlpha=1; }
  // 幼苗期（sprout）要依地區 shape 呈現明顯差異——不然玩家剛開局／快速切換地區時，看到的幾乎都是同一種通用幼苗，會誤以為每區都一樣
  function drawSprout(kind,x,y,s,sway){ ctx.save(); ctx.translate(x,y);
    if(kind==="lily"){ // 台灣萍蓬草幼苗：貼地小圓葉，還沒浮起
      ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.beginPath(); ctx.ellipse(0,1.5*s,6*s,2*s,0,0,7); ctx.fill();
      ctx.fillStyle="#5a9a4a"; for(const o of [[-2.4,0,0.85],[2.2,0.6,0.7]]){ ctx.beginPath(); ctx.ellipse(o[0]*s,o[1]*s,3.4*s*o[2],2.2*s*o[2],0.2,0,7); ctx.fill(); } }
    else if(kind==="conifer"){ // 台灣杉幼苗：尖尖小針葉，已看得出高聳輪廓的雛形
      ctx.strokeStyle="#4a6b34"; ctx.lineWidth=1.4*s; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.sin(sway)*1.4*s,-10*s); ctx.stroke();
      ctx.fillStyle="#3f7a42"; ctx.beginPath(); ctx.moveTo(0,-11*s); ctx.lineTo(-3.2*s,-4*s); ctx.lineTo(3.2*s,-4*s); ctx.closePath(); ctx.fill(); }
    else if(kind==="mangrove"){ // 水筆仔幼苗：胎生苗剛插入土裡，帶一點支柱根雛形
      ctx.strokeStyle="#5a4030"; ctx.lineWidth=1.4*s; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(-2*s,0); ctx.lineTo(-1*s,-3*s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2*s,0); ctx.lineTo(1*s,-3*s); ctx.stroke();
      ctx.fillStyle="#548a52"; ctx.beginPath(); ctx.ellipse(0,-7*s,3*s,4.6*s,0,0,7); ctx.fill(); }
    else if(kind==="juniper"){ // 玉山圓柏幼苗：矮小貼地，已呈現匍匐狀
      ctx.strokeStyle="#6b5842"; ctx.lineWidth=1.6*s; ctx.beginPath(); ctx.moveTo(-3*s,0); ctx.quadraticCurveTo(0,-2*s,3*s,-0.5*s); ctx.stroke();
      ctx.fillStyle="#5f7f5a"; for(const o of [[-2,-2.5,0.7],[1.5,-3,0.8]]){ ctx.beginPath(); ctx.ellipse(o[0]*s,o[1]*s,3*s*o[2],1.8*s*o[2],0.1,0,7); ctx.fill(); } }
    else if(kind==="heron"){ // 欖李幼苗：厚實的鹽生葉片，成叢貼地生長
      ctx.fillStyle="#5c6b3f"; for(const o of [[-2.6,-3,0.8],[0,-4,0.9],[2.6,-2.8,0.75]]){ ctx.beginPath(); ctx.ellipse(o[0]*s,o[1]*s,2.6*s*o[2],3.6*s*o[2],0,0,7); ctx.fill(); } }
    else { // round（台灣欒樹）與其餘：維持原本雙葉子幼苗樣式
      ctx.strokeStyle="#6b8f3e"; ctx.lineWidth=1.6*s; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.sin(sway)*2*s,-9*s); ctx.stroke();
      ctx.fillStyle="#7cb342"; ctx.beginPath(); ctx.ellipse(-3*s,-8*s,4*s,2.2*s,-0.5,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3*s,-9*s,4*s,2.2*s,0.5,0,7); ctx.fill(); }
    ctx.restore(); }

  // stage：同一格反覆收成後的「歲月感」——0=初熟 1=盛開茂盛（收成3次+） 2=老欉（收成7次+），越養越壯觀，不是每次都長一樣
  function harvestStage(tile){ const n=tile.harvestCount||0; return n>=7?2:n>=3?1:0; }
  function drawSpecies(kind,x,y,s,sway,ripe,pop,stage){
    stage=stage||0;
    const S=s*(1+pop*0.18)*(1+stage*0.1);
    ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(sway)*0.03);
    if(stage>=2){ ctx.save(); ctx.globalAlpha=0.35; ctx.fillStyle="#ffe082"; ctx.beginPath(); ctx.ellipse(0,3*S,16*S,4.4*S,0,0,7); ctx.fill(); ctx.restore(); } // 老欉金環底座
    if(kind==="lily"){ // 台灣萍蓬草：扁平浮葉 + 黃花，貼近水面
      ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(0,2*S,15*S,4*S,0,0,7); ctx.fill();
      const pads=stage>=1? [[-8,1,1],[7,2,0.85],[0,-2,1.1],[-4,-4,0.7]] : [[-8,1,1],[7,2,0.85],[0,-2,1.1]];
      for(const o of pads){ ctx.fillStyle=mix("#3f7a3f","#5a9a4a",0.5); ctx.beginPath(); ctx.ellipse(o[0]*S,o[1]*S,7*S*o[2],4.6*S*o[2],0.2,0,7); ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(o[0]*S,o[1]*S); ctx.lineTo(o[0]*S+4*S*o[2],o[1]*S); ctx.stroke(); }
      const flowerN=4+stage*2;
      ctx.fillStyle="#ffd54f"; ctx.beginPath(); ctx.arc(0,-4*S,3.2*S,0,7); ctx.fill();
      for(let k=0;k<flowerN;k++){ const a=k/flowerN*6.283; ctx.beginPath(); ctx.ellipse(Math.cos(a)*3.6*S,-4*S+Math.sin(a)*3.6*S,2*S,1*S,a,0,7); ctx.fillStyle="#ffe082"; ctx.fill(); }
      if(stage>=1){ ctx.fillStyle="#ffd54f"; ctx.beginPath(); ctx.arc(6*S,3*S,2*S,0,7); ctx.fill(); } } // 老株旁多開一朵
    else if(kind==="round"){ // 台灣欒樹：圓冠喬木，成熟時有金紅色蒴果點綴，越老欉冠幅越大、果實越多
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,2*S,10*S,3*S,0,0,7); ctx.fill();
      ctx.fillStyle="#6d4c2f"; ctx.fillRect(-1.4*S,-14*S,2.8*S,14*S);
      const cols=[mix("#2e7d32","#245c28",0.3),mix("#43a047","#2e7d32",0.2),mix("#66bb6a","#43a047",0.1)];
      for(let k=0;k<3;k++){ ctx.fillStyle=cols[k]; const rr=(10-k*2)*S; ctx.beginPath(); ctx.arc(-rr*0.35,-16*S-k*2*S,rr*0.62,0,7); ctx.arc(rr*0.35,-16*S-k*2*S,rr*0.62,0,7); ctx.arc(0,-19*S-k*2*S,rr*0.7,0,7); ctx.fill(); }
      if(ripe){ const fn=5+stage*3; ctx.fillStyle=stage>=2?"#ff8a50":"#e8734a"; for(let k=0;k<fn;k++){ const a=k*(6.283/fn)+sway; ctx.beginPath(); ctx.arc(Math.cos(a)*7*S,-18*S+Math.sin(a)*6*S,1.6*S,0,7); ctx.fill(); } } }
    else if(kind==="conifer"){ // 台灣杉：高聳三角形針葉巨木，越老欉越高聳
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,2*S,8*S,2.6*S,0,0,7); ctx.fill();
      ctx.fillStyle="#5a4632"; ctx.fillRect(-1.2*S,-24*S,2.4*S,24*S);
      ctx.fillStyle=mix("#1b4d2e","#2e6b3e",0.3);
      const layers=4+stage;
      for(let k=0;k<layers;k++){ const yy=-8*S-k*7*S, w=(9-k*1.6)*S; if(w<=0) continue; ctx.beginPath(); ctx.moveTo(0,yy-9*S); ctx.lineTo(-w,yy); ctx.lineTo(w,yy); ctx.closePath(); ctx.fill(); }
      if(stage>=2){ ctx.fillStyle="rgba(200,220,200,0.35)"; for(let k=0;k<3;k++){ const yy=-10*S-k*8*S; ctx.beginPath(); ctx.ellipse(4*S,yy,2*S,1*S,0.3,0,7); ctx.fill(); } } } // 老欉樹皮附生苔蘚斑點
    else if(kind==="mangrove"){ // 水筆仔：露出支柱根的紅樹林灌叢，越老欉支柱根與樹冠越茂密
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(0,2*S,11*S,3.2*S,0,0,7); ctx.fill();
      ctx.strokeStyle="#5a4030"; ctx.lineWidth=1.6*S; ctx.lineCap="round";
      const roots=stage>=1? [-6,-3,0,2.5,5.5,8] : [-5,-1.5,2,5.5];
      for(const dx of roots){ ctx.beginPath(); ctx.moveTo(dx*S,-2*S); ctx.quadraticCurveTo(dx*1.4*S,4*S,dx*1.8*S,7*S); ctx.stroke(); }
      const cols=["#3f6b3f","#548a52"]; for(let k=0;k<2;k++){ ctx.fillStyle=cols[k]; ctx.beginPath(); ctx.ellipse((-3+stage)*S+k*6*S,-9*S-k*2*S,(7+stage)*S,(6+stage*0.5)*S,0,0,7); ctx.fill(); } }
    else if(kind==="juniper"){ // 玉山圓柏：被強風吹成匍匐狀的風衝矮林，越老欉盤根越粗、匍匐範圍越廣
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,2*S,13*S,3.4*S,0,0,7); ctx.fill();
      ctx.strokeStyle="#6b5842"; ctx.lineWidth=(2.2+stage*0.5)*S; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(-(8+stage*2)*S,1*S); ctx.quadraticCurveTo(-2*S,-3*S,(4+stage*2)*S,-4*S); ctx.stroke();
      const cols=[mix("#4a6b4f","#5f7f5a",0.4),mix("#5f7f5a","#7a9a70",0.3)];
      const clumps=stage>=1? [[-6,-5,1],[0,-7,1.15],[5,-4.5,0.9],[8,-3,0.75]] : [[-6,-5,1],[0,-7,1.15],[5,-4.5,0.9]];
      for(const o of clumps){ ctx.fillStyle=cols[o[2]>1?1:0]; ctx.beginPath(); ctx.ellipse(o[0]*S,o[1]*S,7*S*o[2],3.4*S*o[2],0.15,0,7); ctx.fill(); }
      if(ripe){ ctx.fillStyle="#8ea9d8"; const bn=4+stage*2; for(let k=0;k<bn;k++){ const a=k*(6.283/bn)+sway; ctx.beginPath(); ctx.arc(Math.cos(a)*5*S,-6*S+Math.sin(a)*3*S,1.3*S,0,7); ctx.fill(); } } }
    else if(kind==="heron"){ // 欖李叢＋佇立黑面琵鷺剪影：越老欉樹叢越密，甚至多來一隻水鳥
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(-2*S,2*S,10*S,3*S,0,0,7); ctx.fill();
      ctx.fillStyle="#5c6b3f"; for(const o of [[-6,-6,1],[-1,-8,1.05]]){ ctx.beginPath(); ctx.ellipse(o[0]*S,o[1]*S,6*S*o[2],4.6*S*o[2],0,0,7); ctx.fill(); }
      function bird(bx,by,sc){ ctx.save(); ctx.translate(bx,by);
        ctx.strokeStyle="#e8e8e8"; ctx.lineWidth=1.3*S*sc; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(-1.4*S*sc,0); ctx.lineTo(-1.4*S*sc,-8*S*sc); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(1.4*S*sc,0); ctx.lineTo(1.4*S*sc,-8*S*sc); ctx.stroke();
        ctx.fillStyle="#f2f2f2"; ctx.beginPath(); ctx.ellipse(0,-10*S*sc,4*S*sc,3.2*S*sc,0,0,7); ctx.fill();
        ctx.fillStyle="#2c2c2c"; ctx.beginPath(); ctx.moveTo(3.6*S*sc,-10*S*sc); ctx.lineTo(8*S*sc,-9.4*S*sc); ctx.lineTo(3.6*S*sc,-8.8*S*sc); ctx.fill();
        ctx.restore(); }
      bird(6*S,-1*S,1);
      if(stage>=2) bird(-9*S,0.5*S,0.72); }
    ctx.restore();
  }

  function drawSapling(kind,x,y,s,sway,pop){ drawSpecies(kind,x,y,s*0.6,sway,false,pop); }

  const STAGE_TAG=["","🌼盛開","🌟老欉"];
  function drawSpot(sp){ const tile=curTiles()[sp.i], st=stageOf(tile), pos=spotPos(sp.i), s=pos.scale*18, sway=sp.sway+performance.now()/1000;
    const ripe = st==="mature" && storedOf(tile)>0, stage=harvestStage(tile);
    if(sp.popT>0) sp.popT=Math.max(0,sp.popT-0.05);
    if(st==="invasive") drawInvasive(pos.x,pos.y,pos.scale,sway);
    else if(st==="empty") drawEmpty(pos.x,pos.y,pos.scale);
    else if(st==="sprout") drawSprout(REGION_INFO[data.current].shape,pos.x,pos.y,pos.scale,sway);
    else if(st==="sapling") drawSapling(REGION_INFO[data.current].shape,pos.x,pos.y,pos.scale,sway,sp.popT);
    else { drawSpecies(REGION_INFO[data.current].shape,pos.x,pos.y,pos.scale,sway,ripe,sp.popT,stage);
      if(ripe){ const pl=0.5+0.5*Math.sin(performance.now()/300); ctx.save(); ctx.globalAlpha=0.5+0.4*pl; ctx.fillStyle="#fff59d";
        ctx.beginPath(); ctx.arc(pos.x,pos.y-18*pos.scale,3*pos.scale,0,7); ctx.fill(); ctx.restore();
        const stv=storedOf(tile), tag=STAGE_TAG[stage]?(" "+STAGE_TAG[stage]):""; ctx.font="bold "+Math.round(11*pos.scale)+"px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#ffd54f"; ctx.strokeStyle="rgba(0,0,0,.6)"; ctx.lineWidth=3;
        ctx.strokeText("+"+stv+tag,pos.x,pos.y-24*pos.scale); ctx.fillText("+"+stv+tag,pos.x,pos.y-24*pos.scale); } }
  }

  /* ---------- 粒子 / 橫幅 ---------- */
  let parts=[];
  function burstAt(x,y){ for(let k=0;k<8;k++){ const a=Math.random()*6.283, sp=30+Math.random()*40;
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-30,life:0.6,max:0.6}); } if(parts.length>120) parts.splice(0,parts.length-120); }
  function drawParts(dt){ for(const p of parts){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=60*dt; }
    parts=parts.filter(p=>p.life>0);
    for(const p of parts){ const a=Math.max(0,p.life/p.max); ctx.globalAlpha=a; ctx.font="12px serif"; ctx.textAlign="center"; ctx.fillText("🌿",p.x,p.y); ctx.globalAlpha=1; } }

  let bannerT=null;
  function banner(txt){ const b=$("habBanner"); if(!b) return; b.textContent=txt; b.classList.add("show");
    if(bannerT) clearTimeout(bannerT); bannerT=setTimeout(()=>b.classList.remove("show"),1600); }

  /* ---------- HUD 文字 ---------- */
  function applyTheme(){
    const info=REGION_INFO[data.current]||REGION_INFO.paddy, night=isNight(), w=weatherNow(), wm=WMETA[w];
    document.querySelectorAll("#habRegions .hregion[data-r]").forEach(b=>b.classList.toggle("on", b.dataset.r===data.current));
    $("habWeather") && ($("habWeather").textContent=(night?"🌙 夜間":"☀️ 白天")+"　"+wm.icon+" "+wm.txt);
    $("habSpecies") && ($("habSpecies").textContent="🌳 本區培育："+info.plant+"——"+info.fact);
    refreshRegionVisibility();
  }
  // 新棲地分頁只在「等級已解鎖 + 走廊已串聯」時才出現；沒串聯但等級夠了，給一個可點的解鎖提示引導去建走廊
  function refreshRegionVisibility(){
    for(const key of LOCKED_REGIONS){ const btn=document.querySelector('#habRegions .hregion[data-r="'+key+'"]'); if(!btn) continue;
      btn.classList.toggle("hide", !regionVisible(key)); }
    const tip=$("habUnlockTip"); if(!tip) return;
    const next=LOCKED_REGIONS.find(k=> levelUnlocked(k) && !regionVisible(k));
    if(next){ tip.textContent="✨ 已達成解鎖條件："+REGION_INFO[next].label+"！點我前往生態走廊串聯"; tip.classList.remove("hide"); }
    else tip.classList.add("hide");
  }
  function updateHUD(){ let totalW=0, totalStored=0;
    for(let i=0;i<N;i++){ const tile=curTiles()[i], st=stageOf(tile);
      totalW += st==="mature"?1:st==="sapling"?0.6:st==="sprout"?0.3:0;
      if(st==="mature") totalStored += storedOf(tile); }
    const pct=Math.round(totalW/N*100), label=(REGION_INFO[data.current]||REGION_INFO.paddy).label;
    $("habRestoreTxt") && ($("habRestoreTxt").textContent=label+"復原度 "+pct+"%");
    $("habRestoreBar") && ($("habRestoreBar").style.width=pct+"%");
    $("habEcoTxt") && ($("habEcoTxt").textContent="🌿 本區可收成 "+totalStored);
    updateRegionBadges();
  }
  // 每個地區獨立顯示自己的狀態小標：紅=有入侵種待清、金=有成熟可收成——四塊地要輪流照顧，考驗分配注意力
  function updateRegionBadges(){
    document.querySelectorAll("#habRegions .hregion[data-r]").forEach(b=>{ const key=b.dataset.r, tiles=data.regions[key]; if(!tiles) return;
      let invasive=0, ripe=0; for(const tile of tiles){ const st=stageOf(tile); if(st==="invasive") invasive++; else if(st==="mature") ripe+=storedOf(tile)>0?1:0; }
      const badge=b.querySelector(".hbadge"); if(!badge) return;
      if(invasive>0){ badge.textContent=invasive; badge.className="hbadge warn show"; }
      else if(ripe>0){ badge.textContent=ripe; badge.className="hbadge show"; }
      else badge.className="hbadge"; });
  }

  /* ---------- 互動 ---------- */
  function hitTest(px,py){ let best=-1,bd=26; for(const sp of spots){ const pos=spotPos(sp.i); const d=Math.hypot(px-pos.x,py-(pos.y-10*pos.scale)); const rad=16*pos.scale+14; if(d<rad && d<bd){ bd=d; best=sp.i; } } return best; }
  function tap(i){ const tile=curTiles()[i], st=stageOf(tile);
    if(st==="invasive"){ tile.state="unplanted"; tile.emptySince=now(); }
    else if(st==="empty"){ tile.state="planted"; tile.plantedAt=now(); tile.lastCollect=now(); delete tile.emptySince; }
    else if(st==="mature"){ const s=storedOf(tile); if(s>0) harvestTile(i,tile,s); }
    const sp=spots[i]; if(sp) sp.popT=1; save(data); updateHUD(); }
  function harvestTile(i,tile,s){ window.__awardEco && window.__awardEco(s); tile.lastCollect=now(); tile.harvestCount=(tile.harvestCount||0)+1;
    const pos=spotPos(i); burstAt(pos.x,pos.y-16*pos.scale);
    const info=REGION_INFO[data.current]||REGION_INFO.paddy, tag=STAGE_TAG[harvestStage(tile)]?("　"+STAGE_TAG[harvestStage(tile)]+"！"):"";
    banner("🧺 收成 "+info.plant+" +"+s+" 保育值！"+tag); }
  function collectAll(){ let total=0, n=0;
    for(let i=0;i<N;i++){ const tile=curTiles()[i]; if(stageOf(tile)==="mature"){ const s=storedOf(tile); if(s>0){ total+=s; n++; tile.lastCollect=now(); tile.harvestCount=(tile.harvestCount||0)+1;
      const pos=spotPos(i); burstAt(pos.x,pos.y-16*pos.scale); const sp=spots[i]; if(sp) sp.popT=1; } } }
    if(total>0){ window.__awardEco && window.__awardEco(total); banner("🧺 一次收成 "+n+" 棵，共 +"+total+" 保育值！"); } else banner("目前還沒有成熟可收成的植物");
    save(data); updateHUD(); }

  function toLocal(e){ const r=cv.getBoundingClientRect();
    const dsx=e.clientX-(r.left+r.width/2), dsy=e.clientY-(r.top+r.height/2);   // 相對畫面中心的螢幕位移
    const dx = rot? dsy : dsx, dy = rot? -dsx : dsy;                            // 直握旋轉時把螢幕座標轉回世界座標
    return { x: VW/2+dx, y: VH/2+dy }; }
  if(cv) cv.addEventListener("pointerdown",(e)=>{ e.preventDefault(); const p=toLocal(e); const i=hitTest(p.x,p.y); if(i>=0) tap(i); },{passive:false});

  function setRegion(r){ if(!REGION_INFO[r]) return; data.current=r; save(data); applyTheme(); banner("🌏 已切換到"+REGION_INFO[r].label+"棲地——培育"+REGION_INFO[r].plant); }

  /* ---------- 生態走廊面板：花保育值串聯兩棲地，串通後解鎖新棲地分頁＋跨物種協力任務回饋 ---------- */
  function renderCorridorList(){
    const box=$("habCorridorList"); if(!box) return;
    const lv=conservationLevel(), eco=(window.__getEco&&window.__getEco())||0;
    box.innerHTML="";
    for(const c of CORRIDORS){
      const built=corridorBuilt(c.a,c.b), otherInfo=REGION_INFO[c.b], lvOk=levelUnlocked(c.b);
      const item=document.createElement("div"); item.className="hc-item"+(built?" built":"");
      const lvNote = lvOk? "" : "（"+otherInfo.label+"需保育等級 Lv."+otherInfo.unlockLv+"）";
      item.innerHTML = '<div class="hc-t">'+c.label+'</div><div class="hc-d">'+c.desc+lvNote+'</div>'+
        '<div class="hc-row"><span class="hc-cost">花費 🌿'+c.cost+' 保育值</span>'+
        (built? '<span class="hc-built-tag">✅ 已串聯</span>' : '<button data-a="'+c.a+'" data-b="'+c.b+'"'+((!lvOk||eco<c.cost)?" disabled":"")+'>建造走廊</button>') +
        '</div>';
      box.appendChild(item);
    }
    box.querySelectorAll("button[data-a]").forEach(btn=> btn.addEventListener("pointerdown",(e)=>{ e.preventDefault(); buildCorridor(btn.dataset.a,btn.dataset.b); },{passive:false}));
  }
  function spendEco(n){ try{ const cur=parseInt(localStorage.getItem("shoutu_eco")||"0",10)||0; localStorage.setItem("shoutu_eco",String(Math.max(0,cur-n))); }catch(e){} }
  function buildCorridor(a,b){ const c=CORRIDORS.find(x=>(x.a===a&&x.b===b)); if(!c) return;
    if(corridorBuilt(a,b)) return;
    if(!levelUnlocked(b)){ banner("保育等級還不夠，無法建造這條走廊"); return; }
    const eco=(window.__getEco&&window.__getEco())||0; if(eco<c.cost){ banner("保育值不足，無法建造走廊"); return; }
    spendEco(c.cost);   // 一次性花費：只扣可花的保育值，不動終身累積值（保育等級不會因花費而退等）
    const list=loadCorridors(); list.push(corridorId(a,b)); saveCorridors(list);
    window.__awardEco && window.__awardEco(c.reward);   // 跨物種協力任務一次性獎勵：算入終身累積值
    banner("🌉 生態走廊已串聯！"+REGION_INFO[a].label+"與"+REGION_INFO[b].label+"的跨物種協力任務達成，+"+c.reward+" 保育值！");
    renderCorridorList(); refreshRegionVisibility(); updateHUD();
  }
  function openCorridorPanel(){ renderCorridorList(); const e=$("habCorridorPanel"); if(e) e.classList.remove("hide"); }
  function closeCorridorPanel(){ const e=$("habCorridorPanel"); if(e) e.classList.add("hide"); }

  /* ---------- 主迴圈 ---------- */
  let last=0;
  function loop(ts){ if(!running) return; const dt=Math.min(0.05,(ts-last)/1000||0); last=ts;
    if(ctx){ paintBackground(ts/1000); const ordered=spots.slice().sort((a,b)=>spotPos(a.i).depth-spotPos(b.i).depth); for(const sp of ordered) drawSpot(sp); drawParts(dt); }
    updateHUD(); raf=requestAnimationFrame(loop); }

  function openHabitat(){ data=load(); applyTheme();
    const doOpen=()=>{ show(); resize(); running=true; last=0; raf=requestAnimationFrame(loop); };
    if(window.__tx) window.__tx(doOpen); else doOpen(); }
  function show(){ const e=$("habitat"); if(e) e.classList.remove("hide"); }
  function closeHabitat(){ const e=$("habitat"); if(e) e.classList.add("hide"); running=false; cancelAnimationFrame(raf); save(data); window.__lobbyRefresh && window.__lobbyRefresh(); }

  const tap2=(id,fn)=>{ const e=$(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); };
  tap2("navHabitat",openHabitat);
  tap2("habBack",closeHabitat);
  tap2("habCollectAll",collectAll);
  document.querySelectorAll("#habRegions .hregion[data-r]").forEach(b=> b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); if(b.classList.contains("hide")) return; setRegion(b.dataset.r); },{passive:false}));
  tap2("habCorridorBtn",openCorridorPanel);
  tap2("habCorridorClose",closeCorridorPanel);
  tap2("habUnlockTip",openCorridorPanel);

  /* ---------- 對外接點：復育↔對戰核心循環 ----------
     戰場健康度影響對戰數值；對戰獲勝回饋棲地復育素材。data 隨時是最新（load 於每次開關時同步）。 */
  window.__habitatRegions = () => REGION_KEYS.filter(regionVisible).map(k=>({ key:k, label:REGION_INFO[k].label, plant:REGION_INFO[k].plant }));
  window.__habitatHealth = (region) => { const tiles=(data.regions||{})[region]; if(!tiles) return 0;
    let w=0; for(const tile of tiles){ const st=stageOf(tile); w += st==="mature"?1:st==="sapling"?0.6:st==="sprout"?0.3:0; } return w/N; };
  window.__habitatBoost = (region, n) => { const tiles=(data.regions||{})[region]; if(!tiles) return;
    let left=n|0;
    for(const tile of tiles){ if(left<=0) break; if(tile.state==="invasive"){ tile.state="unplanted"; tile.emptySince=now(); left--; } }
    for(const tile of tiles){ if(left<=0) break; if(tile.state==="planted"){ tile.plantedAt-=120000; left--; } }
    save(data); };
  // 生態走廊串聯查詢：供未來「跨物種協力任務」等模組判斷兩棲地是否已串通
  window.__corridorLinked = (a,b) => corridorBuilt(a,b);
})();
