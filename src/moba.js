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
  // 各物種體型/身形（讓每隻一眼就不同：大小、身體長寬比）
  const KCFG = {
    leopard:{sz:1.02, long:1.05, wide:0.72}, bear:{sz:1.30, long:0.98, wide:0.94},
    deer:{sz:1.16, long:1.10, wide:0.56},    dragonfly:{sz:0.82, long:1.35, wide:0.24},
    cicada:{sz:0.90, long:0.88, wide:0.52},   magpie:{sz:0.96, long:1.00, wide:0.60},
    iguana:{sz:1.14, long:1.30, wide:0.52},   snail:{sz:1.04, long:0.92, wide:0.74},
    frog:{sz:1.08, long:0.82, wide:0.98},     ibis:{sz:1.10, long:1.04, wide:0.58}
  };
  const kcfg=(k)=>KCFG[k]||{sz:1,long:1,wide:0.74};

  /* ---------- 視窗 / 世界 ---------- */
  let VW=0, VH=0, dpr=1, rot=false;
  const MW=2000, MH=1500;
  function resize(){ const iw=window.innerWidth, ih=window.innerHeight;
    rot = ih>iw;                              // 直握 → 旋轉成橫向
    root.classList.toggle("rot", rot);
    VW = rot? ih : iw; VH = rot? iw : ih;     // 邏輯畫面一律為橫向（寬>高）
    ZMIN=Math.max(0.62, VW/(MW-40), VH/(MH-40)); if(zoom<ZMIN) zoom=ZMIN;   // 視角不得超出世界邊界
    dpr=Math.min(window.devicePixelRatio||1,2); cv.width=Math.round(VW*dpr); cv.height=Math.round(VH*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  window.addEventListener("resize",()=>{ if(running) resize(); });
  window.addEventListener("orientationchange",()=>{ if(running) setTimeout(resize,60); });

  /* ---------- 幾何：神木置中、苗圃環繞、入侵種從邊緣湧入 ---------- */
  const SHX=MW/2, SHY=MH/2;
  const NPOS=[ {x:MW*0.5,y:MH*0.22}, {x:MW*0.24,y:MH*0.74}, {x:MW*0.76,y:MH*0.74} ];

  /* ---------- 狀態 ---------- */
  let running=false, raf=0, lastT=0, clock=0, teamSize=3, ended=false;
  let shrine=null, nurseries=[], heroes=[], invaders=[], fx=[], floats=[], hprojs=[];
  let player=null, spawnT=0, restore=0, killCount=0, surgeT=45, finalAssault=false, mshake=0;
  const cam={x:0,y:0}, mv={x:0,y:0};
  let wantSp=false, wantBack=false;
  let zoom=1, ZMIN=0.62; const ZMAX=1.8;
  function setZoom(z){ zoom=clamp(z,ZMIN,ZMAX); }

  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  /* ---------- 建立 ---------- */
  function mkHero(kind,isPlayer){ return { kind, isPlayer:!!isPlayer, x:0,y:0, r:24, hp:340, maxhp:340,
    dmg:28, range:70, cd:0.6, t:0, spCd:0, speed:isPlayer?172:150, face:0, dead:false, respawn:0, name:KNAME[kind]||kind,
    hitT:0, anim:0, moving:false, phase:Math.random()*6.28, atkA:0 }; }
  function mkInvader(kind,elite){ const p=edgePoint(), scale=1+Math.min(1.3,clock/120)*0.6; // 隨時間越來越強
    const hp=Math.round((elite?300:64)*scale);
    return { kind, x:p.x, y:p.y, r:elite?30:16, hp, maxhp:hp, dmg:Math.round((elite?18:10)*scale), range:elite?44:32,
      cd:0.9, t:0, speed:elite?62:82, face:0, dead:false, elite, hitT:0, tgt:null, anim:0, moving:false, phase:Math.random()*6.28, atkA:0, stun:0 }; }
  function edgePoint(){ const s=Math.floor(Math.random()*4), u=Math.random();
    if(s===0) return {x:u*MW,y:20}; if(s===1) return {x:u*MW,y:MH-20}; if(s===2) return {x:20,y:u*MH}; return {x:MW-20,y:u*MH}; }

  function setup(size){ teamSize=size; clock=0; ended=false; restore=0; killCount=0; spawnT=2; surgeT=42; finalAssault=false;
    fx=[]; floats=[]; invaders=[]; hprojs=[];
    shrine={ x:SHX, y:SHY, r:76, hp:1400, maxhp:1400, kind:"shrine", hitT:0 };
    nurseries=NPOS.map(p=>({ x:p.x, y:p.y, r:34, hp:340, maxhp:340, growth:0.15, contested:false, kind:"nursery" }));
    const myKey=(window.__featuredKey&&window.__featuredKey())||"leopard";
    const kinds=[myKey]; for(const k of GUARDIANS){ if(kinds.length>=size) break; if(k!==myKey) kinds.push(k); }
    while(kinds.length<size) kinds.push(GUARDIANS[kinds.length%GUARDIANS.length]);
    heroes=kinds.map((k,i)=>{ const h=mkHero(k,i===0); const ang=-1.57+(i-(size-1)/2)*0.6; h.x=SHX+Math.cos(ang)*150; h.y=SHY+Math.sin(ang)*150;
      const lv=(window.__heroLevel&&window.__heroLevel(k))||1; h.level=lv; h.maxhp=Math.round(h.maxhp*(1+(lv-1)*0.03)); h.hp=h.maxhp; h.dmg=Math.round(h.dmg*(1+(lv-1)*0.02));
      h.spMax=(SKILL[k]&&SKILL[k].cd)||7; return h; });
    player=heroes[0];
    cam.x=clamp(player.x-VW/2,0,Math.max(0,MW-VW)); cam.y=clamp(player.y-VH/2,0,Math.max(0,MH-VH));
  }

  /* ---------- 目標 ---------- */
  function aliveNurseries(){ return nurseries.filter(n=>n.hp>0); }
  // 入侵種目標：精英直取神木施壓；一般兵近處英雄優先，否則最近苗圃/神木
  function invaderTarget(v){ if(v.elite) return shrine;
    let bh=null,bd=170; for(const h of heroes){ if(h.dead) continue; const d=dist(v,h); if(d<bd){bd=d;bh=h;} }
    if(bh) return bh;
    let best=shrine, bm=dist(v,shrine); for(const n of aliveNurseries()){ const d=dist(v,n); if(d<bm){bm=d;best=n;} } return best; }
  // 英雄目標：最近入侵種
  function nearestInvader(u,maxR){ let best=null,bd=maxR||1e9; for(const v of invaders){ if(v.dead) continue; const d=dist(u,v); if(d<bd){bd=d;best=v;} } return best?{e:best,d:bd}:null; }

  /* ---------- 傷害 ---------- */
  function knock(o,fromX,fromY,amt){ if(!('elite' in o)) return; const a=Math.atan2(o.y-fromY,o.x-fromX), k=o.elite?amt*0.3:amt; o.x+=Math.cos(a)*k; o.y+=Math.sin(a)*k; }
  function hurt(o,amt,by){ if(o.hp<=0) return; o.hp-=amt; o.hitT=0.14; const big=amt>=40;
    floats.push({x:o.x,y:o.y-o.r-6,txt:"-"+Math.round(amt),col:big?"#fff59d":"#fff",life:0.6,big}); sparks(o.x,o.y,big?9:5,big?"#fff59d":"#fff");
    if(o.hp<=0){ o.hp=0; onDeath(o,by); } }
  function onDeath(o,by){
    if(o.kind==="shrine"){ endGame(false); return; }
    if(o.kind==="nursery"){ ring(o.x,o.y,60,"#ff8a80"); toast("一處復育苗圃被毀！"); return; }
    // 入侵種
    o.dead=true; killCount++; ring(o.x,o.y,o.elite?60:26,"#cddc39"); sparks(o.x,o.y,o.elite?26:12,o.elite?"#ffca28":"#cddc39");
    if(o.elite){ mshake=Math.max(mshake,10); ring(o.x,o.y,90,"#ffca28"); }
    restore=clamp(restore+(o.elite?0.05:0.012),0,1);
    floats.push({x:o.x,y:o.y-30,txt:(o.elite?"入侵種王 ":"")+KNAME[o.kind]+" 被驅逐  🌿復原+"+(o.elite?5:1)+"%",col:"#c5e1a5",life:1.1});
  }

  /* ---------- 攻擊 ---------- */
  function meleeHit(u,tgt,dmg){ u.t=u.cd; u.atkA=0.2; u.face=Math.atan2(tgt.y-u.y,tgt.x-u.x);
    fx.push({type:"slash",x:u.x+Math.cos(u.face)*u.r,y:u.y+Math.sin(u.face)*u.r,a:u.face,life:0.16,max:0.16,col:"#fff59d"});
    hurt(tgt,dmg,u); knock(tgt,u.x,u.y,u.isPlayer?15:11); if(u.isPlayer) mshake=Math.max(mshake,4); }

  /* ---------- 更新 ---------- */
  function step(dt){
    if(ended) return; clock+=dt; if(mshake>0) mshake=Math.max(0,mshake-dt*38);
    // 入侵浪潮：更兇、隨時間加速、精英「入侵種王」
    const RK=()=>INVADERS[Math.floor(Math.random()*INVADERS.length)];
    const pushInv=(el)=>{ if(invaders.length<80) invaders.push(mkInvader(RK(),el)); };
    spawnT-=dt;
    if(spawnT<=0){ const ramp=Math.min(1,clock/110); spawnT=Math.max(0.8, 3.0-ramp*2.0);
      const n=2+(Math.random()<ramp?1:0); for(let i=0;i<n;i++) pushInv(false);
      if(clock>15 && Math.random()<0.2+ramp*0.28) pushInv(true); }
    surgeT-=dt; if(surgeT<=0){ surgeT=42; toast("⚠ 入侵潮來襲！"); const c=3+Math.floor(clock/45); for(let i=0;i<c;i++) pushInv(false); pushInv(true); }
    if(restore>=0.75 && !finalAssault){ finalAssault=true; toast("⚠ 最終反撲・守住神木！"); for(let i=0;i<6;i++) pushInv(false); pushInv(true); pushInv(true); }

    // 入侵種
    for(const v of invaders){ if(v.dead) continue; if(v.hitT>0) v.hitT-=dt;
      if(v.stun>0){ v.stun-=dt; v.moving=false; continue; }   // 被震暈：不動不攻
      if(v.t>0) v.t-=dt; if(v.atkA>0) v.atkA-=dt; v.moving=false;
      const tg=invaderTarget(v); v.tgt=tg; const reach=v.range+(tg.r||0);
      if(dist(v,tg)<=reach){ if(v.t<=0){ v.t=v.cd; v.face=Math.atan2(tg.y-v.y,tg.x-v.x); v.atkA=0.2; hurt(tg,v.dmg,v); } }
      else { const ang=Math.atan2(tg.y-v.y,tg.x-v.x); v.face=ang; v.x+=Math.cos(ang)*v.speed*dt; v.y+=Math.sin(ang)*v.speed*dt; v.moving=true; v.anim+=dt; } }
    invaders=invaders.filter(v=>!v.dead);

    // 守護者技能投射物（疾風刃，可穿透）
    for(const p of hprojs){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      for(const v of invaders){ if(v.dead||p.hits.indexOf(v)>=0) continue; if(dist(p,v)<v.r+11){ hurt(v,p.dmg,{isPlayer:true}); knock(v,p.x-p.vx*0.02,p.y-p.vy*0.02,16); p.hits.push(v); p.pierce--; } }
      if(p.pierce<=0) p.life=0; }
    hprojs=hprojs.filter(p=>p.life>0 && p.x>-40 && p.x<MW+40 && p.y>-40 && p.y<MH+40);

    // 英雄
    for(const h of heroes){
      if(h.dead){ h.respawn-=dt; if(h.respawn<=0){ h.dead=false; h.hp=h.maxhp; h.x=SHX+(Math.random()*120-60); h.y=SHY+110; ring(h.x,h.y,40,"#66bb6a"); } continue; }
      if(h.t>0) h.t-=dt; if(h.spCd>0) h.spCd-=dt; if(h.hitT>0) h.hitT-=dt; if(h.atkA>0) h.atkA-=dt; h.moving=false;
      if(h.isPlayer){ updatePlayer(h,dt); continue; }
      // AI 守護者：優先打靠近苗圃/神木的入侵種
      let tg=nearestInvader(h,420);
      if(tg){ const reach=h.range+tg.e.r;
        if(tg.d<=reach){ if(h.t<=0) meleeHit(h,tg.e,h.dmg); if(h.spCd<=0 && invaders.filter(v=>!v.dead&&dist(v,h)<150).length>=2) castSp(h); }
        else { const ang=Math.atan2(tg.e.y-h.y,tg.e.x-h.x); h.face=ang; h.x+=Math.cos(ang)*h.speed*dt; h.y+=Math.sin(ang)*h.speed*dt; h.moving=true; h.anim+=dt; } }
      else { // 無敵人：回防最近受威脅的苗圃，否則待在神木旁
        const target=aliveNurseries()[0]||shrine; const ang=Math.atan2(target.y-h.y,target.x-h.x); if(dist(h,target)>160){ h.x+=Math.cos(ang)*h.speed*0.6*dt; h.y+=Math.sin(ang)*h.speed*0.6*dt; h.moving=true; h.anim+=dt; } }
      keepIn(h);
    }

    // 棲地復原：苗圃安全就成長、推升復原度；被入侵種接近則停滯
    let healthy=0;
    for(const n of nurseries){ if(n.hp<=0){ n.growth=0; continue; }
      n.contested = invaders.some(v=>!v.dead && dist(v,n)<210);
      if(!n.contested){ n.growth=Math.min(1,n.growth+0.12*dt); restore=clamp(restore+0.0018*dt,0,1); healthy++; }
      else { n.growth=Math.max(0.1,n.growth-0.06*dt); } }

    // 特效 / 文字
    for(const e of fx){ e.life-=dt; if(e.type==="spark"){ e.x+=e.vx*dt; e.y+=e.vy*dt; } } fx=fx.filter(e=>e.life>0); if(fx.length>150) fx.splice(0,fx.length-150);
    for(const f of floats){ f.life-=dt; f.y-=26*dt; } floats=floats.filter(f=>f.life>0);

    // 鏡頭（依縮放調整可視範圍）
    const vw=VW/zoom, vh=VH/zoom, focus=player.dead?shrine:player;
    cam.x += (clamp(focus.x-vw/2,0,Math.max(0,MW-vw))-cam.x)*Math.min(1,dt*6);
    cam.y += (clamp(focus.y-vh/2,0,Math.max(0,MH-vh))-cam.y)*Math.min(1,dt*6);

    updateHUD();
    if(restore>=1) endGame(true);
  }

  function updatePlayer(h,dt){
    const mag=Math.hypot(mv.x,mv.y);
    if(mag>0.12){ const ang=Math.atan2(mv.y,mv.x); h.face=ang; const s=h.speed*Math.min(1,mag); h.x+=Math.cos(ang)*s*dt; h.y+=Math.sin(ang)*s*dt; h.moving=true; h.anim+=dt; }
    keepIn(h);
    if(wantBack){ wantBack=false; h.x=shrine.x; h.y=shrine.y+100; h.hp=h.maxhp; ring(h.x,h.y,46,"#80deea"); toast("回到神木旁・補滿體力"); }
    if(wantSp){ wantSp=false; if(h.spCd<=0) castSp(h); }
    const tg=nearestInvader(h,h.range+60);
    h.aim=(tg && tg.d<=h.range+tg.e.r+40 && !tg.e.dead)? tg.e : null;
    if(tg && tg.d<=h.range+tg.e.r && h.t<=0) meleeHit(h,tg.e,h.dmg);
  }
  // 點到線段距離（突進命中判定）
  function segDist(px,py,ax,ay,bx,by){ const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1; let t=((px-ax)*dx+(py-ay)*dy)/l2; t=clamp(t,0,1); return Math.hypot(px-(ax+t*dx),py-(ay+t*dy)); }
  // 每隻守護者的專屬技能
  function skDash(h){ const ang=(h.aim&&!h.aim.dead)?Math.atan2(h.aim.y-h.y,h.aim.x-h.x):h.face;
    const ex=clamp(h.x+Math.cos(ang)*210,40,MW-40), ey=clamp(h.y+Math.sin(ang)*210,40,MH-40);
    fx.push({type:"streak",x:h.x,y:h.y,x2:ex,y2:ey,life:0.25,max:0.25,col:"#fff59d"});
    for(const v of invaders){ if(!v.dead && segDist(v.x,v.y,h.x,h.y,ex,ey)<46){ hurt(v,h.dmg*2.2,h); knock(v,h.x,h.y,34); } }
    h.x=ex; h.y=ey; ring(ex,ey,60,"#fff59d"); sparks(ex,ey,16,"#fff59d"); }
  function skDive(h){ const tg=nearestInvader(h,650); const ex=clamp(tg?tg.e.x:h.x+Math.cos(h.face)*180,40,MW-40), ey=clamp(tg?tg.e.y:h.y+Math.sin(h.face)*180,40,MH-40);
    fx.push({type:"streak",x:h.x,y:h.y,x2:ex,y2:ey,life:0.22,max:0.22,col:"#4fc3f7"}); h.x=ex; h.y=ey; ring(ex,ey,95,"#4fc3f7"); sparks(ex,ey,20,"#81d4fa");
    for(const v of invaders){ if(!v.dead && dist({x:ex,y:ey},v)<95){ hurt(v,h.dmg*2.6,h); knock(v,ex,ey,30); } } }
  function skSlam(h){ ring(h.x,h.y,175,"#ffd54f"); ring(h.x,h.y,118,"#ffe082"); sparks(h.x,h.y,26,"#ffd54f"); mshake=Math.max(mshake,11);
    for(const v of invaders){ if(!v.dead && dist(h,v)<175){ hurt(v,h.dmg*2.4,h); knock(v,h.x,h.y,60); v.stun=Math.max(v.stun,1.2); } } }
  function skSonic(h){ ring(h.x,h.y,215,"#b3e5fc"); ring(h.x,h.y,150,"#e1f5fe"); sparks(h.x,h.y,24,"#b3e5fc"); mshake=Math.max(mshake,8);
    for(const v of invaders){ if(!v.dead && dist(h,v)<215){ hurt(v,h.dmg*1.8,h); knock(v,h.x,h.y,40); v.stun=Math.max(v.stun,1.6); } } }
  function skShoot(h){ for(let i=-1;i<=1;i++){ const a=h.face+i*0.24; hprojs.push({x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r,vx:Math.cos(a)*540,vy:Math.sin(a)*540,dmg:h.dmg*1.6,life:1.1,hits:[],pierce:3,col:"#b2ff59"}); } }
  function skHeal(h){ ring(h.x,h.y,210,"#a5d6a7"); sparks(h.x,h.y,22,"#a5d6a7");
    for(const a of heroes){ if(!a.dead && dist(h,a)<210){ a.hp=Math.min(a.maxhp,a.hp+120); floats.push({x:a.x,y:a.y-a.r-12,txt:"+120",col:"#a5d6a7",life:0.9}); } }
    for(const v of invaders){ if(!v.dead && dist(h,v)<155) knock(v,h.x,h.y,52); } }
  const SKILL={ leopard:{name:"閃電突進",cd:6,fn:skDash}, bear:{name:"震地",cd:9,fn:skSlam}, cicada:{name:"音爆",cd:9,fn:skSonic},
    dragonfly:{name:"疾風刃",cd:6,fn:skShoot}, magpie:{name:"俯衝啄擊",cd:6,fn:skDive}, deer:{name:"復育號角",cd:8,fn:skHeal} };
  function castSp(h){ const s=SKILL[h.kind]; h.spCd=(s&&s.cd)||7; h.atkA=0.3;
    if(h.isPlayer){ mshake=Math.max(mshake,6); toast((s?s.name:"技能")+"！"); }
    (s?s.fn:skSlam)(h); }
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
    ctx.save(); if(mshake>0) ctx.translate((Math.random()-0.5)*mshake,(Math.random()-0.5)*mshake); ctx.scale(zoom,zoom); ctx.translate(-cam.x,-cam.y);
    drawField();
    // 依 y 疊放
    const ents=[shrine,...nurseries.filter(n=>n.hp>0)];
    for(const v of invaders) ents.push(v);
    for(const h of heroes) if(!h.dead) ents.push(h);
    ents.sort((a,b)=>a.y-b.y);
    for(const e of ents){ if(e.kind==="shrine") drawShrine(e); else if(e.kind==="nursery") drawNursery(e); else if(e.isPlayer!==undefined) drawHero(e); else drawUnit(e,e.r,true); }
    // 鎖定準心（玩家目前普攻的目標）
    if(player && !player.dead && player.aim && !player.aim.dead){ const a=player.aim, rr=(a.r||16)*(kcfg(a.kind).sz)+12, tt=clock*4;
      ctx.strokeStyle="rgba(255,90,80,0.95)"; ctx.lineWidth=2.6; for(let k=0;k<4;k++){ const ang=tt+k*1.5708; ctx.beginPath(); ctx.arc(a.x,a.y,rr,ang+0.35,ang+1.15); ctx.stroke(); } }
    // 特效
    for(const e of fx){ const a=Math.max(0,e.life/e.max);
      if(e.type==="spark"){ ctx.globalAlpha=a; ctx.fillStyle=e.col; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,7); ctx.fill(); }
      else if(e.type==="ring"){ const rr=e.r0+(e.r1-e.r0)*(1-a); ctx.globalAlpha=a*0.9; ctx.strokeStyle=e.col; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(e.x,e.y,rr,0,7); ctx.stroke(); }
      else if(e.type==="slash"){ ctx.globalAlpha=a; ctx.strokeStyle=e.col; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(e.x,e.y,20,e.a-0.9,e.a+0.9); ctx.stroke(); }
      else if(e.type==="streak"){ ctx.globalAlpha=a; ctx.strokeStyle=e.col; ctx.lineWidth=10*a+3; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.x2,e.y2); ctx.stroke(); ctx.lineCap="butt"; }
      ctx.globalAlpha=1; }
    // 技能投射物（疾風刃）
    for(const p of hprojs){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.vy,p.vx)); ctx.fillStyle=p.col; ctx.beginPath(); ctx.ellipse(0,0,13,4.5,0,0,7); ctx.fill(); ctx.globalAlpha=0.4; ctx.beginPath(); ctx.ellipse(-6,0,18,7,0,0,7); ctx.fill(); ctx.restore(); ctx.globalAlpha=1; }
    ctx.textAlign="center"; ctx.textBaseline="middle";
    for(const f of floats){ ctx.globalAlpha=Math.min(1,f.life*1.8); ctx.fillStyle=f.col; ctx.font="bold "+(f.big?20:14)+"px sans-serif"; ctx.fillText(f.txt,f.x,f.y); ctx.globalAlpha=1; }
    ctx.restore();
    // 邊緣暗角（聚焦中央）
    const vg=ctx.createRadialGradient(VW/2,VH*0.52,VH*0.28,VW/2,VH*0.52,VH*0.75);
    vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.28)"); ctx.fillStyle=vg; ctx.fillRect(0,0,VW,VH);
    // 神木瀕危：紅色警示閃動
    if(shrine.hp/shrine.maxhp<0.3){ const pl=0.5+0.5*Math.sin(clock*6); const rv=ctx.createRadialGradient(VW/2,VH/2,VH*0.3,VW/2,VH/2,VH*0.78);
      rv.addColorStop(0,"rgba(255,0,0,0)"); rv.addColorStop(1,"rgba(255,0,0,"+(0.26*pl).toFixed(3)+")"); ctx.fillStyle=rv; ctx.fillRect(0,0,VW,VH); }
    if(toastT>0){ toastT-=0.016; if(toastT<=0){ const el=document.getElementById("mtoast"); if(el) el.classList.remove("show"); } }
  }

  function drawField(){
    const gt=clock;
    // 世界邊界：濃密森林牆（讓鏡頭有明確邊界、不再滑出空白）
    ctx.strokeStyle="rgba(16,36,20,0.95)"; ctx.lineWidth=90; ctx.strokeRect(0,0,MW,MH);
    ctx.fillStyle="rgba(8,24,12,0.9)";
    for(let i=0;i<64;i++){ const t=i/64; // 沿四邊排樹叢
      const pts=[[t*MW,0],[t*MW,MH],[0,t*MH],[MW,t*MH]];
      for(const[px,py]of pts){ ctx.beginPath(); ctx.arc(px,py,26+((i*13)%16),0,7); ctx.fill(); } }
    // 大地色塊變化（讓草地不死板）
    ctx.globalAlpha=0.5; for(let i=0;i<26;i++){ const x=hgrid(i,1), y=hgrid(i,2), rr=90+((i*53)%140);
      ctx.fillStyle=mix("#615a35","#33612a",restore); ctx.beginPath(); ctx.ellipse(x,y,rr,rr*0.7,i,0,7); ctx.fill(); } ctx.globalAlpha=1;
    // 蜿蜒溪流（含流動反光）
    ctx.strokeStyle=mix("#4a5b52","#4fa6c9",restore*0.7+0.3); ctx.lineWidth=64; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); ctx.moveTo(-40,MH*0.36); ctx.bezierCurveTo(MW*0.3,MH*0.28,MW*0.62,MH*0.5,MW+40,MH*0.42); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.strokeStyle="rgba(255,255,255,0.10)"; ctx.lineWidth=10;
    for(let i=0;i<5;i++){ ctx.beginPath(); const off=Math.sin(gt*0.8+i)*10; ctx.moveTo(-40,MH*0.36+off); ctx.bezierCurveTo(MW*0.3,MH*0.28+off,MW*0.62,MH*0.5+off,MW+40,MH*0.42+off); ctx.stroke(); } ctx.restore();
    ctx.lineCap="butt";
    // 復原綠意：苗圃周圍隨成長擴散
    for(const n of nurseries){ if(n.hp<=0) continue; const R=120+n.growth*260;
      const gg=ctx.createRadialGradient(n.x,n.y,10,n.x,n.y,R); gg.addColorStop(0,"rgba(102,187,106,"+(0.32*n.growth+0.06).toFixed(3)+")"); gg.addColorStop(1,"rgba(102,187,106,0)");
      ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(n.x,n.y,R,0,7); ctx.fill(); }
    // 神木周圍核心綠意
    const Rs=200+restore*440; const gs=ctx.createRadialGradient(shrine.x,shrine.y,20,shrine.x,shrine.y,Rs);
    gs.addColorStop(0,"rgba(129,199,132,"+(0.30*restore+0.05).toFixed(3)+")"); gs.addColorStop(1,"rgba(129,199,132,0)"); ctx.fillStyle=gs; ctx.beginPath(); ctx.arc(shrine.x,shrine.y,Rs,0,7); ctx.fill();
    // 岩石
    for(let i=0;i<14;i++){ const x=hgrid(i+3,1), y=hgrid(i+3,2); if(dist({x,y},shrine)<120) continue;
      ctx.fillStyle="rgba(120,120,120,0.5)"; ctx.beginPath(); ctx.ellipse(x,y+4,14+(i%3)*5,10+(i%2)*4,0,0,7); ctx.fill();
      ctx.fillStyle="rgba(160,160,160,0.5)"; ctx.beginPath(); ctx.ellipse(x-3,y,10+(i%3)*4,7+(i%2)*3,0,0,7); ctx.fill(); }
    // 草叢（風吹搖曳）
    ctx.strokeStyle=mix("#5c5a30","#2e7d32",restore); ctx.lineWidth=2.4; ctx.lineCap="round";
    for(let i=0;i<150;i++){ const x=hgrid(i+11,1), y=hgrid(i+11,2); if(dist({x,y},shrine)<70) continue;
      const sw=Math.sin(gt*1.6+i)*3; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+sw,y-7,x+sw*1.4,y-12);
      ctx.moveTo(x+4,y); ctx.quadraticCurveTo(x+4+sw,y-6,x+4+sw*1.2,y-10); ctx.stroke(); }
    ctx.lineCap="butt";
    // 花朵（隨復原度綻放）
    const blooms=Math.floor(restore*70);
    for(let i=0;i<blooms;i++){ const x=hgrid(i+40,1), y=hgrid(i+40,2); if(dist({x,y},shrine)<70) continue;
      const col=["#ffd54f","#f48fb1","#fff59d","#ce93d8"][i%4]; ctx.fillStyle=col;
      for(let p=0;p<5;p++){ const a=p/5*6.28+i; ctx.beginPath(); ctx.arc(x+Math.cos(a)*3,y+Math.sin(a)*3,2.2,0,7); ctx.fill(); }
      ctx.fillStyle="#fbc02d"; ctx.beginPath(); ctx.arc(x,y,1.8,0,7); ctx.fill(); } }
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
  // 立體感俯視角生物：全身 + 3D 漸層 + 走路/待機/攻擊/拍翅動畫
  function drawCreatureTop(u,r0,faction){
    const col=KCOL[u.kind]||"#888", dark=shade(col,-44), lite=shade(col,52);
    const cfg=kcfg(u.kind), r=r0*cfg.sz, gt=clock, f=u.face;
    const flyer=(u.kind==="dragonfly"||u.kind==="cicada"), bird=(u.kind==="magpie"||u.kind==="ibis");
    const mammal=(u.kind==="leopard"||u.kind==="bear"||u.kind==="deer"), angry=u.atkA>0;
    const walk=u.moving?Math.sin(u.anim*12):0;
    const bob=u.moving?Math.abs(Math.sin(u.anim*12))*r*0.14:Math.sin(gt*2.2+u.phase)*r*0.05;
    const breath=1+(u.moving?0:Math.sin(gt*2.2+u.phase)*0.03);
    const lunge=u.atkA>0?Math.sin((1-u.atkA/0.2)*3.14159)*r*0.5:0;
    const gy=u.y-bob-(flyer?r*0.5:0);
    const bLen=r*cfg.long, bW=r*cfg.wide;
    // 影子（地面）
    ctx.fillStyle="rgba(0,0,0,0.26)"; ctx.beginPath(); ctx.ellipse(u.x,u.y+r*0.62,bLen*0.95,r*0.34,0,0,7); ctx.fill();
    // 陣營地環
    ctx.fillStyle=faction==="inv"?"rgba(239,83,80,0.30)":"rgba(102,187,106,0.4)"; ctx.beginPath(); ctx.ellipse(u.x,u.y+r*0.55,bLen*1.02,r*0.4,0,0,7); ctx.fill();
    ctx.save(); ctx.translate(u.x+Math.cos(f)*lunge,gy+Math.sin(f)*lunge*0.4); ctx.rotate(f); ctx.scale(1,breath);
    // 尾巴（貓/鹿/鬣蜥各異）
    if(u.kind==="leopard"||u.kind==="deer"||u.kind==="iguana"){ const tw=Math.sin(gt*3+u.phase)*r*0.4, tl=u.kind==="iguana"?1.7:1.35;
      ctx.strokeStyle=col; ctx.lineWidth=r*(u.kind==="deer"?0.12:0.2); ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(-bLen*0.8,0); ctx.quadraticCurveTo(-r*(tl*0.85),tw,-r*tl,tw*1.5); ctx.stroke(); ctx.lineCap="butt"; }
    // 腳（走路擺動）— 露出身體外緣、深色毛用對比亮腳
    if(!flyer){ const c=hex(col), lum=c[0]*0.299+c[1]*0.587+c[2]*0.114; const footCol=lum<95?shade(col,58):shade(col,-38);
      const sw=walk*r*0.38, lr=r*(u.kind==="bear"?0.22:0.18);
      const ly=bW*0.98, lxf=bLen*0.42, lxb=bLen*0.5;
      const legs=bird?[[-r*0.05,-ly*0.6,1],[-r*0.05,ly*0.6,-1]]
        :[[lxf,-ly,1],[lxf,ly,-1],[-lxb,-ly,-1],[-lxb,ly,1]];
      ctx.fillStyle=footCol; ctx.strokeStyle="rgba(0,0,0,0.28)"; ctx.lineWidth=1.2;
      for(const L of legs){ ctx.beginPath(); ctx.ellipse(L[0]+L[2]*sw,L[1],lr,lr*1.2,0,0,7); ctx.fill(); ctx.stroke(); } }
    // 身體（3D 漸層 + 深色描邊 + 頂光）
    const bg=ctx.createRadialGradient(bLen*0.15,-bW*0.4,r*0.1,0,0,bLen*1.15); bg.addColorStop(0,lite); bg.addColorStop(0.55,col); bg.addColorStop(1,dark);
    ctx.beginPath(); ctx.ellipse(0,0,bLen,bW,0,0,7); ctx.fillStyle=u.hitT>0?"#fff":bg; ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.38)"; ctx.lineWidth=Math.max(1.3,r*0.08); ctx.stroke();
    if(u.hitT<=0){ ctx.save(); ctx.globalAlpha=0.45; ctx.fillStyle=lite; ctx.beginPath(); ctx.ellipse(-bLen*0.08,-bW*0.42,bLen*0.56,bW*0.32,0,0,7); ctx.fill(); ctx.restore(); }
    // 背部花紋 / 殼 / 棘
    if(u.kind==="leopard"){ ctx.strokeStyle="rgba(62,40,16,0.6)"; ctx.lineWidth=r*0.05; for(const o of [[-.35,-.25],[-.05,.2],[.15,-.28],[.35,.08],[-.15,-.02],[.2,.35]]){ ctx.beginPath(); ctx.arc(o[0]*bLen*1.15,o[1]*bW*1.35,r*0.1,0,7); ctx.stroke(); } }
    else if(u.kind==="bear"){ ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.moveTo(bLen*0.35,-bW*0.5); ctx.lineTo(bLen*0.55,0); ctx.lineTo(bLen*0.35,bW*0.5); ctx.lineWidth=r*0.12; ctx.strokeStyle="rgba(255,255,255,0.9)"; ctx.stroke(); } // 胸前白 V
    else if(u.kind==="deer"){ ctx.fillStyle="rgba(255,255,255,0.7)"; for(const o of [[-.2,-.4],[.15,.3],[.3,-.3],[-.35,.35],[0,0]]){ ctx.beginPath(); ctx.arc(o[0]*bLen*1.2,o[1]*bW*1.5,r*0.08,0,7); ctx.fill(); } }
    else if(u.kind==="snail"){ ctx.fillStyle=shade(col,-15); ctx.beginPath(); ctx.arc(-bLen*0.1,0,bW*0.95,0,7); ctx.fill();
      ctx.strokeStyle=dark; ctx.lineWidth=r*0.16; ctx.beginPath(); for(let a=0;a<16;a++){ const rr=bW*0.85*(1-a/19),px=-bLen*0.1+Math.cos(a*0.9)*rr,py=Math.sin(a*0.9)*rr; a?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.stroke(); }
    else if(u.kind==="iguana"){ ctx.fillStyle=lite; for(let i=-3;i<=3;i++){ ctx.beginPath(); ctx.moveTo(i*bLen*0.16,-r*0.05); ctx.lineTo(i*bLen*0.16-r*0.07,-bW*0.9); ctx.lineTo(i*bLen*0.16+r*0.07,-bW*0.9); ctx.closePath(); ctx.fill(); } }
    else if(u.kind==="frog"){ ctx.fillStyle="rgba(40,70,20,0.5)"; for(const o of [[-.2,-.3],[.1,.35],[.25,-.2]]){ ctx.beginPath(); ctx.arc(o[0]*bLen*1.1,o[1]*bW*1.1,r*0.13,0,7); ctx.fill(); } }
    // 頭（描邊）
    const hx=bLen*(bird?0.62:0.72), hr=r*(bird?0.32:0.46);
    // 耳（先畫於頭後：貓/鹿尖耳含粉內耳、熊圓耳）
    if(u.kind==="leopard"||u.kind==="bear"||u.kind==="deer"){ const er=hr*(u.kind==="bear"?0.5:0.44);
      for(const s of [-1,1]){ ctx.fillStyle=dark; ctx.beginPath(); ctx.arc(hx-hr*0.15,s*hr*0.9,er,0,7); ctx.fill(); ctx.strokeStyle="rgba(0,0,0,0.3)"; ctx.lineWidth=1; ctx.stroke();
        if(u.kind!=="bear"){ ctx.fillStyle="#e79ab0"; ctx.beginPath(); ctx.arc(hx-hr*0.1,s*hr*0.9,er*0.5,0,7); ctx.fill(); } } }
    ctx.beginPath(); ctx.arc(hx,0,hr,0,7); ctx.fillStyle=u.hitT>0?"#fff":shade(col,18); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,0.34)"; ctx.lineWidth=Math.max(1,r*0.06); ctx.stroke();
    // 口鼻（哺乳類頭前突出，增加立體）
    if(mammal){ ctx.fillStyle=u.hitT>0?"#fff":lite; ctx.beginPath(); ctx.ellipse(hx+hr*0.58,0,hr*0.5,hr*0.4,0,0,7); ctx.fill(); ctx.strokeStyle="rgba(0,0,0,0.28)"; ctx.lineWidth=1; ctx.stroke(); }
    // 青蛙凸眼（頭頂兩側）
    if(u.kind==="frog"){ ctx.fillStyle=shade(col,25); ctx.beginPath(); ctx.arc(hx,-hr*0.8,hr*0.5,0,7); ctx.arc(hx,hr*0.8,hr*0.5,0,7); ctx.fill(); }
    // 鹿角
    if(u.kind==="deer"){ ctx.strokeStyle="#8d6e63"; ctx.lineWidth=r*0.08; ctx.lineCap="round";
      for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(hx,s*hr*0.6); ctx.lineTo(hx+r*0.4,s*hr*1.3); ctx.moveTo(hx+r*0.22,s*hr*1.0); ctx.lineTo(hx+r*0.45,s*hr*0.6); ctx.stroke(); } ctx.lineCap="butt"; }
    // 鳥喙 + 藍鵲長尾
    if(bird){ ctx.fillStyle=u.kind==="ibis"?"#222":"#e8a13a"; ctx.beginPath(); ctx.moveTo(hx+hr*0.6,-hr*0.15); ctx.lineTo(hx+hr*(u.kind==="ibis"?2.6:1.5),u.kind==="ibis"?hr*0.5:0); ctx.lineTo(hx+hr*0.6,hr*0.15); ctx.closePath(); ctx.fill();
      if(u.kind==="ibis"){ ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(hx,0,hr*0.9,0,7); ctx.fill(); } // 聖䴉黑頭
      if(u.kind==="magpie"){ ctx.strokeStyle="#1565c0"; ctx.lineWidth=r*0.26; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(-bLen*0.8,0); ctx.lineTo(-r*1.7,Math.sin(gt*3+u.phase)*r*0.25); ctx.stroke(); ctx.lineCap="butt"; } }
    // 蝸牛觸角
    if(u.kind==="snail"){ ctx.strokeStyle=col; ctx.lineWidth=r*0.06; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(hx,s*hr*0.4); ctx.lineTo(hx+r*0.25,s*hr*0.9); ctx.stroke(); } }
    // 翅（拍動）
    if(flyer){ const flap=0.4+0.6*Math.abs(Math.sin(gt*20+u.phase)), wl=u.kind==="dragonfly"?1.1:0.85; ctx.fillStyle=u.kind==="dragonfly"?"rgba(190,240,250,0.55)":"rgba(210,225,200,0.6)";
      for(const s of [-1,1]){ ctx.save(); ctx.scale(1,s*flap); ctx.beginPath(); ctx.ellipse(r*0.1,bW*2.2,r*wl,r*0.32,0,0,7); ctx.fill(); ctx.restore(); } }
    // 眼睛（白+虹膜+高光；攻擊時虹膜轉紅+怒眉；飛蟲複眼；蝸牛眼在眼柄，這裡略過）
    if(u.kind!=="snail"){ const eyx=u.kind==="frog"?hx:hx+hr*0.32, eyy=u.kind==="frog"?hr*0.82:hr*0.4, er=hr*0.3;
      if(flyer){ for(const s of [-1,1]){ ctx.fillStyle=shade(col,-22); ctx.beginPath(); ctx.arc(hx+hr*0.15,s*hr*0.55,hr*0.5,0,7); ctx.fill(); ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.arc(hx+hr*0.3,s*hr*0.42,hr*0.16,0,7); ctx.fill(); } }
      else { for(const s of [-1,1]){ ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(eyx,s*eyy,er,0,7); ctx.fill();
          ctx.fillStyle=angry?"#c62828":"#3a2a1a"; ctx.beginPath(); ctx.arc(eyx+er*0.35,s*eyy,er*0.62,0,7); ctx.fill();
          ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(eyx+er*0.08,s*eyy-er*0.35,er*0.3,0,7); ctx.fill(); }
        if(mammal){ ctx.fillStyle="#3a2a20"; ctx.beginPath(); ctx.arc(hx+hr*0.98,0,hr*0.15,0,7); ctx.fill(); }
        if(angry){ ctx.strokeStyle="rgba(0,0,0,0.6)"; ctx.lineWidth=r*0.06; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(eyx-hr*0.15,s*eyy-hr*0.5); ctx.lineTo(eyx+hr*0.4,s*eyy-hr*0.22); ctx.stroke(); } } } }
    ctx.restore();
  }
  function drawUnit(u,r,isInv){ drawCreatureTop(u,r,isInv?"inv":"ally"); const R=r*kcfg(u.kind).sz;
    if(isInv){ if(u.elite){ ctx.fillStyle="#ffca28"; ctx.font="bold 11px sans-serif"; ctx.textAlign="center"; ctx.fillText("👑"+KNAME[u.kind]+"王",u.x,u.y-R-12); }
      if(u.hp<u.maxhp) bar(u.x,u.y-R-8,u.elite?40:26,u.hp/u.maxhp,"#ff8a80");
      if(u.stun>0){ ctx.fillStyle="#ffe082"; for(let s=0;s<3;s++){ const a=clock*7+s*2.1; ctx.beginPath(); ctx.arc(u.x+Math.cos(a)*R*0.9,u.y-R-2+Math.sin(a)*3,2.4,0,7); ctx.fill(); } } } }
  function drawHero(h){ const r=h.r, R=r*kcfg(h.kind).sz; drawCreatureTop(h,r,"ally");
    if(h.isPlayer){ ctx.strokeStyle="#ffd54f"; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(h.x,h.y+r*0.5,R*1.2,R*0.5,0,0,7); ctx.stroke();
      const bY=h.y-R*1.8-Math.sin(clock*4)*3; ctx.fillStyle="#ffd54f"; ctx.beginPath(); ctx.moveTo(h.x,bY+10); ctx.lineTo(h.x-7,bY); ctx.lineTo(h.x+7,bY); ctx.fill(); }
    bar(h.x,h.y-R-14,42,h.hp/h.maxhp,"#66bb6a");
    ctx.font="bold 12px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#fff"; ctx.fillText(h.name,h.x-9,h.y-R-20);
    ctx.fillStyle="#ffd54f"; ctx.fillText(" Lv"+(h.level||1),h.x+h.name.length*6,h.y-R-20); }
  function bar(x,y,w,frac,col){ ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(x-w/2,y,w,5); ctx.fillStyle=col; ctx.fillRect(x-w/2,y,w*clamp(frac,0,1),5); }

  /* ---------- HUD ---------- */
  function updateHUD(){ setW("mhpAlly",shrine.hp/shrine.maxhp); txt("mhpAllyTxt",Math.ceil(shrine.hp));
    setW("mRestore",restore); txt("mRestoreTxt",Math.floor(restore*100)+"%");
    const mm=Math.floor(clock/60),ss=Math.floor(clock%60); txt("mclock",mm+":"+(ss<10?"0":"")+ss);
    const sp=document.getElementById("mSp"); if(sp){ const mx=(player&&player.spMax)||8, cd=player&&player.spCd>0?player.spCd:0; sp.querySelector(".fill").style.height=(cd/mx*100)+"%"; sp.classList.toggle("ready",cd<=0); } }
  function setW(id,f){ const el=document.getElementById(id); if(el) el.style.width=(clamp(f,0,1)*100)+"%"; }
  function txt(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }

  /* ---------- 迴圈 / 流程 ---------- */
  function loop(ts){ if(!running) return; const dt=Math.min(0.04,(ts-lastT)/1000||0); lastT=ts; step(dt); render(); raf=requestAnimationFrame(loop); }
  function start(size){ root.classList.remove("mhide"); hide("mpick"); hide("mover"); zoom=1; resize(); setup(size); running=true; ended=false; lastT=0; raf=requestAnimationFrame(loop); }
  function stop(){ running=false; cancelAnimationFrame(raf); }
  function exitToLobby(){ stop(); root.classList.add("mhide"); hide("mover"); hide("mpick"); mv.x=mv.y=0; if(window.__lobbyRefresh) window.__lobbyRefresh(); }
  function endGame(win){ if(ended) return; ended=true; running=false; cancelAnimationFrame(raf);
    const key=(window.__featuredKey&&window.__featuredKey())||"leopard", before=(window.__heroLevel&&window.__heroLevel(key))||1;
    if(win){ const eco=teamSize*20+killCount, xp=60+teamSize*10+killCount;
      window.__awardEco&&window.__awardEco(eco); window.__awardXP&&window.__awardXP(key,xp); window.__bumpWin&&window.__bumpWin();
      const after=(window.__heroLevel&&window.__heroLevel(key))||before;
      showOver("🌳 棲地復原成功！","枯黃的土地重新長回翠綠","你和守護者小隊驅逐了外來入侵種、守住台灣神木與復育苗圃。<br>🌿 保育值 +"+eco+"　驅逐 "+killCount+" 隻　"+(KNAME[key]||"")+" EXP +"+xp+"　Lv"+before+(after>before?(" → "+after+" ⬆升級！"):"")); }
    else { const xp=8+killCount; window.__awardXP&&window.__awardXP(key,xp);  // 輸了也給少量經驗——等級只升不降
      showOver("神木倒下了…","棲地失守","別氣餒！多回防受威脅的苗圃、善用『守護爆發』與『回神木』補血，再守一次。<br>"+(KNAME[key]||"")+" 仍獲得 EXP +"+xp+"（等級永不下降・目前 Lv"+before+"）"); } }
  function showOver(t,s,b){ root.classList.add("mhide"); txt("moverT",t); txt("moverS",s); const el=document.getElementById("moverB"); if(el) el.innerHTML=b;
    document.getElementById("moverAgain").textContent="⚔ 再守一場"; show("mover"); }
  function show(id){ const e=document.getElementById(id); if(e) e.classList.remove("hide"); }
  function hide(id){ const e=document.getElementById(id); if(e) e.classList.add("hide"); }

  /* ---------- 控制：虛擬搖桿 ---------- */
  const stick=document.getElementById("mstick"), knob=document.getElementById("mknob");
  let stickId=null, sc={x:0,y:0};
  function stickStart(e){ e.preventDefault(); const r=stick.getBoundingClientRect(); sc.x=r.left+r.width/2; sc.y=r.top+r.height/2; stickId=e.pointerId; stick.setPointerCapture&&stick.setPointerCapture(e.pointerId); stickMove(e); }
  function stickMove(e){ if(stickId!==e.pointerId) return; e.preventDefault();
    const dsx=e.clientX-sc.x, dsy=e.clientY-sc.y;
    const dx = rot? dsy : dsx, dy = rot? -dsx : dsy;   // 旋轉時把螢幕位移轉回遊戲座標
    const R=58, d=Math.hypot(dx,dy)||1, cd=Math.min(d,R), nx=dx/d*cd, ny=dy/d*cd; mv.x=nx/R; mv.y=ny/R; knob.style.transform="translate("+nx+"px,"+ny+"px)"; }
  function stickEnd(e){ if(stickId!==e.pointerId) return; e.preventDefault(); stickId=null; mv.x=mv.y=0; knob.style.transform="translate(0,0)"; }
  if(stick){ stick.addEventListener("pointerdown",stickStart,{passive:false}); stick.addEventListener("pointermove",stickMove,{passive:false}); stick.addEventListener("pointerup",stickEnd,{passive:false}); stick.addEventListener("pointercancel",stickEnd,{passive:false}); stick.addEventListener("pointerleave",stickEnd,{passive:false}); }
  const tap=(id,fn)=>{ const e=document.getElementById(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); };
  tap("mSp",()=>{ wantSp=true; }); tap("mBack",()=>{ wantBack=true; });
  // 縮放：＋/－ 鈕、雙指縮放、滾輪
  tap("mZoomIn",()=>setZoom(zoom+0.2)); tap("mZoomOut",()=>setZoom(zoom-0.2));
  const pts=new Map(); let pinchD=0, pinchZ=1;
  cv.addEventListener("pointerdown",(e)=>{ pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pts.size===2){ const a=[...pts.values()]; pinchD=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1; pinchZ=zoom; } },{passive:false});
  cv.addEventListener("pointermove",(e)=>{ if(!pts.has(e.pointerId))return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pts.size===2){ e.preventDefault(); const a=[...pts.values()], d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1; setZoom(pinchZ*d/pinchD); } },{passive:false});
  const rmPt=(e)=>pts.delete(e.pointerId); cv.addEventListener("pointerup",rmPt); cv.addEventListener("pointercancel",rmPt); cv.addEventListener("pointerleave",rmPt);
  cv.addEventListener("wheel",(e)=>{ if(!running)return; e.preventDefault(); setZoom(zoom-Math.sign(e.deltaY)*0.12); },{passive:false});

  /* ---------- 接到大廳「對戰」 ---------- */
  function openPick(){ const e=document.getElementById("mpick"); if(e) e.classList.remove("hide"); }
  const pb=document.getElementById("playBtn"); if(pb) pb.onclick=openPick;
  tap("pick3",()=>start(3)); tap("pick5",()=>start(5)); tap("pickBack",()=>hide("mpick"));
  tap("moverAgain",()=>start(teamSize)); tap("moverHome",exitToLobby);
  window.addEventListener("keydown",(e)=>{ if(!running) return; if(e.key==="ArrowLeft"||e.key==="a")mv.x=-1; else if(e.key==="ArrowRight"||e.key==="d")mv.x=1; else if(e.key==="ArrowUp"||e.key==="w")mv.y=-1; else if(e.key==="ArrowDown"||e.key==="s")mv.y=1; else if(e.key==="k"||e.key==="Shift")wantSp=true; else if(e.key==="b")wantBack=true; });
  window.addEventListener("keyup",(e)=>{ if(["ArrowLeft","a","ArrowRight","d"].includes(e.key))mv.x=0; if(["ArrowUp","w","ArrowDown","s"].includes(e.key))mv.y=0; });

  window.MOBA={ start, exit:exitToLobby };
})();
