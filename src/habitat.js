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
  };

  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  /* ---------- 資料 / 成長邏輯（純時間函數，離線正確、不需模擬 tick） ---------- */
  function load(){ try{ const raw=localStorage.getItem("shoutu_habitat_v1"); if(raw){ const d=JSON.parse(raw); if(d && Array.isArray(d.tiles) && d.tiles.length===N){ if(!d.region) d.region="paddy"; return d; } } }catch(e){}
    const t=now(); const tiles=[];
    for(let i=0;i<N;i++){ if(i%5===0) tiles.push({state:"invasive"}); else tiles.push({state:"unplanted", emptySince:t}); }
    return { tiles, region:"paddy" };
  }
  function save(d){ try{ localStorage.setItem("shoutu_habitat_v1", JSON.stringify(d)); }catch(e){} }
  let data = load();

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
    const info=REGION_INFO[data.region]||REGION_INFO.paddy, night=isNight(), w=weatherNow();
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
    drawTerrain(data.region, night);
    // 天氣色調
    if(w==="rain") ctx.fillStyle="rgba(60,90,130,0.16)"; else if(w==="cloudy") ctx.fillStyle="rgba(80,80,90,0.12)"; else ctx.fillStyle="rgba(255,220,140,0.05)";
    ctx.fillRect(0,0,VW,VH);
    if(night){ ctx.fillStyle="rgba(0,0,20,0.28)"; ctx.fillRect(0,0,VW,VH); }
    // 雨滴
    if(w==="rain"){ ctx.strokeStyle="rgba(200,220,255,0.5)"; ctx.lineWidth=1.4;
      for(let i=0;i<26;i++){ const rx=(i*37+  (t*220)% (VW+60)) % (VW+60) - 30; const ry=((i*53 + t*380) % (VH+40)) - 20;
        ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-4,ry+12); ctx.stroke(); } }
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
  function drawEmpty(x,y,s){ ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(x,y,12*s,4*s,0,0,7); ctx.fill();
    ctx.fillStyle="rgba(120,95,60,0.6)"; ctx.beginPath(); ctx.ellipse(x,y-1,9*s,3.2*s,0,0,7); ctx.fill(); }
  function drawSprout(x,y,s,sway){ ctx.save(); ctx.translate(x,y);
    ctx.strokeStyle="#6b8f3e"; ctx.lineWidth=1.6*s; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.sin(sway)*2*s,-9*s); ctx.stroke();
    ctx.fillStyle="#7cb342"; ctx.beginPath(); ctx.ellipse(-3*s,-8*s,4*s,2.2*s,-0.5,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3*s,-9*s,4*s,2.2*s,0.5,0,7); ctx.fill(); ctx.restore(); }

  function drawSpecies(kind,x,y,s,sway,ripe,pop){
    const S=s*(1+pop*0.18);
    ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(sway)*0.03);
    if(kind==="lily"){ // 台灣萍蓬草：扁平浮葉 + 黃花，貼近水面
      ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(0,2*S,15*S,4*S,0,0,7); ctx.fill();
      for(const o of [[-8,1,1],[7,2,0.85],[0,-2,1.1]]){ ctx.fillStyle=mix("#3f7a3f","#5a9a4a",0.5); ctx.beginPath(); ctx.ellipse(o[0]*S,o[1]*S,7*S*o[2],4.6*S*o[2],0.2,0,7); ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(o[0]*S,o[1]*S); ctx.lineTo(o[0]*S+4*S*o[2],o[1]*S); ctx.stroke(); }
      ctx.fillStyle="#ffd54f"; ctx.beginPath(); ctx.arc(0,-4*S,3.2*S,0,7); ctx.fill();
      for(let k=0;k<6;k++){ const a=k/6*6.283; ctx.beginPath(); ctx.ellipse(Math.cos(a)*3.6*S,-4*S+Math.sin(a)*3.6*S,2*S,1*S,a,0,7); ctx.fillStyle="#ffe082"; ctx.fill(); } }
    else if(kind==="round"){ // 台灣欒樹：圓冠喬木，成熟時有金紅色蒴果點綴
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,2*S,10*S,3*S,0,0,7); ctx.fill();
      ctx.fillStyle="#6d4c2f"; ctx.fillRect(-1.4*S,-14*S,2.8*S,14*S);
      const cols=[mix("#2e7d32","#245c28",0.3),mix("#43a047","#2e7d32",0.2),mix("#66bb6a","#43a047",0.1)];
      for(let k=0;k<3;k++){ ctx.fillStyle=cols[k]; const rr=(10-k*2)*S; ctx.beginPath(); ctx.arc(-rr*0.35,-16*S-k*2*S,rr*0.62,0,7); ctx.arc(rr*0.35,-16*S-k*2*S,rr*0.62,0,7); ctx.arc(0,-19*S-k*2*S,rr*0.7,0,7); ctx.fill(); }
      if(ripe){ ctx.fillStyle="#e8734a"; for(let k=0;k<5;k++){ const a=k*1.4+sway; ctx.beginPath(); ctx.arc(Math.cos(a)*7*S,-18*S+Math.sin(a)*6*S,1.6*S,0,7); ctx.fill(); } } }
    else if(kind==="conifer"){ // 台灣杉：高聳三角形針葉巨木
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(0,2*S,8*S,2.6*S,0,0,7); ctx.fill();
      ctx.fillStyle="#5a4632"; ctx.fillRect(-1.2*S,-24*S,2.4*S,24*S);
      ctx.fillStyle=mix("#1b4d2e","#2e6b3e",0.3);
      for(let k=0;k<4;k++){ const yy=-8*S-k*7*S, w=(9-k*1.6)*S; ctx.beginPath(); ctx.moveTo(0,yy-9*S); ctx.lineTo(-w,yy); ctx.lineTo(w,yy); ctx.closePath(); ctx.fill(); } }
    else if(kind==="mangrove"){ // 水筆仔：露出支柱根的紅樹林灌叢
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(0,2*S,11*S,3.2*S,0,0,7); ctx.fill();
      ctx.strokeStyle="#5a4030"; ctx.lineWidth=1.6*S; ctx.lineCap="round";
      for(const dx of [-5,-1.5,2,5.5]){ ctx.beginPath(); ctx.moveTo(dx*S,-2*S); ctx.quadraticCurveTo(dx*1.4*S,4*S,dx*1.8*S,7*S); ctx.stroke(); }
      const cols=["#3f6b3f","#548a52"]; for(let k=0;k<2;k++){ ctx.fillStyle=cols[k]; ctx.beginPath(); ctx.ellipse(-3*S+k*6*S,-9*S-k*2*S,7*S,6*S,0,0,7); ctx.fill(); } }
    ctx.restore();
  }

  function drawSapling(kind,x,y,s,sway,pop){ drawSpecies(kind,x,y,s*0.6,sway,false,pop); }

  function drawSpot(sp){ const tile=data.tiles[sp.i], st=stageOf(tile), pos=spotPos(sp.i), s=pos.scale*18, sway=sp.sway+performance.now()/1000;
    const ripe = st==="mature" && storedOf(tile)>0;
    if(sp.popT>0) sp.popT=Math.max(0,sp.popT-0.05);
    if(st==="invasive") drawInvasive(pos.x,pos.y,pos.scale,sway);
    else if(st==="empty") drawEmpty(pos.x,pos.y,pos.scale);
    else if(st==="sprout") drawSprout(pos.x,pos.y,pos.scale,sway);
    else if(st==="sapling") drawSapling(REGION_INFO[data.region].shape,pos.x,pos.y,pos.scale,sway,sp.popT);
    else { drawSpecies(REGION_INFO[data.region].shape,pos.x,pos.y,pos.scale,sway,ripe,sp.popT);
      if(ripe){ const pl=0.5+0.5*Math.sin(performance.now()/300); ctx.save(); ctx.globalAlpha=0.5+0.4*pl; ctx.fillStyle="#fff59d";
        ctx.beginPath(); ctx.arc(pos.x,pos.y-18*pos.scale,3*pos.scale,0,7); ctx.fill(); ctx.restore();
        const stv=storedOf(tile); ctx.font="bold "+Math.round(11*pos.scale)+"px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#ffd54f"; ctx.strokeStyle="rgba(0,0,0,.6)"; ctx.lineWidth=3;
        ctx.strokeText("+"+stv,pos.x,pos.y-24*pos.scale); ctx.fillText("+"+stv,pos.x,pos.y-24*pos.scale); } }
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
    const info=REGION_INFO[data.region]||REGION_INFO.paddy, night=isNight(), w=weatherNow(), wm=WMETA[w];
    document.querySelectorAll(".hregion").forEach(b=>b.classList.toggle("on", b.dataset.r===data.region));
    $("habWeather") && ($("habWeather").textContent=(night?"🌙 夜間":"☀️ 白天")+"　"+wm.icon+" "+wm.txt);
    $("habSpecies") && ($("habSpecies").textContent="🌳 本區培育："+info.plant+"——"+info.fact);
  }
  function updateHUD(){ let totalW=0, totalStored=0;
    for(let i=0;i<N;i++){ const tile=data.tiles[i], st=stageOf(tile);
      totalW += st==="mature"?1:st==="sapling"?0.6:st==="sprout"?0.3:0;
      if(st==="mature") totalStored += storedOf(tile); }
    const pct=Math.round(totalW/N*100);
    $("habRestoreTxt") && ($("habRestoreTxt").textContent="復原度 "+pct+"%");
    $("habRestoreBar") && ($("habRestoreBar").style.width=pct+"%");
    $("habEcoTxt") && ($("habEcoTxt").textContent="🌿 可收成 "+totalStored);
  }

  /* ---------- 互動 ---------- */
  function hitTest(px,py){ let best=-1,bd=26; for(const sp of spots){ const pos=spotPos(sp.i); const d=Math.hypot(px-pos.x,py-(pos.y-10*pos.scale)); const rad=16*pos.scale+14; if(d<rad && d<bd){ bd=d; best=sp.i; } } return best; }
  function tap(i){ const tile=data.tiles[i], st=stageOf(tile);
    if(st==="invasive"){ tile.state="unplanted"; tile.emptySince=now(); }
    else if(st==="empty"){ tile.state="planted"; tile.plantedAt=now(); tile.lastCollect=now(); delete tile.emptySince; }
    else if(st==="mature"){ const s=storedOf(tile); if(s>0) harvestTile(i,tile,s); }
    const sp=spots[i]; if(sp) sp.popT=1; save(data); updateHUD(); }
  function harvestTile(i,tile,s){ window.__awardEco && window.__awardEco(s); tile.lastCollect=now();
    const pos=spotPos(i); burstAt(pos.x,pos.y-16*pos.scale);
    const info=REGION_INFO[data.region]||REGION_INFO.paddy; banner("🧺 收成 "+info.plant+" +"+s+" 保育值！"); }
  function collectAll(){ let total=0, n=0;
    for(let i=0;i<N;i++){ const tile=data.tiles[i]; if(stageOf(tile)==="mature"){ const s=storedOf(tile); if(s>0){ total+=s; n++; tile.lastCollect=now();
      const pos=spotPos(i); burstAt(pos.x,pos.y-16*pos.scale); const sp=spots[i]; if(sp) sp.popT=1; } } }
    if(total>0){ window.__awardEco && window.__awardEco(total); banner("🧺 一次收成 "+n+" 棵，共 +"+total+" 保育值！"); } else banner("目前還沒有成熟可收成的植物");
    save(data); updateHUD(); }

  function toLocal(e){ const r=cv.getBoundingClientRect();
    const dsx=e.clientX-(r.left+r.width/2), dsy=e.clientY-(r.top+r.height/2);   // 相對畫面中心的螢幕位移
    const dx = rot? dsy : dsx, dy = rot? -dsx : dsy;                            // 直握旋轉時把螢幕座標轉回世界座標
    return { x: VW/2+dx, y: VH/2+dy }; }
  if(cv) cv.addEventListener("pointerdown",(e)=>{ e.preventDefault(); const p=toLocal(e); const i=hitTest(p.x,p.y); if(i>=0) tap(i); },{passive:false});

  function setRegion(r){ if(!REGION_INFO[r]) return; data.region=r; save(data); applyTheme(); banner("🌏 已切換到"+REGION_INFO[r].label+"棲地——培育"+REGION_INFO[r].plant); }

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
  document.querySelectorAll(".hregion").forEach(b=> b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); setRegion(b.dataset.r); },{passive:false}));
})();
