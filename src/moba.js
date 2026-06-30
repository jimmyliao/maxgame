/* 守護台灣神木 — 俯視角 MOBA（自含模組）
   設計原則：不碰 legacy.js 的 drawCreature／dock／狀態機（鐵則）。
   自己的 canvas (#mgame)、自己的迴圈、自己的俯視角繪製與虛擬搖桿。 */
(() => {
  "use strict";
  const root = document.getElementById("moba");
  const cv = document.getElementById("mgame");
  if (!root || !cv) return;
  const ctx = cv.getContext("2d");

  /* ---------- 物種資料（俯視角用色與名稱） ---------- */
  const KCOL = { leopard:"#e8a13a", bear:"#3b332e", cicada:"#5f9a3c", dragonfly:"#1fa3a3", deer:"#cf9a5e", magpie:"#2f6fd0",
                 snail:"#b6884a", iguana:"#54b24a", frog:"#82b24c", ibis:"#e3e9ec" };
  const KNAME = { leopard:"石虎", bear:"黑熊", cicada:"爺蟬", dragonfly:"勾蜓", deer:"梅花鹿", magpie:"藍鵲",
                  snail:"福壽螺", iguana:"綠鬣蜥", frog:"斑腿蛙", ibis:"聖䴉" };
  const GUARDIANS = ["leopard","bear","dragonfly","magpie","deer","cicada"];
  const INVADERS  = ["iguana","snail","frog","ibis"];

  /* ---------- 視窗 / 世界 ---------- */
  let VW=0, VH=0, dpr=1;
  const MW=2200, MH=1500;                 // 世界大小（大於畫面，鏡頭跟隨）
  function resize(){ const r=cv.getBoundingClientRect(); VW=r.width||window.innerWidth; VH=r.height||window.innerHeight;
    dpr=Math.min(window.devicePixelRatio||1,2); cv.width=Math.round(VW*dpr); cv.height=Math.round(VH*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  window.addEventListener("resize",()=>{ if(running) resize(); });

  /* ---------- 場景幾何（對角線單路 + 雙方神木 + 防禦塔） ---------- */
  const ALLY={x:300, y:MH-300}, FOE={x:MW-300, y:300};
  // 路徑路點（蜿蜒對角線），小兵沿此推進
  const PATH=[ {x:300,y:MH-300},{x:MW*0.34,y:MH*0.70},{x:MW*0.5,y:MH*0.5},{x:MW*0.66,y:MH*0.30},{x:MW-300,y:300} ];
  function lerpPath(f){ const seg=(PATH.length-1)*f, i=Math.min(PATH.length-2,Math.floor(seg)), t=seg-i;
    return {x:PATH[i].x+(PATH[i+1].x-PATH[i].x)*t, y:PATH[i].y+(PATH[i+1].y-PATH[i].y)*t}; }

  /* ---------- 狀態 ---------- */
  let running=false, raf=0, lastT=0, clock=0, teamSize=3, ended=false;
  let nexus=[], towers=[], minions=[], heroes=[], projs=[], fx=[], floats=[];
  let player=null, waveT=0;
  const cam={x:0,y:0};
  const mv={x:0,y:0};            // 搖桿向量（-1..1）
  let wantSp=false, wantBack=false;

  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  /* ---------- 建立單位 ---------- */
  function mkNexus(team){ return { team, x:team?FOE.x:ALLY.x, y:team?FOE.y:ALLY.y, r:74, hp:1600, maxhp:1600, kind:"nexus" }; }
  function mkTower(team,f){ const p=lerpPath(f); return { team, x:p.x, y:p.y, r:34, hp:680, maxhp:680, range:250, dmg:24, cd:0.95, t:0, kind:"tower" }; }
  function mkHero(team,kind,isPlayer){ return { team, kind, isPlayer:!!isPlayer, x:0,y:0, r:24, hp:340, maxhp:340,
    dmg:26, range:66, cd:0.62, t:0, spCd:0, speed:isPlayer?168:150, face:team?Math.PI:0, dead:false, respawn:0,
    name:KNAME[kind]||kind, level:1, hitT:0 }; }
  function mkMinion(team,kind){ const n={ team, kind, x:0,y:0, r:15, hp:70, maxhp:70, dmg:9, range:34, cd:0.85, t:0,
    speed:78, face:team?Math.PI:0, dead:false, kindt:"minion", pf:team?1:0 };
    const sp=team?FOE:ALLY; n.x=sp.x+(Math.random()*60-30); n.y=sp.y+(Math.random()*60-30); return n; }

  function setup(size){
    teamSize=size; clock=0; ended=false; waveT=2;
    nexus=[mkNexus(0),mkNexus(1)]; minions=[]; projs=[]; fx=[]; floats=[];
    towers=[ mkTower(0,0.30), mkTower(0,0.16), mkTower(1,0.70), mkTower(1,0.84) ];
    // 隊伍：玩家用大廳選的守護者，AI 補滿；敵方用入侵種
    const myKey=(window.__featuredKey&&window.__featuredKey())||"leopard";
    const allyKinds=[myKey]; for(const k of GUARDIANS){ if(allyKinds.length>=size) break; if(k!==myKey) allyKinds.push(k); }
    while(allyKinds.length<size) allyKinds.push(GUARDIANS[allyKinds.length%GUARDIANS.length]);
    const foeKinds=[]; for(let i=0;i<size;i++) foeKinds.push(INVADERS[i%INVADERS.length]);
    heroes=[];
    allyKinds.forEach((k,i)=>{ const h=mkHero(0,k,i===0); placeAtBase(h,0,i,size); heroes.push(h); if(i===0) player=h; });
    foeKinds.forEach((k,i)=>{ const h=mkHero(1,k,false); placeAtBase(h,1,i,size); heroes.push(h); });
    cam.x=clamp(player.x-VW/2,0,MW-VW); cam.y=clamp(player.y-VH/2,0,MH-VH);
  }
  function placeAtBase(h,team,i,size){ const base=team?FOE:ALLY, ang=(team?Math.PI:0)+ (i-(size-1)/2)*0.5;
    h.x=base.x+Math.cos(ang)*120; h.y=base.y+Math.sin(ang)*120; }

  /* ---------- 目標搜尋 ---------- */
  function enemiesOf(team){ const out=[]; for(const m of minions) if(m.team!==team&&!m.dead) out.push(m);
    for(const h of heroes) if(h.team!==team&&!h.dead) out.push(h); for(const t of towers) if(t.team!==team&&t.hp>0) out.push(t);
    const nx=nexus[team?0:1]; if(nx.hp>0) out.push(nx); return out; }
  function nearestEnemy(u,maxR){ let best=null,bd=maxR||1e9; for(const e of enemiesOf(u.team)){ const d=dist(u,e); if(d<bd){ bd=d; best=e; } } return best?{e:best,d:bd}:null; }
  // 帶優先序的 AI 目標：英雄 > 小兵 > 塔/神木
  function aiTarget(u,aggro){ let bh=null,bhd=aggro, bm=null,bmd=aggro;
    for(const h of heroes){ if(h.team===u.team||h.dead) continue; const d=dist(u,h); if(d<bhd){bhd=d;bh=h;} }
    if(bh) return {e:bh,d:bhd};
    for(const m of minions){ if(m.team===u.team||m.dead) continue; const d=dist(u,m); if(d<bmd){bmd=d;bm=m;} }
    if(bm) return {e:bm,d:bmd};
    // 否則推進到敵方路上最近的塔/神木
    let bt=null,btd=1e9; for(const t of towers){ if(t.team===u.team||t.hp<=0) continue; const d=dist(u,t); if(d<btd){btd=d;bt=t;} }
    const nx=nexus[u.team?0:1];
    if(bt && btd< dist(u,nx)) return {e:bt,d:btd};
    return {e:nx,d:dist(u,nx)};
  }

  /* ---------- 傷害 / 死亡 ---------- */
  function hpMax(o){ return o.maxhp; }
  function hurt(o,amt,by){ if(o.hp<=0) return; o.hp-=amt; o.hitT=0.12;
    floats.push({x:o.x,y:o.y-o.r-6,txt:"-"+Math.round(amt),col:"#fff",life:0.6});
    sparks(o.x,o.y,5,"#fff");
    if(o.hp<=0){ o.hp=0; onDeath(o,by); } }
  function onDeath(o,by){
    if(o.kind==="nexus"){ endGame(o.team===1); return; }            // 敵方神木倒 → 你贏
    if(o.kind==="tower"){ ring(o.x,o.y,70,"#ffd54f"); toast((o.team?"敵方":"我方")+"防禦塔被摧毀"); return; }
    if(o.kindt==="minion"){ o.dead=true; ring(o.x,o.y,22,"#cddc39"); return; }
    // 英雄
    o.dead=true; o.respawn=4+teamSize*0.6; ring(o.x,o.y,40,o.team?"#ef5350":"#66bb6a");
    floats.push({x:o.x,y:o.y-40,txt:KNAME[o.kind]+(o.team?" 被擊退":" 倒下"),col:o.team?"#ffab91":"#bbb",life:1.2});
    if(o.team===1 && by && by.isPlayer){ /* 玩家擊退入侵者 */ }
  }

  /* ---------- 攻擊 ---------- */
  function meleeHit(u,tgt,dmg){ u.t=u.cd; u.face=Math.atan2(tgt.y-u.y,tgt.x-u.x);
    fx.push({type:"slash",x:u.x+Math.cos(u.face)*u.r,y:u.y+Math.sin(u.face)*u.r,a:u.face,life:0.16,max:0.16,col:u.team?"#ff8a80":"#fff59d"});
    hurt(tgt,dmg,u); }
  function towerShot(u,tgt){ u.t=u.cd; projs.push({team:u.team,x:u.x,y:u.y-20,tx:tgt,dmg:u.dmg,life:1.4,col:u.team?"#ce93d8":"#ffd54f",sp:520}); }

  /* ---------- 更新 ---------- */
  function step(dt){
    if(ended) return; clock+=dt;
    // 出兵：每 14 秒一波，雙方各 3 隻（場上設上限）
    waveT-=dt; if(waveT<=0){ waveT=14; if(minions.length<46){ for(let i=0;i<3;i++){ minions.push(mkMinion(0,INVADERS[i%INVADERS.length])); minions.push(mkMinion(1,INVADERS[i%INVADERS.length])); } } }

    // 小兵
    for(const m of minions){ if(m.dead) continue; if(m.t>0) m.t-=dt;
      const tg=nearestEnemy(m,170);
      if(tg && tg.d<=m.range+tg.e.r){ if(m.t<=0){ m.t=m.cd; m.face=Math.atan2(tg.e.y-m.y,tg.e.x-m.x); hurt(tg.e,m.dmg,m); } }
      else { // 沿路推進
        const goalF = m.team? (1 - clamp(advance(m),0,1)) : clamp(advance(m),0,1);
        const wp = m.team? nextWP(m,-1) : nextWP(m,1);
        const ang=Math.atan2(wp.y-m.y,wp.x-m.x); m.face=ang; m.x+=Math.cos(ang)*m.speed*dt; m.y+=Math.sin(ang)*m.speed*dt;
        if(tg && tg.d<170){ const a2=Math.atan2(tg.e.y-m.y,tg.e.x-m.x); m.x+=Math.cos(a2)*m.speed*0.4*dt; m.y+=Math.sin(a2)*m.speed*0.4*dt; }
      }
      if(m.hitT>0) m.hitT-=dt;
    }
    minions=minions.filter(m=>!m.dead);

    // 塔
    for(const t of towers){ if(t.hp<=0) continue; if(t.t>0) t.t-=dt;
      // 塔優先打小兵或英雄
      let tg=null,bd=t.range; for(const e of enemiesOf(t.team)){ if(e.kind==="nexus"||e.kind==="tower") continue; const d=dist(t,e); if(d<bd){bd=d;tg=e;} }
      if(tg && t.t<=0) towerShot(t,tg); }

    // 英雄
    for(const h of heroes){
      if(h.dead){ h.respawn-=dt; if(h.respawn<=0){ h.dead=false; h.hp=h.maxhp; placeAtBase(h,h.team,0,teamSize); } continue; }
      if(h.t>0) h.t-=dt; if(h.spCd>0) h.spCd-=dt; if(h.hitT>0) h.hitT-=dt;
      if(h.isPlayer){ updatePlayer(h,dt); continue; }
      // AI 英雄
      const tg=aiTarget(h,360);
      if(tg){ const reach=h.range+tg.e.r; if(tg.d<=reach){ if(h.t<=0) meleeHit(h,tg.e,h.dmg);
            // 技能：附近有敵英雄就放
            if(h.spCd<=0){ const near=heroes.find(x=>x.team!==h.team&&!x.dead&&dist(x,h)<150); if(near) castSp(h); } }
          else { const ang=Math.atan2(tg.e.y-h.y,tg.e.x-h.x); h.face=ang; h.x+=Math.cos(ang)*h.speed*dt; h.y+=Math.sin(ang)*h.speed*dt; } }
      keepIn(h);
    }

    // 投射物（塔）
    for(const p of projs){ p.life-=dt; if(p.tx&&p.tx.hp>0){ const ang=Math.atan2(p.tx.y-p.y,p.tx.x-p.x); p.x+=Math.cos(ang)*p.sp*dt; p.y+=Math.sin(ang)*p.sp*dt;
        if(dist(p,p.tx)<p.tx.r){ hurt(p.tx,p.dmg,{team:p.team}); p.life=0; } } else p.life=0; }
    projs=projs.filter(p=>p.life>0);

    // 特效 / 文字
    for(const e of fx) e.life-=dt; fx=fx.filter(e=>e.life>0); if(fx.length>140) fx.splice(0,fx.length-140);
    for(const f of floats){ f.life-=dt; f.y-=26*dt; } floats=floats.filter(f=>f.life>0);

    // 鏡頭跟隨（玩家死亡時看神木）
    const focus = player.dead? nexus[0] : player;
    cam.x += (clamp(focus.x-VW/2,0,Math.max(0,MW-VW))-cam.x)*Math.min(1,dt*6);
    cam.y += (clamp(focus.y-VH/2,0,Math.max(0,MH-VH))-cam.y)*Math.min(1,dt*6);

    updateHUD();
  }

  // 小兵沿路徑下一個目標點
  function advance(m){ return 0; }
  function nextWP(m,dir){ // dir:1 往敵方(FOE)，-1 往我方(ALLY)
    // 找路徑上「前方」最近的路點
    let bestI=0,bestD=1e9; for(let i=0;i<PATH.length;i++){ const d=dist(m,PATH[i]); if(d<bestD){bestD=d;bestI=i;} }
    let ni = bestI + (dir>0?1:-1); ni=clamp(ni,0,PATH.length-1);
    // 若已很靠近該點，看更前面一個
    if(dist(m,PATH[bestI])<60){ ni=clamp(bestI+(dir>0?1:-1),0,PATH.length-1); }
    return PATH[ni];
  }

  function updatePlayer(h,dt){
    // 移動：搖桿
    const mag=Math.hypot(mv.x,mv.y);
    if(mag>0.12){ const ang=Math.atan2(mv.y,mv.x); h.face=ang; const s=h.speed*Math.min(1,mag);
      h.x+=Math.cos(ang)*s*dt; h.y+=Math.sin(ang)*s*dt; }
    keepIn(h);
    // 回神木
    if(wantBack){ wantBack=false; const d=dist(h,nexus[0]); if(d>120){ toast("回防神木中…"); } h.x=nexus[0].x; h.y=nexus[0].y+90; h.hp=h.maxhp; ring(h.x,h.y,46,"#80deea"); }
    // 技能
    if(wantSp){ wantSp=false; if(h.spCd<=0) castSp(h); }
    // 自動普攻：射程內最近敵人
    const tg=nearestEnemy(h, h.range+40);
    if(tg && tg.d<=h.range+tg.e.r && h.t<=0) meleeHit(h,tg.e,h.dmg);
  }
  function castSp(h){ h.spCd=8; ring(h.x,h.y,130,h.team?"#ce93d8":"#fff59d"); sparks(h.x,h.y,16,h.team?"#ce93d8":"#fff59d");
    floats.push({x:h.x,y:h.y-46,txt:"技能!",col:"#fff59d",life:0.7});
    for(const e of enemiesOf(h.team)){ if(e.kind==="nexus") continue; if(dist(h,e)<140) hurt(e, h.dmg*2.4, h); } }
  function keepIn(h){ h.x=clamp(h.x,40,MW-40); h.y=clamp(h.y,40,MH-40);
    // 不可穿過神木/塔
    for(const o of [nexus[0],nexus[1],...towers]){ if(o.hp<=0) continue; const d=dist(h,o), min=o.r+h.r; if(d<min&&d>0){ const a=Math.atan2(h.y-o.y,h.x-o.x); h.x=o.x+Math.cos(a)*min; h.y=o.y+Math.sin(a)*min; } } }

  /* ---------- 特效 ---------- */
  function sparks(x,y,n,col){ for(let i=0;i<n;i++){ const a=Math.random()*6.28,s=60+Math.random()*150;
    fx.push({type:"spark",x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.3+Math.random()*0.2,max:0.5,r:1.5+Math.random()*2,col}); } if(fx.length>140) fx.splice(0,fx.length-140); }
  function ring(x,y,r,col){ fx.push({type:"ring",x,y,r0:6,r1:r,life:0.32,max:0.32,col}); }
  let toastT=0; function toast(s){ const el=document.getElementById("mtoast"); if(!el) return; el.textContent=s; el.classList.add("show"); toastT=1.6; }

  /* ---------- 繪製（俯視角） ---------- */
  function render(){
    ctx.clearRect(0,0,VW,VH);
    // 草地
    const g=ctx.createLinearGradient(0,0,0,VH); g.addColorStop(0,"#3f6b34"); g.addColorStop(1,"#2e5226"); ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
    ctx.save(); ctx.translate(-cam.x,-cam.y);
    drawField();
    // 排序：依 y 疊放
    const ents=[];
    for(const t of towers) if(t.hp>0) ents.push(t);
    ents.push(nexus[0],nexus[1]);
    for(const m of minions) ents.push(m);
    for(const h of heroes) if(!h.dead) ents.push(h);
    ents.sort((a,b)=>a.y-b.y);
    for(const e of ents){ if(e.kind==="nexus") drawNexus(e); else if(e.kind==="tower") drawTower(e); else if(e.kindt==="minion") drawUnit(e,e.r,true); else drawHero(e); }
    // 投射物
    for(const p of projs){ ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,5,0,7); ctx.fill();
      ctx.globalAlpha=0.4; ctx.beginPath(); ctx.arc(p.x,p.y,9,0,7); ctx.fill(); ctx.globalAlpha=1; }
    // 特效
    for(const e of fx){ const a=Math.max(0,e.life/e.max);
      if(e.type==="spark"){ e.x+=e.vx*0.016; e.y+=e.vy*0.016; ctx.globalAlpha=a; ctx.fillStyle=e.col; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,7); ctx.fill(); }
      else if(e.type==="ring"){ const rr=e.r0+(e.r1-e.r0)*(1-a); ctx.globalAlpha=a*0.9; ctx.strokeStyle=e.col; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(e.x,e.y,rr,0,7); ctx.stroke(); }
      else if(e.type==="slash"){ ctx.globalAlpha=a; ctx.strokeStyle=e.col; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(e.x,e.y,20,e.a-0.9,e.a+0.9); ctx.stroke(); }
      ctx.globalAlpha=1; }
    // 浮動字
    ctx.textAlign="center"; ctx.textBaseline="middle";
    for(const f of floats){ ctx.globalAlpha=Math.min(1,f.life*1.8); ctx.fillStyle=f.col; ctx.font="bold 14px sans-serif"; ctx.fillText(f.txt,f.x,f.y); ctx.globalAlpha=1; }
    ctx.restore();
    // toast 淡出
    if(toastT>0){ toastT-=0.016; if(toastT<=0){ const el=document.getElementById("mtoast"); if(el) el.classList.remove("show"); } }
  }

  function drawField(){
    // 路（蜿蜒寬路）
    ctx.strokeStyle="#6b7d3f"; ctx.lineWidth=170; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); ctx.moveTo(PATH[0].x,PATH[0].y); for(let i=1;i<PATH.length;i++) ctx.lineTo(PATH[i].x,PATH[i].y); ctx.stroke();
    ctx.strokeStyle="#7c9047"; ctx.lineWidth=140; ctx.beginPath(); ctx.moveTo(PATH[0].x,PATH[0].y); for(let i=1;i<PATH.length;i++) ctx.lineTo(PATH[i].x,PATH[i].y); ctx.stroke();
    // 河流裝飾（橫向）
    ctx.strokeStyle="rgba(79,166,201,0.5)"; ctx.lineWidth=70; ctx.beginPath(); ctx.moveTo(0,MH*0.5-40); ctx.quadraticCurveTo(MW*0.5,MH*0.5+120,MW,MH*0.5-60); ctx.stroke();
    // 灌木叢（固定位置，依索引）
    ctx.fillStyle="rgba(20,50,20,0.55)";
    for(let i=0;i<60;i++){ const x=((i*githash(i))%MW), y=((i*githash(i+7))%MH); if(Math.abs(y-(MH*0.5))<60) continue;
      ctx.beginPath(); ctx.arc(x,y,10+ (i%3)*4,0,7); ctx.fill(); }
    ctx.lineCap="butt";
  }
  function githash(i){ const s=Math.sin(i*127.1)*43758.5453; return Math.floor((s-Math.floor(s))*MW); }

  function drawNexus(n){
    const ally=n.team===0;
    // 陰影
    ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(n.x,n.y+n.r*0.5,n.r*1.1,n.r*0.4,0,0,7); ctx.fill();
    // 樹幹
    ctx.fillStyle=ally?"#6d4c2f":"#4a3a44"; ctx.fillRect(n.x-14,n.y-6,28,n.r*0.7);
    // 樹冠（多層圓）
    const cols= ally? ["#2e7d32","#43a047","#66bb6a"] : ["#5e2b6b","#7b3f8c","#9c5bb0"];
    for(let i=0;i<3;i++){ ctx.fillStyle=cols[i]; const rr=n.r*(1-i*0.22);
      ctx.beginPath(); ctx.arc(n.x-rr*0.4,n.y-n.r*0.3,rr*0.7,0,7); ctx.arc(n.x+rr*0.4,n.y-n.r*0.3,rr*0.7,0,7); ctx.arc(n.x,n.y-n.r*0.7,rr*0.75,0,7); ctx.fill(); }
    // 光暈
    const gl=ctx.createRadialGradient(n.x,n.y-n.r*0.4,4,n.x,n.y-n.r*0.4,n.r*1.6);
    gl.addColorStop(0,ally?"rgba(165,214,167,0.35)":"rgba(206,147,216,0.35)"); gl.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(n.x,n.y-n.r*0.4,n.r*1.6,0,7); ctx.fill();
    // 血環
    ctx.lineWidth=6; ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(n.x,n.y-n.r*0.4,n.r*1.05,0,7); ctx.stroke();
    ctx.strokeStyle=ally?"#66bb6a":"#ef5350"; ctx.beginPath(); ctx.arc(n.x,n.y-n.r*0.4,n.r*1.05,-1.57,-1.57+6.283*(n.hp/n.maxhp)); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font="bold 16px sans-serif"; ctx.textAlign="center"; ctx.fillText(ally?"🌳 台灣神木":"🟣 入侵巢穴",n.x,n.y+n.r*0.9);
  }
  function drawTower(t){ const ally=t.team===0;
    ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(t.x,t.y+t.r*0.4,t.r,t.r*0.4,0,0,7); ctx.fill();
    ctx.fillStyle="#9e9e9e"; ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,7); ctx.fill();
    ctx.fillStyle="#cfcfcf"; ctx.beginPath(); ctx.arc(t.x,t.y-6,t.r*0.7,0,7); ctx.fill();
    ctx.fillStyle=ally?"#43a047":"#ab47bc"; ctx.beginPath(); ctx.arc(t.x,t.y-6,t.r*0.4,0,7); ctx.fill();
    bar(t.x,t.y-t.r-10,46,t.hp/t.maxhp,ally?"#66bb6a":"#ef5350");
  }
  // 俯視角通用單位（小兵/英雄共用底圖）
  function drawUnit(u,r,isMin){ const ally=u.team===0, col=KCOL[u.kind]||"#888";
    ctx.fillStyle="rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(u.x,u.y+r*0.55,r*0.95,r*0.4,0,0,7); ctx.fill();
    // 隊伍底環
    ctx.fillStyle=ally?"rgba(102,187,106,0.55)":"rgba(239,83,80,0.5)"; ctx.beginPath(); ctx.arc(u.x,u.y,r*1.05,0,7); ctx.fill();
    // 身體
    const br=u.hitT>0?"#fff":col; ctx.fillStyle=br; ctx.beginPath(); ctx.ellipse(u.x,u.y,r*0.85,r*0.78,0,0,7); ctx.fill();
    // 物種特徵 + 朝向
    drawKindTop(u,r,col,ally);
    if(isMin && u.hp<u.maxhp) bar(u.x,u.y-r-7,26,u.hp/u.maxhp,ally?"#9ccc65":"#ff8a80");
  }
  function drawHero(h){ const r=h.r; drawUnit(h,r,false);
    // 選取環（玩家）
    if(h.isPlayer){ ctx.strokeStyle="#ffd54f"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(h.x,h.y,r*1.3,0,7); ctx.stroke();
      ctx.fillStyle="#ffd54f"; ctx.beginPath(); ctx.moveTo(h.x,h.y-r*1.8); ctx.lineTo(h.x-7,h.y-r*1.4); ctx.lineTo(h.x+7,h.y-r*1.4); ctx.fill(); }
    bar(h.x,h.y-r-12,42,h.hp/h.maxhp,h.team?"#ef5350":"#66bb6a");
    ctx.fillStyle="#fff"; ctx.font="bold 12px sans-serif"; ctx.textAlign="center"; ctx.fillText(h.name,h.x,h.y-r-18);
  }
  // 物種俯視特徵（耳/翅/喙 + 朝向眼睛）
  function drawKindTop(u,r,col,ally){ const fx2=Math.cos(u.face), fy=Math.sin(u.face);
    const dark=shade(col,-30), lite=shade(col,30);
    if(u.kind==="leopard"||u.kind==="deer"){ ctx.fillStyle=dark; // 耳
      ctx.beginPath(); ctx.arc(u.x-r*0.5+fx2*r*0.2,u.y-r*0.55+fy*r*0.2,r*0.22,0,7); ctx.arc(u.x+r*0.5+fx2*r*0.2,u.y-r*0.55+fy*r*0.2,r*0.22,0,7); ctx.fill();
      if(u.kind==="leopard"){ ctx.fillStyle="rgba(60,40,20,0.6)"; for(const o of [[-.3,-.1],[.25,.05],[0,.3],[-.15,.35]]) { ctx.beginPath(); ctx.arc(u.x+o[0]*r,u.y+o[1]*r,r*0.12,0,7); ctx.fill(); } } }
    else if(u.kind==="bear"||u.kind==="iguana"){ ctx.fillStyle=dark; ctx.beginPath(); ctx.arc(u.x-r*0.45,u.y-r*0.5,r*0.2,0,7); ctx.arc(u.x+r*0.45,u.y-r*0.5,r*0.2,0,7); ctx.fill();
      if(u.kind==="iguana"){ ctx.fillStyle=lite; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(u.x+i*r*0.18,u.y-r*0.8); ctx.lineTo(u.x+i*r*0.18-3,u.y-r*0.5); ctx.lineTo(u.x+i*r*0.18+3,u.y-r*0.5); ctx.fill(); } } }
    else if(u.kind==="dragonfly"||u.kind==="cicada"){ ctx.fillStyle="rgba(255,255,255,0.4)"; // 翅
      ctx.save(); ctx.translate(u.x,u.y); ctx.rotate(u.face); for(const s of [-1,1]){ ctx.beginPath(); ctx.ellipse(0,s*r*0.7,r*0.8,r*0.3,0,0,7); ctx.fill(); } ctx.restore(); }
    else if(u.kind==="magpie"||u.kind==="ibis"){ ctx.fillStyle=u.kind==="ibis"?"#222":"#0b3b8c"; // 頭/喙
      ctx.beginPath(); ctx.arc(u.x+fx2*r*0.5,u.y+fy*r*0.5,r*0.3,0,7); ctx.fill();
      ctx.strokeStyle=u.kind==="ibis"?"#222":"#e8a13a"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(u.x+fx2*r*0.6,u.y+fy*r*0.6); ctx.lineTo(u.x+fx2*r*1.2,u.y+fy*r*1.2); ctx.stroke();
      if(u.kind==="magpie"){ ctx.strokeStyle="#1565c0"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(u.x-fx2*r*0.6,u.y-fy*r*0.6); ctx.lineTo(u.x-fx2*r*1.5,u.y-fy*r*1.5); ctx.stroke(); } }
    else if(u.kind==="snail"){ ctx.strokeStyle=dark; ctx.lineWidth=4; ctx.beginPath(); for(let a=0;a<12;a++){ const rr=r*0.7*(1-a/16); ctx.lineTo(u.x+Math.cos(a*0.9)*rr,u.y+Math.sin(a*0.9)*rr); } ctx.stroke(); }
    else if(u.kind==="frog"){ ctx.fillStyle=dark; ctx.beginPath(); ctx.arc(u.x-r*0.4,u.y-r*0.45,r*0.22,0,7); ctx.arc(u.x+r*0.4,u.y-r*0.45,r*0.22,0,7); ctx.fill(); ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(u.x-r*0.4,u.y-r*0.48,r*0.1,0,7); ctx.arc(u.x+r*0.4,u.y-r*0.48,r*0.1,0,7); ctx.fill(); }
    // 朝向眼睛
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(u.x+fx2*r*0.42-fy*r*0.18,u.y+fy*r*0.42+fx2*r*0.18,r*0.13,0,7); ctx.arc(u.x+fx2*r*0.42+fy*r*0.18,u.y+fy*r*0.42-fx2*r*0.18,r*0.13,0,7); ctx.fill();
    ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(u.x+fx2*r*0.5-fy*r*0.18,u.y+fy*r*0.5+fx2*r*0.18,r*0.06,0,7); ctx.arc(u.x+fx2*r*0.5+fy*r*0.18,u.y+fy*r*0.5-fx2*r*0.18,r*0.06,0,7); ctx.fill();
  }
  function bar(x,y,w,frac,col){ ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(x-w/2,y,w,5); ctx.fillStyle=col; ctx.fillRect(x-w/2,y,w*clamp(frac,0,1),5); }
  function shade(hex,amt){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
    r=clamp(r,0,255);g=clamp(g,0,255);b=clamp(b,0,255); return "rgb("+r+","+g+","+b+")"; }

  /* ---------- HUD ---------- */
  function updateHUD(){
    const a=nexus[0],f=nexus[1];
    setW("mhpAlly",a.hp/a.maxhp); setW("mhpFoe",f.hp/f.maxhp);
    txt("mhpAllyTxt",Math.ceil(a.hp)); txt("mhpFoeTxt",Math.ceil(f.hp));
    const mm=Math.floor(clock/60), ss=Math.floor(clock%60); txt("mclock",mm+":"+(ss<10?"0":"")+ss);
    const sp=document.getElementById("mSp"); if(sp){ const cd=player&&player.spCd>0?player.spCd:0; sp.querySelector(".fill").style.height=(cd/8*100)+"%"; sp.classList.toggle("ready",cd<=0); }
  }
  function setW(id,f){ const el=document.getElementById(id); if(el) el.style.width=(clamp(f,0,1)*100)+"%"; }
  function txt(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }

  /* ---------- 迴圈 ---------- */
  function loop(ts){ if(!running) return; const dt=Math.min(0.04,(ts-lastT)/1000||0); lastT=ts; step(dt); render(); raf=requestAnimationFrame(loop); }

  /* ---------- 流程 ---------- */
  function start(size){ root.classList.remove("mhide"); hide("mpick"); hide("mover");
    resize(); setup(size); running=true; ended=false; lastT=0;
    raf=requestAnimationFrame(loop); }
  function stop(){ running=false; cancelAnimationFrame(raf); }
  function exitToLobby(){ stop(); root.classList.add("mhide"); hide("mover"); hide("mpick"); mv.x=mv.y=0;
    if(window.__lobbyRefresh) window.__lobbyRefresh(); }
  function endGame(win){ if(ended) return; ended=true; running=false; cancelAnimationFrame(raf);
    if(win){ const eco=teamSize*20, key=(window.__featuredKey&&window.__featuredKey())||"leopard", xp=60+teamSize*10;
      if(window.__awardEco) window.__awardEco(eco); if(window.__awardXP) window.__awardXP(key,xp); if(window.__bumpWin) window.__bumpWin();
      showOver("🏆 守護成功！","入侵巢穴已被搗毀","你守住了台灣神木，並把外來入侵種趕出棲地。<br>🌿 保育值 +"+eco+"　"+(KNAME[key]||"")+" EXP +"+xp); }
    else { showOver("神木倒下了…","棲地失守","別氣餒！用屬性相剋、善用技能與防禦塔，再守一次。"); }
  }
  function showOver(t,s,b){ root.classList.add("mhide");
    txt("moverT",t); txt("moverS",s); const el=document.getElementById("moverB"); if(el) el.innerHTML=b;
    const ag=document.getElementById("moverAgain"); ag.textContent="⚔ 再守一場"; show("mover"); }
  function show(id){ const e=document.getElementById(id); if(e) e.classList.remove("hide"); }
  function hide(id){ const e=document.getElementById(id); if(e) e.classList.add("hide"); }

  /* ---------- 控制：虛擬搖桿 ---------- */
  const stick=document.getElementById("mstick"), knob=document.getElementById("mknob");
  let stickId=null, sc={x:0,y:0};
  function stickStart(e){ e.preventDefault(); const r=stick.getBoundingClientRect(); sc.x=r.left+r.width/2; sc.y=r.top+r.height/2; stickId=e.pointerId; stick.setPointerCapture&&stick.setPointerCapture(e.pointerId); stickMove(e); }
  function stickMove(e){ if(stickId!==e.pointerId) return; e.preventDefault(); const dx=e.clientX-sc.x, dy=e.clientY-sc.y; const R=58; const d=Math.hypot(dx,dy)||1; const cd=Math.min(d,R);
    const nx=dx/d*cd, ny=dy/d*cd; mv.x=nx/R; mv.y=ny/R; knob.style.transform="translate("+nx+"px,"+ny+"px)"; }
  function stickEnd(e){ if(stickId!==e.pointerId) return; e.preventDefault(); stickId=null; mv.x=mv.y=0; knob.style.transform="translate(0,0)"; }
  if(stick){ stick.addEventListener("pointerdown",stickStart,{passive:false}); stick.addEventListener("pointermove",stickMove,{passive:false});
    stick.addEventListener("pointerup",stickEnd,{passive:false}); stick.addEventListener("pointercancel",stickEnd,{passive:false}); stick.addEventListener("pointerleave",stickEnd,{passive:false}); }
  const tap=(id,fn)=>{ const e=document.getElementById(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); };
  tap("mSp",()=>{ wantSp=true; }); tap("mBack",()=>{ wantBack=true; });

  /* ---------- 接到大廳「對戰」 ---------- */
  function openPick(){ const e=document.getElementById("mpick"); if(e){ e.classList.remove("hide"); } }
  const pb=document.getElementById("playBtn"); if(pb) pb.onclick=openPick;   // 覆寫：對戰 = 守護神木
  tap("pick3",()=>start(3)); tap("pick5",()=>start(5));
  tap("pickBack",()=>{ hide("mpick"); });
  tap("moverAgain",()=>start(teamSize)); tap("moverHome",exitToLobby);
  // 鍵盤（桌機方便測試）
  window.addEventListener("keydown",(e)=>{ if(!running) return; if(e.key==="ArrowLeft"||e.key==="a")mv.x=-1; else if(e.key==="ArrowRight"||e.key==="d")mv.x=1; else if(e.key==="ArrowUp"||e.key==="w")mv.y=-1; else if(e.key==="ArrowDown"||e.key==="s")mv.y=1; else if(e.key==="k"||e.key==="Shift")wantSp=true; else if(e.key==="b")wantBack=true; });
  window.addEventListener("keyup",(e)=>{ if(["ArrowLeft","a","ArrowRight","d"].includes(e.key))mv.x=0; if(["ArrowUp","w","ArrowDown","s"].includes(e.key))mv.y=0; });

  window.MOBA={ start, exit:exitToLobby };
})();
