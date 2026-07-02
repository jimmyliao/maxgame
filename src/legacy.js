import { TYPE, ADV, eff } from "./data/types-chart.js";

(() => {
  "use strict";

  /* ===== 寫實圖檔（sprite）載入：有圖用圖、沒圖 fallback 程式畫 ===== */
  const SPRITES={};
  const SPRITE_SRC={
    leopard:"assets/heroes/leopard.png", bear:"assets/heroes/bear.png",
    cicada:"assets/heroes/cicada.png", dragonfly:"assets/heroes/dragonfly.png",
    snail:"assets/bosses/snail.png", iguana:"assets/bosses/iguana.png",
    frog:"assets/bosses/frog.png", ibis:"assets/bosses/ibis.png",
    deer:"assets/heroes/deer.png", magpie:"assets/heroes/magpie.png"
  };
  function loadSprites(){ for(const k in SPRITE_SRC){ const img=new Image(); img.onload=()=>{ if(img.naturalWidth>0) SPRITES[k]=img; }; img.src=SPRITE_SRC[k]; } }
  // 多視角立繪（偽 3D 建模）：assets/views/{kind}_{front|right|back|left}.png，大廳拖曳 360° 旋轉看每一面。
  // 有哪隻的視角圖就載哪隻（缺圖 onerror 靜默、自動退回翻面過渡）；要幫新角色開 360° 只要把四張圖放進 assets/views/。
  const SPRITE_VIEWS={};
  ["leopard"].forEach(k=>{ const o={}; ["front","right","back","left"].forEach(v=>{ const im=new Image(); im.onerror=()=>{}; im.onload=()=>{ if(im.naturalWidth>0) o[v]=im; }; im.src="assets/views/"+k+"_"+v+".png"; }); SPRITE_VIEWS[k]=o; });
  loadSprites();

  /* ===== 角色繪製（優先用寫實圖，否則程式畫）===== */
  function drawCreature(cMain, kind, x, y, s, o){
    o=o||{}; const t=o.t||0, mood=o.mood||"happy", flip=o.flip;
    const bob=Math.sin(t*3+(o.ph||0))*s*0.04;
    const sp=SPRITES[kind];
    if(sp && sp.naturalWidth>0){ const ar=sp.naturalWidth/sp.naturalHeight, hh=s*2.7, ww=hh*ar;
      cMain.save(); cMain.translate(x,y+bob);
      cMain.fillStyle="rgba(0,0,0,0.25)"; cMain.beginPath(); cMain.ellipse(0,s*0.86,s*0.55,s*0.13,0,0,7); cMain.fill();
      if(flip) cMain.scale(-1,1);
      cMain.drawImage(sp, -ww/2, s*0.92-hh, ww, hh);
      cMain.restore(); return; }
    // 離屏畫布：立體上色(source-atop)只作用在角色本身，避免污染背景
    const R=Math.ceil(s*1.7), SS=2;
    const oc=drawCreature._oc||(drawCreature._oc=document.createElement("canvas"));
    const c=drawCreature._g||(drawCreature._g=oc.getContext("2d"));
    if(oc.width!==R*2*SS){ oc.width=R*2*SS; oc.height=R*2*SS; }
    c.setTransform(SS,0,0,SS,R*SS,R*SS); c.clearRect(-R,-R,R*2,R*2);
    c.save(); if(flip) c.scale(-1,1); c.lineJoin="round"; c.lineCap="round";
    const eye=(ex,ey,r)=>{ c.fillStyle="#fff"; c.beginPath(); c.arc(ex,ey,r,0,7); c.fill();
      c.fillStyle="#222"; c.beginPath(); c.arc(ex,ey,r*0.6,0,7); c.fill();
      c.fillStyle="rgba(255,255,255,0.95)"; c.beginPath(); c.arc(ex-r*0.32,ey-r*0.36,r*0.3,0,7); c.fill(); }; // 眼神高光
    const brow=(ex,ey,w)=>{ c.strokeStyle="#3e2723"; c.lineWidth=s*0.05; c.beginPath(); c.moveTo(ex-w,ey-2); c.lineTo(ex+w,ey+2); c.stroke(); };
    // 共用左上打光漸層 + 細邊描邊：所有角色統一光源方向、脫離「平塗貼紙」感
    const rg=(x0,y0,r,a,b)=>{ const g=c.createRadialGradient(x0-r*0.35,y0-r*0.4,r*0.1,x0,y0,r); g.addColorStop(0,a); g.addColorStop(1,b); return g; };
    const edge=(col)=>{ c.strokeStyle=col||"rgba(0,0,0,0.16)"; c.lineWidth=s*0.022; c.stroke(); };
    if(kind==="leopard"){
      // 尾巴（後方）+ 環紋
      c.lineCap="round"; c.strokeStyle="#d9974a"; c.lineWidth=s*0.18;
      c.beginPath(); c.moveTo(s*0.32,s*0.5); c.quadraticCurveTo(s*0.92,s*0.46,s*0.82,-s*0.06); c.stroke();
      c.strokeStyle="#6b4327"; c.lineWidth=s*0.06;
      for(let i=0;i<3;i++){ const px=s*(0.5+i*0.12), py=s*(0.44-i*0.16); c.beginPath(); c.moveTo(px-s*0.06,py+s*0.02); c.lineTo(px+s*0.05,py-s*0.04); c.stroke(); }
      // 身體（坐姿）
      c.fillStyle=rg(-s*0.12,s*0.1,s*0.62,"#f1b773","#c9883f");
      c.beginPath(); c.ellipse(0,s*0.28,s*0.46,s*0.5,0,0,7); c.fill();
      // 前腳 + 腳掌
      c.fillStyle=rg(0,s*0.6,s*0.24,"#eab068","#c9883f");
      c.beginPath(); c.ellipse(-s*0.17,s*0.6,s*0.13,s*0.2,0,0,7); c.fill();
      c.beginPath(); c.ellipse(s*0.17,s*0.6,s*0.13,s*0.2,0,0,7); c.fill();
      c.fillStyle="#fdf1e2"; c.beginPath(); c.ellipse(-s*0.17,s*0.75,s*0.1,s*0.06,0,0,7); c.fill(); c.beginPath(); c.ellipse(s*0.17,s*0.75,s*0.1,s*0.06,0,0,7); c.fill();
      // 胸腹白毛
      c.fillStyle="#fdf1e2"; c.beginPath(); c.moveTo(0,s*0.02); c.quadraticCurveTo(s*0.18,s*0.32,s*0.05,s*0.62); c.quadraticCurveTo(-s*0.05,s*0.64,-s*0.17,s*0.32); c.quadraticCurveTo(-s*0.12,s*0.06,0,s*0.02); c.fill();
      // 身體玫瑰斑
      c.lineWidth=s*0.025;
      for(const p of [[-0.28,0.18],[-0.31,0.44],[0.28,0.16],[0.31,0.4],[-0.04,0.5]]){ c.strokeStyle="#6b4327"; c.beginPath(); c.arc(p[0]*s,p[1]*s,s*0.06,0,7); c.stroke(); c.fillStyle="#6b4327"; c.beginPath(); c.arc(p[0]*s,p[1]*s,s*0.018,0,7); c.fill(); }
      // 頭 + 頰毛
      c.fillStyle=rg(-s*0.1,-s*0.46,s*0.56,"#f1b773","#cf8d42");
      c.beginPath(); c.ellipse(0,-s*0.32,s*0.44,s*0.4,0,0,7); c.fill();
      c.beginPath(); c.moveTo(-s*0.4,-s*0.3); c.lineTo(-s*0.52,-s*0.16); c.lineTo(-s*0.34,-s*0.1); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(s*0.4,-s*0.3); c.lineTo(s*0.52,-s*0.16); c.lineTo(s*0.34,-s*0.1); c.closePath(); c.fill();
      // 耳朵（外/黑斑/內耳）
      c.fillStyle="#cf8d42"; c.beginPath(); c.moveTo(-s*0.42,-s*0.58); c.lineTo(-s*0.16,-s*0.74); c.lineTo(-s*0.12,-s*0.46); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(s*0.42,-s*0.58); c.lineTo(s*0.16,-s*0.74); c.lineTo(s*0.12,-s*0.46); c.closePath(); c.fill();
      c.fillStyle="#3a2417"; c.beginPath(); c.moveTo(-s*0.4,-s*0.6); c.lineTo(-s*0.25,-s*0.69); c.lineTo(-s*0.2,-s*0.53); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(s*0.4,-s*0.6); c.lineTo(s*0.25,-s*0.69); c.lineTo(s*0.2,-s*0.53); c.closePath(); c.fill();
      c.fillStyle="#e98b8b"; c.beginPath(); c.moveTo(-s*0.3,-s*0.58); c.lineTo(-s*0.2,-s*0.64); c.lineTo(-s*0.17,-s*0.52); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(s*0.3,-s*0.58); c.lineTo(s*0.2,-s*0.64); c.lineTo(s*0.17,-s*0.52); c.closePath(); c.fill();
      // 額頭條紋
      c.strokeStyle="#6b4327"; c.lineWidth=s*0.04;
      for(const dx of [-0.14,-0.05,0.05,0.14]){ c.beginPath(); c.moveTo(dx*s,-s*0.62); c.lineTo(dx*s*0.7,-s*0.42); c.stroke(); }
      // 口鼻白
      c.fillStyle="#fdf4ea"; c.beginPath(); c.ellipse(0,-s*0.12,s*0.24,s*0.18,0,0,7); c.fill();
      // 琥珀眼
      const eyeA=(ex)=>{ c.fillStyle="#fff"; c.beginPath(); c.ellipse(ex,-s*0.34,s*0.13,s*0.15,0,0,7); c.fill();
        c.fillStyle="#f4b53a"; c.beginPath(); c.arc(ex,-s*0.33,s*0.105,0,7); c.fill();
        c.fillStyle="#241a10"; c.beginPath(); c.ellipse(ex,-s*0.33,s*0.05,s*0.1,0,0,7); c.fill();
        c.fillStyle="rgba(255,255,255,0.95)"; c.beginPath(); c.arc(ex-s*0.04,-s*0.39,s*0.035,0,7); c.fill(); };
      eyeA(-s*0.2); eyeA(s*0.2);
      if(mood==="angry"){ c.strokeStyle="#5d3a22"; c.lineWidth=s*0.05; c.beginPath(); c.moveTo(-s*0.33,-s*0.5); c.lineTo(-s*0.1,-s*0.45); c.moveTo(s*0.33,-s*0.5); c.lineTo(s*0.1,-s*0.45); c.stroke(); }
      // 鼻 + 嘴
      c.fillStyle="#d9737a"; c.beginPath(); c.moveTo(-s*0.05,-s*0.17); c.lineTo(s*0.05,-s*0.17); c.lineTo(0,-s*0.1); c.closePath(); c.fill();
      c.strokeStyle="#7a4a35"; c.lineWidth=s*0.025; c.beginPath(); c.moveTo(0,-s*0.1); c.lineTo(0,-s*0.05); c.quadraticCurveTo(-s*0.07,-s*0.01,-s*0.11,-s*0.05); c.moveTo(0,-s*0.05); c.quadraticCurveTo(s*0.07,-s*0.01,s*0.11,-s*0.05); c.stroke();
      // 鬍鬚
      c.strokeStyle="rgba(255,255,255,0.85)"; c.lineWidth=s*0.014;
      for(const dy of [-0.03,0.03]){ c.beginPath(); c.moveTo(-s*0.13,-s*0.1+dy*s); c.lineTo(-s*0.44,-s*0.14+dy*s*1.8); c.moveTo(s*0.13,-s*0.1+dy*s); c.lineTo(s*0.44,-s*0.14+dy*s*1.8); c.stroke(); }
    } else if(kind==="bear"){
      const earWag=Math.sin(t*4+(o.ph||0))*0.05;   // 耳朵隨時間微幅擺動，讀既有 o.t，不動合約
      // 身體（漸層打光，黑毛不再是死黑一片）
      c.fillStyle=rg(-s*0.14,s*0.05,s*0.68,"#4a4642","#161513"); c.beginPath(); c.ellipse(0,s*0.35,s*0.6,s*0.55,0,0,7); c.fill(); edge();
      // 胸口 V 字白斑（台灣黑熊最大特徵，用曲線取代直線三角形）
      c.fillStyle="#f6f3ec"; c.beginPath(); c.moveTo(-s*0.2,s*0.06); c.quadraticCurveTo(-s*0.02,s*0.28,-s*0.03,s*0.52); c.quadraticCurveTo(0,s*0.56,s*0.03,s*0.52); c.quadraticCurveTo(s*0.02,s*0.28,s*0.2,s*0.06); c.quadraticCurveTo(0,s*0.16,-s*0.2,s*0.06); c.fill();
      // 頭
      c.fillStyle=rg(-s*0.12,-s*0.42,s*0.54,"#4d4844","#18130f"); c.beginPath(); c.arc(0,-s*0.28,s*0.5,0,7); c.fill(); edge();
      // 耳朵（外殼+內耳兩層，帶微幅搖擺）
      c.save(); c.translate(-s*0.42,-s*0.55); c.rotate(earWag); c.fillStyle="#211d19"; c.beginPath(); c.arc(0,0,s*0.19,0,7); c.fill(); edge();
        c.fillStyle="#6b5a52"; c.beginPath(); c.arc(0,s*0.02,s*0.1,0,7); c.fill(); c.restore();
      c.save(); c.translate(s*0.42,-s*0.55); c.rotate(-earWag); c.fillStyle="#211d19"; c.beginPath(); c.arc(0,0,s*0.19,0,7); c.fill(); edge();
        c.fillStyle="#6b5a52"; c.beginPath(); c.arc(0,s*0.02,s*0.1,0,7); c.fill(); c.restore();
      // 口吻（淺棕漸層+深色鼻頭+嘴線）
      c.fillStyle=rg(0,-s*0.14,s*0.3,"#a1876f","#7a6153"); c.beginPath(); c.ellipse(0,-s*0.1,s*0.28,s*0.22,0,0,7); c.fill();
      c.fillStyle="#1c1512"; c.beginPath(); c.ellipse(0,-s*0.18,s*0.09,s*0.07,0,0,7); c.fill();
      c.strokeStyle="#3a2e26"; c.lineWidth=s*0.022; c.beginPath(); c.moveTo(0,-s*0.12); c.lineTo(0,-s*0.04); c.quadraticCurveTo(-s*0.06,0,-s*0.1,-s*0.03); c.moveTo(0,-s*0.04); c.quadraticCurveTo(s*0.06,0,s*0.1,-s*0.03); c.stroke();
      // 深棕虹膜（區別於通用 eye()）
      const bEye=(ex)=>{ c.fillStyle="#fff"; c.beginPath(); c.ellipse(ex,-s*0.34,s*0.1,s*0.11,0,0,7); c.fill();
        c.fillStyle="#4a2f1c"; c.beginPath(); c.arc(ex,-s*0.34,s*0.075,0,7); c.fill();
        c.fillStyle="#1a1008"; c.beginPath(); c.arc(ex,-s*0.34,s*0.04,0,7); c.fill();
        c.fillStyle="rgba(255,255,255,0.9)"; c.beginPath(); c.arc(ex-s*0.028,-s*0.38,s*0.026,0,7); c.fill(); };
      bEye(-s*0.2); bEye(s*0.2);
      if(mood==="angry"){ brow(-s*0.2,-s*0.48,s*0.12); brow(s*0.2,-s*0.48,s*0.12); }
    } else if(kind==="cicada"){
      // 翅膀：加翅脈線，不再是純色半透明色塊
      const wing=(a)=>{ c.save(); c.rotate(a); c.fillStyle=rg(s*0.2,0,s*0.5,"rgba(235,248,225,.7)","rgba(210,232,195,.35)"); c.beginPath(); c.ellipse(s*0.45,0,s*0.42,s*0.13,0,0,7); c.fill();
        c.strokeStyle="rgba(120,150,100,0.45)"; c.lineWidth=s*0.01; for(const r of [0.2,0.45,0.7]){ c.beginPath(); c.moveTo(s*0.06,0); c.lineTo(s*0.06+s*0.75*r,-s*0.1*r+s*0.02); c.stroke(); } c.restore(); };
      wing(-0.5); wing(0.5);
      c.fillStyle=rg(-s*0.1,-s*0.1,s*0.34,"#9ccc65","#4c7a24"); c.beginPath(); c.ellipse(0,s*0.05,s*0.3,s*0.5,0,0,7); c.fill(); edge("rgba(0,0,0,0.2)");
      c.fillStyle=rg(-s*0.1,-s*0.42,s*0.36,"#6fa03a","#33581a"); c.beginPath(); c.arc(0,-s*0.35,s*0.32,0,7); c.fill(); edge("rgba(0,0,0,0.2)");
      eye(-s*0.2,-s*0.38,s*0.12); eye(s*0.2,-s*0.38,s*0.12);
      if(mood==="angry"){ brow(-s*0.2,-s*0.54,s*0.12); brow(s*0.2,-s*0.54,s*0.12); }
    } else if(kind==="dragonfly"){
      // 翅膀：加放射翅脈 + 漸層透明感
      const dwing=(a)=>{ c.save(); c.rotate(a); c.fillStyle=rg(s*0.2,0,s*0.5,"rgba(210,245,250,.65)","rgba(180,230,240,.28)"); c.beginPath(); c.ellipse(s*0.45,0,s*0.42,s*0.13,0,0,7); c.fill();
        c.strokeStyle="rgba(100,180,190,0.5)"; c.lineWidth=s*0.009; for(const r of [0.3,0.55,0.8]){ c.beginPath(); c.moveTo(s*0.05,0); c.lineTo(s*0.05+s*0.78*r,-s*0.08*r); c.stroke(); } c.restore(); };
      for(const a of [-0.6,0.6,-1.0,1.0]) dwing(a);
      c.fillStyle=rg(-s*0.05,s*0.05,s*0.35,"#4dd8ec","#00838f"); c.beginPath(); c.ellipse(0,s*0.2,s*0.13,s*0.6,0,0,7); c.fill(); edge("rgba(0,0,0,0.22)");
      c.fillStyle=rg(-s*0.08,-s*0.48,s*0.3,"#2fd0e4","#006d7a"); c.beginPath(); c.arc(0,-s*0.42,s*0.26,0,7); c.fill(); edge("rgba(0,0,0,0.22)");
      // 暖色細邊：讓冷色系的勾蜓在深色背景不會「隱形」
      c.strokeStyle="rgba(255,220,150,0.3)"; c.lineWidth=s*0.02; c.beginPath(); c.ellipse(0,s*0.2,s*0.13,s*0.6,0,0,7); c.moveTo(s*0.26,-s*0.42); c.arc(0,-s*0.42,s*0.26,0,7); c.stroke();
      eye(-s*0.16,-s*0.46,s*0.14); eye(s*0.16,-s*0.46,s*0.14);
      if(mood==="angry"){ brow(-s*0.16,-s*0.62,s*0.12); brow(s*0.16,-s*0.62,s*0.12); }
    } else if(kind==="snail"){
      c.fillStyle=rg(-s*0.25,s*0.2,s*0.55,"#dcb37e","#8d5524"); c.beginPath(); c.ellipse(-s*0.15,s*0.35,s*0.5,s*0.28,0,0,7); c.fill(); edge();
      c.fillStyle=rg(0,-s*0.3,s*0.46,"#c17a3a","#6b3d12"); c.beginPath(); c.arc(s*0.15,-s*0.05,s*0.42,0,7); c.fill(); edge();
      c.strokeStyle="#5d3a17"; c.lineWidth=s*0.06; c.beginPath();
      for(let a=0;a<7;a+=0.2){ const rr=s*0.05*a,px=s*0.15+Math.cos(a*1.6)*rr,py=-s*0.05+Math.sin(a*1.6)*rr; a===0?c.moveTo(px,py):c.lineTo(px,py);} c.stroke();
      c.strokeStyle="#c79a6b"; c.lineWidth=s*0.05; c.lineCap="round"; c.beginPath(); c.moveTo(-s*0.4,s*0.2); c.lineTo(-s*0.52,-s*0.15); c.moveTo(-s*0.28,s*0.18); c.lineTo(-s*0.34,-s*0.18); c.stroke();
      c.fillStyle="#e8734a"; c.beginPath(); c.arc(-s*0.52,-s*0.17,s*0.055,0,7); c.arc(-s*0.34,-s*0.2,s*0.055,0,7); c.fill();
      c.fillStyle="#222"; c.beginPath(); c.arc(-s*0.52,-s*0.17,s*0.03,0,7); c.arc(-s*0.34,-s*0.2,s*0.03,0,7); c.fill();
      brow(-s*0.45,-s*0.3,s*0.1);
    } else if(kind==="iguana"){
      c.fillStyle=rg(-s*0.1,s*0.05,s*0.62,"#9ccc55","#4a7a24"); c.beginPath(); c.ellipse(0,s*0.3,s*0.58,s*0.32,0,0,7); c.fill(); edge();
      // 尾巴：加漸層 + 深色橫紋（鬣蜥招牌特徵）
      c.strokeStyle=rg(s*0.7,s*0.2,s*0.3,"#8bc34a","#4a7a24"); c.lineWidth=s*0.14; c.lineCap="round"; c.beginPath(); c.moveTo(s*0.5,s*0.35); c.quadraticCurveTo(s*0.95,s*0.3,s*1.0,0); c.stroke();
      c.strokeStyle="#33501a"; c.lineWidth=s*0.025; for(const t of [0.2,0.4,0.6,0.8]){ const tx=s*0.5+t*s*0.5,ty=s*0.35-t*s*0.35; c.beginPath(); c.moveTo(tx-s*0.05,ty-s*0.05); c.lineTo(tx+s*0.05,ty+s*0.05); c.stroke(); }
      // 背棘（沿脊椎的三角尖刺，鬣蜥辨識度最高的特徵）
      c.fillStyle="#33501a"; for(let i=-2;i<=3;i++){ c.beginPath(); c.moveTo(i*s*0.16,0); c.lineTo(i*s*0.16+s*0.05,-s*0.18); c.lineTo(i*s*0.16+s*0.1,0); c.fill(); c.strokeStyle="#20330f"; c.lineWidth=s*0.012; c.stroke(); }
      c.fillStyle=rg(-s*0.4,0,s*0.34,"#9ccc55","#4a7a24"); c.beginPath(); c.ellipse(-s*0.5,s*0.15,s*0.3,s*0.26,0,0,7); c.fill(); edge();
      c.fillStyle="#7cb342"; c.beginPath(); c.ellipse(-s*0.55,s*0.4,s*0.16,s*0.12,0,0,7); c.fill();
      // 喉垂（求偶/威嚇時展開的紅色肉垂）
      c.fillStyle="#c0473a"; c.beginPath(); c.moveTo(-s*0.48,s*0.22); c.quadraticCurveTo(-s*0.5,s*0.42,-s*0.4,s*0.5); c.quadraticCurveTo(-s*0.46,s*0.35,-s*0.44,s*0.22); c.closePath(); c.fill();
      const igEye=(ex)=>{ c.fillStyle="#fff"; c.beginPath(); c.ellipse(ex,s*0.05,s*0.1,s*0.11,0,0,7); c.fill();
        c.fillStyle="#4a3a1a"; c.beginPath(); c.arc(ex,s*0.05,s*0.06,0,7); c.fill();
        c.fillStyle="#1a1408"; c.beginPath(); c.ellipse(ex,s*0.05,s*0.03,s*0.05,0,0,7); c.fill(); };
      igEye(-s*0.6); brow(-s*0.6,-s*0.08,s*0.1);
    } else if(kind==="frog"){
      c.fillStyle=rg(-s*0.1,s*0.05,s*0.62,"#a1887f","#5d4037"); c.beginPath(); c.ellipse(0,s*0.3,s*0.55,s*0.42,0,0,7); c.fill(); edge();
      c.fillStyle="#4a332a"; for(const p of [[-.3,.45],[.3,.45],[-.1,.55],[.15,.3]]){ c.beginPath(); c.ellipse(p[0]*s,p[1]*s,s*0.08,s*0.06,0,0,7); c.fill(); }
      c.fillStyle=rg(0,-s*0.28,s*0.24,"#c4a394","#8d6e63"); c.beginPath(); c.arc(-s*0.28,-s*0.18,s*0.2,0,7); c.arc(s*0.28,-s*0.18,s*0.2,0,7); c.fill(); edge();
      eye(-s*0.28,-s*0.2,s*0.13); eye(s*0.28,-s*0.2,s*0.13);
      // 濕潤反光感
      c.fillStyle="rgba(255,255,255,0.25)"; c.beginPath(); c.ellipse(-s*0.12,s*0.14,s*0.14,s*0.07,-0.3,0,7); c.fill();
      if(mood!=="happy"){ brow(-s*0.28,-s*0.38,s*0.13); brow(s*0.28,-s*0.38,s*0.13); }
    } else if(kind==="ibis"){
      c.fillStyle=rg(-s*0.1,s*0,s*0.56,"#ffffff","#c8c8c8"); c.beginPath(); c.ellipse(0,s*0.25,s*0.5,s*0.4,0,0,7); c.fill(); edge("rgba(0,0,0,0.14)");
      c.fillStyle=rg(-s*0.24,-s*0.36,s*0.3,"#3a3a3a","#0d0d0d"); c.beginPath(); c.arc(-s*0.2,-s*0.3,s*0.26,0,7); c.fill(); edge("rgba(0,0,0,0.3)");
      c.strokeStyle="#1a1a1a"; c.lineWidth=s*0.08; c.lineCap="round"; c.beginPath(); c.moveTo(-s*0.4,-s*0.28); c.quadraticCurveTo(-s*0.85,-s*0.2,-s*0.8,s*0.15); c.stroke();
      c.strokeStyle="rgba(255,255,255,0.3)"; c.lineWidth=s*0.02; c.beginPath(); c.moveTo(-s*0.42,-s*0.3); c.quadraticCurveTo(-s*0.75,-s*0.22,-s*0.72,s*0.08); c.stroke();
      eye(-s*0.18,-s*0.34,s*0.08); brow(-s*0.18,-s*0.46,s*0.1);
    } else if(kind==="deer"){
      // 身體（漸層打光）+ 胸腹淺色 + 加大加亮的梅花斑（原本太小太淡，60px 縮圖幾乎看不見）
      c.fillStyle=rg(-s*0.15,s*0.1,s*0.62,"#dc9c58","#a8672f"); c.beginPath(); c.ellipse(0,s*0.32,s*0.5,s*0.44,0,0,7); c.fill(); edge();
      c.fillStyle="#f5e2c8"; c.beginPath(); c.ellipse(0,s*0.42,s*0.26,s*0.3,0,0,7); c.fill();
      c.fillStyle="#fffaf0"; for(const p of [[-0.28,0.14,1.15],[0.26,0.12,1.05],[-0.1,0.3,1],[0.14,0.32,0.95],[-0.3,0.4,0.9],[0.3,0.42,0.85],[0,0.05,0.8]]){ c.beginPath(); c.arc(p[0]*s,p[1]*s,s*0.07*p[2],0,7); c.fill();
        c.strokeStyle="rgba(168,106,54,0.5)"; c.lineWidth=s*0.008; c.stroke(); }
      // 鹿角（加粗、加分岔，原本太細幾乎消失）
      c.strokeStyle="#8a5a2a"; c.lineWidth=s*0.11; c.lineCap="round"; c.beginPath(); c.moveTo(-s*0.2,s*0.6); c.lineTo(-s*0.22,s*0.78); c.moveTo(s*0.2,s*0.6); c.lineTo(s*0.22,s*0.78); c.stroke();
      c.fillStyle=rg(0,-s*0.24,s*0.32,"#dc9c58","#a8672f"); c.beginPath(); c.ellipse(0,-s*0.18,s*0.18,s*0.26,0,0,7); c.fill();
      c.beginPath(); c.ellipse(0,-s*0.42,s*0.26,s*0.22,0,0,7); c.fill(); edge();
      c.fillStyle="#c8884a"; c.beginPath(); c.ellipse(-s*0.26,-s*0.5,s*0.1,s*0.16,-0.4,0,7); c.fill(); c.beginPath(); c.ellipse(s*0.26,-s*0.5,s*0.1,s*0.16,0.4,0,7); c.fill();
      c.strokeStyle="#7a4a1e"; c.lineWidth=s*0.062; c.lineCap="round"; c.beginPath(); c.moveTo(-s*0.12,-s*0.56); c.lineTo(-s*0.16,-s*0.78); c.moveTo(-s*0.16,-s*0.68); c.lineTo(-s*0.28,-s*0.76); c.moveTo(s*0.12,-s*0.56); c.lineTo(s*0.16,-s*0.78); c.moveTo(s*0.16,-s*0.68); c.lineTo(s*0.28,-s*0.76); c.stroke();
      c.fillStyle="#f5e2c8"; c.beginPath(); c.ellipse(0,-s*0.34,s*0.13,s*0.1,0,0,7); c.fill();
      c.fillStyle="#3a281c"; c.beginPath(); c.ellipse(0,-s*0.3,s*0.055,s*0.045,0,0,7); c.fill();
      eye(-s*0.12,-s*0.44,s*0.07); eye(s*0.12,-s*0.44,s*0.07);
      if(mood==="angry"){ brow(-s*0.12,-s*0.54,s*0.08); brow(s*0.12,-s*0.54,s*0.08); }
    } else if(kind==="magpie"){
      const tailWag=Math.sin(t*3+(o.ph||0))*0.04;
      // 長尾羽（藍鵲招牌特徵，加粗、加層次、帶微幅擺動）
      c.save(); c.rotate(tailWag);
      c.strokeStyle="#1d4f8f"; c.lineWidth=s*0.15; c.lineCap="round"; c.beginPath(); c.moveTo(s*0.2,s*0.4); c.quadraticCurveTo(s*0.7,s*0.62,s*0.98,s*0.16); c.stroke();
      c.strokeStyle="#2f73c4"; c.lineWidth=s*0.09; c.beginPath(); c.moveTo(s*0.2,s*0.4); c.quadraticCurveTo(s*0.7,s*0.6,s*0.95,s*0.18); c.stroke();
      c.fillStyle="#dbe9f7"; c.beginPath(); c.arc(s*0.97,s*0.17,s*0.07,0,7); c.fill();
      c.restore();
      // 身體（漸層打光，藍羽更有光澤感）
      c.fillStyle=rg(-s*0.2,s*0.05,s*0.46,"#4a94e0","#1d4f8f"); c.beginPath(); c.ellipse(-s*0.05,s*0.25,s*0.4,s*0.42,0,0,7); c.fill(); edge("rgba(0,0,0,0.22)");
      c.fillStyle="#eef5fc"; c.beginPath(); c.ellipse(-s*0.05,s*0.36,s*0.2,s*0.26,0,0,7); c.fill();
      c.fillStyle=rg(-s*0.28,s*0.14,s*0.26,"#3a7ecb","#1a4a86"); c.beginPath(); c.ellipse(-s*0.22,s*0.22,s*0.18,s*0.3,-0.3,0,7); c.fill();
      c.strokeStyle="#e53935"; c.lineWidth=s*0.055; c.lineCap="round"; c.beginPath(); c.moveTo(-s*0.12,s*0.62); c.lineTo(-s*0.12,s*0.78); c.moveTo(s*0.06,s*0.62); c.lineTo(s*0.06,s*0.78); c.stroke();
      // 頭（黑羽也給一點漸層，不是死黑）
      c.fillStyle=rg(-s*0.1,-s*0.36,s*0.32,"#3a3a3a","#0d0d0d"); c.beginPath(); c.arc(0,-s*0.28,s*0.3,0,7); c.fill(); edge("rgba(0,0,0,0.3)");
      c.fillStyle="#e53935"; c.beginPath(); c.moveTo(s*0.26,-s*0.3); c.lineTo(s*0.5,-s*0.24); c.lineTo(s*0.26,-s*0.15); c.closePath(); c.fill();
      c.strokeStyle="#a82420"; c.lineWidth=s*0.015; c.stroke();
      eye(-s*0.02,-s*0.32,s*0.08);
      if(mood==="angry"){ brow(-s*0.02,-s*0.44,s*0.1); }
    } else if(kind==="muntjac"){
      const earWag=Math.sin(t*3.6+(o.ph||0))*0.05;
      // 身體（漸層打光，體型比梅花鹿小巧，毛色偏紅棕）
      c.fillStyle=rg(-s*0.14,s*0.12,s*0.54,"#c9784a","#8f4f28"); c.beginPath(); c.ellipse(0,s*0.34,s*0.42,s*0.38,0,0,7); c.fill(); edge();
      c.fillStyle="#f0dcc4"; c.beginPath(); c.ellipse(0,s*0.44,s*0.2,s*0.24,0,0,7); c.fill();
      // 背脊深色條紋（山羌特徵之一）
      c.strokeStyle="#6b3a1e"; c.lineWidth=s*0.03; c.beginPath(); c.moveTo(0,-s*0.02); c.quadraticCurveTo(s*0.02,s*0.24,0,s*0.5); c.stroke();
      // 短小鹿角（僅雄性微凸，象徵性簡化）
      c.strokeStyle="#7a5230"; c.lineWidth=s*0.05; c.lineCap="round"; c.beginPath(); c.moveTo(-s*0.1,-s*0.56); c.lineTo(-s*0.14,-s*0.68); c.moveTo(s*0.1,-s*0.56); c.lineTo(s*0.14,-s*0.68); c.stroke(); c.lineCap="butt";
      // 頭
      c.fillStyle=rg(0,-s*0.22,s*0.26,"#c9784a","#8f4f28"); c.beginPath(); c.ellipse(0,-s*0.18,s*0.16,s*0.22,0,0,7); c.fill();
      c.beginPath(); c.ellipse(0,-s*0.38,s*0.22,s*0.19,0,0,7); c.fill(); edge();
      // 耳朵（大耳、微幅擺動——警覺敏銳的特徵）
      c.save(); c.translate(-s*0.24,-s*0.46); c.rotate(earWag); c.fillStyle="#a8613a"; c.beginPath(); c.ellipse(0,0,s*0.1,s*0.15,-0.3,0,7); c.fill(); c.restore();
      c.save(); c.translate(s*0.24,-s*0.46); c.rotate(-earWag); c.fillStyle="#a8613a"; c.beginPath(); c.ellipse(0,0,s*0.1,s*0.15,0.3,0,7); c.fill(); c.restore();
      c.fillStyle="#f0dcc4"; c.beginPath(); c.ellipse(0,-s*0.3,s*0.1,s*0.08,0,0,7); c.fill();
      c.fillStyle="#3a2418"; c.beginPath(); c.ellipse(0,-s*0.26,s*0.045,s*0.036,0,0,7); c.fill();
      eye(-s*0.11,-s*0.4,s*0.065); eye(s*0.11,-s*0.4,s*0.065);
      if(mood==="angry"){ brow(-s*0.11,-s*0.48,s*0.07); brow(s*0.11,-s*0.48,s*0.07); }
      // 微光療癒粒子（呼應輔助/治癒角色定位）
      for(let i=0;i<3;i++){ const a=t*1.4+i*2.1, rr=s*0.6; c.fillStyle="rgba(197,225,165,0.55)"; c.beginPath(); c.arc(Math.cos(a)*rr,s*0.1+Math.sin(a*1.3)*rr*0.5,s*0.03,0,7); c.fill(); }
    } else if(kind==="macaque"){
      const tailSwing=Math.sin(t*4+(o.ph||0))*0.08;
      // 尾巴（後方，敏捷刺客的動態擺動）
      c.save(); c.rotate(tailSwing); c.strokeStyle="#8a6a4a"; c.lineWidth=s*0.09; c.lineCap="round";
      c.beginPath(); c.moveTo(s*0.3,s*0.46); c.quadraticCurveTo(s*0.78,s*0.5,s*0.78,s*0.08); c.stroke(); c.restore();
      // 身體（漸層打光，米棕色毛）
      c.fillStyle=rg(-s*0.12,s*0.1,s*0.56,"#c2a06a","#8c6c3e"); c.beginPath(); c.ellipse(0,s*0.3,s*0.4,s*0.44,0,0,7); c.fill(); edge();
      c.fillStyle="#e8d9b8"; c.beginPath(); c.ellipse(0,s*0.4,s*0.2,s*0.26,0,0,7); c.fill();
      // 四肢敏捷姿態（前臂微舉，暗示戰鬥感）
      c.fillStyle=rg(0,s*0.62,s*0.16,"#b6935e","#8c6c3e"); c.beginPath(); c.ellipse(-s*0.26,s*0.5,s*0.1,s*0.2,0.5,0,7); c.fill();
      c.beginPath(); c.ellipse(s*0.28,s*0.46,s*0.1,s*0.2,-0.6,0,7); c.fill();
      // 頭（帶粉紅臉部特徵）
      c.fillStyle=rg(-s*0.08,-s*0.4,s*0.42,"#c2a06a","#96754a"); c.beginPath(); c.arc(0,-s*0.28,s*0.36,0,7); c.fill(); edge();
      c.fillStyle="#e0a898"; c.beginPath(); c.ellipse(0,-s*0.16,s*0.22,s*0.18,0,0,7); c.fill();
      // 耳朵
      c.fillStyle="#a8875a"; c.beginPath(); c.arc(-s*0.32,-s*0.4,s*0.13,0,7); c.fill(); c.beginPath(); c.arc(s*0.32,-s*0.4,s*0.13,0,7); c.fill();
      c.fillStyle="#d9a894"; c.beginPath(); c.arc(-s*0.32,-s*0.4,s*0.07,0,7); c.fill(); c.beginPath(); c.arc(s*0.32,-s*0.4,s*0.07,0,7); c.fill();
      // 深棕虹膜，銳利眼神
      const mEye=(ex)=>{ c.fillStyle="#fff"; c.beginPath(); c.ellipse(ex,-s*0.3,s*0.09,s*0.1,0,0,7); c.fill();
        c.fillStyle="#3a2414"; c.beginPath(); c.arc(ex,-s*0.3,s*0.065,0,7); c.fill();
        c.fillStyle="#150c06"; c.beginPath(); c.arc(ex,-s*0.3,s*0.032,0,7); c.fill();
        c.fillStyle="rgba(255,255,255,0.9)"; c.beginPath(); c.arc(ex-s*0.024,-s*0.34,s*0.022,0,7); c.fill(); };
      mEye(-s*0.11); mEye(s*0.11);
      if(mood==="angry"){ brow(-s*0.11,-s*0.42,s*0.1); brow(s*0.11,-s*0.42,s*0.1); }
      c.fillStyle="#c48a72"; c.beginPath(); c.ellipse(0,-s*0.1,s*0.08,s*0.06,0,0,7); c.fill();
    } else if(kind==="salmon"){
      const swim=Math.sin(t*5+(o.ph||0))*0.08;
      // 尾鰭（擺動，洄游意象）
      c.save(); c.rotate(swim*0.6); c.fillStyle=rg(s*0.5,0,s*0.3,"#e8887a","#c05a4a");
      c.beginPath(); c.moveTo(s*0.42,0); c.lineTo(s*0.78,-s*0.28); c.lineTo(s*0.66,0); c.lineTo(s*0.78,s*0.28); c.closePath(); c.fill(); edge("rgba(0,0,0,0.2)"); c.restore();
      // 身體（銀藍漸層+側線，國寶魚的流線體型）
      c.fillStyle=rg(-s*0.1,s*0.02,s*0.56,"#7fc4d4","#2f7a92"); c.beginPath(); c.ellipse(0,0,s*0.52,s*0.28,0,0,7); c.fill(); edge("rgba(0,0,0,0.22)");
      c.fillStyle="#e8f4f6"; c.beginPath(); c.ellipse(-s*0.02,s*0.12,s*0.46,s*0.14,0,0,7); c.fill();
      // 櫻花鉤吻鮭招牌：體側橢圓斑點（parr marks）+ 粉橘婚姻色
      c.fillStyle="rgba(60,40,30,0.5)"; for(const p of [[-0.28,-0.04],[-0.1,-0.1],[0.1,-0.06],[0.26,-0.1]]){ c.beginPath(); c.ellipse(p[0]*s,p[1]*s,s*0.07,s*0.045,0,0,7); c.fill(); }
      c.fillStyle="rgba(233,138,120,0.55)"; for(const p of [[-0.2,0.06],[0.02,0.08],[0.22,0.04]]){ c.beginPath(); c.arc(p[0]*s,p[1]*s,s*0.03,0,7); c.fill(); }
      // 背鰭 + 脂鰭（鮭科特徵）
      c.fillStyle=rg(0,-s*0.32,s*0.2,"#5fa8bc","#2f7a92"); c.beginPath(); c.moveTo(-s*0.06,-s*0.22); c.lineTo(s*0.06,-s*0.44); c.lineTo(s*0.2,-s*0.2); c.closePath(); c.fill(); edge("rgba(0,0,0,0.18)");
      c.fillStyle="#8fc9d6"; c.beginPath(); c.ellipse(s*0.34,-s*0.2,s*0.05,s*0.06,0,0,7); c.fill();
      // 胸鰭
      c.fillStyle="#7fc4d4"; c.beginPath(); c.ellipse(s*0.14,s*0.2,s*0.1,s*0.06,0.4,0,7); c.fill();
      // 頭 + 吻部（洄游期雄魚下顎微勾）
      c.fillStyle=rg(s*0.3,-s*0.02,s*0.24,"#8fcbd8","#3a8a9e"); c.beginPath(); c.ellipse(s*0.38,-s*0.02,s*0.18,s*0.16,0,0,7); c.fill();
      c.strokeStyle="#2f7a92"; c.lineWidth=s*0.025; c.beginPath(); c.moveTo(s*0.5,s*0.04); c.quadraticCurveTo(s*0.58,s*0.1,s*0.52,s*0.14); c.stroke();
      // 銀藍虹膜、水汪汪大眼
      c.fillStyle="#fff"; c.beginPath(); c.arc(s*0.42,-s*0.06,s*0.075,0,7); c.fill();
      c.fillStyle="#1c4a5a"; c.beginPath(); c.arc(s*0.44,-s*0.06,s*0.05,0,7); c.fill();
      c.fillStyle="#0a1e26"; c.beginPath(); c.arc(s*0.44,-s*0.06,s*0.024,0,7); c.fill();
      c.fillStyle="rgba(255,255,255,0.95)"; c.beginPath(); c.arc(s*0.41,-s*0.09,s*0.02,0,7); c.fill();
      if(mood==="angry"){ c.strokeStyle="#1c4a5a"; c.lineWidth=s*0.03; c.beginPath(); c.moveTo(s*0.32,-s*0.16); c.lineTo(s*0.48,-s*0.13); c.stroke(); }
      // 水花特效（傳奇角色專屬）
      for(let i=0;i<4;i++){ const a=t*2+i*1.6, rr=s*0.66+Math.sin(t*3+i)*s*0.05; c.fillStyle="rgba(180,230,240,0.5)"; c.beginPath(); c.arc(Math.cos(a)*rr,Math.sin(a)*rr*0.4,s*0.025,0,7); c.fill(); }
    } else if(kind==="pheasant"){
      const tailWag=Math.sin(t*2.6+(o.ph||0))*0.035;
      // 長尾羽（深藍為主、末端點綴，遠程射手的華麗感）
      c.save(); c.rotate(tailWag);
      c.strokeStyle="#1a2f5c"; c.lineWidth=s*0.14; c.lineCap="round"; c.beginPath(); c.moveTo(s*0.1,s*0.42); c.quadraticCurveTo(s*0.6,s*0.66,s*0.92,s*0.24); c.stroke();
      c.strokeStyle="#2d4a8a"; c.lineWidth=s*0.08; c.beginPath(); c.moveTo(s*0.1,s*0.42); c.quadraticCurveTo(s*0.6,s*0.64,s*0.9,s*0.26); c.stroke();
      c.fillStyle="#fff"; c.beginPath(); c.arc(s*0.92,s*0.25,s*0.05,0,7); c.fill();
      c.restore();
      // 身體（深藍帶金屬光澤，招牌配色）
      c.fillStyle=rg(-s*0.18,s*0.02,s*0.48,"#3a5fb8","#182a5c"); c.beginPath(); c.ellipse(-s*0.02,s*0.24,s*0.4,s*0.42,0,0,7); c.fill(); edge("rgba(0,0,0,0.24)");
      // 金屬光澤反光帶
      c.strokeStyle="rgba(140,180,255,0.4)"; c.lineWidth=s*0.03; c.beginPath(); c.moveTo(-s*0.24,-s*0.02); c.quadraticCurveTo(-s*0.1,s*0.2,-s*0.2,s*0.5); c.stroke();
      // 白色背部條紋（藍腹鷴雄鳥特徵）
      c.fillStyle="#eef2fb"; c.beginPath(); c.ellipse(-s*0.02,s*0.02,s*0.22,s*0.08,0,0,7); c.fill();
      // 深紅色腳（藍腹鷴特徵之一，簡化呈現於下方）
      c.strokeStyle="#c0392b"; c.lineWidth=s*0.045; c.lineCap="round"; c.beginPath(); c.moveTo(-s*0.1,s*0.58); c.lineTo(-s*0.1,s*0.72); c.moveTo(s*0.06,s*0.58); c.lineTo(s*0.06,s*0.72); c.stroke(); c.lineCap="butt";
      // 頭（黑羽微藍光澤）
      c.fillStyle=rg(-s*0.08,-s*0.34,s*0.3,"#2a3a4a","#0c1420"); c.beginPath(); c.arc(0,-s*0.26,s*0.28,0,7); c.fill(); edge("rgba(0,0,0,0.3)");
      // 鮮紅肉垂（臉部最醒目特徵）
      c.fillStyle="#e5342a"; c.beginPath(); c.ellipse(-s*0.02,-s*0.16,s*0.16,s*0.13,0,0,7); c.fill();
      c.strokeStyle="#a8221a"; c.lineWidth=s*0.012; c.stroke();
      // 白色冠羽
      c.fillStyle="#f5f7fb"; c.beginPath(); c.moveTo(-s*0.06,-s*0.5); c.lineTo(s*0.02,-s*0.62); c.lineTo(s*0.08,-s*0.48); c.closePath(); c.fill();
      // 喙
      c.fillStyle="#e8a13a"; c.beginPath(); c.moveTo(s*0.22,-s*0.28); c.lineTo(s*0.42,-s*0.22); c.lineTo(s*0.22,-s*0.17); c.closePath(); c.fill();
      eye(-s*0.03,-s*0.3,s*0.07);
      if(mood==="angry"){ brow(-s*0.03,-s*0.42,s*0.09); }
    } else if(kind==="pangolin"){
      // 尾巴（後方，粗厚帶鱗，坦克象徵）
      c.fillStyle=rg(s*0.6,s*0.2,s*0.4,"#c79a5e","#7a5326"); c.beginPath(); c.moveTo(s*0.3,s*0.5); c.quadraticCurveTo(s*0.95,s*0.5,s*0.9,-s*0.02); c.quadraticCurveTo(s*0.7,s*0.1,s*0.34,s*0.32); c.closePath(); c.fill();
      // 身體（拱背蹲姿，土黃棕）
      c.fillStyle=rg(-s*0.12,s*0.08,s*0.6,"#c99a5a","#7d5528"); c.beginPath(); c.ellipse(0,s*0.3,s*0.46,s*0.46,0,0,7); c.fill(); edge();
      // 前後腳（粗短、挖掘型）
      c.fillStyle=rg(0,s*0.62,s*0.2,"#b98a48","#6e4a22"); for(const dx of [-0.2,0.22]){ c.beginPath(); c.ellipse(dx*s,s*0.6,s*0.12,s*0.18,0,0,7); c.fill(); }
      // 前爪（挖掘大爪）
      c.strokeStyle="#4a3216"; c.lineWidth=s*0.03; c.lineCap="round"; for(const dx of [-0.24,-0.18,0.18,0.24]){ c.beginPath(); c.moveTo(dx*s,s*0.74); c.lineTo(dx*s,s*0.82); c.stroke(); }
      // 鱗甲（覆瓦狀，招牌特徵；成排三角鱗片由背至臀）
      c.lineWidth=s*0.018; c.strokeStyle="#5a3d1c";
      for(let row=0;row<4;row++){ for(let col=-2;col<=2;col++){ const px=col*s*0.19+ (row%2? s*0.095: 0), py=-s*0.02+row*s*0.16;
        if(Math.hypot(px, py-s*0.3)>s*0.5) continue;
        c.fillStyle=rg(px-s*0.05,py-s*0.05,s*0.13,"#e0b878","#9a6f36"); c.beginPath();
        c.moveTo(px,py-s*0.07); c.lineTo(px+s*0.1,py+s*0.06); c.lineTo(px-s*0.1,py+s*0.06); c.closePath(); c.fill(); c.stroke(); } }
      // 頭（小、圓錐、無鱗較淺）
      c.fillStyle=rg(-s*0.34,-s*0.28,s*0.32,"#d0a868","#9a6f36"); c.beginPath(); c.ellipse(-s*0.42,-s*0.08,s*0.26,s*0.22,-0.2,0,7); c.fill(); edge();
      // 長吻（食蟻）
      c.fillStyle=rg(-s*0.62,-s*0.02,s*0.2,"#dcb87c","#a4783e"); c.beginPath(); c.ellipse(-s*0.6,s*0.02,s*0.16,s*0.1,-0.1,0,7); c.fill();
      // 小圓耳
      c.fillStyle="#9a6f36"; c.beginPath(); c.arc(-s*0.34,-s*0.26,s*0.06,0,7); c.fill();
      eye(-s*0.46,-s*0.1,s*0.06); brow(-s*0.46,-s*0.22,s*0.08);
      if(mood==="angry"){ c.strokeStyle="#5a3d1c"; c.lineWidth=s*0.04; c.beginPath(); c.moveTo(-s*0.6,-s*0.16); c.lineTo(-s*0.46,-s*0.12); c.stroke(); }
    } else if(kind==="yellowmarten"){
      const tailSwing=Math.sin(t*4.5+(o.ph||0))*0.1;
      // 長尾（後方，蓬鬆深褐，敏捷擺動）
      c.save(); c.rotate(tailSwing); c.strokeStyle=rg(s*0.7,s*0.2,s*0.4,"#5a3c22","#3a2412"); c.lineWidth=s*0.13; c.lineCap="round";
      c.beginPath(); c.moveTo(s*0.32,s*0.42); c.quadraticCurveTo(s*0.9,s*0.42,s*0.98,-s*0.16); c.stroke(); c.restore();
      // 身體（細長流線，前深後淺——貂科修長體型）
      c.fillStyle=rg(-s*0.14,s*0.06,s*0.58,"#6b4a2a","#3e2814"); c.beginPath(); c.ellipse(0,s*0.3,s*0.5,s*0.34,0,0,7); c.fill(); edge();
      // 鮮黃喉胸（招牌特徵）
      c.fillStyle=rg(-s*0.1,s*0.2,s*0.32,"#ffe066","#e0a81f"); c.beginPath(); c.ellipse(-s*0.12,s*0.34,s*0.24,s*0.22,-0.2,0,7); c.fill();
      // 四肢（細短、敏捷姿態）
      c.fillStyle=rg(0,s*0.6,s*0.16,"#5a3c22","#33200f"); for(const dx of [-0.22,0.24]){ c.beginPath(); c.ellipse(dx*s,s*0.58,s*0.09,s*0.18,0,0,7); c.fill(); }
      // 頭（尖臉、貂科）
      c.fillStyle=rg(-s*0.36,-s*0.28,s*0.34,"#75512f","#452c16"); c.beginPath(); c.ellipse(-s*0.4,-s*0.1,s*0.28,s*0.24,-0.15,0,7); c.fill(); edge();
      // 尖吻
      c.fillStyle=rg(-s*0.62,-s*0.04,s*0.18,"#7d5834","#4a2f18"); c.beginPath(); c.ellipse(-s*0.62,s*0.0,s*0.13,s*0.09,-0.1,0,7); c.fill();
      // 圓耳
      c.fillStyle="#5a3c22"; c.beginPath(); c.arc(-s*0.34,-s*0.32,s*0.09,0,7); c.fill(); c.fillStyle="#8a6a48"; c.beginPath(); c.arc(-s*0.34,-s*0.31,s*0.045,0,7); c.fill();
      // 鼻頭 + 銳利眼
      c.fillStyle="#2a1a10"; c.beginPath(); c.arc(-s*0.72,s*0.0,s*0.045,0,7); c.fill();
      eye(-s*0.44,-s*0.12,s*0.07);
      if(mood==="angry"){ brow(-s*0.44,-s*0.24,s*0.09); c.fillStyle="#fff"; c.beginPath(); c.moveTo(-s*0.6,s*0.02); c.lineTo(-s*0.52,-s*0.02); c.lineTo(-s*0.56,s*0.08); c.closePath(); c.fill(); }
      else { c.strokeStyle="#2a1a10"; c.lineWidth=s*0.02; c.beginPath(); c.moveTo(-s*0.62,s*0.04); c.quadraticCurveTo(-s*0.55,s*0.08,-s*0.5,s*0.05); c.stroke(); }
    } else if(kind==="mikado"){
      const tailWag=Math.sin(t*2.4+(o.ph||0))*0.03;
      // 極長尾羽（藍黑帶白橫帶，帝雉招牌）
      c.save(); c.rotate(tailWag);
      c.strokeStyle="#12203f"; c.lineWidth=s*0.15; c.lineCap="round"; c.beginPath(); c.moveTo(s*0.12,s*0.42); c.quadraticCurveTo(s*0.7,s*0.7,s*1.02,s*0.16); c.stroke();
      c.strokeStyle="#26386a"; c.lineWidth=s*0.09; c.beginPath(); c.moveTo(s*0.12,s*0.42); c.quadraticCurveTo(s*0.7,s*0.68,s*1.0,s*0.18); c.stroke();
      // 白色橫帶（帝雉尾羽特徵）
      c.strokeStyle="#f2f5fb"; c.lineWidth=s*0.05; for(const tt of [0.4,0.6,0.8]){ const bx=s*0.12+tt*(s*0.9), by=s*0.42+Math.sin(tt*1.4)*s*0.1-tt*tt*s*0.34; c.beginPath(); c.moveTo(bx-s*0.05,by+s*0.03); c.lineTo(bx+s*0.05,by-s*0.03); c.stroke(); }
      c.restore();
      // 身體（深藍黑、金屬光澤）
      c.fillStyle=rg(-s*0.18,s*0.02,s*0.48,"#2c4272","#141f38"); c.beginPath(); c.ellipse(-s*0.02,s*0.24,s*0.4,s*0.42,0,0,7); c.fill(); edge("rgba(0,0,0,0.28)");
      // 金屬反光帶
      c.strokeStyle="rgba(120,160,230,0.4)"; c.lineWidth=s*0.03; c.beginPath(); c.moveTo(-s*0.24,-s*0.02); c.quadraticCurveTo(-s*0.1,s*0.2,-s*0.2,s*0.5); c.stroke();
      // 白色細橫紋（帝雉體羽細白條）
      c.strokeStyle="rgba(230,238,250,0.5)"; c.lineWidth=s*0.012; for(const yy of [0.1,0.24,0.38]){ c.beginPath(); c.moveTo(-s*0.32,s*yy); c.lineTo(s*0.24,s*yy); c.stroke(); }
      // 紅腳
      c.strokeStyle="#c0392b"; c.lineWidth=s*0.045; c.lineCap="round"; for(const dx of [-0.1,0.06]){ c.beginPath(); c.moveTo(dx*s,s*0.58); c.lineTo(dx*s,s*0.72); c.stroke(); } c.lineCap="butt";
      // 頭（藍黑）
      c.fillStyle=rg(-s*0.08,-s*0.34,s*0.3,"#2a3a58","#0e1626"); c.beginPath(); c.arc(0,-s*0.26,s*0.27,0,7); c.fill(); edge("rgba(0,0,0,0.3)");
      // 鮮紅臉部肉垂（帝雉眼周紅色）
      c.fillStyle="#e5342a"; c.beginPath(); c.ellipse(-s*0.02,-s*0.2,s*0.15,s*0.11,0,0,7); c.fill();
      c.strokeStyle="#a8221a"; c.lineWidth=s*0.012; c.stroke();
      // 喙
      c.fillStyle="#3a3a3a"; c.beginPath(); c.moveTo(s*0.2,-s*0.28); c.lineTo(s*0.4,-s*0.22); c.lineTo(s*0.2,-s*0.17); c.closePath(); c.fill();
      eye(-s*0.05,-s*0.3,s*0.07);
      if(mood==="angry"){ brow(-s*0.05,-s*0.42,s*0.09); }
    }
    // 立體上色：頂光 + 底暗，只作用在角色剪影上（source-atop，離屏內不污染背景）
    c.globalCompositeOperation="source-atop";
    const _sg=c.createLinearGradient(0,-s*0.95,0,s*0.7);
    _sg.addColorStop(0,"rgba(255,255,255,0.26)"); _sg.addColorStop(0.45,"rgba(255,255,255,0)"); _sg.addColorStop(1,"rgba(0,0,0,0.32)");
    c.fillStyle=_sg; c.fillRect(-s*1.5,-s*1.25,s*3,s*2.4);
    c.globalCompositeOperation="source-over"; c.restore();
    // 合成到主畫布：先畫接地柔影，再貼上角色
    cMain.save(); cMain.translate(x,y+bob);
    cMain.fillStyle="rgba(0,0,0,0.22)"; cMain.beginPath(); cMain.ellipse(0,s*0.84,s*0.52,s*0.13,0,0,7); cMain.fill();
    cMain.drawImage(oc,-R,-R,R*2,R*2);
    cMain.restore();
  }

  /* ===== 屬性（台灣棲地）===== 由 ./data/types-chart.js 提供（TYPE/ADV/eff，見檔頭 import） */

  /* ===== 英雄（台灣特有種）===== */
  const HEROES = [
    { key:"leopard", name:"石虎", type:"forest", speed:235, atkDmg:7, atkCd:0.33, reach:64, spName:"突刺", spCd:4.5, sp:"dash",
      status:"瀕危・保育類", fact:"台灣唯一的原生貓科動物，夜行性，全台僅存數百隻，棲地破碎與路殺是最大威脅。" },
    { key:"bear", name:"黑熊", type:"forest", speed:160, atkDmg:12, atkCd:0.6, reach:78, spName:"震地", spCd:6.0, sp:"slam",
      status:"瀕危・保育類", fact:"台灣唯一原生熊類，胸前有 V 形白斑（月熊）。森林的傘護種，保護牠就保護整片山林。" },
    { key:"cicada", name:"爺蟬", type:"bug", speed:185, atkDmg:6, atkCd:0.4, reach:60, spName:"音波", spCd:5.0, sp:"sonic",
      status:"台灣特有", fact:"台灣體型最大的蟬之一，鳴聲宏亮可傳數百公尺。幼蟲在地下生活多年才羽化。" },
    { key:"dragonfly", name:"勾蜓", type:"sky", speed:265, atkDmg:6, atkCd:0.3, reach:60, spName:"疾風", spCd:4.5, sp:"dash",
      status:"保育類", fact:"無霸勾蜓是台灣最大的蜻蜓，飛行迅速，是乾淨溪流與濕地的指標生物。" },
    { key:"deer", name:"梅花鹿", type:"forest", speed:250, atkDmg:8, atkCd:0.36, reach:70, spName:"鹿躍", spCd:4.6, sp:"dash",
      status:"台灣特有亞種・復育中", fact:"梅花鹿曾因獵捕在野外滅絕，經人工復育後重返墾丁等地，是台灣復育成功的象徵。" },
    { key:"magpie", name:"台灣藍鵲", type:"sky", speed:272, atkDmg:6, atkCd:0.3, reach:62, spName:"群襲", spCd:4.2, sp:"dash", locked:true, cost:400,
      status:"台灣特有・國鳥之一", fact:"台灣藍鵲尾羽極長、藍紅相間，群體護巢性極強，俗稱長尾山娘。" },
    { key:"muntjac", name:"山羌", type:"forest", speed:245, atkDmg:5, atkCd:0.34, reach:56, spName:"靈奔祝福", spCd:4.8, sp:"dash", locked:true, cost:320,
      status:"台灣特有亞種・數量穩定", fact:"台灣體型最小的鹿科動物，受驚時會發出如犬吠的叫聲，故俗稱吠鹿。棲息在森林底層，是山林生態鏈的重要一環。" },
    { key:"macaque", name:"台灣獼猴", type:"forest", speed:290, atkDmg:5, atkCd:0.22, reach:52, spName:"猿躍連擊", spCd:4.0, sp:"dash", locked:true, cost:350,
      status:"台灣特有亞種・保育類", fact:"台灣唯一原生靈長類，群居性強、攀爬敏捷。近年因誤餵食導致部分族群失去戒心，餵食野生獼猴其實會害了牠們。" },
    { key:"salmon", name:"台灣櫻花鉤吻鮭", type:"water", speed:210, atkDmg:9, atkCd:0.4, reach:58, spName:"逆流衝刺", spCd:5.2, sp:"dash", locked:true, cost:580,
      status:"瀕危・國寶魚", fact:"冰河時期孑遺生物，僅存於雪霸大甲溪上游冷水溪流，對水溫與水質要求極高，是台灣溪流保育的旗艦物種。" },
    { key:"pheasant", name:"藍腹鷴", type:"sky", speed:215, atkDmg:7, atkCd:0.42, reach:120, spName:"金羽連射", spCd:5.0, sp:"sonic", locked:true, cost:400,
      status:"台灣特有・保育類", fact:"雄鳥羽色深藍帶金屬光澤、臉部鮮紅肉垂，是世界知名的華麗雉科鳥類，棲息於中低海拔原始闊葉林。" },
    { key:"pangolin", name:"穿山甲", type:"forest", speed:150, atkDmg:10, atkCd:0.55, reach:66, spName:"捲甲防禦", spCd:6.5, sp:"slam", locked:true, cost:520,
      status:"珍貴稀有・保育類", fact:"台灣穿山甲全身覆滿角質鱗甲，遇敵會捲成球自保，專吃螞蟻與白蟻。曾因盜獵鱗片瀕危，是淺山森林的鬆土工程師。" },
    { key:"yellowmarten", name:"黃喉貂", type:"forest", speed:300, atkDmg:6, atkCd:0.2, reach:52, spName:"疾襲連咬", spCd:4.0, sp:"dash", locked:true, cost:460,
      status:"珍貴稀有・保育類", fact:"黃喉貂喉部有醒目的鮮黃色斑，是台灣森林裡動作最敏捷的中型食肉獸，常成小群合作獵捕，行動如閃電。" },
    { key:"mikado", name:"帝雉", type:"sky", speed:210, atkDmg:7, atkCd:0.44, reach:126, spName:"帝羽箭雨", spCd:5.2, sp:"sonic", locked:true, cost:560,
      status:"台灣特有・瀕危保育類", fact:"帝雉是台灣特有的高山雉類，雄鳥通體藍黑帶金屬光澤、尾羽極長並有白色橫帶，常在雲霧繚繞的森林現身，有『迷霧中的王者』美名。" },
  ];
  /* ===== 章節與魔王（外來入侵種）===== */
  const CH = [
    { place:"稻田", bg:"paddy", hero:0, boss:{kind:"snail", name:"福壽螺王", type:"water", hp:120, r:62, dmg:14,
        status:"外來入侵種", fact:"原產南美，1980 年代引進養殖後逸出，繁殖力驚人，啃食秧苗造成稻作重大損失。" },
      intro:[ {s:0,m:"happy",t:"我是石虎，淺山的夜行獵手！我的屬性是 🌲山林。"},
              {s:0,m:"angry",t:"福壽螺王是 💧水域 屬性——山林剋水域，我打牠『效果絕佳』！"},
              {s:0,m:"happy",t:"等牠出招後露出破綻再衝上去。下面：◀▶移動、跳、攻擊、必殺(突刺)。"} ],
      outro:[ {s:0,m:"happy",t:"贏了！圖鑑裡多認識了一種生命。下一個敵人在淺山…"} ] },
    { place:"淺山", bg:"hill", hero:1, boss:{kind:"iguana", name:"綠鬣蜥王", type:"forest", hp:165, r:72, dmg:16,
        status:"外來入侵種", fact:"原產中南美，棄養後在南台灣大量野化，啃食農作、挖洞破壞堤防，已列為有害外來種。" },
      intro:[ {s:1,m:"happy",t:"換我了，台灣黑熊！屬性 🌲山林。"},
              {s:1,m:"angry",t:"綠鬣蜥王也是 🌲山林，同屬性不吃相剋…硬碰硬！"},
              {s:1,m:"happy",t:"想佔上風？戰鬥中按『換手』，換成剋牠的夥伴。必殺『震地』打一大片！"} ],
      outro:[ {s:1,m:"happy",t:"這點重量難不倒我。溪流那邊好像也有狀況…"} ] },
    { place:"溪流", bg:"stream", hero:2, boss:{kind:"frog", name:"斑腿樹蛙王", type:"water", hp:200, r:66, dmg:14,
        status:"外來入侵種", fact:"原產東南亞，隨園藝植物引入，繁殖快、適應力強，排擠台灣原生的莫氏樹蛙等蛙類。" },
      intro:[ {s:2,m:"happy",t:"吱———！台灣爺蟬，屬性 🪲蟲。"},
              {s:2,m:"angry",t:"斑腿樹蛙王是 💧水域，我打牠普通…不如換 🌲山林 的石虎、黑熊『效果絕佳』！"},
              {s:2,m:"happy",t:"我的必殺『音波』是遠程、還能震暈。記得善用換手喔！"} ],
      outro:[ {s:2,m:"happy",t:"安靜下來了…最後的決戰，在濕地。"} ] },
    { place:"濕地", bg:"wetland", hero:3, boss:{kind:"ibis", name:"埃及聖䴉王", type:"sky", hp:255, r:70, dmg:16,
        status:"外來入侵種", fact:"原產非洲，從動物園逸出後大量繁殖，搶佔黑面琵鷺等水鳥棲地、掠食原生鳥卵。" },
      intro:[ {s:3,m:"happy",t:"嗡嗡嗡！無霸勾蜓，屬性 🌪天空，台灣飛最快！"},
              {s:3,m:"angry",t:"埃及聖䴉王也是 🌪天空，這是場勢均力敵的最後決戰！"},
              {s:3,m:"happy",t:"四隻夥伴到齊了，自由換手、用對屬性。打倒牠，守住台灣！"} ],
      outro:[ {s:3,m:"happy",t:"我們贏了！"},
              {s:0,m:"happy",t:"這些動物都是真的，正在消失。記得牠們、告訴別人，就是最好的守護。"} ] },
  ];

  /* ===== DOM ===== */
  const canvas=document.getElementById("game"), ctx=canvas.getContext("2d");
  const dock=document.getElementById("dock");
  const titleScr=document.getElementById("title"), mapScr=document.getElementById("map"),
        resultScr=document.getElementById("result"), storyScr=document.getElementById("story"), dexScr=document.getElementById("dex"),
        upgradeScr=document.getElementById("upgrade"), statsScr=document.getElementById("stats"), settingsScr=document.getElementById("settings"),
        dailyScr=document.getElementById("daily");
  const bSp=document.getElementById("bSp"), bSwap=document.getElementById("bSwap");
  const lobbyScr=document.getElementById("lobby");
  const heroShow=document.getElementById("heroShow"), hctx=heroShow.getContext("2d");
  const LOBBY_TAG={ leopard:"台灣唯一原生貓科 · 夜行獵手", bear:"台灣唯一原生熊 · 森林守護者", cicada:"台灣最大的蟬 · 鳴聲震場", dragonfly:"台灣最快的蜻蜓 · 空中獵手", deer:"復育成功的象徵 · 重返山林", magpie:"長尾山娘 · 護巢勇者",
    muntjac:"森林吠鹿 · 復育治癒者", macaque:"台灣原生猴 · 敏捷刺客", salmon:"冰河孑遺 · 國寶溪流傳奇", pheasant:"華麗雉科 · 遠程金羽射手",
    pangolin:"鱗甲防禦專家 · 捲球無敵", yellowmarten:"森林最速刺客 · 黃喉連咬", mikado:"迷霧中的王者 · 高山遠程" };
  // 保育行動知識（玩中學）
  const CONS_END={ leopard:"開車經過淺山請減速，避免路殺石虎。", bear:"登山不留廚餘、不餵食野生動物。", cicada:"保留老樹與森林，就是保留昆蟲的家。", dragonfly:"別污染溪流濕地，牠們是水質好壞的指標。", deer:"支持棲地保育，讓復育的族群能長久生存。", magpie:"友善賞鳥不干擾巢區，讓藍鵲安心育雛。",
    muntjac:"登山賞鹿保持距離，不要因為好奇而驚擾牠們棲息的森林底層。", macaque:"看到台灣獼猴請勿餵食，這會讓牠們失去覓食本能、增加人猴衝突。", salmon:"守護溪流上游的水質與水溫，就是守護國寶魚僅存的家。", pheasant:"淺山賞鳥不放音誘、不接近巢區，讓藍腹鷴安心繁殖。",
    pangolin:"拒買穿山甲鱗片與製品，盜獵才會停止；夜間淺山開車減速避免路殺。", yellowmarten:"保留完整的森林廊道，讓黃喉貂有足夠獵場與活動空間。", mikado:"高山賞鳥保持安靜與距離，不餵食、不追逐，讓帝雉安心於霧林覓食。" };
  const CONS_INV={ snail:"看到福壽螺的粉紅色卵塊，撥落水中可阻止孵化。", iguana:"養寵物請養到底——綠鬣蜥是因棄養才氾濫的。", frog:"不要隨意放生，外來蛙會排擠台灣原生種。", ibis:"發現外來入侵種，可通報林業保育署協助移除。" };
  // 記住上次選的守護者（跨 session 持久化）：讀 localStorage，驗證在範圍內且已解鎖才採用，否則回到 0
  let featured=(()=>{ try{ const v=parseInt(localStorage.getItem("shoutu_featured")||"0",10); if(v>=0&&v<HEROES.length&&isHeroUnlocked(HEROES[v].key)) return v; }catch(e){} return 0; })(), hsW=0, hsH=0;
  function saveFeatured(){ try{ localStorage.setItem("shoutu_featured",String(featured)); }catch(e){} }
  // 遊戲帳號名稱（沿用好友連線的暱稱鍵 shoutu_nick，跨模組共用同一個名字）
  function getAccountName(){ try{ return (localStorage.getItem("shoutu_nick")||"").trim()||"守護者"; }catch(e){ return "守護者"; } }
  function setAccountName(v){ try{ localStorage.setItem("shoutu_nick",(v||"").trim()); }catch(e){} }
  function renameAccount(){ const cur=getAccountName(); const v=window.prompt("輸入你的遊戲帳號名稱：", cur==="守護者"?"":cur);
    if(v===null) return; const name=(v||"").trim().slice(0,16); setAccountName(name);
    const ni=document.getElementById("nickInput"); if(ni) ni.value=name;   // 同步好友連線的暱稱輸入
    if(window.__sfx) window.__sfx.play("levelup"); updateLobby(); }
  function getEco(){ try{ return parseInt(localStorage.getItem("shoutu_eco")||"0",10)||0; }catch(e){ return 0; } }
  function setEco(v){ try{ localStorage.setItem("shoutu_eco",String(v)); }catch(e){} }
  // 累積獲得的保育值（終身；只增不減——花費保育值不會扣，保育等級才不會退等）
  function getEcoEarned(){ let base=0; try{ const v=parseInt(localStorage.getItem("shoutu_ecoearned"),10); base=isNaN(v)?0:v; }catch(e){}
    const m=Math.max(base,getEco()); if(m!==base){ try{ localStorage.setItem("shoutu_ecoearned",String(m)); }catch(e){} } return m; }
  function gainEco(n){ n=n|0; const earned=getEcoEarned(); setEco(getEco()+n); try{ localStorage.setItem("shoutu_ecoearned",String(earned+n)); }catch(e){} }
  // 守護者經驗/等級（最高 50，不退級）
  function getXP(){ try{ return JSON.parse(localStorage.getItem("shoutu_xp")||"{}")||{}; }catch(e){ return {}; } }
  function setXP(o){ try{ localStorage.setItem("shoutu_xp",JSON.stringify(o)); }catch(e){} }
  function heroXP(key){ return getXP()[key]||0; }
  function heroLevel(key){ return Math.min(50, Math.floor(heroXP(key)/100)+1); }
  function gainXP(key,amt){ const o=getXP(); o[key]=Math.min((o[key]||0)+amt, 4999); setXP(o); }
  function lvHP(key){ return 100 + (heroLevel(key)-1)*6; }
  function lvAtk(key){ return Math.floor((heroLevel(key)-1)/4); }
  /* ===== 天賦樹（分歧培養）：每隻守護者 2 條路線二選一，各 3 級，第 3 級解鎖主動技能效果 =====
     mods 疊加到 MOBA 對戰數值：dmg/speed/spCd（技能冷卻倍率，越小越快）/dr（減傷 0~1）
     active：第 3 級解鎖，effect 對應 moba.js castSp() 內讀取的旗標字串 */
  const TALENTS = {
    leopard: { A:{ name:"夜行夜襲流", tiers:[
          { cost:60,  mods:{dmg:0.06}, desc:"夜間感官敏銳，攻擊力 +6%" },
          { cost:120, mods:{dmg:0.10, speed:0.06}, desc:"擅長伏擊，攻擊力 +10%、速度 +6%" },
          { cost:240, mods:{dmg:0.16, speed:0.10}, active:{effect:"leopard_ambush", name:"夜襲",
            desc:"攻擊力 +16%、速度 +10%；施放突刺時額外附加一段夜襲爆擊傷害"} } ] },
        B:{ name:"避險生存流", tiers:[
          { cost:60,  mods:{dr:0.06}, desc:"提高戒心，減傷 6%" },
          { cost:120, mods:{dr:0.11}, desc:"熟悉地形陷阱，減傷 11%" },
          { cost:240, mods:{dr:0.16}, active:{effect:"leopard_evade", name:"路殺迴避",
            desc:"減傷 16%；施放突刺時獲得 1.5 秒無敵，可安全穿越危險路段"} } ] } },
    bear: { A:{ name:"蠻力衝撞流", tiers:[
          { cost:60,  mods:{dmg:0.07}, desc:"前臂力量增強，攻擊力 +7%" },
          { cost:120, mods:{dmg:0.12, spCd:-0.06}, desc:"攻擊力 +12%、技能冷卻 -6%" },
          { cost:240, mods:{dmg:0.18, spCd:-0.10}, active:{effect:"bear_smash", name:"怒熊震擊",
            desc:"攻擊力 +18%、技能冷卻 -10%；震地範圍與擊退力大幅提升"} } ] },
        B:{ name:"厚皮防禦流", tiers:[
          { cost:60,  mods:{dr:0.07}, desc:"皮下脂肪增厚，減傷 7%" },
          { cost:120, mods:{dr:0.13, speed:0.04}, desc:"減傷 13%、速度 +4%" },
          { cost:240, mods:{dr:0.20}, active:{effect:"bear_guard", name:"不屈厚皮",
            desc:"減傷 20%；施放震地時獲得 2 秒護盾，抵銷下一波傷害"} } ] } },
    dragonfly: { A:{ name:"疾風流", tiers:[
          { cost:60,  mods:{speed:0.08}, desc:"飛行肌群強化，速度 +8%" },
          { cost:120, mods:{speed:0.14, dmg:0.05}, desc:"速度 +14%、攻擊力 +5%" },
          { cost:240, mods:{speed:0.20, dmg:0.08}, active:{effect:"dragonfly_gust", name:"音速衝刺",
            desc:"速度 +20%、攻擊力 +8%；施放疾風刃前先高速衝刺一小段並附加額外傷害"} } ] },
        B:{ name:"索敵流", tiers:[
          { cost:60,  mods:{dmg:0.06}, desc:"複眼視野更廣，攻擊力 +6%" },
          { cost:120, mods:{dmg:0.11, spCd:-0.05}, desc:"攻擊力 +11%、技能冷卻 -5%" },
          { cost:240, mods:{dmg:0.16, spCd:-0.10}, active:{effect:"dragonfly_pierce", name:"精準捕獵",
            desc:"攻擊力 +16%、技能冷卻 -10%；疾風刃穿透數與飛行速度提升"} } ] } },
    magpie: { A:{ name:"群襲流", tiers:[
          { cost:60,  mods:{spCd:-0.06}, desc:"群體默契，技能冷卻 -6%" },
          { cost:120, mods:{spCd:-0.10, dmg:0.05}, desc:"技能冷卻 -10%、攻擊力 +5%" },
          { cost:240, mods:{spCd:-0.15, dmg:0.08}, active:{effect:"magpie_swarm", name:"群鵲俯衝",
            desc:"技能冷卻 -15%、攻擊力 +8%；俯衝啄擊命中範圍與擊退力提升"} } ] },
        B:{ name:"護巢流", tiers:[
          { cost:60,  mods:{dr:0.05}, desc:"護巢警覺，減傷 5%" },
          { cost:120, mods:{dr:0.09, speed:0.05}, desc:"減傷 9%、速度 +5%" },
          { cost:240, mods:{dr:0.14}, active:{effect:"magpie_nest", name:"護巢屏障",
            desc:"減傷 14%；施放俯衝啄擊時，周圍友軍額外獲得短暫護盾"} } ] } },
    deer: { A:{ name:"敏捷奔躍流", tiers:[
          { cost:60,  mods:{speed:0.07}, desc:"腿部肌力強化，速度 +7%" },
          { cost:120, mods:{speed:0.13, dr:0.04}, desc:"速度 +13%、減傷 4%" },
          { cost:240, mods:{speed:0.18, dr:0.08}, active:{effect:"deer_leap", name:"鹿群疾躍",
            desc:"速度 +18%、減傷 8%；施放復育號角時自身額外獲得 1.2 秒無敵"} } ] },
        B:{ name:"復育治癒流", tiers:[
          { cost:60,  mods:{dmg:0.04}, desc:"族群生命力旺盛，攻擊力 +4%" },
          { cost:120, mods:{dmg:0.07, spCd:-0.06}, desc:"攻擊力 +7%、技能冷卻 -6%" },
          { cost:240, mods:{dmg:0.10, spCd:-0.12}, active:{effect:"deer_bless", name:"復育祝福",
            desc:"攻擊力 +10%、技能冷卻 -12%；復育號角治療量大幅提升"} } ] } },
    cicada: { A:{ name:"音波震攝流", tiers:[
          { cost:60,  mods:{dmg:0.06}, desc:"鳴聲共鳴增強，攻擊力 +6%" },
          { cost:120, mods:{dmg:0.11, spCd:-0.05}, desc:"攻擊力 +11%、技能冷卻 -5%" },
          { cost:240, mods:{dmg:0.16, spCd:-0.10}, active:{effect:"cicada_boom", name:"共鳴音爆",
            desc:"攻擊力 +16%、技能冷卻 -10%；音爆範圍加大、暈眩時間延長"} } ] },
        B:{ name:"潛伏擬態流", tiers:[
          { cost:60,  mods:{dr:0.05}, desc:"若蟲蟄伏本能，減傷 5%" },
          { cost:120, mods:{dr:0.09, speed:0.04}, desc:"減傷 9%、速度 +4%" },
          { cost:240, mods:{dr:0.12}, active:{effect:"cicada_mimic", name:"環境擬態",
            desc:"減傷 12%；施放音爆時先隱身 3 秒，入侵種無法鎖定你"} } ] } },
    pangolin: { A:{ name:"鋼鱗防禦流", tiers:[
          { cost:60,  mods:{dr:0.07}, desc:"角質鱗片增厚，減傷 7%" },
          { cost:120, mods:{dr:0.13}, desc:"層層覆瓦鱗甲，減傷 13%" },
          { cost:240, mods:{dr:0.20}, active:{effect:"pangolin_fortress", name:"鐵甲堡壘",
            desc:"減傷 20%；捲甲防禦時間延長、護盾更厚，穩如磐石"} } ] },
        B:{ name:"掘地重擊流", tiers:[
          { cost:60,  mods:{dmg:0.07}, desc:"前爪強而有力，攻擊力 +7%" },
          { cost:120, mods:{dmg:0.12, dr:0.05}, desc:"攻擊力 +12%、減傷 5%" },
          { cost:240, mods:{dmg:0.18, dr:0.08}, active:{effect:"pangolin_dig", name:"破土重擊",
            desc:"攻擊力 +18%、減傷 8%；捲甲展開時對周圍造成額外震擊傷害"} } ] } },
    yellowmarten: { A:{ name:"疾襲刺客流", tiers:[
          { cost:60,  mods:{speed:0.08}, desc:"林間穿梭如電，速度 +8%" },
          { cost:120, mods:{speed:0.13, dmg:0.06}, desc:"速度 +13%、攻擊力 +6%" },
          { cost:240, mods:{speed:0.18, dmg:0.10}, active:{effect:"marten_blitz", name:"閃電獵殺",
            desc:"速度 +18%、攻擊力 +10%；疾襲連咬段數增加、每段命中回復少量體力"} } ] },
        B:{ name:"群獵連咬流", tiers:[
          { cost:60,  mods:{dmg:0.07}, desc:"利齒更尖，攻擊力 +7%" },
          { cost:120, mods:{dmg:0.12, spCd:-0.06}, desc:"攻擊力 +12%、技能冷卻 -6%" },
          { cost:240, mods:{dmg:0.17, spCd:-0.12}, active:{effect:"marten_pack", name:"合圍撕咬",
            desc:"攻擊力 +17%、技能冷卻 -12%；連咬命中的入侵種留下破綻，受創加重"} } ] } },
    mikado: { A:{ name:"帝羽箭雨流", tiers:[
          { cost:60,  mods:{dmg:0.07}, desc:"羽箭更銳，攻擊力 +7%" },
          { cost:120, mods:{dmg:0.12, spCd:-0.06}, desc:"攻擊力 +12%、技能冷卻 -6%" },
          { cost:240, mods:{dmg:0.18, spCd:-0.10}, active:{effect:"mikado_volley", name:"漫天箭雨",
            desc:"攻擊力 +18%、技能冷卻 -10%；帝羽箭雨箭數增加、射程更遠"} } ] },
        B:{ name:"靈羽迴避流", tiers:[
          { cost:60,  mods:{speed:0.07}, desc:"步伐輕盈，速度 +7%" },
          { cost:120, mods:{speed:0.12, dr:0.06}, desc:"速度 +12%、減傷 6%" },
          { cost:240, mods:{speed:0.16, dr:0.12}, active:{effect:"mikado_grace", name:"雲霧靈羽",
            desc:"速度 +16%、減傷 12%；施放箭雨後短暫加速拉開距離，高山雉的靈巧身法"} } ] } },
  };
  function getTalents(){ try{ return JSON.parse(localStorage.getItem("shoutu_talents")||"{}")||{}; }catch(e){ return {}; } }
  function setTalents(o){ try{ localStorage.setItem("shoutu_talents",JSON.stringify(o)); }catch(e){} }
  function heroTalent(key){ const o=getTalents(); return o[key]||{path:null,tier:0}; }
  function talentDef(key){ return TALENTS[key]||null; }
  function talentPick(key,path){ const o=getTalents(); const cur=o[key]||{path:null,tier:0};
    if(cur.path && cur.path!==path) return false; // 已選路線需先升到底才能重選（避免混搭）
    o[key]={path, tier:cur.tier||0}; setTalents(o); return true; }
  function talentUpgrade(key){ const def=talentDef(key); if(!def) return false; const o=getTalents(); const cur=o[key]; if(!cur||!cur.path) return false;
    if(cur.tier>=3) return false; const cost=def[cur.path].tiers[cur.tier].cost; if(getEco()<cost) return false;
    setEco(getEco()-cost); cur.tier++; o[key]=cur; setTalents(o); return true; }
  // 匯總目前生效的天賦數值加成（供 MOBA 讀取）：dmg/speed/spCd 為疊加倍率、dr 為減傷、active 為第 3 級主動技能旗標
  function talentSummary(key){ const t=heroTalent(key), def=talentDef(key); if(!def||!t.path||t.tier<=0) return null;
    const path=def[t.path]; const mods={dmg:0,speed:0,spCd:0,dr:0}; let active=null;
    for(let i=0;i<t.tier;i++){ const tr=path.tiers[i]; if(tr.mods){ for(const k in tr.mods) mods[k]=(mods[k]||0)+tr.mods[k]; } if(tr.active) active=tr.active; }
    return { path:t.path, pathName:path.name, tier:t.tier, mods, active }; }
  // 解鎖守護者（基本 4 隻恆解鎖；梅花鹿/藍鵲用保育值解鎖）
  function getUnlockedHeroes(){ try{ return JSON.parse(localStorage.getItem("shoutu_heroes")||"[]")||[]; }catch(e){ return []; } }
  function isHeroUnlocked(key){ const h=HEROES.find(x=>x.key===key); if(!h||!h.locked) return true; return getUnlockedHeroes().includes(key); }
  function unlockHero(key){ const a=getUnlockedHeroes(); if(!a.includes(key)){ a.push(key); try{ localStorage.setItem("shoutu_heroes",JSON.stringify(a)); }catch(e){} } }
  // 戰績
  function getWins(){ try{ return parseInt(localStorage.getItem("shoutu_wins")||"0",10)||0; }catch(e){ return 0; } }
  function getMaxStar(){ try{ return parseInt(localStorage.getItem("shoutu_maxstar")||"0",10)||0; }catch(e){ return 0; } }
  function bumpWin(){ try{ localStorage.setItem("shoutu_wins",String(getWins()+1)); if(matchLevel>getMaxStar()) localStorage.setItem("shoutu_maxstar",String(matchLevel)); }catch(e){} }
  // 通行證點數（完成每日任務累積，用來在通行證兌換特殊服裝）
  function getPassPts(){ try{ return parseInt(localStorage.getItem("shoutu_pass_pts")||"0",10)||0; }catch(e){ return 0; } }
  function setPassPts(v){ try{ localStorage.setItem("shoutu_pass_pts",String(Math.max(0,v|0))); }catch(e){} }
  // 通行證等級：看「累計獲得」點數(花掉不扣、只增不減)，每 5 點升 1 級、上限 Lv.30；等級解鎖更高級的服裝與獎勵
  const PASS_LV_STEP=5, PASS_LV_MAX=30;
  function getPassEarned(){ try{ const v=parseInt(localStorage.getItem("shoutu_pass_earned")||"0",10)||0; return Math.max(v,getPassPts()); }catch(e){ return getPassPts(); } }   // 舊玩家遷移：至少等於目前持有
  function passLevel(){ return Math.min(PASS_LV_MAX, Math.floor(getPassEarned()/PASS_LV_STEP)+1); }
  function addPassPts(n){ n=n|0; if(n>0){ const before=passLevel();
      try{ localStorage.setItem("shoutu_pass_earned",String(getPassEarned()+n)); }catch(e){}
      setPassPts(getPassPts()+n);
      if(passLevel()>before && window.__sfx) window.__sfx.play("levelup");   // 通行證升級音效
    } else setPassPts(getPassPts()+n); }
  // 每日任務（每天刷新、完成領「通行證點數」）——精簡成 3 個一目了然、玩主線就會自然進度的任務
  const DAILY_DEFS=[ {id:"win",name:"打贏 1 場對戰",goal:1,pp:3}, {id:"eco",name:"賺取 150 保育值",goal:150,pp:2}, {id:"boss",name:"擊敗 1 位大首領",goal:1,pp:4} ];
  function todayKey(){ try{ const d=new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }catch(e){ return "x"; } }
  function getDaily(){ let o=null; try{ o=JSON.parse(localStorage.getItem("shoutu_daily")||"null"); }catch(e){}
    if(!o || o.date!==todayKey()){ o={date:todayKey(),prog:{},claimed:{}}; saveDaily(o); } return o; }
  function saveDaily(o){ try{ localStorage.setItem("shoutu_daily",JSON.stringify(o)); }catch(e){} }
  function dailyBump(id,n){ const o=getDaily(); o.prog[id]=(o.prog[id]||0)+(n||1); saveDaily(o); }
  function dailyClaimable(){ const o=getDaily(); return DAILY_DEFS.filter(d=>(o.prog[d.id]||0)>=d.goal && !o.claimed[d.id]).length; }

  let W=0,H=0,GY=0,dpr=1,rot=false;
  // 只有手機/平板才強制橫向；電腦瀏覽器不管視窗形狀都維持原生直式，不套用旋轉戲法
  const isMobileDevice=()=>/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent||"");
  const appRoot=document.getElementById("app");
  // 這幾個畫面是獨立於 #app 之外的覆蓋層（MOBA 選人/結算、好友連線），沒有內部畫布要重繪，
  // 直接把整個 .scr 盒子原地旋轉即可，跟 #app 用同一個 rot 判斷、同一時間切換，畫面才不會忽正忽橫。
  const ROT_OVERLAYS=["mpick","mover","coop","coopRoom"].map(id=>document.getElementById(id)).filter(Boolean);
  const rotateGate=document.getElementById("rotateGate");
  // 直握手機時，強制把整個遊戲（大廳/1v1戰鬥/圖鑑/復育…）旋轉成橫向，跟 MOBA／棲地基地同一套做法：
  // 內部畫布一律以「橫向」尺寸繪製，交給 CSS transform 負責把畫面轉正貼滿直立螢幕。
  // 同時蓋一層「請橫向持機」引導頁——CSS 旋轉戲法只有物理橫拿手機才會正確顯示，
  // 不提示的話玩家會看到整個畫面歪一邊、以為壞掉，這裡把要求講清楚，橫拿後自動消失。
  function applyRot(){ const iw=window.innerWidth, ih=window.innerHeight; rot=isMobileDevice()&&ih>iw;
    if(appRoot) appRoot.classList.toggle("rot",rot);
    for(const el of ROT_OVERLAYS) el.classList.toggle("rot",rot);
    if(rotateGate) rotateGate.classList.toggle("hide",!rot); }
  function resize(){ applyRot(); const iw=window.innerWidth, ih=window.innerHeight;
    W = rot? ih : iw; H = rot? iw : ih; GY=H*0.82;
    dpr=Math.min(window.devicePixelRatio||1,2); canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  window.addEventListener("resize",resize);
  window.addEventListener("orientationchange",()=>setTimeout(resize,60));
  function getUnlocked(){ try{ return parseInt(localStorage.getItem("shoutu_unlocked")||"0",10)||0; }catch(e){ return 0; } }
  function setUnlocked(v){ try{ localStorage.setItem("shoutu_unlocked",String(v)); }catch(e){} }

  /* ===== 狀態 ===== */
  let state="title", chapter=0, elapsed=0, shake=0;
  let matchMode=false, matchLevel=1, hitstop=0, itemTimer=0;
  let hero, heroDef, boss, team, active, projs, fx, floaters, parts, items;
  // 保育道具（玩中學）
  const ITEMS={ heal:{icon:"🌿",name:"棲地復育",col:"#66bb6a"}, report:{icon:"📢",name:"通報移除",col:"#ffd54f"}, shield:{icon:"🛡️",name:"生態廊道",col:"#4dd0e1"} };
  const ITEM_KEYS=["heal","report","shield"];
  const GRAV=1700, JUMP=-620;
  const input={ left:false, right:false };

  function show(scr){ [titleScr,mapScr,resultScr,dexScr,lobbyScr,upgradeScr,statsScr,settingsScr,dailyScr].forEach(s=>s.classList.add("hide")); storyScr.classList.add("hide"); if(scr) scr.classList.remove("hide"); }
  function goDaily(){ state="daily"; setBattleUI(false); show(dailyScr);
    const pp=document.getElementById("dailyPassPts"); if(pp) pp.textContent=getPassPts();
    const o=getDaily(), wrap=document.getElementById("dailyCards"); wrap.innerHTML="";
    DAILY_DEFS.forEach(d=>{ const prog=Math.min(o.prog[d.id]||0,d.goal), done=prog>=d.goal, claimed=!!o.claimed[d.id];
      const div=document.createElement("div"); div.className="card"+(claimed?" cleared":"");
      const info=document.createElement("div"); info.className="info";
      info.innerHTML=`<div class="t">${d.name}</div>`+
        `<div class="d">進度 ${prog}/${d.goal}　·　獎勵 🎟 ${d.pp} 點</div>`;
      div.appendChild(info);
      const btn=document.createElement("button"); btn.className="btn"; btn.style.cssText="margin:0;padding:8px 12px;font-size:13px;";
      if(claimed){ btn.textContent="已領取"; btn.className="btn sec"; btn.disabled=true; btn.style.opacity=".5"; }
      else if(done){ btn.textContent="領取"; btn.onclick=()=>{ const oo=getDaily(); if(!oo.claimed[d.id] && (oo.prog[d.id]||0)>=d.goal){ oo.claimed[d.id]=true; saveDaily(oo); addPassPts(d.pp);
        if(window.__sfx) window.__sfx.play("coin"); flyPassPts(btn, d.pp); refreshDailyNav(); goDaily(); } }; }
      else { btn.textContent="進行中"; btn.className="btn sec"; btn.disabled=true; btn.style.opacity=".5"; }
      div.appendChild(btn); wrap.appendChild(div); });
  }
  // 完成任務領取時：一枚「🎟」票券從任務卡飛到上方通行證點數徽章，抵達時徽章彈一下，把「任務→通行證」的關聯視覺化
  function flyPassPts(fromEl, amount){ try{
    const badge=document.getElementById("dailyPassBadge"); if(!fromEl||!badge) return;
    const a=fromEl.getBoundingClientRect(), b=badge.getBoundingClientRect();
    const chip=document.createElement("div"); chip.className="pp-fly"; chip.textContent="🎟 +"+amount;
    chip.style.left=(a.left+a.width/2)+"px"; chip.style.top=(a.top+a.height/2)+"px"; chip.style.transform="translate(-50%,-50%) scale(1)";
    document.body.appendChild(chip);
    const dx=(b.left+b.width/2)-(a.left+a.width/2), dy=(b.top+b.height/2)-(a.top+a.height/2);
    requestAnimationFrame(()=>{ chip.style.transform="translate(-50%,-50%) translate("+dx+"px,"+dy+"px) scale(.6)"; chip.style.opacity="0"; });
    setTimeout(()=>{ chip.remove(); const dp=document.getElementById("dailyPassPts"); if(dp) dp.textContent=getPassPts();
      badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump"); }, 720);
  }catch(e){} }
  function goStats(){ state="stats"; setBattleUI(false); show(statsScr);
    const lv=Math.floor(getEcoEarned()/100)+1, ml=getMaxStar();
    document.getElementById("statsBody").innerHTML=
      `🌿 保育值：<b>${getEco()}</b><br>🎖️ 保育等級：<b>Lv.${lv}</b><br>🛡️ 驅逐外來種：<b>${getWins()}</b> 次<br>⭐ 最高配對星級：<b>${ml?("★"+ml):"—"}</b><br><br>`+
      `<span style="color:#ffd54f;font-weight:800">守護者族群復育</span><br>`+
      HEROES.filter(h=>isHeroUnlocked(h.key)).map(h=>`${h.name}　Lv.${heroLevel(h.key)}`).join("　·　");
  }
  function goSettings(){ state="settings"; setBattleUI(false); show(settingsScr); }
  let talentOpenKey=null; // 目前展開天賦面板的守護者（重繪 goUpgrade 時保持展開狀態）
  function goUpgrade(){ state="upgrade"; setBattleUI(false); show(upgradeScr);
    document.getElementById("upgEco").textContent=getEco();
    const wrap=document.getElementById("upgCards"); wrap.innerHTML="";
    HEROES.forEach((h,idx)=>{ const unlocked=isHeroUnlocked(h.key);
      const div=document.createElement("div"); div.className="card"; div.style.cssText="flex-direction:column;align-items:stretch;";
      const top=document.createElement("div"); top.style.cssText="display:flex;align-items:center;gap:12px;width:100%;";
      // 用跟大廳一樣的寫實插畫(drawCreature 圖檔優先)，加大尺寸讓玩家看得清楚
      const cv=document.createElement("canvas"); cv.width=144; cv.height=144; cv.style.cssText="width:72px;height:72px;flex:none;"; top.appendChild(cv);
      const cc=cv.getContext("2d"); drawCreature(cc,h.key,72,82,46,{t:0}); if(!unlocked){ cc.globalAlpha=0.55; cc.fillStyle="#000"; cc.fillRect(0,0,144,144); cc.globalAlpha=1; cc.font="40px serif"; cc.textAlign="center"; cc.fillText("🔒",72,88); }
      const info=document.createElement("div"); info.className="info";
      if(!unlocked){
        info.innerHTML=`<div class="t">${h.name} 🔒</div><div class="d">${h.status}<br>解鎖花 🌿 ${h.cost}</div>`;
        top.appendChild(info);
        const btn=document.createElement("button"); btn.className="btn"; btn.style.cssText="margin:0;padding:8px 12px;font-size:13px;"; btn.textContent="解鎖";
        if(getEco()<h.cost){ btn.className="btn sec"; btn.style.opacity=".4"; }
        btn.addEventListener("pointerdown",(e)=>{ e.preventDefault(); if(getEco()>=h.cost){ setEco(getEco()-h.cost); unlockHero(h.key); goUpgrade(); } },{passive:false});
        top.appendChild(btn);
        div.appendChild(top);
      } else {
        const lv=heroLevel(h.key), xp=heroXP(h.key), inLv=lv>=50?100:(xp%100), max=lv>=50;
        const ts=talentSummary(h.key);
        info.innerHTML=`<div class="t">${h.name} <span style="color:#ffd54f;font-size:12px">Lv.${lv}${max?" MAX":""}</span></div>`+
          `<div class="d">血量 ${lvHP(h.key)} · 攻擊 +${lvAtk(h.key)}　｜　EXP ${max?"滿級":(inLv+"/100")}</div>`+
          `<div style="height:6px;background:rgba(0,0,0,.4);border-radius:4px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${inLv}%;background:#ffd54f"></div></div>`+
          (ts?`<div style="font-size:11px;color:#80cbc4;margin-top:3px">🌟 ${ts.pathName} Lv.${ts.tier}${ts.active?"（"+ts.active.name+"）":""}</div>`:"");
        top.appendChild(info);
        const btn=document.createElement("button"); btn.className="btn"; btn.style.cssText="margin:0;padding:8px 12px;font-size:13px;"; btn.textContent="🌿80→+100EXP";
        if(max || getEco()<80){ btn.className="btn sec"; btn.style.opacity=".4"; }
        btn.addEventListener("pointerdown",(e)=>{ e.preventDefault(); if(!max && getEco()>=80){ setEco(getEco()-80); gainXP(h.key,100); goUpgrade(); } },{passive:false});
        top.appendChild(btn);
        div.appendChild(top);
        const talBtn=document.createElement("button"); talBtn.className="btn sec"; talBtn.style.cssText="margin:8px 0 0;padding:7px 14px;font-size:12px;align-self:flex-start;";
        talBtn.textContent=(talentOpenKey===h.key?"▲ 收起天賦":"🌟 天賦");
        talBtn.addEventListener("pointerdown",(e)=>{ e.preventDefault(); talentOpenKey=(talentOpenKey===h.key?null:h.key); goUpgrade(); },{passive:false});
        div.appendChild(talBtn);
        if(talentOpenKey===h.key) div.appendChild(buildTalentPanel(h.key));
      }
      wrap.appendChild(div); });
  }
  function buildTalentPanel(key){
    const def=talentDef(key), cur=heroTalent(key);
    const panel=document.createElement("div");
    panel.style.cssText="margin-top:10px;padding:10px;background:rgba(0,0,0,.25);border-radius:12px;";
    if(!def){ panel.innerHTML=`<div style="font-size:12px;color:#b0bec5">此守護者尚無天賦路線。</div>`; return panel; }
    ["A","B"].forEach(pk=>{
      const path=def[pk]; const locked=cur.path && cur.path!==pk;
      const box=document.createElement("div"); box.style.cssText="margin-bottom:8px;padding:8px;border-radius:10px;background:rgba(255,255,255,.05);"+(locked?"opacity:.4;":"");
      const isCur=cur.path===pk, tier=isCur?cur.tier:0;
      let html=`<div style="font-size:13px;font-weight:800;color:${isCur?"#ffd54f":"#e0e0e0"}">${path.name}${isCur?"　Lv."+tier+"/3":""}</div>`;
      path.tiers.forEach((tr,i)=>{ const got=isCur&&tier>i, desc=tr.desc||(tr.active&&tr.active.desc)||"";
        html+=`<div style="font-size:11px;color:${got?"#a5d6a7":"#90a4ae"};margin-top:2px">`+
          `${got?"✅":"・"} Lv.${i+1}　${desc}${tr.active?"　【主動："+tr.active.name+"】":""}</div>`; });
      box.innerHTML=html;
      if(!locked){
        const btnWrap=document.createElement("div"); btnWrap.style.cssText="margin-top:6px;";
        if(!isCur){
          const pickBtn=document.createElement("button"); pickBtn.className="btn"; pickBtn.style.cssText="margin:0;padding:6px 14px;font-size:12px;";
          pickBtn.textContent="選擇此路線"; pickBtn.addEventListener("pointerdown",(e)=>{ e.preventDefault(); talentPick(key,pk); goUpgrade(); },{passive:false});
          btnWrap.appendChild(pickBtn);
        } else if(tier<3){
          const cost=path.tiers[tier].cost, canAfford=getEco()>=cost;
          const upBtn=document.createElement("button"); upBtn.className=canAfford?"btn":"btn sec"; upBtn.style.cssText="margin:0;padding:6px 14px;font-size:12px;"+(canAfford?"":"opacity:.4;");
          upBtn.textContent=`升級 Lv.${tier+1}（🌿 ${cost}）`;
          upBtn.addEventListener("pointerdown",(e)=>{ e.preventDefault(); if(talentUpgrade(key)) goUpgrade(); },{passive:false});
          btnWrap.appendChild(upBtn);
        } else {
          const doneEl=document.createElement("div"); doneEl.style.cssText="font-size:11px;color:#ffd54f;margin-top:4px;"; doneEl.textContent="已修煉至最高等級";
          btnWrap.appendChild(doneEl);
        }
        box.appendChild(btnWrap);
      }
      panel.appendChild(box); });
    return panel;
  }
  function setBattleUI(on){ dock.classList.toggle("hide",!on); }
  function goTitle(){ state="title"; setBattleUI(false); show(titleScr); }

  /* ===== 大廳 Lobby ===== */
  function resizeHeroShow(){ applyRot(); const iw=window.innerWidth, ih=window.innerHeight;
    hsW = rot? ih : iw; hsH = rot? iw : ih;
    const d=Math.min(window.devicePixelRatio||1,2); heroShow.width=Math.round(hsW*d); heroShow.height=Math.round(hsH*d); hctx.setTransform(d,0,0,d,0,0); }
  // 選角彈窗：一次瀏覽全部守護者的網格；點卡片→選定→關閉彈窗回大廳（取代原本大廳一整排 roster）
  function buildRoster(){ const wrap=document.getElementById("heroPickerGrid"); if(!wrap) return; wrap.innerHTML="";
    HEROES.forEach((h,i)=>{ const unlocked=isHeroUnlocked(h.key);
      const b=document.createElement("button"); b.className="hp-card"+(i===featured&&unlocked?" sel":"");
      const cv=document.createElement("canvas"); cv.width=144; cv.height=144; b.appendChild(cv);
      const cc=cv.getContext("2d"); drawCreature(cc, h.key, 72, 80, 50, {t:0}); if(unlocked) drawCosmetic(cc, cosEquipOf(h.key), 72, 80, 50, 0, h.key);
      if(!unlocked){ cc.fillStyle="rgba(0,0,0,.5)"; cc.fillRect(0,0,144,144); cc.font="40px serif"; cc.textAlign="center"; cc.textBaseline="middle"; cc.fillText("🔒",72,74); }
      const nm=document.createElement("div"); nm.className="hp-name"; nm.textContent=h.name; b.appendChild(nm);
      if(!unlocked){ const lk=document.createElement("div"); lk.className="hp-lock"; lk.textContent="🔒 去復育解鎖"; b.appendChild(lk); }
      b.onclick=()=>{ if(unlocked){ featured=i; saveFeatured(); updateLobby(); closeHeroPicker(); } else { closeHeroPicker(); transition(goUpgrade); } };
      wrap.appendChild(b); }); }
  function openHeroPicker(){ const p=document.getElementById("heroPicker"); if(!p) return; buildRoster(); p.classList.remove("hide"); }
  function closeHeroPicker(){ const p=document.getElementById("heroPicker"); if(p) p.classList.add("hide"); }

  /* ===== 保育服裝店：用保育值買裝飾，穿在守護者身上（大廳展示＋選角彈窗），每隻各自記憶裝備 ===== */
  // 服裝店已移除（依需求）：基本服裝改用通行證點數(pp)兌換，全部收進通行證「專屬服裝」分頁；cost 保留僅供舊資料相容
  const COSMETICS=[
    {key:"crown", name:"守護皇冠", icon:"👑", cost:120, pp:3, lv:1},
    {key:"bow",   name:"櫻花蝶結", icon:"🎀", cost:70,  pp:2, lv:1},
    {key:"wreath",name:"山林花環", icon:"🌸", cost:100, pp:3, lv:2},
    {key:"star",  name:"星塵光環", icon:"✨", cost:160, pp:4, lv:3},
    {key:"leaf",  name:"落葉之舞", icon:"🍂", cost:110, pp:3, lv:2},
    {key:"snow",  name:"初雪結晶", icon:"❄️", cost:130, pp:3, lv:3},
  ];
  function cosOwned(){ try{ return JSON.parse(localStorage.getItem("shoutu_cosmetics")||"[]")||[]; }catch(e){ return []; } }
  function cosOwnedSet(a){ try{ localStorage.setItem("shoutu_cosmetics",JSON.stringify(a)); }catch(e){} }
  function cosEquipOf(hk){ try{ return localStorage.getItem("shoutu_cos_"+hk)||""; }catch(e){ return ""; } }
  function cosEquipSet(hk,k){ try{ if(k) localStorage.setItem("shoutu_cos_"+hk,k); else localStorage.removeItem("shoutu_cos_"+hk); }catch(e){} }
  function cosStar(g,x,y,r){ g.beginPath(); for(let i=0;i<5;i++){ const a=-1.5708+i*1.2566; g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r); const a2=a+0.628; g.lineTo(x+Math.cos(a2)*r*0.45,y+Math.sin(a2)*r*0.45); } g.closePath(); g.fill(); }
  // 畫在守護者(x,y 中心、大小 s)上的裝飾；純程序繪製、無狀態，動畫吃 t 不 push 陣列（零外部資源＋無粒子洩漏）
  // 真圖頭部錨點：掃描插畫不透明像素，找「頭頂帶」的加權中心——每張插畫頭的位置都不同，用演算法對位而不是用猜的
  const _headAnchor={};
  function spriteHeadAnchor(kind){ const sp=SPRITES[kind]; if(!sp||!sp.naturalWidth) return null;
    if(_headAnchor[kind]) return _headAnchor[kind];
    try{ const W=64,H=64,c=document.createElement("canvas"); c.width=W; c.height=H; const g2=c.getContext("2d");
      g2.drawImage(sp,0,0,W,H); const d=g2.getImageData(0,0,W,H).data;
      let topY=-1; for(let yy=0;yy<H&&topY<0;yy++){ for(let xx=0;xx<W;xx++){ if(d[(yy*W+xx)*4+3]>60){ topY=yy; break; } } }
      if(topY<0) return null;
      const band=Math.max(2,Math.round(H*0.12)); let sx=0,n=0;
      for(let yy=topY;yy<Math.min(H,topY+band);yy++) for(let xx=0;xx<W;xx++){ if(d[(yy*W+xx)*4+3]>60){ sx+=xx; n++; } }
      const a={x:(sx/Math.max(1,n))/W, y:topY/H}; _headAnchor[kind]=a; return a;
    }catch(e){ return null; } }
  const HEAD_ITEMS={crown:1,bow:1,halo:1,x_deer:1,x_magpie:1};   // 頭飾：要精準戴在頭上；其餘為環繞特效包住全身
  // 每角色專屬服裝（依需求）：各角色有自己獨一無二的服裝，只在「該角色」的通行證頁出現
  const EXCLUSIVE_COS={
    leopard:  {key:"x_leopard",  name:"夜行獵手星幕", icon:"🌙", pp:6, lv:4},
    bear:     {key:"x_bear",     name:"月光胸甲",     icon:"🌗", pp:6, lv:4},
    cicada:   {key:"x_cicada",   name:"蟬鳴音浪",     icon:"🎵", pp:6, lv:4},
    dragonfly:{key:"x_dragonfly",name:"疾風殘影",     icon:"💨", pp:6, lv:4},
    deer:     {key:"x_deer",     name:"森之花冠",     icon:"🌺", pp:6, lv:4},
    magpie:   {key:"x_magpie",   name:"藍羽長冠",     icon:"🪶", pp:6, lv:4},
  };
  function drawCosmetic(g,key,x,y,s,t,kind){ if(!key) return; t=t||0;
    // 真圖模式重定位：寫實插畫比程式畫的角色高很多(hh=s*2.7)，且每張頭的位置不同。
    // 頭飾 → 用 spriteHeadAnchor 掃出頭頂精準對位、比例縮小(1.1x)不壓過寫實角色；
    // 環繞特效 → 錨點移到插畫視覺中心、放大 1.55x 包住全身。無插畫時行為不變(canvas fallback)。
    const _sp=kind&&SPRITES[kind];
    if(_sp&&_sp.naturalWidth>0){
      const a=HEAD_ITEMS[key]?spriteHeadAnchor(kind):null;
      if(a){ const hh=s*2.7, ww=hh*(_sp.naturalWidth/_sp.naturalHeight);
        const headX=x+(a.x-0.5)*ww, headY=y+s*0.92-hh+a.y*hh;
        s*=1.3; x=headX; y=headY+s*0.56; }   // 稍大、稍下沉：戴「進」頭頂而不是浮在耳尖
      else { y-=s*0.43; s*=1.55; }
    }
    g.save(); g.translate(x,y); const hy=-s*0.5;
    if(key==="crown"){ const w=s*0.5,h=s*0.3;
      // 精緻版皇冠：柔金光暈 + 立體漸層金 + 冠底環帶 + 尖頂珠 + 三寶石含高光
      g.save(); g.globalCompositeOperation="lighter"; const glw=g.createRadialGradient(0,hy-h*0.3,2,0,hy-h*0.3,w*0.9);
      glw.addColorStop(0,"rgba(255,215,110,0.35)"); glw.addColorStop(1,"rgba(255,215,110,0)"); g.fillStyle=glw; g.beginPath(); g.arc(0,hy-h*0.3,w*0.9,0,7); g.fill(); g.restore();
      const gold=g.createLinearGradient(0,hy-h,0,hy); gold.addColorStop(0,"#fff3b0"); gold.addColorStop(0.45,"#ffd54f"); gold.addColorStop(1,"#c99700");
      g.fillStyle=gold; g.strokeStyle="#8a6d1a"; g.lineWidth=Math.max(1,s*0.028); g.lineJoin="round";
      g.beginPath(); g.moveTo(-w/2,hy); g.lineTo(-w/2,hy-h*0.42);
      g.lineTo(-w*0.28,hy-h*0.95); g.lineTo(-w*0.12,hy-h*0.5); g.lineTo(0,hy-h*1.05); g.lineTo(w*0.12,hy-h*0.5); g.lineTo(w*0.28,hy-h*0.95);
      g.lineTo(w/2,hy-h*0.42); g.lineTo(w/2,hy); g.closePath(); g.fill(); g.stroke();
      g.fillStyle="#b8860b"; g.fillRect(-w/2,hy-h*0.12,w,h*0.14);
      for(const p of [[-w*0.28,-0.95],[0,-1.05],[w*0.28,-0.95]]){ g.fillStyle="#fff8dc"; g.beginPath(); g.arc(p[0],hy+p[1]*h,s*0.02,0,7); g.fill(); }
      for(const gm of [[0,"#e53935"],[-w*0.3,"#43a047"],[w*0.3,"#43a047"]]){ g.fillStyle=gm[1]; g.beginPath(); g.arc(gm[0],hy-h*0.06,s*0.04,0,7); g.fill();
        g.fillStyle="rgba(255,255,255,0.85)"; g.beginPath(); g.arc(gm[0]-s*0.012,hy-h*0.06-s*0.012,s*0.013,0,7); g.fill(); } }
    else if(key==="bow"){ const by=hy-s*0.02, r=s*0.15;
      // 精緻版蝶結：漸層粉緞面圓弧結翼 + 內摺陰影 + 垂帶 + 中心結高光
      const pk=g.createLinearGradient(0,by-r,0,by+r); pk.addColorStop(0,"#ffa8bf"); pk.addColorStop(1,"#f06292");
      g.lineJoin="round";
      for(const sg of [-1,1]){
        g.strokeStyle="#e2749a"; g.lineWidth=Math.max(1,s*0.03); g.beginPath(); g.moveTo(sg*r*0.4,by+r*0.5); g.quadraticCurveTo(sg*r*0.6,by+r*1.3,sg*r*0.35,by+r*1.8); g.stroke();
        g.fillStyle=pk; g.strokeStyle="#ad2c55"; g.lineWidth=Math.max(1,s*0.022);
        g.beginPath(); g.moveTo(0,by);
        g.quadraticCurveTo(sg*r*1.1,by-r*1.15,sg*r*1.8,by-r*0.55); g.quadraticCurveTo(sg*r*2.0,by,sg*r*1.8,by+r*0.55);
        g.quadraticCurveTo(sg*r*1.1,by+r*1.05,0,by); g.closePath(); g.fill(); g.stroke();
        g.fillStyle="rgba(173,44,85,0.3)"; g.beginPath(); g.moveTo(0,by); g.quadraticCurveTo(sg*r*0.9,by-r*0.35,sg*r*1.5,by-r*0.2); g.quadraticCurveTo(sg*r*0.8,by+r*0.1,0,by); g.fill(); }
      g.fillStyle="#e91e63"; g.strokeStyle="#ad2c55"; g.beginPath(); g.arc(0,by,r*0.42,0,7); g.fill(); g.stroke();
      g.fillStyle="rgba(255,255,255,0.7)"; g.beginPath(); g.arc(-r*0.12,by-r*0.14,r*0.13,0,7); g.fill(); }
    else if(key==="wreath"){ const n=8, rr=s*0.62;
      // 精緻版花環：五瓣櫻花 + 葉片交錯環繞
      for(let i=0;i<n;i++){ const a=i/n*6.283+t*0.25, px=Math.cos(a)*rr, py=Math.sin(a)*rr*0.7-s*0.05;
        g.save(); g.translate(px,py);
        if(i%2){ for(let p2=0;p2<5;p2++){ const pa=p2/5*6.283+a; g.fillStyle="#ffb7c5"; g.beginPath(); g.ellipse(Math.cos(pa)*s*0.045,Math.sin(pa)*s*0.045,s*0.038,s*0.024,pa,0,7); g.fill(); }
          g.fillStyle="#fff176"; g.beginPath(); g.arc(0,0,s*0.024,0,7); g.fill(); }
        else { g.rotate(a+0.6); g.fillStyle="#66bb6a"; g.beginPath(); g.ellipse(0,0,s*0.075,s*0.032,0,0,7); g.fill();
          g.strokeStyle="#2e7d32"; g.lineWidth=Math.max(0.8,s*0.012); g.beginPath(); g.moveTo(-s*0.07,0); g.lineTo(s*0.07,0); g.stroke(); }
        g.restore(); } }
    else if(key==="star"){ g.globalCompositeOperation="lighter";
      // 精緻版星塵：星點 + 十字閃芒
      for(let i=0;i<8;i++){ const a=t*1.6+i*0.785, rr=s*(0.7+0.12*Math.sin(t*3+i)), px=Math.cos(a)*rr, py=Math.sin(a)*rr*0.6-s*0.1, tw=0.5+0.5*Math.sin(t*4+i*2);
        g.strokeStyle="rgba(255,246,190,"+(tw*0.7).toFixed(2)+")"; g.lineWidth=Math.max(0.8,s*0.012);
        const fl=s*0.085*tw; g.beginPath(); g.moveTo(px-fl,py); g.lineTo(px+fl,py); g.moveTo(px,py-fl); g.lineTo(px,py+fl); g.stroke();
        g.fillStyle="rgba(255,240,150,"+tw.toFixed(2)+")"; cosStar(g,px,py,s*0.05*(0.6+tw*0.6)); }
      g.globalCompositeOperation="source-over"; }
    else if(key==="leaf"){ for(let i=0;i<6;i++){ const a=t*1.1+i*1.047, rr=s*0.66, px=Math.cos(a)*rr, py=(Math.sin(t*1.5+i)*0.5)*s*0.5-s*0.05+Math.sin(a)*rr*0.4;
      // 精緻版落葉：漸層雙色葉身 + 中肋葉脈
      g.save(); g.translate(px,py); g.rotate(a+t);
      const lc=i%2?["#e09a52","#b06a2c"]:["#c0894a","#8a5a2b"];
      const lg2=g.createLinearGradient(-s*0.09,0,s*0.09,0); lg2.addColorStop(0,lc[0]); lg2.addColorStop(1,lc[1]);
      g.fillStyle=lg2; g.beginPath(); g.ellipse(0,0,s*0.095,s*0.05,0,0,7); g.fill();
      g.strokeStyle="rgba(90,50,15,0.75)"; g.lineWidth=Math.max(0.8,s*0.011); g.beginPath(); g.moveTo(-s*0.09,0); g.lineTo(s*0.095,0); g.stroke();
      g.restore(); } }
    else if(key==="snow"){
      // 精緻版初雪：六芒雪花結晶(交錯大小、緩慢旋轉)，不再是單調白點
      for(let i=0;i<10;i++){ const px=(-0.7+((i*0.27)%1.4))*s, py=(((t*0.4+i*0.37)%1.4)-0.7)*s, sz=s*(i%3===0?0.05:0.032), rot=t*0.8+i;
        g.save(); g.translate(px,py); g.rotate(rot);
        g.strokeStyle="rgba(230,245,255,0.9)"; g.lineWidth=Math.max(0.8,s*0.012); g.lineCap="round";
        for(let k2=0;k2<3;k2++){ g.rotate(1.047); g.beginPath(); g.moveTo(-sz,0); g.lineTo(sz,0); g.stroke(); }
        g.fillStyle="rgba(255,255,255,0.85)"; g.beginPath(); g.arc(0,0,sz*0.22,0,7); g.fill();
        g.restore(); } }
    // ===== 通行證專屬特殊服裝（更華麗）=====
    else if(key==="halo"){ const ry=hy-s*0.32; g.globalCompositeOperation="lighter"; for(let i=0;i<3;i++){ g.strokeStyle="rgba(255,224,130,"+(0.55-i*0.15).toFixed(2)+")"; g.lineWidth=s*(0.055-i*0.014); g.beginPath(); g.ellipse(0,ry,s*0.32,s*0.11,0,0,7); g.stroke(); }
      for(let i=0;i<8;i++){ const a=t*1.4+i*0.785, px=Math.cos(a)*s*0.32, py=ry+Math.sin(a)*s*0.11, tw=0.5+0.5*Math.sin(t*4+i); g.fillStyle="rgba(255,245,180,"+tw.toFixed(2)+")"; g.beginPath(); g.arc(px,py,s*0.03*tw+s*0.012,0,7); g.fill(); } g.globalCompositeOperation="source-over"; }
    else if(key==="flame"){ g.globalCompositeOperation="lighter"; for(let i=0;i<12;i++){ const a=i/12*6.283, fl=0.5+0.5*Math.sin(t*8+i*1.7), rr=s*(0.56+0.12*fl), px=Math.cos(a)*rr, py=Math.sin(a)*rr*0.72-s*0.04;
      g.fillStyle="rgba(255,"+(110+(fl*110|0))+",40,"+(0.30+fl*0.4).toFixed(2)+")"; g.beginPath(); g.moveTo(px,py+s*0.11); g.quadraticCurveTo(px-s*0.05,py,px,py-s*0.11*(0.6+fl)); g.quadraticCurveTo(px+s*0.05,py,px,py+s*0.11); g.fill(); } g.globalCompositeOperation="source-over"; }
    else if(key==="aurora"){ g.globalCompositeOperation="lighter"; const cols=["#7cf6c8","#8bd3ff","#c69cff","#8bffdd","#a0e0ff"];
      for(const sg of [-1,1]){ for(let i=0;i<5;i++){ g.strokeStyle=cols[i]; g.globalAlpha=0.30+0.2*Math.sin(t*3+i); g.lineWidth=s*0.05; g.beginPath();
        for(let k=0;k<=6;k++){ const yy=hy+(k/6)*s*0.72, xx=sg*(s*0.3+Math.sin(t*2+i*0.5+k*0.6)*s*0.14+k*s*0.03); if(k===0) g.moveTo(xx,yy); else g.lineTo(xx,yy); } g.stroke(); } }
      g.globalAlpha=1; g.globalCompositeOperation="source-over"; }
    // ===== 每角色專屬服裝 =====
    else if(key==="x_leopard"){ // 夜行獵手星幕：深藍星空披風感——身後弦月+星星環繞
      g.globalCompositeOperation="lighter";
      g.fillStyle="rgba(120,150,255,0.30)"; g.beginPath(); g.arc(0,-s*0.1,s*0.72,0,7); g.fill();
      g.strokeStyle="rgba(220,230,255,0.9)"; g.lineWidth=s*0.05; g.beginPath(); g.arc(s*0.42,-s*0.55,s*0.16,0.6,4.2); g.stroke();   // 弦月
      for(let i=0;i<7;i++){ const a=t*1.2+i*0.9, rr=s*(0.6+0.1*Math.sin(t*2.5+i)); const tw=0.5+0.5*Math.sin(t*4+i*1.7);
        g.fillStyle="rgba(200,220,255,"+tw.toFixed(2)+")"; cosStar(g,Math.cos(a)*rr,Math.sin(a)*rr*0.65-s*0.08,s*0.04*(0.5+tw*0.6)); }
      g.globalCompositeOperation="source-over"; }
    else if(key==="x_bear"){ // 月光胸甲：胸前銀白弦月徽 + 柔光
      g.globalCompositeOperation="lighter";
      const my=s*0.05; g.fillStyle="rgba(210,225,255,0.25)"; g.beginPath(); g.arc(0,my,s*0.34,0,7); g.fill();
      g.strokeStyle="rgba(235,242,255,0.95)"; g.lineWidth=s*0.07; g.lineCap="round"; g.beginPath(); g.arc(0,my,s*0.2,0.7,4.1); g.stroke();
      for(const p of [[-0.26,-0.12],[0.24,-0.16],[0,0.3]]){ const tw=0.5+0.5*Math.sin(t*3+p[0]*9); g.fillStyle="rgba(255,255,255,"+tw.toFixed(2)+")"; g.beginPath(); g.arc(p[0]*s,my+p[1]*s,s*0.02,0,7); g.fill(); }
      g.globalCompositeOperation="source-over"; }
    else if(key==="x_cicada"){ // 蟬鳴音浪：環形聲波 + 跳動音符
      g.globalCompositeOperation="lighter";
      for(let i=0;i<3;i++){ const ph=(t*0.9+i/3)%1; g.strokeStyle="rgba(170,255,200,"+(0.5*(1-ph)).toFixed(2)+")"; g.lineWidth=s*0.035;
        g.beginPath(); g.ellipse(0,-s*0.05,s*(0.3+ph*0.55),s*(0.18+ph*0.34),0,0,7); g.stroke(); }
      g.fillStyle="rgba(200,255,220,0.95)"; g.font="bold "+Math.round(s*0.3)+"px serif"; g.textAlign="center";
      for(let i=0;i<3;i++){ const a=t*1.5+i*2.1; g.fillText("♪",Math.cos(a)*s*0.55,Math.sin(a)*s*0.4-s*0.15+Math.sin(t*3+i)*s*0.06); }
      g.globalCompositeOperation="source-over"; }
    else if(key==="x_dragonfly"){ // 疾風殘影：水平風痕拖尾
      g.globalCompositeOperation="lighter"; g.lineCap="round";
      for(let i=0;i<6;i++){ const yy=(-0.45+i*0.18)*s, ph=(t*2+i*0.35)%1, ln=s*(0.5+0.3*Math.sin(i*1.3));
        g.strokeStyle="rgba(180,240,255,"+(0.55*(1-ph)).toFixed(2)+")"; g.lineWidth=s*0.045*(1-ph*0.5);
        g.beginPath(); g.moveTo(-s*0.2-ph*ln,yy); g.lineTo(-s*0.2-ph*ln-ln*0.6,yy); g.stroke(); }
      g.globalCompositeOperation="source-over"; }
    else if(key==="x_deer"){ // 森之花冠：粉白花朵編成的頭冠（頭飾）
      const cy2=hy-s*0.02;
      for(let i=0;i<5;i++){ const px=(-0.3+i*0.15)*s, py=cy2-Math.sin(i/4*3.14)*s*0.1;
        for(let p2=0;p2<5;p2++){ const pa=p2/5*6.283+i; g.fillStyle=i%2?"#ffb7c5":"#fff5f7"; g.beginPath(); g.ellipse(px+Math.cos(pa)*s*0.035,py+Math.sin(pa)*s*0.035,s*0.03,s*0.02,pa,0,7); g.fill(); }
        g.fillStyle="#ffd54f"; g.beginPath(); g.arc(px,py,s*0.018,0,7); g.fill(); }
      g.strokeStyle="#66bb6a"; g.lineWidth=s*0.02; g.beginPath(); g.moveTo(-s*0.34,cy2+s*0.02); g.quadraticCurveTo(0,cy2-s*0.1,s*0.34,cy2+s*0.02); g.stroke(); }
    else if(key==="x_magpie"){ // 藍羽長冠：三根飄逸藍羽（頭飾）
      const cy2=hy;
      for(const o of [[-0.12,-0.4,-1],[0,-0.52,0],[0.12,-0.42,1]]){
        g.save(); g.translate(o[0]*s,cy2); g.rotate(o[2]*0.25+Math.sin(t*2+o[2])*0.06);
        const fg=g.createLinearGradient(0,0,0,-s*0.5); fg.addColorStop(0,"#1e88e5"); fg.addColorStop(1,"#90caf9");
        g.fillStyle=fg; g.beginPath(); g.ellipse(0,o[1]*s*0.5,s*0.045,s*0.28,0,0,7); g.fill();
        g.strokeStyle="rgba(255,255,255,0.7)"; g.lineWidth=s*0.012; g.beginPath(); g.moveTo(0,0); g.lineTo(0,o[1]*s); g.stroke(); g.restore(); } }
    else if(key==="phoenix"){ for(let i=0;i<7;i++){ const a=-2.5+i*0.5; g.save(); g.rotate(a); const grd=g.createLinearGradient(0,-s*0.2,0,-s*0.72); grd.addColorStop(0,"#ffca28"); grd.addColorStop(0.6,"#ff8a00"); grd.addColorStop(1,"#ff3d00");
      g.fillStyle=grd; g.beginPath(); g.ellipse(0,-s*0.5,s*0.05,s*0.24,0,0,7); g.fill(); g.restore(); }
      const cy2=hy-s*0.06; g.fillStyle="#ff6f00"; g.beginPath(); g.moveTo(0,cy2-s*0.18); g.lineTo(-s*0.08,cy2); g.lineTo(s*0.08,cy2); g.closePath(); g.fill();
      g.globalCompositeOperation="lighter"; g.fillStyle="rgba(255,200,80,0.5)"; g.beginPath(); g.arc(0,cy2,s*0.1,0,7); g.fill(); g.globalCompositeOperation="source-over"; }
    g.restore(); }
  function mkCosCard(c, owned, equipped, hk){
    const key=c?c.key:"", isOwned=!c||owned.includes(key), isEq=equipped===key;
    const b=document.createElement("button"); b.className="cos-card"+(isEq?" sel":"");
    const cv=document.createElement("canvas"); cv.width=120; cv.height=120; b.appendChild(cv);
    const cc=cv.getContext("2d"); drawCreature(cc, hk, 60, 66, 40, {t:0}); if(c) drawCosmetic(cc, key, 60, 66, 40, 0, hk);
    const nm=document.createElement("div"); nm.className="cos-name"; nm.textContent=c?(c.icon+" "+c.name):"🚫 不穿"; b.appendChild(nm);
    const st=document.createElement("div"); st.className="cos-status"; st.textContent=isEq?"✅ 已裝備":isOwned?"點我裝備":("🌿 "+c.cost);
    if(c && !isOwned) st.style.color=getEco()>=c.cost?"#ffd54f":"#ff8a65"; b.appendChild(st);
    b.onclick=()=>{ if(c && !isOwned){ if(getEco()>=c.cost){ setEco(getEco()-c.cost); const o=cosOwned(); o.push(key); cosOwnedSet(o); if(window.__sfx)window.__sfx.play("coin"); rebuildShops(); } else if(window.__sfx) window.__sfx.play("back"); return; }
      cosEquipSet(hk, isEq?"":key); if(window.__sfx)window.__sfx.play(isEq?"back":"levelup"); rebuildShops(); updateLobby(); };
    return b; }
  function buildCostumeShop(){ const wrap=document.getElementById("costumeGrid"); if(!wrap) return; wrap.innerHTML="";
    const hk=HEROES[featured].key, owned=cosOwned(), equipped=cosEquipOf(hk);
    const eco=document.getElementById("costumeEco"); if(eco) eco.textContent="🌿 保育值 "+getEco();
    const hn=document.getElementById("costumeHero"); if(hn) hn.textContent="正在打扮："+HEROES[featured].name;
    wrap.appendChild(mkCosCard(null, owned, equipped, hk));
    COSMETICS.forEach(c=> wrap.appendChild(mkCosCard(c, owned, equipped, hk))); }
  function openCostumeShop(){ const p=document.getElementById("costumeShop"); if(!p) return; buildCostumeShop(); p.classList.remove("hide"); }
  function closeCostumeShop(){ const p=document.getElementById("costumeShop"); if(p) p.classList.add("hide"); }
  // ===== 通行證：專屬特殊服裝（只能用「通行證點數」兌換，跟保育值服裝店分開）=====
  const PASS_COSMETICS=[
    {key:"halo",    name:"神聖光輪", icon:"😇", pp:8,  lv:5},
    {key:"flame",   name:"聖焰之環", icon:"🔥", pp:12, lv:8},
    {key:"aurora",  name:"極光之翼", icon:"🌌", pp:16, lv:12},
    {key:"phoenix", name:"鳳凰之羽", icon:"🦅", pp:22, lv:16},
  ];
  function mkPassCard(c, owned, equipped, hk){ const key=c.key, isOwned=owned.includes(key), isEq=equipped===key;
    const locked=!isOwned && (c.lv||1)>passLevel();   // 通行證等級未達 → 上鎖(已擁有不影響)
    const b=document.createElement("button"); b.className="cos-card"+(isEq?" sel":"");
    const cv=document.createElement("canvas"); cv.width=120; cv.height=120; b.appendChild(cv);
    const cc=cv.getContext("2d"); drawCreature(cc, hk, 60, 66, 40, {t:0}); drawCosmetic(cc, key, 60, 66, 40, 0, hk);
    if(locked){ cc.fillStyle="rgba(0,0,0,0.55)"; cc.fillRect(0,0,120,120); cc.font="30px serif"; cc.textAlign="center"; cc.textBaseline="middle"; cc.fillText("🔒",60,58); }
    const nm=document.createElement("div"); nm.className="cos-name"; nm.textContent=c.icon+" "+c.name; b.appendChild(nm);
    const st=document.createElement("div"); st.className="cos-status";
    st.textContent=isEq?"✅ 已裝備":isOwned?"點我裝備":locked?("🔒 通行證 Lv."+c.lv+" 解鎖"):("🎟 "+c.pp+" 點");
    if(!isOwned) st.style.color=locked?"#90a4ae":(getPassPts()>=c.pp?"#ffd54f":"#ff8a65"); b.appendChild(st);
    b.onclick=()=>{ if(locked){ if(window.__sfx) window.__sfx.play("back"); return; }
      if(!isOwned){ if(getPassPts()>=c.pp){ setPassPts(getPassPts()-c.pp); const o=cosOwned(); o.push(key); cosOwnedSet(o); if(window.__sfx)window.__sfx.play("levelup"); buildPassShop(); } else if(window.__sfx) window.__sfx.play("back"); return; }
      cosEquipSet(hk, isEq?"":key); if(window.__sfx)window.__sfx.play(isEq?"back":"levelup"); buildPassShop(); updateLobby(); };
    return b; }
  // 通行證兌換獎勵：點數換保育值/EXP 等（依需求「通行證要有保育值等東西」）
  const PASS_REWARDS=[
    { key:"eco80",  name:"保育值 ×80",  icon:"🌿", pp:2, lv:1, give:()=>gainEco(80) },
    { key:"eco250", name:"保育值 ×250", icon:"🌿", pp:5, lv:3, give:()=>gainEco(250) },
    { key:"xp100",  name:"目前守護者 EXP+100", icon:"⭐", pp:3, lv:2, give:()=>gainXP(HEROES[featured].key,100) },
  ];
  let passTab="pass";   // 通行證分頁：pass=專屬服裝(點數) / cos=服裝店(保育值，已併入) / reward=兌換獎勵
  function mkRewardCard(rw){ const locked=(rw.lv||1)>passLevel();
    const b=document.createElement("button"); b.className="cos-card";
    const ic=document.createElement("div"); ic.style.cssText="font-size:42px;line-height:64px;height:64px;"+(locked?"filter:grayscale(1);opacity:.5;":""); ic.textContent=locked?"🔒":rw.icon; b.appendChild(ic);
    const nm=document.createElement("div"); nm.className="cos-name"; nm.textContent=rw.name; b.appendChild(nm);
    const st=document.createElement("div"); st.className="cos-status"; st.textContent=locked?("🔒 通行證 Lv."+rw.lv+" 解鎖"):("🎟 "+rw.pp+" 點");
    st.style.color=locked?"#90a4ae":(getPassPts()>=rw.pp?"#ffd54f":"#ff8a65"); b.appendChild(st);
    b.onclick=()=>{ if(locked){ if(window.__sfx) window.__sfx.play("back"); return; }
      if(getPassPts()>=rw.pp){ setPassPts(getPassPts()-rw.pp); rw.give(); if(window.__sfx)window.__sfx.play("coin"); updateLobby(); rebuildShops(); }
      else if(window.__sfx) window.__sfx.play("back"); };
    return b; }
  function buildPassShop(){ const wrap=document.getElementById("passGrid"); if(!wrap) return; wrap.innerHTML="";
    const hk=HEROES[featured].key, owned=cosOwned(), equipped=cosEquipOf(hk);
    const v=document.getElementById("passPtsVal"); if(v) v.textContent="🎟 "+getPassPts()+" 點　🌿 "+getEco();
    // 通行證等級列：Lv + 升級進度(累計獲得點數，每 5 點升 1 級)
    const lv=passLevel(), prog=getPassEarned()%PASS_LV_STEP, maxed=lv>=PASS_LV_MAX;
    const lvEl=document.getElementById("passLv"); if(lvEl) lvEl.textContent="通行證 Lv."+lv+(maxed?" 👑":"");
    const lf=document.getElementById("passLvFill"); if(lf) lf.style.width=(maxed?100:prog/PASS_LV_STEP*100)+"%";
    const lt=document.getElementById("passLvTxt"); if(lt) lt.textContent=maxed?"已滿級":("升級 "+prog+"/"+PASS_LV_STEP);
    document.querySelectorAll("#passTabs .pass-tab").forEach(b=>b.classList.toggle("on",b.dataset.pt===passTab));
    const hn=document.getElementById("passHero"); if(hn) hn.textContent=passTab==="reward"?"用通行證點數兌換獎勵":"正在打扮："+HEROES[featured].name;
    const tip=document.getElementById("passTip");
    if(tip) tip.textContent=passTab==="pass"?"🎟 服裝用通行證點數兌換（完成每日任務累積）——愈稀有的愈華麗！"
      :"🌿 點數換保育值、經驗值——任務打得勤，養成快一截！";
    if(passTab==="reward"){ PASS_REWARDS.forEach(rw=> wrap.appendChild(mkRewardCard(rw))); return; }
    wrap.appendChild(mkCosCard(null, owned, equipped, hk));   // 「不穿」選項
    const ex=EXCLUSIVE_COS[hk]; if(ex) wrap.appendChild(mkPassCard(ex, owned, equipped, hk));   // ★ 這隻角色的專屬服裝(每角色不同)
    COSMETICS.forEach(c=> wrap.appendChild(mkPassCard(c, owned, equipped, hk)));        // 基本服裝(點數兌換)
    PASS_COSMETICS.forEach(c=> wrap.appendChild(mkPassCard(c, owned, equipped, hk))); } // 華麗特殊服裝(點數兌換)
  function rebuildShops(){ buildCostumeShop(); buildPassShop(); }   // 買/裝備後同步重繪兩個面板(哪個開著都正確)
  function openPassShop(tab){ if(typeof tab==="string") passTab=tab; const p=document.getElementById("passShop"); if(!p) return; buildPassShop(); p.classList.remove("hide"); }
  function closePassShop(){ const p=document.getElementById("passShop"); if(p) p.classList.add("hide"); }
  // ===== 守護者個人資訊（點大廳角色開啟，全螢幕）：等級/經驗值/天賦/保育戰績 =====
  function openHeroInfo(){ const h=HEROES[featured], p=document.getElementById("heroInfo"); if(!h||!p) return;
    const $=(id)=>document.getElementById(id);
    $("hiName").textContent=h.name; $("hiType").textContent=TYPE[h.type]; $("hiStatus").textContent=h.status||"";
    const lv=heroLevel(h.key), xp=heroXP(h.key), max=lv>=50, inLv=max?100:(xp%100);
    $("hiLv").textContent="Lv."+lv+(max?" ★MAX":"");
    $("hiXpFill").style.width=inLv+"%";
    $("hiXpTxt").textContent=max?"已滿級（Lv.50）":(inLv+"/100 EXP　累計 "+xp);
    $("hiFact").textContent=h.fact||"";
    const tal=talentSummary(h.key);
    $("hiStats").innerHTML="🎖️ 帳號保育等級：<b>Lv."+(Math.floor(getEcoEarned()/100)+1)+"</b>　🛡️ 累計驅逐外來種：<b>"+getWins()+"</b> 次"
      +(tal?("<br>🌟 天賦：<b>"+tal.pathName+" Lv."+tal.tier+"</b>"+(tal.active?("（主動："+tal.active.name+"）"):"")):"<br>🌱 尚未點天賦（到「復育」培養）");
    const cv=$("hiPortrait"); if(cv){ const c=cv.getContext("2d"); c.clearRect(0,0,cv.width,cv.height);
      drawCreature(c,h.key,cv.width/2,cv.height*0.6,cv.height*0.33,{t:0}); drawCosmetic(c,cosEquipOf(h.key),cv.width/2,cv.height*0.6,cv.height*0.33,0,h.key); }
    p.classList.remove("hide"); }
  function closeHeroInfo(){ const p=document.getElementById("heroInfo"); if(p) p.classList.add("hide"); }
  // ===== 帳號資訊（點左上角帳號徽章，全螢幕）：帳號名稱/保育等級/戰績 + 守護者圖鑑等級一覽（仿荒野亂鬥個人檔案） =====
  const DUEL_TIER_NAMES=["見習","初階","中階","高階","大師"];
  // 玩家 ID 代碼（產生一次、永久保存，像荒野亂鬥的好友代碼）
  function getPlayerCode(){ try{ let c=localStorage.getItem("shoutu_pid"); if(!c){ const ch="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; c=""; for(let i=0;i<6;i++) c+=ch[Math.floor(Math.random()*ch.length)]; localStorage.setItem("shoutu_pid",c); } return "ID #"+c; }catch(e){ return "ID #------"; } }
  function openAccountInfo(){ const p=document.getElementById("accountInfo"); if(!p) return; const $=(id)=>document.getElementById(id);
    $("aiName").textContent=getAccountName();
    $("aiTitle").textContent=getPlayerCode();
    const alv=Math.floor(getEcoEarned()/100)+1, prog=getEcoEarned()%100;
    $("aiLv").textContent="保育等級 Lv."+alv;
    $("aiEcoFill").style.width=prog+"%"; $("aiEcoTxt").textContent=prog+"/100";
    const unlocked=HEROES.filter(h=>isHeroUnlocked(h.key)).length;
    let dlv=1; try{ dlv=Math.min(5,Math.max(1,parseInt(localStorage.getItem("shoutu_duel_level")||"1",10)||1)); }catch(e){}
    const cells=[["🌿 保育值",getEco()],["🏆 累計保育值",getEcoEarned()],["🛡️ 驅逐外來種",getWins()+" 次"],["🎟 通行證點數",getPassPts()],["⚔ 首領難度",DUEL_TIER_NAMES[dlv-1]+"級"],["🐾 守護者",unlocked+"/"+HEROES.length]];
    $("aiStatGrid").innerHTML=cells.map(c=>'<div class="ai-cell"><div class="v">'+c[1]+'</div><div class="k">'+c[0]+'</div></div>').join("");
    $("aiCollected").textContent="已收集 "+unlocked+"/"+HEROES.length;
    const grid=$("aiHeroGrid"); grid.innerHTML="";
    HEROES.forEach(h=>{ const un=isHeroUnlocked(h.key); const cell=document.createElement("div"); cell.className="ai-hero"+(un?"":" locked");
      const cv=document.createElement("canvas"); cv.width=120; cv.height=120; cell.appendChild(cv);
      const c=cv.getContext("2d"); try{ drawCreature(c,h.key,60,66,38,{t:0}); }catch(e){}
      if(un){ const b=document.createElement("div"); b.className="lv"; b.textContent="Lv."+heroLevel(h.key); cell.appendChild(b); }
      else { const lk=document.createElement("div"); lk.className="lk"; lk.textContent="🔒"; cell.appendChild(lk); }
      grid.appendChild(cell); });
    p.classList.remove("hide"); }
  function closeAccountInfo(){ const p=document.getElementById("accountInfo"); if(p) p.classList.add("hide"); }
  function updateLobby(){ const h=HEROES[featured];
    document.getElementById("hsName").textContent=h.name;
    document.getElementById("hsType").textContent=TYPE[h.type];
    document.getElementById("hsTag").textContent=LOBBY_TAG[h.key]||h.status;
    document.getElementById("ecoVal").textContent=getEco();
    document.getElementById("trophyVal").textContent=Math.floor(getEcoEarned()/100)+1;
    const nel=document.getElementById("lbAccountName"); if(nel) nel.textContent=getAccountName();   // 左上角顯示遊戲帳號名稱
    const cl=dailyClaimable(), nd=document.getElementById("navDaily"); if(nd) nd.textContent=cl>0?("📋 任務 ("+cl+")"):"📋 任務";
    const sw=document.getElementById("heroSwitchBtn"); if(sw) sw.textContent="🔄 更換守護者（目前："+h.name+"）";
    const p=document.getElementById("heroPicker"); if(p && !p.classList.contains("hide")) [...document.querySelectorAll("#heroPickerGrid .hp-card")].forEach((b,i)=>b.classList.toggle("sel",i===featured)); }
  function goLobby(){ state="lobby"; setBattleUI(false); show(lobbyScr); buildRoster(); updateLobby(); resizeHeroShow(); }
  const TICKERS=["🌿 石虎全台僅存數百隻，路殺是最大威脅之一","🐻 台灣黑熊胸前的白色 V 是月亮的印記","💧 福壽螺來自南美，是稻田的大害","🦎 綠鬣蜥棄養野化，正衝擊南部生態","🕊 埃及聖䴉搶佔黑面琵鷺的濕地","🪲 爺蟬幼蟲在地下蟄伏多年才羽化"];
  // ===== 天空主題：依「當地時間(時態)」變色 + 依「時區推測半球」決定季節（皆不需權限：時間讀裝置時鐘、地區讀 Intl 時區） =====
  function _hx(h){ const n=parseInt(h.slice(1),16); return [n>>16,(n>>8)&255,n&255]; }
  function _mix(a,b,t){ const A=_hx(a),B=_hx(b); return "rgb("+Math.round(A[0]+(B[0]-A[0])*t)+","+Math.round(A[1]+(B[1]-A[1])*t)+","+Math.round(A[2]+(B[2]-A[2])*t)+")"; }
  let _seasonCache=null;
  function localSeason(){ if(_seasonCache) return _seasonCache;
    let south=false; try{ const tz=(Intl.DateTimeFormat().resolvedOptions().timeZone)||"";
      south=/Australia|Pacific\/(Auckland|Fiji|Port_Moresby|Noumea)|America\/(Argentina|Sao_Paulo|Santiago|Montevideo|La_Paz|Lima|Asuncion|Bahia|Recife)|Africa\/(Johannesburg|Windhoek|Maputo|Harare|Gaborone|Lusaka)|Antarctica|Indian\/(Mauritius|Reunion|Antananarivo)/.test(tz); }catch(e){}
    const m=new Date().getMonth(); let s=(m===11||m<2)?3:(m<5)?0:(m<8)?1:2;   // 北半球 0春1夏2秋3冬
    if(south) s=(s+2)%4; return (_seasonCache=["spring","summer","autumn","winter"][s]); }
  function skyTheme(){ const d=new Date(), h=d.getHours()+d.getMinutes()/60;
    const K={ night:{top:"#0e1730",mid:"#1b3a4d",night:1}, dawn:{top:"#43507f",mid:"#e79a72",night:0},
              day:{top:"#4a90c9",mid:"#a7d3ea",night:0}, dusk:{top:"#33305e",mid:"#e0795a",night:0} };
    let a,b,f;
    if(h<5){a=K.night;b=K.night;f=0;} else if(h<7){a=K.night;b=K.dawn;f=(h-5)/2;}
    else if(h<9){a=K.dawn;b=K.day;f=(h-7)/2;} else if(h<16){a=K.day;b=K.day;f=0;}
    else if(h<18){a=K.day;b=K.dusk;f=(h-16)/2;} else if(h<20){a=K.dusk;b=K.night;f=(h-18)/2;}
    else {a=K.night;b=K.night;f=0;}
    return { top:_mix(a.top,b.top,f), mid:_mix(a.mid,b.mid,f), night:(f<0.5?a.night:b.night), season:localSeason() }; }
  const SEASON_TINT={ spring:"rgba(255,183,197,0.09)", summer:"rgba(120,220,160,0.07)", autumn:"rgba(230,150,70,0.11)", winter:"rgba(190,215,255,0.11)" };
  const SEASON_PARTICLE={ spring:"#ffc4d6", summer:"#c8f0a8", autumn:"#e6a24a", winter:"#ffffff" };

  // 大廳 360° 旋轉：heroSpin 為目前旋轉角(拖曳角色改變)。依角度挑對應視角圖(front/right/back/left)；
  // 沒有視角圖的角色 → 左半圈自動翻面(至少能看左右兩面)，之後補圖即自動升級成全視角。
  let heroSpin=0;
  function drawHeroView(g,key,x,y,s,tt){
    const TAU=Math.PI*2, a=((heroSpin%TAU)+TAU)%TAU;
    const sector=Math.round(a/(Math.PI/2))%4;   // 0=正面 1=右側 2=背面 3=左側
    const views=SPRITE_VIEWS[key], name=["front","right","back","left"][sector];
    const img=views&&views[name];
    if(img){ const hh=s*2.7, ww=hh*img.naturalWidth/img.naturalHeight;
      g.save(); g.translate(x,y);
      g.fillStyle="rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(0,s*0.86,s*0.55,s*0.13,0,0,7); g.fill();
      g.drawImage(img,-ww/2,s*0.92-hh,ww,hh); g.restore(); return; }
    drawCreature(g,key,x,y,s,{t:tt,mood:"happy",flip:(sector===3)});   // 無視角圖：左側面時翻面
  }
  function drawLobby(ts){ if(!hsW) resizeHeroShow(); if(!hsW) return;
    const g=hctx, Wd=hsW, Hd=hsH, tt=ts/1000;
    const th=skyTheme();
    // 天空：隨當地時態（清晨/白天/黃昏/夜晚）變色；下半仍是山林綠地
    const sky=g.createLinearGradient(0,0,0,Hd); sky.addColorStop(0,th.top); sky.addColorStop(.4,th.mid); sky.addColorStop(.68,"#3f7a4e"); sky.addColorStop(1,"#1d5a2b");
    g.fillStyle=sky; g.fillRect(0,0,Wd,Hd);
    // 太陽/月亮光暈：白天亮暖、夜晚柔黃
    const orbA=th.night?0.95:0.85, orbCol=th.night?"255,247,210":"255,250,225";
    const moon=g.createRadialGradient(Wd*0.76,Hd*0.15,4,Wd*0.76,Hd*0.15,Hd*(th.night?0.2:0.26)); moon.addColorStop(0,"rgba("+orbCol+","+orbA+")"); moon.addColorStop(.3,"rgba("+orbCol+",0.5)"); moon.addColorStop(1,"rgba("+orbCol+",0)");
    g.fillStyle=moon; g.fillRect(0,0,Wd,Hd);
    // 星星：只有夜晚明顯（白天幾乎看不到）
    const starMul=th.night?0.85:0.1;
    for(let i=0;i<46;i++){ const x=(i*89.7)%Wd, y=(i*47.3)%(Hd*0.52); const tw=0.4+0.6*(0.5+0.5*Math.sin(tt*2+i*1.3)); g.globalAlpha=tw*starMul; g.fillStyle=i%5===0?"#fff59d":"#ffffff"; g.beginPath(); g.arc(x,y,i%7===0?1.8:1.1,0,7); g.fill(); }
    g.globalAlpha=1;
    // 季節微粒：春櫻粉/夏綠光/秋落葉/冬雪，飄落（決定式位置、不 push 陣列，零洩漏）
    const pc=SEASON_PARTICLE[th.season]||"#ffffff"; g.fillStyle=pc;
    for(let i=0;i<14;i++){ const px=((i*97.3 + tt*(th.season==="winter"?14:22))%Wd); const py=((i*63.7 + tt*(th.season==="winter"?26:40))%(Hd*0.72)); const sw=Math.sin(tt*1.4+i)*6;
      g.globalAlpha=0.5; if(th.season==="autumn"){ g.save(); g.translate(px+sw,py); g.rotate(tt+i); g.beginPath(); g.ellipse(0,0,3.4,1.6,0,0,7); g.fill(); g.restore(); }
      else { g.beginPath(); g.arc(px+sw,py,th.season==="winter"?1.8:2.2,0,7); g.fill(); } }
    g.globalAlpha=1;
    // 季節色調：整體天空罩一層極淡的季節色（春粉/夏綠/秋橙/冬藍）
    g.fillStyle=SEASON_TINT[th.season]||"rgba(0,0,0,0)"; g.fillRect(0,0,Wd,Hd*0.72);
    // 多層遠山
    const ridge=(yB,amp,col)=>{ g.fillStyle=col; g.beginPath(); g.moveTo(0,yB); for(let x=0;x<=Wd;x+=Wd/8){ g.lineTo(x, yB - amp*Math.sin(x/Wd*3.14159) - amp*0.4*Math.sin(x/Wd*9+1)); } g.lineTo(Wd,Hd); g.lineTo(0,Hd); g.closePath(); g.fill(); };
    ridge(Hd*0.5,Hd*0.07,"rgba(30,55,60,0.55)"); ridge(Hd*0.57,Hd*0.06,"rgba(18,52,38,0.7)"); ridge(Hd*0.64,Hd*0.05,"rgba(10,40,26,0.88)");
    // 樹剪影
    g.fillStyle="rgba(6,28,18,0.92)";
    for(const tx of [0.07,0.19,0.85,0.94]){ const bx=Wd*tx, by=Hd*0.66; g.beginPath(); g.moveTo(bx,by); g.lineTo(bx-Hd*0.035,by-Hd*0.14); g.lineTo(bx+Hd*0.035,by-Hd*0.14); g.closePath(); g.moveTo(bx,by-Hd*0.08); g.lineTo(bx-Hd*0.05,by-Hd*0.2); g.lineTo(bx+Hd*0.05,by-Hd*0.2); g.closePath(); g.fill(); g.fillRect(bx-2,by-Hd*0.14,4,Hd*0.14); }
    // 聚光
    const spot=g.createRadialGradient(Wd/2,Hd*0.44,8,Wd/2,Hd*0.44,Math.min(Wd,Hd)*0.6); spot.addColorStop(0,"rgba(255,235,150,0.3)"); spot.addColorStop(1,"rgba(255,235,150,0)");
    g.fillStyle=spot; g.fillRect(0,0,Wd,Hd);
    // 上升光點（螢火/餘燼）
    g.save(); g.globalCompositeOperation="lighter";
    for(let i=0;i<28;i++){ const sp=14+(i%5)*6; const yy=Hd-((tt*sp+i*73)%(Hd+40)); const xx=((i*137.5)%Wd)+Math.sin(tt*0.8+i)*14; const tw=0.3+0.7*(0.5+0.5*Math.sin(tt*3+i)); g.fillStyle=(i%4===0)?"rgba(255,213,120,"+(tw*0.85).toFixed(3)+")":"rgba(170,230,150,"+(tw*0.6).toFixed(3)+")"; g.beginPath(); g.arc(xx,yy,1.4+1.3*tw,0,7); g.fill(); }
    g.restore();
    // 自適應安全區：量測下方名稱列(.lb-bottom)實際位置，角色一律落在它上方，永不擋字
    // 旋轉橫向時，getBoundingClientRect 量到的是「螢幕座標」，跟畫布內部橫向座標系軸向不一致
    // （90度旋轉會讓寬高軸互換），量測比例會失真，改用針對橫向版面調校過的安全值，不用動態量測。
    // 手機橫向(高度矮)：上方跑馬燈占比更高，主角起始線往下移，避免頭頂到字
    const topBound=(!rot&&Hd<560)? Hd*0.2 : Hd*0.1; let lbTop=rot? Hd*0.4 : Hd*0.62;
    if(!rot){ const lbEl=document.querySelector("#lobby .lb-bottom");
      if(lbEl && heroShow){ const r=lbEl.getBoundingClientRect(), cr=heroShow.getBoundingClientRect();
        const t=(r.top-cr.top)*(Hd/Math.max(1,cr.height));
        // 之前門檻太嚴(+60)：手機橫向名稱列很高時量測被丟棄、退回 0.62 → 主角被畫進文字底下。
        // 改成放寬接受實測值：名稱列再高，主角就縮小站在它上方，寧可小也絕不被字擋住。
        if(t>topBound+40) lbTop=Math.min(t,Hd*0.66); } }
    // 尺寸與站位用「真實可用空間」算（不用灌水後的下限），極矮視窗時角色才不會被撐大到跟上方文字重疊
    const realRegion=Math.max(40, lbTop-topBound);
    const s=Math.min(Math.min(Wd,Hd)*0.15, realRegion*0.34), h=HEROES[featured];
    const py=lbTop-realRegion*0.3, pr=s*1.15, cy=py-s*0.62, pl=0.5+0.5*Math.sin(tt*2);
    // 台座
    g.fillStyle="rgba(0,0,0,0.34)"; g.beginPath(); g.ellipse(Wd/2,py,pr,pr*0.22,0,0,7); g.fill();
    g.strokeStyle="rgba(255,213,79,0.65)"; g.lineWidth=3; g.beginPath(); g.ellipse(Wd/2,py,pr,pr*0.22,0,0,7); g.stroke();
    g.strokeStyle="rgba(255,213,79,0.22)"; g.lineWidth=2; g.beginPath(); g.ellipse(Wd/2,py,pr*1.25,pr*0.28,0,0,7); g.stroke();
    const aura=g.createRadialGradient(Wd/2,cy,s*0.2,Wd/2,cy,s*1.1);
    aura.addColorStop(0,"rgba(255,228,130,"+(0.22+0.18*pl).toFixed(3)+")"); aura.addColorStop(1,"rgba(255,228,130,0)");
    g.fillStyle=aura; g.beginPath(); g.arc(Wd/2,cy,s*1.1,0,7); g.fill();
    g.save(); g.translate(Wd/2,cy); g.rotate(Math.sin(tt*1.2)*0.05); const sc=1+0.035*Math.sin(tt*2.2); g.scale(sc,sc);
    drawHeroView(g, h.key, 0, 0, s, tt); drawCosmetic(g, cosEquipOf(h.key), 0, 0, s, tt, h.key); g.restore();
    g.save(); g.globalCompositeOperation="lighter";
    for(let i=0;i<9;i++){ const a=tt*1.4+i*0.7, rr=s*(1.05+0.18*Math.sin(tt*2+i)); const sx=Wd/2+Math.cos(a)*rr, sy=cy+Math.sin(a)*rr*0.62; const tw=0.4+0.6*(0.5+0.5*Math.sin(tt*4+i*2)); g.fillStyle="rgba(255,245,180,"+tw.toFixed(3)+")"; g.beginPath(); g.arc(sx,sy,1.6+1.7*tw,0,7); g.fill(); }
    g.restore();
    // 跑馬燈輪播
    const ti=Math.floor(tt/4)%TICKERS.length, el=document.getElementById("lbTicker");
    if(el && el.dataset.i!==String(ti)){ el.dataset.i=String(ti); el.textContent=TICKERS[ti]; }
  }
  window.addEventListener("resize",()=>{ if(state==="lobby") resizeHeroShow(); });

  function goMap(){ state="map"; setBattleUI(false); show(mapScr);
    const cards=document.getElementById("cards"); cards.innerHTML=""; const unlocked=getUnlocked();
    CH.forEach((c,i)=>{ const div=document.createElement("div"); div.className="card"+(i>unlocked?" locked":"")+(i<unlocked?" cleared":"");
      const cv=document.createElement("canvas"); cv.width=104; cv.height=104; div.appendChild(cv);
      const info=document.createElement("div"); info.className="info";
      info.innerHTML=`<div class="t">第${i+1}章 · ${c.place}</div><div class="d">${HEROES[c.hero].name}（${TYPE[HEROES[c.hero].type]}） VS ${c.boss.name}（${TYPE[c.boss.type]}）</div>`;
      div.appendChild(info); const st=document.createElement("div"); st.className="st"; st.textContent=i<unlocked?"✅":(i>unlocked?"🔒":"▶"); div.appendChild(st);
      drawCreature(cv.getContext("2d"),HEROES[c.hero].key,52,60,36,{t:0});
      if(i<=unlocked) div.onclick=()=>transition(()=>startChapter(i)); cards.appendChild(div); });
  }

  function goDex(){ state="dex"; setBattleUI(false); show(dexScr); const wrap=document.getElementById("dexCards"); wrap.innerHTML="";
    const h1=document.createElement("div"); h1.className="dexhdr"; h1.textContent="🛡 守護者 · 台灣特有種"; wrap.appendChild(h1);
    HEROES.forEach(h=>{ wrap.appendChild(dexCard(h.key,h.name,TYPE[h.type],"b-end",h.status,h.fact)); });
    const h2=document.createElement("div"); h2.className="dexhdr"; h2.textContent="⚠ 入侵者 · 外來入侵種"; wrap.appendChild(h2);
    CH.forEach(c=>{ const b=c.boss; wrap.appendChild(dexCard(b.kind,b.name.replace("王",""),TYPE[b.type],"b-inv",b.status,b.fact)); });
  }
  function dexCard(kind,name,typeLabel,badgeCls,status,fact){ const div=document.createElement("div"); div.className="card";
    const cv=document.createElement("canvas"); cv.width=104; cv.height=104; div.appendChild(cv); drawCreature(cv.getContext("2d"),kind,52,60,34,{t:0});
    const info=document.createElement("div"); info.className="info";
    info.innerHTML=`<div class="t">${name} <span style="font-size:12px;color:#b0bec5">${typeLabel}</span></div>`+
      `<div class="d"><span class="badge ${badgeCls}">${status}</span>${fact}</div>`;
    div.appendChild(info); return div; }

  /* ===== 對話 ===== */
  let dlg=null,dlgIdx=0,dlgAfter=null;
  function playStory(lines,after){ state="story"; setBattleUI(false); show(null); storyScr.classList.remove("hide"); drawStoryBg(); dlg=lines; dlgIdx=0; dlgAfter=after; renderLine(); }
  function renderLine(){ const ln=dlg[dlgIdx], h=HEROES[ln.s];
    document.getElementById("spk").textContent=h.name; document.getElementById("line").textContent=ln.t;
    const px=document.getElementById("portrait").getContext("2d"); px.clearRect(0,0,128,128); drawCreature(px,h.key,64,72,46,{t:0,mood:ln.m}); }
  function advance(){ dlgIdx++; if(dlgIdx>=dlg.length){ const a=dlgAfter; dlg=null; if(a)a(); } else renderLine(); }
  function drawStoryBg(){ const sb=document.getElementById("storybg"), r=storyScr.getBoundingClientRect(); sb.width=r.width; sb.height=r.height; paintBackground(sb.getContext("2d"),r.width,r.height,CH[chapter].bg); }
  storyScr.addEventListener("pointerdown",(e)=>{ e.preventDefault(); if(state==="story") advance(); },{passive:false});

  /* ===== 開始戰鬥 ===== */
  function startChapter(i){ matchMode=false; chapter=i; playStory(CH[i].intro, ()=>transition(beginBattle)); }
  // 配對：按「對戰」→ 用大廳選的角色，對上隨機外來入侵種（隨機星級）
  function quickMatch(){ matchMode=true; chapter=Math.floor(Math.random()*CH.length); matchLevel=1+Math.floor(Math.random()*5); transition(beginBattle); }
  function beginBattle(){ const c=CH[chapter]; state="play"; setBattleUI(true); show(null);
    elapsed=0; shake=0; hitstop=0; itemTimer=6; projs=[]; fx=[]; floaters=[]; parts=[]; items=[]; input.left=input.right=false;
    // 隊伍：配對戰可用全部 4 隻；戰役則用已解鎖的
    const avail = HEROES.map((h,i)=>i).filter(i=> isHeroUnlocked(HEROES[i].key));
    team = avail.map(i=>{ const mh=lvHP(HEROES[i].key); return {idx:i, hp:mh, maxhp:mh, fainted:false}; });
    active = team.findIndex(m=>m.idx===featured); if(active<0) active=0;
    hero={ x:W*0.22, y:GY-28, vy:0, onGround:true, face:1, hp:100, maxhp:100, atkT:0, atkCd:0, atkHit:false, spCd:0, invuln:0, hitT:0, dashT:0, dashDir:1, foot:28, key:"leopard", type:"forest" };
    loadActive(active,true);
    const b=c.boss, hpS=matchMode?(0.7+matchLevel*0.18):1, dmgS=matchMode?(0.8+matchLevel*0.08):1;
    boss={ kind:b.kind, name:b.name+(matchMode?(" ★"+matchLevel):""), type:b.type, x:W*0.78, y:GY-b.r*0.7, vy:0, onGround:true, face:-1,
      hp:Math.round(b.hp*hpS), maxhp:Math.round(b.hp*hpS), r:b.r, dmg:Math.round(b.dmg*dmgS), foot:b.r*0.7, st:"idle", t:1.0, stun:0, danger:false, atk:null, hitT:0 };
    bSwap.style.display = team.length>1 ? "flex" : "none";
    updateSp();
  }
  function loadActive(i,instant){ active=i; const m=team[i]; heroDef=HEROES[m.idx];
    hero.key=heroDef.key; hero.type=heroDef.type; hero.sp=heroDef.sp; hero.maxhp=m.maxhp; hero.hp=m.hp;
    hero.atkT=0; hero.atkCd=0; hero.atkHit=false; hero.spCd=0; hero.dashT=0; hero.invuln=Math.max(hero.invuln, instant?0.3:0.7); updateSp(); }
  function saveActive(){ if(team&&team[active]) team[active].hp=hero.hp; }
  function nextAlive(from){ for(let k=1;k<=team.length;k++){ const j=(from+k)%team.length; if(!team[j].fainted) return j; } return -1; }
  function swapHero(){ if(state!=="play"||team.length<2) return; const j=nextAlive(active); if(j<0||j===active) return; saveActive(); loadActive(j); flo(hero.x,hero.y-52,HEROES[team[j].idx].name+"上!","#80deea"); }

  /* ===== 英雄動作 ===== */
  function heroAttack(){ if(state!=="play"||hero.atkCd>0||hero.dashT>0) return; hero.atkT=0.22; hero.atkCd=heroDef.atkCd; hero.atkHit=false; hero.x+=hero.face*10; }
  function heroJump(){ if(state!=="play"||!hero.onGround) return; hero.vy=JUMP; hero.onGround=false; }
  function heroSpecial(){ if(state!=="play"||hero.spCd>0) return; const sp=hero.sp; hero.spCd=heroDef.spCd;
    if(sp==="dash"){ const fast=hero.type==="sky"; hero.dashT=fast?0.34:0.26; hero.dashDir=hero.face; hero.invuln=Math.max(hero.invuln,hero.dashT+0.05); hero.spDmg=fast?24:20; hero.spHit=false; flo(hero.x,hero.y-50,heroDef.spName+"!","#fff59d"); }
    else if(sp==="slam"){ hero.vy=JUMP*0.7; hero.slamPending=true; flo(hero.x,hero.y-50,heroDef.spName+"!","#fff59d"); }
    else if(sp==="sonic"){ projs.push({from:"hero",x:hero.x+hero.face*30,y:hero.y-20,vx:hero.face*460,vy:0,r:18,dmg:16,stun:true,life:1.6,kind:"sonic"}); flo(hero.x,hero.y-50,heroDef.spName+"!","#fff59d"); }
    updateSp();
  }
  function hurtHero(base,fromX){ if(hero.invuln>0) return; const mult=eff(boss.type,hero.type); const dmg=Math.round(base*mult);
    hero.hp-=dmg; hero.invuln=1.0; hero.hitT=0.3; shake=Math.max(shake,12); hero.vy=-260; hero.onGround=false; hero.x+=(hero.x<fromX?-1:1)*30;
    burst(hero.x,hero.y-20,14,"#ff8a80",1.3); ringAt(hero.x,hero.y-20,"#ff5252",62); hitstop=Math.max(hitstop,0.06);
    flo(hero.x,hero.y-50,"-"+dmg,"#ff8a80"); if(mult>1) flo(hero.x,hero.y-72,"效果絕佳!","#ffab91");
    if(hero.hp<=0){ hero.hp=0; team[active].hp=0; team[active].fainted=true; flo(hero.x,hero.y-40,HEROES[team[active].idx].name+" 倒下!","#bbb");
      const j=nextAlive(active); if(j<0){ loseChapter(); } else { loadActive(j); } } }
  function hitBoss(base,stun){ const mult=eff(hero.type,boss.type); const dmg=Math.round(base*mult);
    boss.hp-=dmg; boss.hitT=0.18; flo(boss.x,boss.y-boss.r-10,"-"+dmg,"#fff");
    const ix=boss.x+(hero.x<boss.x?-boss.r*0.7:boss.r*0.7), iy=boss.y-boss.r*0.15;
    burst(ix,iy, mult>1?18:11, mult>1?"#fff59d":"#ffffff", mult>1?1.5:1);
    ringAt(ix,iy, mult>1?"#ffe082":"#ffffff", boss.r*0.95);
    shake=Math.max(shake, mult>1?14:9); hitstop=Math.max(hitstop, mult>1?0.075:0.045);
    if(mult>1) flo(boss.x,boss.y-boss.r-30,"效果絕佳!","#a5d6a7"); else if(mult<1) flo(boss.x,boss.y-boss.r-30,"效果不佳…","#cfd8dc");
    if(stun){ boss.stun=Math.max(boss.stun,1.3); boss.st="idle"; boss.danger=false; }
    if(boss.hp<=0){ boss.hp=0; winChapter(); } }

  /* ===== 魔王 AI ===== */
  function bossPick(){ const gap=Math.abs(hero.x-boss.x); const r=(Math.floor(elapsed*7)+boss.hp)%3;
    if(gap>W*0.4) return "charge"; if(r===0) return "charge"; if(r===1) return "slam"; return "spit"; }
  function bossUpdate(dt){ if(boss.hitT>0) boss.hitT-=dt; boss.face = hero.x<boss.x ? -1 : 1;
    if(boss.stun>0){ boss.stun-=dt; boss.danger=false; return; }
    boss.vy+=GRAV*dt; boss.y+=boss.vy*dt; const by=GY-boss.foot;
    if(boss.y>=by){ if(!boss.onGround&&boss.atk==="slam"&&boss.st==="attack"){ projs.push({from:"bossWave",x:boss.x,y:GY,vx:-280,r:20,dmg:13,life:1.4}); projs.push({from:"bossWave",x:boss.x,y:GY,vx:280,r:20,dmg:13,life:1.4}); shake=Math.max(shake,9); boss.st="recover"; boss.t=1.0; }
      boss.y=by; boss.vy=0; boss.onGround=true; }
    switch(boss.st){
      case "idle": { const gap=hero.x-boss.x, d=Math.abs(gap); const want=d<W*0.28?-Math.sign(gap):Math.sign(gap); boss.x+=want*60*dt; boss.t-=dt; if(boss.t<=0){ boss.atk=bossPick(); boss.st="tele"; boss.t=0.75; } break; }
      case "tele": { boss.t-=dt; if(boss.t<=0){ boss.st="attack"; boss.danger=true;
          if(boss.atk==="charge"){ boss.cv=Math.sign(hero.x-boss.x)*Math.max(360,W*0.9); boss.t=0.55; }
          else if(boss.atk==="slam"){ boss.vy=JUMP*0.95; boss.onGround=false; boss.t=2.0; }
          else if(boss.atk==="spit"){ for(let i=0;i<3;i++){ projs.push({from:"boss",x:boss.x+boss.face*boss.r*0.6,y:boss.y-boss.r*0.4,vx:boss.face*(300+i*30),vy:-260+i*60,r:14,dmg:10,life:2.4,grav:true}); } boss.danger=false; boss.st="recover"; boss.t=0.9; } } break; }
      case "attack": { if(boss.atk==="charge"){ boss.x+=boss.cv*dt; boss.t-=dt; if(boss.x<boss.r)boss.x=boss.r; if(boss.x>W-boss.r)boss.x=W-boss.r; if(boss.t<=0){ boss.danger=false; boss.st="recover"; boss.t=1.1; } }
        else if(boss.atk==="slam"){ boss.t-=dt; if(boss.t<=0&&boss.onGround){ boss.st="recover"; boss.t=1.0; } } break; }
      case "recover": { boss.danger=false; boss.t-=dt; if(boss.t<=0){ boss.st="idle"; boss.t=0.7+Math.random()*0.6; } break; }
    }
    boss.x=Math.max(boss.r,Math.min(W-boss.r,boss.x));
    if(boss.danger && hero.invuln<=0){ const dx=Math.abs(hero.x-boss.x), dy=Math.abs(hero.y-boss.y); if(dx<boss.r+18 && dy<boss.r){ hurtHero(boss.dmg,boss.x); } }
  }

  /* ===== 更新 ===== */
  function update(dt){
    // 打擊頓挫：命中瞬間凍格（仍持續整合粒子讓火花動）
    if(hitstop>0){ hitstop=Math.max(0,hitstop-dt); for(const p of parts){ p.life-=dt; if(p.type==="spark"){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=900*dt; } } parts=parts.filter(p=>p.life>0); if(shake>0) shake=Math.max(0,shake-dt*40); return; }
    elapsed+=dt; if(shake>0) shake=Math.max(0,shake-dt*40);
    for(const p of parts){ p.life-=dt; if(p.type==="spark"){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=900*dt; } } parts=parts.filter(p=>p.life>0);
    if(hero.atkCd>0)hero.atkCd-=dt; if(hero.atkT>0)hero.atkT-=dt; if(hero.spCd>0){hero.spCd-=dt; updateSp();}
    if(hero.invuln>0)hero.invuln-=dt; if(hero.hitT>0)hero.hitT-=dt;
    let mv=0; if(input.left)mv-=1; if(input.right)mv+=1; if(mv!==0) hero.face=mv;
    if(hero.dashT>0){ hero.x+=hero.dashDir*620*dt; hero.dashT-=dt; } else hero.x+=mv*heroDef.speed*dt;
    hero.x=Math.max(20,Math.min(W-20,hero.x));
    hero.vy+=GRAV*dt; hero.y+=hero.vy*dt; const hy=GY-hero.foot;
    if(hero.y>=hy){ if(!hero.onGround&&hero.slamPending){ hero.slamPending=false; if(Math.abs(hero.x-boss.x)<160) hitBoss(20); shake=Math.max(shake,9); } hero.y=hy; hero.vy=0; hero.onGround=true; }
    if(hero.atkT>0 && !hero.atkHit){ const gap=Math.abs(hero.x-boss.x)-boss.r; const facing=(boss.x-hero.x)*hero.face>=0; if(gap<heroDef.reach && facing){ hitBoss(heroDef.atkDmg+lvAtk(hero.key)); hero.atkHit=true; } }
    if(hero.dashT>0 && !hero.spHit && hero.sp==="dash"){ if(Math.abs(hero.x-boss.x)<boss.r+26){ hitBoss(hero.spDmg); hero.spHit=true; } }
    bossUpdate(dt);
    // 防穿模：非衝撞時，英雄不可走進魔王身體（維持在自己這側）
    { const charging=(boss.st==="attack"&&boss.atk==="charge"); if(!charging){ const minGap=boss.r*0.55+18;
        if(hero.x<boss.x && hero.x>boss.x-minGap) hero.x=boss.x-minGap;
        else if(hero.x>=boss.x && hero.x<boss.x+minGap) hero.x=boss.x+minGap;
        hero.x=Math.max(20,Math.min(W-20,hero.x)); } }
    for(const p of projs){ p.life-=dt; p.x+=p.vx*dt; if(p.grav){ p.vy+=GRAV*dt; p.y+=p.vy*dt; if(p.y>GY){ p.y=GY; p.life=0; } }
      if(p.from==="bossWave"||p.from==="boss"){ if(hero.invuln<=0){ if(p.from==="bossWave"){ if(hero.onGround && Math.abs(hero.x-p.x)<24){ hurtHero(p.dmg,p.x); p.life=0; } } else { if(Math.hypot(hero.x-p.x,hero.y-p.y)<22){ hurtHero(p.dmg,p.x); p.life=0; } } } }
      else if(p.from==="hero"){ if(Math.abs(p.x-boss.x)<boss.r && Math.abs(p.y-boss.y)<boss.r){ hitBoss(p.dmg,p.stun); p.life=0; } } }
    projs=projs.filter(p=>p.life>0 && p.x>-60 && p.x<W+60);
    for(const f of floaters){ f.life-=dt; f.y-=24*dt; } floaters=floaters.filter(f=>f.life>0);
    // 保育道具：生成 + 拾取
    itemTimer-=dt; if(itemTimer<=0){ spawnItem(); itemTimer=8+Math.random()*4; }
    for(const it of items){ it.life-=dt; it.bob+=dt; if(!it.dead && Math.abs(hero.x-it.x)<32 && hero.y>GY-110){ collectItem(it); it.dead=true; } }
    items=items.filter(it=>!it.dead && it.life>0);
  }
  function updateSp(){ const r=Math.max(0,hero?hero.spCd:0); const cd=heroDef?heroDef.spCd:5; bSp.querySelector(".fill").style.height=(r/cd*100)+"%"; bSp.classList.toggle("ready", r<=0); }

  function winChapter(){ if(state!=="play")return;
    if(matchMode){ state="post"; setBattleUI(false); bumpWin(); dailyBump("repel",1); if(matchLevel>=3) dailyBump("hard",1);
      const gain=matchLevel*10; gainEco(gain); const xpGain=40+matchLevel*15; gainXP(HEROES[featured].key, xpGain);
      const tip="🌱 <b>你可以這樣幫：</b><br>"+CONS_INV[boss.kind]+"<br>"+CONS_END[HEROES[featured].key];
      showResult("🛡️ 驅逐成功！", boss.name+" 被擊退　🌿+"+gain+"　"+HEROES[featured].name+" EXP+"+xpGain, tip, "⚔ 再來一場", quickMatch); return; }
    state="post"; setBattleUI(false);
    const was=getUnlocked(); if(chapter+1>was) setUnlocked(Math.min(CH.length,chapter+1));
    playStory(CH[chapter].outro, ()=>{ const last=chapter>=CH.length-1;
      showResult("🏆 打倒 "+CH[chapter].boss.name+"！", last?"全戰役完成！":"章節過關",
        last?"你打倒了所有入侵種的王，守住了台灣每一個家。<br>打開『保育圖鑑』，把這些真實的台灣生命記在心裡。":"新夥伴加入隊伍！之後可在任何章節換手出戰。",
        last?"回大廳":"下一章 ▶", last?goLobby:()=>startChapter(chapter+1)); }); }
  function loseChapter(){ if(state!=="play")return;
    if(matchMode){ state="lose"; setBattleUI(false);
      showResult("被擊退了…", boss.name+" 太強", "換隻角色、用對屬性(🌲>💧>🌪>🪲>🌲)再來！<br><br>🌱 "+CONS_INV[boss.kind], "⚔ 再配對", quickMatch); return; }
    state="lose"; setBattleUI(false);
    showResult("全隊被擊倒了…", CH[chapter].boss.name+"太強了", "撐住！等首領出招『後』再反擊；按『換手』用屬性剋制牠（🌲>💧>🌪>🪲>🌲）。", "再挑戰一次", ()=>startChapter(chapter)); }
  function showResult(title,sub,body,mainTxt,mainFn){ state="result"; show(resultScr);
    document.getElementById("rTitle").textContent=title; document.getElementById("rSub").textContent=sub;
    document.getElementById("rBody").innerHTML=body; const mb=document.getElementById("rMain"); mb.textContent=mainTxt; mb.onclick=()=>transition(mainFn); }
  function flo(x,y,txt,col){ floaters.push({x,y,txt,col,life:0.8}); }
  // 碰撞/打擊：火花爆發 + 衝擊環
  function burst(x,y,n,col,power){ power=power||1; for(let i=0;i<n;i++){ const a=Math.random()*6.283, sp=(70+Math.random()*200)*power; parts.push({type:"spark",x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-70,life:0.3+Math.random()*0.25,max:0.55,r:1.4+Math.random()*2.6,col}); } if(parts.length>240) parts.splice(0,parts.length-240); }
  function ringAt(x,y,col,maxr){ parts.push({type:"ring",x,y,life:0.28,max:0.28,r0:6,r1:maxr||40,col}); }
  function spawnItem(){ const k=ITEM_KEYS[Math.floor(Math.random()*ITEM_KEYS.length)]; items.push({key:k,x:60+Math.random()*(W-120),y:GY-22,life:12,bob:Math.random()*6}); }
  function collectItem(it){ const d=ITEMS[it.key]; ringAt(it.x,it.y-10,d.col,46); burst(it.x,it.y-10,10,d.col,1); dailyBump("item",1);
    if(it.key==="heal"){ hero.hp=Math.min(hero.maxhp,hero.hp+30); flo(it.x,it.y-34,"🌿 棲地復育 +30","#a5d6a7"); }
    else if(it.key==="report"){ boss.hp-=28; burst(boss.x,boss.y-boss.r*0.2,14,"#ffd54f",1.3); shake=Math.max(shake,10); flo(it.x,it.y-34,"📢 通報移除！","#ffd54f"); if(boss.hp<=0){ boss.hp=0; winChapter(); } }
    else if(it.key==="shield"){ hero.invuln=Math.max(hero.invuln,3); flo(it.x,it.y-34,"🛡️ 生態廊道 無敵","#80deea"); } }

  /* ===== 背景（依棲地的寫實大氣場景） ===== */
  // 每種棲地的天空/太陽/三層山色/前景植被
  const BG_PAL={
    paddy:  { sky:["#6fa8cf","#a7cfe0","#f0e3b4"], sun:"255,238,180", sunX:0.74, sunY:0.20, far:"#9db7c4", mid:"#7a9a6e", near:"#46683f", veg:"rice" },
    hill:   { sky:["#bcdcee","#d6e7e0","#eaf1d6"], sun:"255,250,225", sunX:0.30, sunY:0.18, far:"#9fbcc4", mid:"#6f9a6a", near:"#3c6b3a", veg:"tree" },
    stream: { sky:["#a9d6ec","#cde8ef","#e3f1e6"], sun:"255,252,235", sunX:0.66, sunY:0.16, far:"#a7c4cc", mid:"#6f9e88", near:"#3e6f5c", veg:"rock" },
    wetland:{ sky:["#f4b483","#e7a6a0","#9fb1c8"], sun:"255,210,150", sunX:0.78, sunY:0.26, far:"#b69ca8", mid:"#7d7f95", near:"#4a5a63", veg:"reed" },
    forest: { sky:["#bcdcee","#cfe6d6","#e3efcf"], sun:"255,250,225", sunX:0.30, sunY:0.18, far:"#9fbcc4", mid:"#5f8f5a", near:"#33602f", veg:"tree" }
  };
  function drawVeg(c,w,hz,p,t){
    if(p.veg==="tree"){ c.fillStyle="rgba(10,38,24,0.9)";
      for(const tx of [0.04,0.13,0.88,0.97]){ const bx=w*tx, by=hz, th=hz*0.22;
        c.beginPath(); c.moveTo(bx,by); c.lineTo(bx-th*0.42,by-th*0.55); c.lineTo(bx+th*0.42,by-th*0.55); c.closePath();
        c.moveTo(bx,by-th*0.34); c.lineTo(bx-th*0.5,by-th*0.95); c.lineTo(bx+th*0.5,by-th*0.95); c.closePath(); c.fill();
        c.fillRect(bx-2,by-th*0.55,4,th*0.55); } }
    else if(p.veg==="reed"){ c.lineWidth=3;
      for(let i=0;i<24;i++){ const bx=(i/24)*w+(i%3)*5, bh=hz*(0.1+0.06*(i%4)), sw=Math.sin(t*1.2+i)*5;
        c.strokeStyle="rgba(20,32,30,0.8)"; c.beginPath(); c.moveTo(bx,hz); c.quadraticCurveTo(bx+sw,hz-bh*0.6,bx+sw*1.6,hz-bh); c.stroke();
        c.fillStyle="rgba(80,62,34,0.85)"; c.beginPath(); c.ellipse(bx+sw*1.6,hz-bh,2.4,6.5,0,0,7); c.fill(); } }
    else if(p.veg==="rice"){ c.strokeStyle="rgba(120,140,50,0.55)"; c.lineWidth=2;
      for(let i=0;i<44;i++){ const bx=(i/44)*w, bh=hz*0.06, sw=Math.sin(t*1.5+i)*2.2;
        c.beginPath(); c.moveTo(bx,hz); c.lineTo(bx+sw,hz-bh); c.stroke(); } }
    else if(p.veg==="rock"){ c.fillStyle="rgba(66,78,84,0.88)";
      for(const rx of [0.08,0.2,0.5,0.8,0.93]){ const bx=w*rx, by=hz, rw=hz*(0.06+0.03*((rx*10)%2));
        c.beginPath(); c.moveTo(bx-rw,by); c.quadraticCurveTo(bx-rw*0.6,by-rw*0.95,bx,by-rw); c.quadraticCurveTo(bx+rw*0.7,by-rw*0.8,bx+rw,by); c.closePath(); c.fill(); } }
  }
  function paintBackground(c,w,h,bg,t){ t=t||0; const hz=h*0.82, p=BG_PAL[bg]||BG_PAL.forest;
    // 天空漸層
    const sky=c.createLinearGradient(0,0,0,hz); sky.addColorStop(0,p.sky[0]); sky.addColorStop(.55,p.sky[1]); sky.addColorStop(1,p.sky[2]);
    c.fillStyle=sky; c.fillRect(0,0,w,hz);
    // 太陽 + 大氣輝光
    const sx=w*p.sunX, sy=hz*p.sunY;
    const sun=c.createRadialGradient(sx,sy,2,sx,sy,hz*0.55); sun.addColorStop(0,"rgba("+p.sun+",0.95)"); sun.addColorStop(.25,"rgba("+p.sun+",0.4)"); sun.addColorStop(1,"rgba("+p.sun+",0)");
    c.fillStyle=sun; c.fillRect(0,0,w,hz);
    c.fillStyle="rgba("+p.sun+",0.9)"; c.beginPath(); c.arc(sx,sy,hz*0.05,0,7); c.fill();
    // 飄移雲層
    for(let i=0;i<4;i++){ const cx=((i*0.32+t*0.012)%1.25-0.12)*w, cy=hz*(0.12+i*0.07), cw=w*(0.16+0.05*(i%2)), ch=hz*0.045;
      c.fillStyle="rgba(255,255,255,"+(0.34-i*0.05).toFixed(2)+")"; c.beginPath(); c.ellipse(cx,cy,cw,ch,0,0,7); c.fill(); }
    // 遠/中/近三層山稜
    const ridge=(yB,amp,seed,col)=>{ c.fillStyle=col; c.beginPath(); c.moveTo(0,yB);
      for(let x=0;x<=w;x+=w/12){ c.lineTo(x, yB - amp*Math.sin(x/w*3.14159+seed) - amp*0.45*Math.sin(x/w*7+seed*1.7)); }
      c.lineTo(w,hz); c.lineTo(0,hz); c.closePath(); c.fill(); };
    ridge(hz*0.72,hz*0.13,0.4,p.far);
    c.fillStyle="rgba(255,255,255,0.16)"; c.fillRect(0,hz*0.64,w,hz*0.13); // 山腰霧帶
    ridge(hz*0.85,hz*0.12,1.6,p.mid);
    ridge(hz*0.97,hz*0.10,2.7,p.near);
    drawVeg(c,w,hz,p,t);
    // 地平線空氣感壓暗
    const hb=c.createLinearGradient(0,hz*0.78,0,hz); hb.addColorStop(0,"rgba(0,0,0,0)"); hb.addColorStop(1,"rgba(0,0,0,0.12)"); c.fillStyle=hb; c.fillRect(0,hz*0.78,w,hz*0.22);
  }
  function drawGround(bg,t){ t=t||0; const water=(bg==="paddy"||bg==="stream"||bg==="wetland");
    if(water){ const wc={paddy:["#8a9659","#5a6a39"],stream:["#5aa6c4","#2f6f8c"],wetland:["#6f7e88","#3a525c"]}[bg];
      const g=ctx.createLinearGradient(0,GY,0,H); g.addColorStop(0,wc[0]); g.addColorStop(1,wc[1]); ctx.fillStyle=g; ctx.fillRect(0,GY,W,H-GY);
      ctx.save(); ctx.globalCompositeOperation="lighter"; // 水面流動反光
      for(let i=0;i<7;i++){ const yy=GY+8+i*((H-GY-8)/7), a=0.13*(1-i/7), ww=W*(0.5+0.3*Math.sin(t*0.8+i)), xx=W*0.5-ww/2+Math.sin(t*0.5+i)*22;
        ctx.fillStyle="rgba(255,255,255,"+a.toFixed(3)+")"; ctx.fillRect(xx,yy,ww,2); }
      ctx.restore();
      ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.fillRect(0,GY,W,2); // 岸邊高光
    } else { const sc={hill:["#6b7d3f","#45591f"],forest:["#5d7e3a","#3a5626"]}[bg]||["#5d4037","#3e2723"];
      const g=ctx.createLinearGradient(0,GY,0,H); g.addColorStop(0,sc[0]); g.addColorStop(1,sc[1]); ctx.fillStyle=g; ctx.fillRect(0,GY,W,H-GY);
      ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fillRect(0,GY,W,4);
      ctx.strokeStyle="rgba(28,56,22,0.5)"; ctx.lineWidth=2; // 草叢
      for(let x=6;x<W;x+=18){ const hh=6+((x*7)%6); ctx.beginPath(); ctx.moveTo(x,GY+8); ctx.lineTo(x+3,GY+8-hh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+6,GY+8); ctx.lineTo(x+4,GY+8-hh*0.8); ctx.stroke(); } } }

  /* ===== 繪製 ===== */
  function hpBar(x,y,w,frac,col,name){ ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(x,y,w,14); ctx.fillStyle=col; ctx.fillRect(x,y,w*Math.max(0,frac),14);
    ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=2; ctx.strokeRect(x,y,w,14); ctx.fillStyle="#fff"; ctx.font="bold 12px sans-serif"; ctx.textBaseline="alphabetic"; ctx.fillText(name,x,y-5); }
  function draw(){ ctx.save(); if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    const _bg=CH[chapter]?CH[chapter].bg:"paddy"; paintBackground(ctx,W+1,H+1,_bg,elapsed); drawGround(_bg,elapsed);
    for(const p of projs){ if(p.from==="bossWave"){ ctx.fillStyle="rgba(180,120,80,.6)"; ctx.beginPath(); ctx.ellipse(p.x,GY-6,p.r,p.r*0.5,0,0,7); ctx.fill(); }
      else if(p.from==="boss"){ ctx.fillStyle="#7e57c2"; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); }
      else if(p.kind==="sonic"){ ctx.strokeStyle="rgba(174,213,129,.9)"; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(p.x,p.y,16,0,7); ctx.stroke(); } }
    ctx.textAlign="center"; ctx.textBaseline="middle";
    // 保育道具（發光圓盤 + 圖示 + 漂浮）
    for(const it of items){ const d=ITEMS[it.key], by=it.y-18-Math.sin(it.bob*3)*4, gl=0.5+0.5*Math.sin(it.bob*4);
      const g2=ctx.createRadialGradient(it.x,by,2,it.x,by,22); g2.addColorStop(0,d.col); g2.addColorStop(1,"rgba(0,0,0,0)");
      ctx.globalAlpha=0.5+0.4*gl; ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(it.x,by,22,0,7); ctx.fill(); ctx.globalAlpha=1;
      ctx.font="22px serif"; ctx.fillText(d.icon,it.x,by);
      ctx.font="bold 10px sans-serif"; ctx.fillStyle="#fff"; ctx.fillText(d.name,it.x,by+22); }
    if(boss.hitT>0) ctx.globalAlpha=0.6; const tele=(boss.st==="tele"); if(tele && Math.floor(elapsed*12)%2===0) ctx.globalAlpha=0.7;
    drawCreature(ctx,boss.kind,boss.x,boss.y,boss.r,{t:elapsed,mood:"angry",flip:boss.face>0}); ctx.globalAlpha=1;
    if(tele){ ctx.fillStyle="#ff5252"; ctx.font="bold 30px sans-serif"; ctx.fillText("!",boss.x,boss.y-boss.r-14); }
    if(boss.stun>0){ ctx.font="20px serif"; ctx.fillText("💫",boss.x,boss.y-boss.r-10); }
    let ha=1; if(hero.invuln>0 && Math.floor(elapsed*16)%2===0) ha=0.4; ctx.globalAlpha=ha;
    drawCreature(ctx,hero.key,hero.x,hero.y,32,{t:elapsed,mood:hero.hitT>0?"angry":"happy",flip:hero.face<0}); ctx.globalAlpha=1;
    if(hero.atkT>0){ ctx.strokeStyle="rgba(255,255,255,.85)"; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(hero.x+hero.face*36,hero.y-6,26,-0.8,0.8); ctx.stroke(); }
    // 碰撞火花 + 衝擊環
    for(const p of parts){ const a=Math.max(0,p.life/p.max);
      if(p.type==="spark"){ ctx.globalAlpha=a; ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); }
      else { const rr=p.r0+(p.r1-p.r0)*(1-a); ctx.globalAlpha=a*0.9; ctx.strokeStyle=p.col; ctx.lineWidth=3.5; ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,7); ctx.stroke(); } }
    ctx.globalAlpha=1;
    for(const f of floaters){ ctx.globalAlpha=Math.min(1,f.life*1.6); ctx.fillStyle=f.col; ctx.font="bold 15px sans-serif"; ctx.fillText(f.txt,f.x,f.y); ctx.globalAlpha=1; }
    // 血條
    hpBar(14,30,W*0.40,hero.hp/hero.maxhp,"#66bb6a",HEROES[team[active].idx].name+" "+TYPE[hero.type]);
    hpBar(W-14-W*0.40,30,W*0.40,boss.hp/boss.maxhp,"#ef5350",boss.name+" "+TYPE[boss.type]);
    // 隊伍小點
    ctx.textAlign="left"; for(let i=0;i<team.length;i++){ const m=team[i]; const cx=18+i*22, cy=52;
      ctx.globalAlpha=m.fainted?0.3:1; ctx.fillStyle=i===active?"#fff59d":(m.fainted?"#777":"#aed581");
      ctx.beginPath(); ctx.arc(cx,cy,8,0,7); ctx.fill(); if(i===active){ ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.stroke(); } ctx.globalAlpha=1; }
    ctx.fillStyle="rgba(255,255,255,.85)"; ctx.font="bold 12px sans-serif"; ctx.textAlign="center"; ctx.fillText(matchMode?("★"+matchLevel+" 配對 · "+CH[chapter].place):("第"+(chapter+1)+"章 · "+CH[chapter].place),W/2,40);
    ctx.restore();
  }

  let last=0;
  function frame(ts){ const dt=Math.min(0.04,(ts-last)/1000||0); last=ts; if(state==="play"){ update(dt); draw(); } else if(state==="lose"||state==="result"){ draw(); } else if(state==="lobby"){ drawLobby(ts); } requestAnimationFrame(frame); }

  /* ===== 輸入 ===== */
  function hold(btn,flag){ const b=document.getElementById(btn);
    const on=(e)=>{ e.preventDefault(); input[flag]=true; b.classList.add("on"); };
    const off=(e)=>{ e.preventDefault(); input[flag]=false; b.classList.remove("on"); };
    b.addEventListener("pointerdown",on); b.addEventListener("pointerup",off); b.addEventListener("pointerleave",off); b.addEventListener("pointercancel",off); }
  hold("bLeft","left"); hold("bRight","right");
  const tap=(id,fn)=>document.getElementById(id).addEventListener("pointerdown",(e)=>{ e.preventDefault(); fn(); },{passive:false});
  tap("bJump",heroJump); tap("bAtk",heroAttack); tap("bSp",heroSpecial); tap("bSwap",swapHero);
  canvas.addEventListener("pointerdown",(e)=>{ if(state!=="play")return; e.preventDefault(); heroAttack(); },{passive:false});
  const xf=document.getElementById("xfade");
  function xfOff(){ xf.classList.remove("on"); }
  function transition(fn){
    xf.classList.add("on"); let done=false;
    const run=()=>{ if(done) return; done=true; try{ fn(); }catch(e){} setTimeout(xfOff,70); };
    setTimeout(run, 220);
    setTimeout(xfOff, 1200); // 失效保險：遮罩最多存在 1.2 秒，絕不卡黑屏
  }
  // 防卡死：點到遮罩、或頁面回到前景，一律強制清除
  xf.addEventListener("pointerdown", xfOff);
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) xfOff(); });
  document.getElementById("toMap").onclick=()=>transition(goMap); document.getElementById("rMap").onclick=()=>transition(goLobby);
  document.getElementById("toDex").onclick=()=>transition(goDex); document.getElementById("dexBack").onclick=()=>transition(goLobby);
  document.getElementById("mapHome").onclick=()=>transition(goLobby);
  document.getElementById("playBtn").onclick=quickMatch;
  document.getElementById("navDex").onclick=()=>transition(goDex);
  { const sw=document.getElementById("heroSwitchBtn"); if(sw) sw.onclick=openHeroPicker;
    const hc=document.getElementById("heroPickerClose"); if(hc) hc.onclick=closeHeroPicker;
    const hp=document.getElementById("heroPicker"); if(hp) hp.addEventListener("pointerdown",(e)=>{ if(e.target===hp) closeHeroPicker(); }); }   // 點彈窗外圍空白處也可關閉
  // 左上角帳號徽章：點開全螢幕帳號資訊（等級/戰績/守護者圖鑑）
  { const pf=document.getElementById("lbProfile"); if(pf) pf.addEventListener("pointerdown",(e)=>{ e.preventDefault(); openAccountInfo(); },{passive:false});
    const ac=document.getElementById("aiClose"); if(ac) ac.onclick=closeAccountInfo;
    const ab=document.getElementById("aiBack"); if(ab) ab.onclick=closeAccountInfo;
    const ar=document.getElementById("aiRename"); if(ar) ar.onclick=()=>{ renameAccount(); openAccountInfo(); };   // 改名後重繪帳號面板
    const ai=document.getElementById("accountInfo"); if(ai) ai.addEventListener("pointerdown",(e)=>{ if(e.target===ai) closeAccountInfo(); }); }
  // 點大廳角色 → 開啟守護者個人資訊（等級/經驗值）；只在大廳有效
  // 大廳角色互動：拖曳=360°旋轉看每一面；點一下(位移<10px)=開個人資訊
  { let spinDrag=null;
    if(heroShow){
      heroShow.addEventListener("pointerdown",(e)=>{ if(state!=="lobby") return; e.preventDefault();
        spinDrag={x0:e.clientX, last:e.clientX, moved:false}; heroShow.setPointerCapture&&heroShow.setPointerCapture(e.pointerId); },{passive:false});
      heroShow.addEventListener("pointermove",(e)=>{ if(!spinDrag) return; e.preventDefault();
        const dx=e.clientX-spinDrag.last; spinDrag.last=e.clientX;
        if(Math.abs(e.clientX-spinDrag.x0)>10) spinDrag.moved=true;
        heroSpin+=dx*0.012; },{passive:false});
      const endDrag=(e)=>{ if(!spinDrag) return; const wasTap=!spinDrag.moved; spinDrag=null; if(wasTap && state==="lobby") openHeroInfo(); };
      heroShow.addEventListener("pointerup",endDrag,{passive:false});
      heroShow.addEventListener("pointercancel",()=>{ spinDrag=null; },{passive:false}); }
    const hib=document.getElementById("hiClose"); if(hib) hib.onclick=closeHeroInfo;
    const hbk=document.getElementById("hiBack"); if(hbk) hbk.onclick=closeHeroInfo;
    const hi=document.getElementById("heroInfo"); if(hi) hi.addEventListener("pointerdown",(e)=>{ if(e.target===hi) closeHeroInfo(); }); }
  // 服裝店已移除（依需求）：所有服裝統一在通行證用點數兌換；舊 #costumeShop 彈窗保留於 DOM 但無入口(相容)
  { const cc=document.getElementById("costumeClose"); if(cc) cc.onclick=closeCostumeShop;
    const cs=document.getElementById("costumeShop"); if(cs) cs.addEventListener("pointerdown",(e)=>{ if(e.target===cs) closeCostumeShop(); }); }
  { const pb=document.getElementById("navPass"); if(pb) pb.onclick=()=>openPassShop("pass");
    const pc=document.getElementById("passClose"); if(pc) pc.onclick=closePassShop;
    const ps=document.getElementById("passShop"); if(ps) ps.addEventListener("pointerdown",(e)=>{ if(e.target===ps) closePassShop(); });   // 通行證開關
    document.querySelectorAll("#passTabs .pass-tab").forEach(b=> b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); passTab=b.dataset.pt; buildPassShop(); },{passive:false}));
    const dp=document.getElementById("dailyToPass"); if(dp) dp.onclick=()=>transition(()=>{ goLobby(); openPassShop("reward"); }); }
  document.getElementById("navUpg").onclick=()=>transition(goUpgrade);
  document.getElementById("upgBack").onclick=()=>transition(goLobby);
  document.getElementById("navDaily").onclick=()=>transition(goDaily);
  document.getElementById("dailyBack").onclick=()=>transition(goLobby);
  document.getElementById("navStats").onclick=()=>transition(goStats);
  document.getElementById("navSet").onclick=()=>transition(goSettings);
  document.getElementById("statsBack").onclick=()=>transition(goLobby);
  document.getElementById("setBack").onclick=()=>transition(goLobby);
  document.getElementById("setShare").onclick=()=>{ const url="https://jimmyliao.github.io/maxgame/"; if(navigator.share){ navigator.share({title:"守土 · 成為臺灣山林守護者", text:"一起來成為臺灣山林守護者，守護台灣特有種！", url}).catch(()=>{}); } else { try{ navigator.clipboard.writeText(url); }catch(e){} alert("遊戲連結已複製，分享給朋友一起守護台灣生態！\n"+url); } };
  window.__tx=transition;
  // ===== 守護神木 MOBA 模組接點（不改既有合約，只導出唯讀資訊與回大廳刷新） =====
  window.__featuredKey=()=> (HEROES[featured]&&HEROES[featured].key)||"leopard";
  window.__unlockedKeys=()=> HEROES.filter(h=>isHeroUnlocked(h.key)).map(h=>h.key);
  window.__heroList=()=> HEROES.filter(h=>isHeroUnlocked(h.key)).map(h=>({key:h.key,name:h.name}));   // 給好友大廳選角 UI 用的唯讀清單（不含鎖定角色）
  window.__drawCreature=drawCreature;   // 給好友大廳選角頭像用；簽名/畫法完全沿用鐵則內的 drawCreature，不另寫一份繪製邏輯
  window.__spriteOf=(k)=>{ const s2=SPRITES[k]; return (s2&&s2.naturalWidth>0)?s2:null; };   // 給對戰(moba)取立繪：動漫立繪直立顯示用
  window.__cosmeticOf=(key)=>{ try{ return cosEquipOf(key)||""; }catch(e){ return ""; } };   // 給對戰(moba)讀取某守護者裝備的服裝，讓買的裝飾在戰場也看得到
  window.__heroLevel=(key)=> heroLevel(key);   // 守護者等級（最高 50、永不退級）
  window.__heroTalent=(key)=> talentSummary(key);   // 天賦加成摘要：{path,pathName,tier,mods:{dmg,speed,spCd,dr},active}|null
  window.__awardEco=(n)=>{ gainEco(n); dailyBump("eco",n|0); refreshDailyNav(); };   // 賺保育值同時推進「賺取保育值」任務
  window.__getEco=()=> getEco();
  window.__conservationLevel=()=> Math.floor(getEcoEarned()/100)+1;   // 保育等級（跟結算頁公式一致，供其他模組讀取）
  window.__awardXP=(key,n)=>{ gainXP(key,n|0); };
  window.__bumpWin=()=>{ try{ localStorage.setItem("shoutu_wins",String(getWins()+1)); }catch(e){} dailyBump("win",1); refreshDailyNav(); };   // 打贏推進「打贏對戰」任務
  window.__taskBump=(id,n)=>{ dailyBump(id,n||1); refreshDailyNav(); };   // 給 moba 等模組推進指定任務（如擊敗大首領 boss）
  // 更新大廳導覽列「任務」徽章的可領取數；daily 畫面開著時一併重繪
  function refreshDailyNav(){ const cl=dailyClaimable(), nd=document.getElementById("navDaily"); if(nd) nd.textContent=cl>0?("📋 任務 ("+cl+")"):"📋 任務"; if(state==="daily") goDaily(); }
  window.__lobbyRefresh=()=>{ if(state==="lobby"){ updateLobby(); buildRoster(); resizeHeroShow(); } };
  window.addEventListener("keydown",(e)=>{ if(state==="play"){ if(e.key==="ArrowLeft"||e.key==="a")input.left=true; else if(e.key==="ArrowRight"||e.key==="d")input.right=true;
      else if(e.key==="ArrowUp"||e.key==="w"||e.code==="Space"){ e.preventDefault(); heroJump(); } else if(e.key==="j"||e.key==="Enter")heroAttack(); else if(e.key==="k"||e.key==="Shift")heroSpecial(); else if(e.key==="q"||e.key==="Tab"){ e.preventDefault(); swapHero(); } }
    else if(state==="story"&&e.code==="Space"){ e.preventDefault(); advance(); } });
  window.addEventListener("keyup",(e)=>{ if(e.key==="ArrowLeft"||e.key==="a")input.left=false; else if(e.key==="ArrowRight"||e.key==="d")input.right=false; });

  resize(); goLobby(); requestAnimationFrame(frame);
  if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }
})();

