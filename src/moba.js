/* 守護台灣神木 — 棲地復育保衛戰（自含模組・原創玩法，非對稱）
   設計：不對稱守護戰，沒有敵方核心/兵線/防禦塔（刻意不照 MOBA 公式）。
   你與 AI 守護者小隊保護「台灣神木」與數個「復育苗圃」，
   外來入侵種從四面湧入；擊退牠們、守住苗圃，棲地就從枯黃復原成翠綠，
   復原度滿 100% = 守護成功；神木倒下 = 失敗。
   俯視角 + 跟隨鏡頭 + 虛擬搖桿；不碰 legacy.js 的 drawCreature／dock／狀態機（鐵則）。 */
(() => {
  "use strict";
  const root = document.getElementById("moba");
  const cv = document.getElementById("mgame");
  if (!root || !cv) return;
  const ctx = cv.getContext("2d");

  /* ---------- 物種資料 ---------- */
  const KCOL = { leopard:"#e8a13a", bear:"#3b332e", cicada:"#5f9a3c", dragonfly:"#1fa3a3", deer:"#cf9a5e", magpie:"#2f6fd0",
                 snail:"#b6884a", iguana:"#54b24a", frog:"#82b24c", ibis:"#e3e9ec" };
  const KNAME = { leopard:"石虎", bear:"黑熊", cicada:"爺蟬", dragonfly:"勾蜓", deer:"梅花鹿", magpie:"藍鵲",
                  snail:"福壽螺", iguana:"綠鬣蜥", frog:"斑腿蛙", ibis:"聖䴉" };
  const GUARDIANS = ["leopard","bear","dragonfly","magpie","deer","cicada"];
  const INVADERS  = ["iguana","snail","frog","ibis"];

  /* ---------- 視窗 / 世界 ---------- */
  let VW=0, VH=0, dpr=1;
  const MW=2000, MH=1500;
  function resize(){ const r=cv.getBoundingClientRect(); VW=r.width||window.innerWidth; VH=r.height||window.innerHeight;
    dpr=Math.min(window.devicePixelRatio||1,2); cv.width=Math.round(VW*dpr); cv.height=Math.round(VH*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  window.addEventListener("resize",()=>{ if(running) resize(); });

  /* ---------- 幾何：神木置中、苗圃環繞、入侵種從邊緣湧入 ---------- */
  const SHX=MW/2, SHY=MH/2;
  const NPOS=[ {x:MW*0.5,y:MH*0.22}, {x:MW*0.24,y:MH*0.74}, {x:MW*0.76,y:MH*0.74} ];

  /* ---------- 狀態 ---------- */
  let running=false, raf=0, lastT=0, clock=0, teamSize=3, ended=false;
  let shrine=null, nurseries=[], heroes=[], invaders=[], fx=[], floats=[];
  let player=null, spawnT=0, restore=0, killCount=0;
  const cam={x:0,y:0}, mv={x:0,y:0};
  let wantSp=false, wantBack=false;

  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  /* ---------- 建立 ---------- */
  function mkHero(kind,isPlayer){ return { kind, isPlayer:!!isPlayer, x:0,y:0, r:24, hp:340, maxhp:340,
    dmg:28, range:70, cd:0.6, t:0, spCd:0, speed:isPlayer?172:150, face:0, dead:false, respawn:0, name:KNAME[kind]||kind, hitT:0 }; }
  function mkInvader(kind,elite){ const ed=elite?1:0; const p=edgePoint();
    return { kind, x:p.x, y:p.y, r:elite?30:16, hp:elite?260:56, maxhp:elite?260:56, dmg:elite?16:9, range:elite?44:32,
      cd:0.9, t:0, speed:elite?58:74, face:0, dead:false, elite, hitT:0, tgt:null }; }
  function edgePoint(){ const s=Math.floor(Math.random()*4), u=Math.random();
    if(s===0) return {x:u*MW,y:20}; if(s===1) return {x:u*MW,y:MH-20}; if(s===2) return {x:20,y:u*MH}; return {x:MW-20,y:u*MH}; }

  function setup(size){ teamSize=size; clock=0; ended=false; restore=0; killCount=0; spawnT=2;
    fx=[]; floats=[]; invaders=[];
    shrine={ x:SHX, y:SHY, r:76, hp:1500, maxhp:1500, kind:"shrine", hitT:0 };
    nurseries=NPOS.map(p=>({ x:p.x, y:p.y, r:34, hp:420, maxhp:420, growth:0.15, contested:false, kind:"nursery" }));
    const myKey=(window.__featuredKey&&window.__featuredKey())||"leopard";
    const kinds=[myKey]; for(const k of GUARDIANS){ if(kinds.length>=size) break; if(k!==myKey) kinds.push(k); }
    while(kinds.length<size) kinds.push(GUARDIANS[kinds.length%GUARDIANS.length]);
    heroes=kinds.map((k,i)=>{ const h=mkHero(k,i===0); const ang=-1.57+(i-(size-1)/2)*0.6; h.x=SHX+Math.cos(ang)*150; h.y=SHY+Math.sin(ang)*150; return h; });
    player=heroes[0];
    cam.x=clamp(player.x-VW/2,0,Math.max(0,MW-VW)); cam.y=clamp(player.y-VH/2,0,Math.max(0,MH-VH));
  }

  /* ---------- 目標 ---------- */
  function aliveNurseries(){ return nurseries.filter(n=>n.hp>0); }
  // 入侵種目標：附近的英雄優先（被擾），否則最近的苗圃/神木（破壞棲地）
  function invaderTarget(v){ let bh=null,bd=190; for(const h of heroes){ if(h.dead) continue; const d=dist(v,h); if(d<bd){bd=d;bh=h;} }
    if(bh) return bh;
    let best=shrine, bm=dist(v,shrine); for(const n of aliveNurseries()){ const d=dist(v,n); if(d<bm){bm=d;best=n;} } return best; }
  // 英雄目標：最近入侵種
  function nearestInvader(u,maxR){ let best=null,bd=maxR||1e9; for(const v of invaders){ if(v.dead) continue; const d=dist(u,v); if(d<bd){bd=d;best=v;} } return best?{e:best,d:bd}:null; }

  /* ---------- 傷害 ---------- */
  function hurt(o,amt,by){ if(o.hp<=0) return; o.hp-=amt; o.hitT=0.12;
    floats.push({x:o.x,y:o.y-o.r-6,txt:"-"+Math.round(amt),col:"#fff",life:0.55}); sparks(o.x,o.y,5,"#fff");
    if(o.hp<=0){ o.hp=0; onDeath(o,by); } }
  function onDeath(o,by){
    if(o.kind==="shrine"){ endGame(false); return; }
    if(o.kind==="nursery"){ ring(o.x,o.y,60,"#ff8a80"); toast("一處復育苗圃被毀！"); return; }
    // 入侵種
    o.dead=true; killCount++; ring(o.x,o.y,o.elite?50:24,"#cddc39");
    restore=clamp(restore+(o.elite?0.05:0.012),0,1);
    floats.push({x:o.x,y:o.y-30,txt:(o.elite?"入侵種王 ":"")+KNAME[o.kind]+" 被驅逐  🌿復原+"+(o.elite?5:1)+"%",col:"#c5e1a5",life:1.1});
  }

  /* ---------- 攻擊 ---------- */
  function meleeHit(u,tgt,dmg){ u.t=u.cd; u.face=Math.atan2(tgt.y-u.y,tgt.x-u.x);
    fx.push({type:"slash",x:u.x+Math.cos(u.face)*u.r,y:u.y+Math.sin(u.face)*u.r,a:u.face,life:0.16,max:0.16,col:u.isPlayer?"#fff59d":(u.kind&&KCOL[u.kind]?"#fff59d":"#ff8a80")});
    hurt(tgt,dmg,u); }

  /* ---------- 更新 ---------- */
  function step(dt){
    if(ended) return; clock+=dt;
    // 入侵浪潮：隨時間加速、偶有「入侵種王」
    spawnT-=dt;
    if(spawnT<=0){ const ramp=Math.min(1,clock/150); spawnT=Math.max(1.1, 3.4-ramp*2.2);
      if(invaders.length<54){ const n=1+(Math.random()<ramp?1:0); for(let i=0;i<n;i++) invaders.push(mkInvader(INVADERS[Math.floor(Math.random()*INVADERS.length)],false));
        if(clock>20 && Math.random()<0.18+ramp*0.18) invaders.push(mkInvader(INVADERS[Math.floor(Math.random()*INVADERS.length)],true)); } }

    // 入侵種
    for(const v of invaders){ if(v.dead) continue; if(v.t>0) v.t-=dt; if(v.hitT>0) v.hitT-=dt;
      const tg=invaderTarget(v); v.tgt=tg; const reach=v.range+(tg.r||0);
      if(dist(v,tg)<=reach){ if(v.t<=0){ v.t=v.cd; v.face=Math.atan2(tg.y-v.y,tg.x-v.x); hurt(tg,v.dmg,v); } }
      else { const ang=Math.atan2(tg.y-v.y,tg.x-v.x); v.face=ang; v.x+=Math.cos(ang)*v.speed*dt; v.y+=Math.sin(ang)*v.speed*dt; } }
    invaders=invaders.filter(v=>!v.dead);

    // 英雄
    for(const h of heroes){
      if(h.dead){ h.respawn-=dt; if(h.respawn<=0){ h.dead=false; h.hp=h.maxhp; h.x=SHX+(Math.random()*120-60); h.y=SHY+110; ring(h.x,h.y,40,"#66bb6a"); } continue; }
      if(h.t>0) h.t-=dt; if(h.spCd>0) h.spCd-=dt; if(h.hitT>0) h.hitT-=dt;
      if(h.isPlayer){ updatePlayer(h,dt); continue; }
      // AI 守護者：優先打靠近苗圃/神木的入侵種
      let tg=nearestInvader(h,420);
      if(tg){ const reach=h.range+tg.e.r;
        if(tg.d<=reach){ if(h.t<=0) meleeHit(h,tg.e,h.dmg); if(h.spCd<=0 && invaders.filter(v=>!v.dead&&dist(v,h)<150).length>=2) castSp(h); }
        else { const ang=Math.atan2(tg.e.y-h.y,tg.e.x-h.x); h.face=ang; h.x+=Math.cos(ang)*h.speed*dt; h.y+=Math.sin(ang)*h.speed*dt; } }
      else { // 無敵人：回防最近受威脅的苗圃，否則待在神木旁
        const target=aliveNurseries()[0]||shrine; const ang=Math.atan2(target.y-h.y,target.x-h.x); if(dist(h,target)>160){ h.x+=Math.cos(ang)*h.speed*0.6*dt; h.y+=Math.sin(ang)*h.speed*0.6*dt; } }
      keepIn(h);
    }

    // 棲地復原：苗圃安全就成長、推升復原度；被入侵種接近則停滯
    let healthy=0;
    for(const n of nurseries){ if(n.hp<=0){ n.growth=0; continue; }
      n.contested = invaders.some(v=>!v.dead && dist(v,n)<210);
      if(!n.contested){ n.growth=Math.min(1,n.growth+0.12*dt); restore=clamp(restore+0.0026*dt,0,1); healthy++; }
      else { n.growth=Math.max(0.1,n.growth-0.06*dt); } }

    // 特效 / 文字
    for(const e of fx){ e.life-=dt; if(e.type==="spark"){ e.x+=e.vx*dt; e.y+=e.vy*dt; } } fx=fx.filter(e=>e.life>0); if(fx.length>150) fx.splice(0,fx.length-150);
    for(const f of floats){ f.life-=dt; f.y-=26*dt; } floats=floats.filter(f=>f.life>0);

    // 鏡頭
    const focus=player.dead?shrine:player;
    cam.x += (clamp(focus.x-VW/2,0,Math.max(0,MW-VW))-cam.x)*Math.min(1,dt*6);
    cam.y += (clamp(focus.y-VH/2,0,Math.max(0,MH-VH))-cam.y)*Math.min(1,dt*6);

    updateHUD();
    if(restore>=1) endGame(true);
  }

  function updatePlayer(h,dt){
    const mag=Math.hypot(mv.x,mv.y);
    if(mag>0.12){ const ang=Math.atan2(mv.y,mv.x); h.face=ang; const s=h.speed*Math.min(1,mag); h.x+=Math.cos(ang)*s*dt; h.y+=Math.sin(ang)*s*dt; }
    keepIn(h);
    if(wantBack){ wantBack=false; h.x=shrine.x; h.y=shrine.y+100; h.hp=h.maxhp; ring(h.x,h.y,46,"#80deea"); toast("回到神木旁・補滿體力"); }
    if(wantSp){ wantSp=false; if(h.spCd<=0) castSp(h); }
    const tg=nearestInvader(h,h.range+44);
    if(tg && tg.d<=h.range+tg.e.r && h.t<=0) meleeHit(h,tg.e,h.dmg);
  }
  function castSp(h){ h.spCd=8; ring(h.x,h.y,135,"#fff59d"); sparks(h.x,h.y,18,"#fff59d"); floats.push({x:h.x,y:h.y-46,txt:"守護爆發!",col:"#fff59d",life:0.7});
    for(const v of invaders){ if(!v.dead && dist(h,v)<145) hurt(v,h.dmg*2.4,h); } }
  function keepIn(h){ h.x=clamp(h.x,40,MW-40); h.y=clamp(h.y,40,MH-40);
    for(const o of [shrine,...nurseries]){ if(o.hp<=0) continue; const d=dist(h,o),min=o.r+h.r; if(d<min&&d>0){ const a=Math.atan2(h.y-o.y,h.x-o.x); h.x=o.x+Math.cos(a)*min; h.y=o.y+Math.sin(a)*min; } } }

  /* ---------- 特效 ---------- */
  function sparks(x,y,n,col){ for(let i=0;i<n;i++){ const a=Math.random()*6.28,s=60+Math.random()*150; fx.push({type:"spark",x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.3+Math.random()*0.2,max:0.5,r:1.5+Math.random()*2,col}); } if(fx.length>150) fx.splice(0,fx.length-150); }
  function ring(x,y,r,col){ fx.push({type:"ring",x,y,r0:6,r1:r,life:0.32,max:0.32,col}); }
  let toastT=0; function toast(s){ const el=document.getElementById("mtoast"); if(!el) return; el.textContent=s; el.classList.add("show"); toastT=1.8; }

  /* ---------- 顏色工具 ---------- */
  function hex(h){ const n=parseInt(h.slice(1),16); return [n>>16,(n>>8)&255,n&255]; }
  function mix(a,b,t){ const A=hex(a),B=hex(b); return "rgb("+Math.round(A[0]+(B[0]-A[0])*t)+","+Math.round(A[1]+(B[1]-A[1])*t)+","+Math.round(A[2]+(B[2]-A[2])*t)+")"; }
  function shade(hexc,amt){ const c=hex(hexc); return "rgb("+clamp(c[0]+amt,0,255)+","+clamp(c[1]+amt,0,255)+","+clamp(c[2]+amt,0,255)+")"; }

  /* ---------- 繪製 ---------- */
  function render(){
    ctx.clearRect(0,0,VW,VH);
    // 棲地：枯黃(低復原) → 翠綠(高復原)
    const top=mix("#6f6a44","#3f6b34",restore), bot=mix("#574e30","#2e5226",restore);
    const g=ctx.createLinearGradient(0,0,0,VH); g.addColorStop(0,top); g.addColorStop(1,bot); ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
    ctx.save(); ctx.translate(-cam.x,-cam.y);
    drawField();
    // 依 y 疊放
    const ents=[shrine,...nurseries.filter(n=>n.hp>0)];
    for(const v of invaders) ents.push(v);
    for(const h of heroes) if(!h.dead) ents.push(h);
    ents.sort((a,b)=>a.y-b.y);
    for(const e of ents){ if(e.kind==="shrine") drawShrine(e); else if(e.kind==="nursery") drawNursery(e); else if(e.isPlayer!==undefined) drawHero(e); else drawUnit(e,e.r,true); }
    // 特效
    for(const e of fx){ const a=Math.max(0,e.life/e.max);
      if(e.type==="spark"){ ctx.globalAlpha=a; ctx.fillStyle=e.col; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,7); ctx.fill(); }
      else if(e.type==="ring"){ const rr=e.r0+(e.r1-e.r0)*(1-a); ctx.globalAlpha=a*0.9; ctx.strokeStyle=e.col; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(e.x,e.y,rr,0,7); ctx.stroke(); }
      else if(e.type==="slash"){ ctx.globalAlpha=a; ctx.strokeStyle=e.col; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(e.x,e.y,20,e.a-0.9,e.a+0.9); ctx.stroke(); }
      ctx.globalAlpha=1; }
    ctx.textAlign="center"; ctx.textBaseline="middle";
    for(const f of floats){ ctx.globalAlpha=Math.min(1,f.life*1.8); ctx.fillStyle=f.col; ctx.font="bold 14px sans-serif"; ctx.fillText(f.txt,f.x,f.y); ctx.globalAlpha=1; }
    ctx.restore();
    if(toastT>0){ toastT-=0.016; if(toastT<=0){ const el=document.getElementById("mtoast"); if(el) el.classList.remove("show"); } }
  }

  function drawField(){
    // 復原綠意：苗圃周圍隨成長擴散的翠綠地塊
    for(const n of nurseries){ if(n.hp<=0) continue; const R=120+n.growth*260;
      const gg=ctx.createRadialGradient(n.x,n.y,10,n.x,n.y,R); gg.addColorStop(0,"rgba(102,187,106,"+(0.32*n.growth+0.06).toFixed(3)+")"); gg.addColorStop(1,"rgba(102,187,106,0)");
      ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(n.x,n.y,R,0,7); ctx.fill(); }
    // 神木周圍的核心綠意（隨總復原度）
    const Rs=200+restore*420; const gs=ctx.createRadialGradient(shrine.x,shrine.y,20,shrine.x,shrine.y,Rs);
    gs.addColorStop(0,"rgba(129,199,132,"+(0.28*restore+0.05).toFixed(3)+")"); gs.addColorStop(1,"rgba(129,199,132,0)"); ctx.fillStyle=gs; ctx.beginPath(); ctx.arc(shrine.x,shrine.y,Rs,0,7); ctx.fill();
    // 灌木/枯枝裝飾（固定位置；復原低時偏枯）
    for(let i=0;i<70;i++){ const x=hgrid(i,1), y=hgrid(i,2); if(dist({x,y},shrine)<90) continue;
      ctx.fillStyle = (i%5===0)? mix("#5a4a2a","#2f5a26",restore) : mix("#6a6038","#2e7d32",restore);
      ctx.globalAlpha=0.5; ctx.beginPath(); ctx.arc(x,y,8+(i%3)*4,0,7); ctx.fill(); ctx.globalAlpha=1; } }
  function hgrid(i,k){ const s=Math.sin(i*(k===1?127.1:311.7)+k)*43758.5; const f=s-Math.floor(s); return f*(k===1?MW:MH); }

  function drawShrine(n){
    ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(n.x,n.y+n.r*0.5,n.r*1.1,n.r*0.4,0,0,7); ctx.fill();
    ctx.fillStyle="#6d4c2f"; ctx.fillRect(n.x-16,n.y-6,32,n.r*0.75);
    const cols=["#2e7d32","#43a047","#66bb6a"];
    for(let i=0;i<3;i++){ ctx.fillStyle=cols[i]; const rr=n.r*(1-i*0.2);
      ctx.beginPath(); ctx.arc(n.x-rr*0.42,n.y-n.r*0.3,rr*0.72,0,7); ctx.arc(n.x+rr*0.42,n.y-n.r*0.3,rr*0.72,0,7); ctx.arc(n.x,n.y-n.r*0.72,rr*0.78,0,7); ctx.fill(); }
    const gl=ctx.createRadialGradient(n.x,n.y-n.r*0.4,4,n.x,n.y-n.r*0.4,n.r*1.7); gl.addColorStop(0,"rgba(197,225,165,0.4)"); gl.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(n.x,n.y-n.r*0.4,n.r*1.7,0,7); ctx.fill();
    ctx.lineWidth=6; ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(n.x,n.y-n.r*0.4,n.r*1.05,0,7); ctx.stroke();
    ctx.strokeStyle=n.hp/n.maxhp>0.3?"#66bb6a":"#ef5350"; ctx.beginPath(); ctx.arc(n.x,n.y-n.r*0.4,n.r*1.05,-1.57,-1.57+6.283*(n.hp/n.maxhp)); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font="bold 16px sans-serif"; ctx.textAlign="center"; ctx.fillText("🌳 台灣神木",n.x,n.y+n.r*0.92);
  }
  function drawNursery(n){
    ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(n.x,n.y+n.r*0.4,n.r,n.r*0.4,0,0,7); ctx.fill();
    // 土圃
    ctx.fillStyle="#6d4c33"; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,7); ctx.fill();
    // 苗（隨成長變多/變綠）
    const k=Math.round(3+n.growth*5); for(let i=0;i<k;i++){ const a=i/k*6.283, rr=n.r*0.55; ctx.fillStyle=mix("#9e8b4a","#43a047",n.growth);
      const sx=n.x+Math.cos(a)*rr*0.6, sy=n.y+Math.sin(a)*rr*0.6; ctx.beginPath(); ctx.ellipse(sx,sy-6-n.growth*8,3,7+n.growth*7,0,0,7); ctx.fill(); }
    if(n.contested){ ctx.strokeStyle="#ff7043"; ctx.lineWidth=3; ctx.setLineDash([6,5]); ctx.beginPath(); ctx.arc(n.x,n.y,n.r+8,0,7); ctx.stroke(); ctx.setLineDash([]); }
    bar(n.x,n.y-n.r-10,52,n.hp/n.maxhp,"#9ccc65");
    ctx.fillStyle="#fff"; ctx.font="bold 11px sans-serif"; ctx.textAlign="center"; ctx.fillText("🌱 復育苗圃",n.x,n.y+n.r+14);
  }
  function drawUnit(u,r,isInv){ const col=KCOL[u.kind]||"#888";
    ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(u.x,u.y+r*0.55,r*0.95,r*0.4,0,0,7); ctx.fill();
    ctx.fillStyle=isInv?"rgba(239,83,80,0.5)":"rgba(102,187,106,0.55)"; ctx.beginPath(); ctx.arc(u.x,u.y,r*1.05,0,7); ctx.fill();
    ctx.fillStyle=u.hitT>0?"#fff":col; ctx.beginPath(); ctx.ellipse(u.x,u.y,r*0.85,r*0.78,0,0,7); ctx.fill();
    drawKindTop(u,r,col);
    if(isInv){ if(u.elite){ ctx.fillStyle="#ffca28"; ctx.font="bold 11px sans-serif"; ctx.textAlign="center"; ctx.fillText("👑"+KNAME[u.kind]+"王",u.x,u.y-r-9); }
      if(u.hp<u.maxhp) bar(u.x,u.y-r-7,u.elite?40:26,u.hp/u.maxhp,"#ff8a80"); } }
  function drawHero(h){ const r=h.r; drawUnit(h,r,false);
    if(h.isPlayer){ ctx.strokeStyle="#ffd54f"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(h.x,h.y,r*1.3,0,7); ctx.stroke();
      ctx.fillStyle="#ffd54f"; ctx.beginPath(); ctx.moveTo(h.x,h.y-r*1.85); ctx.lineTo(h.x-7,h.y-r*1.45); ctx.lineTo(h.x+7,h.y-r*1.45); ctx.fill(); }
    bar(h.x,h.y-r-12,42,h.hp/h.maxhp,"#66bb6a");
    ctx.fillStyle="#fff"; ctx.font="bold 12px sans-serif"; ctx.textAlign="center"; ctx.fillText(h.name,h.x,h.y-r-18); }
  function drawKindTop(u,r,col){ const fx2=Math.cos(u.face), fy=Math.sin(u.face); const dark=shade(col,-30), lite=shade(col,30);
    if(u.kind==="leopard"||u.kind==="deer"){ ctx.fillStyle=dark; ctx.beginPath(); ctx.arc(u.x-r*0.5,u.y-r*0.55,r*0.22,0,7); ctx.arc(u.x+r*0.5,u.y-r*0.55,r*0.22,0,7); ctx.fill();
      if(u.kind==="leopard"){ ctx.fillStyle="rgba(60,40,20,0.6)"; for(const o of [[-.3,-.1],[.25,.05],[0,.3]]){ ctx.beginPath(); ctx.arc(u.x+o[0]*r,u.y+o[1]*r,r*0.12,0,7); ctx.fill(); } } }
    else if(u.kind==="bear"||u.kind==="iguana"){ ctx.fillStyle=dark; ctx.beginPath(); ctx.arc(u.x-r*0.45,u.y-r*0.5,r*0.2,0,7); ctx.arc(u.x+r*0.45,u.y-r*0.5,r*0.2,0,7); ctx.fill();
      if(u.kind==="iguana"){ ctx.fillStyle=lite; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(u.x+i*r*0.18,u.y-r*0.8); ctx.lineTo(u.x+i*r*0.18-3,u.y-r*0.5); ctx.lineTo(u.x+i*r*0.18+3,u.y-r*0.5); ctx.fill(); } } }
    else if(u.kind==="dragonfly"||u.kind==="cicada"){ ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.save(); ctx.translate(u.x,u.y); ctx.rotate(u.face); for(const s of [-1,1]){ ctx.beginPath(); ctx.ellipse(0,s*r*0.7,r*0.8,r*0.3,0,0,7); ctx.fill(); } ctx.restore(); }
    else if(u.kind==="magpie"||u.kind==="ibis"){ ctx.fillStyle=u.kind==="ibis"?"#222":"#0b3b8c"; ctx.beginPath(); ctx.arc(u.x+fx2*r*0.5,u.y+fy*r*0.5,r*0.3,0,7); ctx.fill();
      ctx.strokeStyle=u.kind==="ibis"?"#222":"#e8a13a"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(u.x+fx2*r*0.6,u.y+fy*r*0.6); ctx.lineTo(u.x+fx2*r*1.2,u.y+fy*r*1.2); ctx.stroke(); }
    else if(u.kind==="snail"){ ctx.strokeStyle=dark; ctx.lineWidth=4; ctx.beginPath(); for(let a=0;a<12;a++){ const rr=r*0.7*(1-a/16); ctx.lineTo(u.x+Math.cos(a*0.9)*rr,u.y+Math.sin(a*0.9)*rr); } ctx.stroke(); }
    else if(u.kind==="frog"){ ctx.fillStyle=dark; ctx.beginPath(); ctx.arc(u.x-r*0.4,u.y-r*0.45,r*0.22,0,7); ctx.arc(u.x+r*0.4,u.y-r*0.45,r*0.22,0,7); ctx.fill(); ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(u.x-r*0.4,u.y-r*0.48,r*0.1,0,7); ctx.arc(u.x+r*0.4,u.y-r*0.48,r*0.1,0,7); ctx.fill(); }
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(u.x+fx2*r*0.42-fy*r*0.18,u.y+fy*r*0.42+fx2*r*0.18,r*0.13,0,7); ctx.arc(u.x+fx2*r*0.42+fy*r*0.18,u.y+fy*r*0.42-fx2*r*0.18,r*0.13,0,7); ctx.fill();
    ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(u.x+fx2*r*0.5-fy*r*0.18,u.y+fy*r*0.5+fx2*r*0.18,r*0.06,0,7); ctx.arc(u.x+fx2*r*0.5+fy*r*0.18,u.y+fy*r*0.5-fx2*r*0.18,r*0.06,0,7); ctx.fill(); }
  function bar(x,y,w,frac,col){ ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(x-w/2,y,w,5); ctx.fillStyle=col; ctx.fillRect(x-w/2,y,w*clamp(frac,0,1),5); }

  /* ---------- HUD ---------- */
  function updateHUD(){ setW("mhpAlly",shrine.hp/shrine.maxhp); txt("mhpAllyTxt",Math.ceil(shrine.hp));
    setW("mRestore",restore); txt("mRestoreTxt",Math.floor(restore*100)+"%");
    const mm=Math.floor(clock/60),ss=Math.floor(clock%60); txt("mclock",mm+":"+(ss<10?"0":"")+ss);
    const sp=document.getElementById("mSp"); if(sp){ const cd=player&&player.spCd>0?player.spCd:0; sp.querySelector(".fill").style.height=(cd/8*100)+"%"; sp.classList.toggle("ready",cd<=0); } }
  function setW(id,f){ const el=document.getElementById(id); if(el) el.style.width=(clamp(f,0,1)*100)+"%"; }
  function txt(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }

  /* ---------- 迴圈 / 流程 ---------- */
  function loop(ts){ if(!running) return; const dt=Math.min(0.04,(ts-lastT)/1000||0); lastT=ts; step(dt); render(); raf=requestAnimationFrame(loop); }
  function start(size){ root.classList.remove("mhide"); hide("mpick"); hide("mover"); resize(); setup(size); running=true; ended=false; lastT=0; raf=requestAnimationFrame(loop); }
  function stop(){ running=false; cancelAnimationFrame(raf); }
  function exitToLobby(){ stop(); root.classList.add("mhide"); hide("mover"); hide("mpick"); mv.x=mv.y=0; if(window.__lobbyRefresh) window.__lobbyRefresh(); }
  function endGame(win){ if(ended) return; ended=true; running=false; cancelAnimationFrame(raf);
    if(win){ const eco=teamSize*20+killCount, key=(window.__featuredKey&&window.__featuredKey())||"leopard", xp=60+teamSize*10+killCount;
      if(window.__awardEco) window.__awardEco(eco); if(window.__awardXP) window.__awardXP(key,xp); if(window.__bumpWin) window.__bumpWin();
      showOver("🌳 棲地復原成功！","枯黃的土地重新長回翠綠","你和守護者小隊驅逐了外來入侵種、守住台灣神木與復育苗圃。<br>🌿 保育值 +"+eco+"　驅逐 "+killCount+" 隻入侵種　"+(KNAME[key]||"")+" EXP +"+xp); }
    else showOver("神木倒下了…","棲地失守","別氣餒！多回防受威脅的苗圃、善用『守護爆發』與『回神木』補血，再守一次。"); }
  function showOver(t,s,b){ root.classList.add("mhide"); txt("moverT",t); txt("moverS",s); const el=document.getElementById("moverB"); if(el) el.innerHTML=b;
    document.getElementById("moverAgain").textContent="⚔ 再守一場"; show("mover"); }
  function show(id){ const e=document.getElementById(id); if(e) e.classList.remove("hide"); }
  function hide(id){ const e=document.getElementById(id); if(e) e.classList.add("hide"); }

  /* ---------- 控制：虛擬搖桿 ---------- */
  const stick=document.getElementById("mstick"), knob=document.getElementById("mknob");
  let stickId=null, sc={x:0,y:0};
  function stickStart(e){ e.preventDefault(); const r=stick.getBoundingClientRect(); sc.x=r.left+r.width/2; sc.y=r.top+r.height/2; stickId=e.pointerId; stick.setPointerCapture&&stick.setPointerCapture(e.pointerId); stickMove(e); }
  function stickMove(e){ if(stickId!==e.pointerId) return; e.preventDefault(); const dx=e.clientX-sc.x, dy=e.clientY-sc.y, R=58, d=Math.hypot(dx,dy)||1, cd=Math.min(d,R), nx=dx/d*cd, ny=dy/d*cd; mv.x=nx/R; mv.y=ny/R; knob.style.transform="translate("+nx+"px,"+ny+"px)"; }
  function stickEnd(e){ if(stickId!==e.pointerId) return; e.preventDefault(); stickId=null; mv.x=mv.y=0; knob.style.transform="translate(0,0)"; }
  if(stick){ stick.addEventListener("pointerdown",stickStart,{passive:false}); stick.addEventListener("pointermove",stickMove,{passive:false}); stick.addEventListener("pointerup",stickEnd,{passive:false}); stick.addEventListener("pointercancel",stickEnd,{passive:false}); stick.addEventListener("pointerleave",stickEnd,{passive:false}); }
  const tap=(id,fn)=>{ const e=document.getElementById(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); };
  tap("mSp",()=>{ wantSp=true; }); tap("mBack",()=>{ wantBack=true; });

  /* ---------- 接到大廳「對戰」 ---------- */
  function openPick(){ const e=document.getElementById("mpick"); if(e) e.classList.remove("hide"); }
  const pb=document.getElementById("playBtn"); if(pb) pb.onclick=openPick;
  tap("pick3",()=>start(3)); tap("pick5",()=>start(5)); tap("pickBack",()=>hide("mpick"));
  tap("moverAgain",()=>start(teamSize)); tap("moverHome",exitToLobby);
  window.addEventListener("keydown",(e)=>{ if(!running) return; if(e.key==="ArrowLeft"||e.key==="a")mv.x=-1; else if(e.key==="ArrowRight"||e.key==="d")mv.x=1; else if(e.key==="ArrowUp"||e.key==="w")mv.y=-1; else if(e.key==="ArrowDown"||e.key==="s")mv.y=1; else if(e.key==="k"||e.key==="Shift")wantSp=true; else if(e.key==="b")wantBack=true; });
  window.addEventListener("keyup",(e)=>{ if(["ArrowLeft","a","ArrowRight","d"].includes(e.key))mv.x=0; if(["ArrowUp","w","ArrowDown","s"].includes(e.key))mv.y=0; });

  window.MOBA={ start, exit:exitToLobby };
})();
