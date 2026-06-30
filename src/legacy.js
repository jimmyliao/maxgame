import { TYPE, ADV, eff } from "./data/types-chart.js";

(() => {
  "use strict";

  /* ===== 寫實圖檔（sprite）載入：有圖用圖、沒圖 fallback 程式畫 ===== */
  const SPRITES={};
  const SPRITE_SRC={
    leopard:"assets/heroes/leopard.png", bear:"assets/heroes/bear.png",
    cicada:"assets/heroes/cicada.png", dragonfly:"assets/heroes/dragonfly.png",
    snail:"assets/bosses/snail.png", iguana:"assets/bosses/iguana.png",
    frog:"assets/bosses/frog.png", ibis:"assets/bosses/ibis.png"
  };
  function loadSprites(){ for(const k in SPRITE_SRC){ const img=new Image(); img.onload=()=>{ if(img.naturalWidth>0) SPRITES[k]=img; }; img.src=SPRITE_SRC[k]; } }
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
    if(kind==="leopard"){
      const rg=(x0,y0,r,a,b)=>{ const g=c.createRadialGradient(x0-r*0.35,y0-r*0.4,r*0.1,x0,y0,r); g.addColorStop(0,a); g.addColorStop(1,b); return g; };
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
      c.fillStyle="#2b2b2b"; c.beginPath(); c.ellipse(0,s*0.35,s*0.6,s*0.55,0,0,7); c.fill();
      c.fillStyle="#fafafa"; c.beginPath(); c.moveTo(-s*0.18,s*0.1); c.lineTo(0,s*0.5); c.lineTo(s*0.18,s*0.1); c.closePath(); c.fill();
      c.fillStyle="#2b2b2b"; c.beginPath(); c.arc(0,-s*0.28,s*0.5,0,7); c.fill();
      c.beginPath(); c.arc(-s*0.42,-s*0.55,s*0.18,0,7); c.arc(s*0.42,-s*0.55,s*0.18,0,7); c.fill();
      c.fillStyle="#8d6e63"; c.beginPath(); c.ellipse(0,-s*0.1,s*0.28,s*0.22,0,0,7); c.fill();
      c.fillStyle="#222"; c.beginPath(); c.ellipse(0,-s*0.18,s*0.09,s*0.07,0,0,7); c.fill();
      eye(-s*0.2,-s*0.34,s*0.09); eye(s*0.2,-s*0.34,s*0.09);
      if(mood==="angry"){ brow(-s*0.2,-s*0.48,s*0.12); brow(s*0.2,-s*0.48,s*0.12); }
    } else if(kind==="cicada"){
      c.fillStyle="rgba(220,240,200,.55)"; c.beginPath(); c.ellipse(-s*0.35,s*0.1,s*0.5,s*0.24,-0.5,0,7); c.fill();
      c.beginPath(); c.ellipse(s*0.35,s*0.1,s*0.5,s*0.24,0.5,0,7); c.fill();
      c.fillStyle="#7cb342"; c.beginPath(); c.ellipse(0,s*0.05,s*0.3,s*0.5,0,0,7); c.fill();
      c.fillStyle="#558b2f"; c.beginPath(); c.arc(0,-s*0.35,s*0.32,0,7); c.fill();
      eye(-s*0.2,-s*0.38,s*0.12); eye(s*0.2,-s*0.38,s*0.12);
      if(mood==="angry"){ brow(-s*0.2,-s*0.54,s*0.12); brow(s*0.2,-s*0.54,s*0.12); }
    } else if(kind==="dragonfly"){
      c.fillStyle="rgba(180,235,245,.5)"; for(const a of [-0.6,0.6,-1.0,1.0]){ c.save(); c.rotate(a); c.beginPath(); c.ellipse(s*0.45,0,s*0.42,s*0.13,0,0,7); c.fill(); c.restore(); }
      c.fillStyle="#26c6da"; c.beginPath(); c.ellipse(0,s*0.2,s*0.13,s*0.6,0,0,7); c.fill();
      c.fillStyle="#00acc1"; c.beginPath(); c.arc(0,-s*0.42,s*0.26,0,7); c.fill();
      eye(-s*0.16,-s*0.46,s*0.14); eye(s*0.16,-s*0.46,s*0.14);
      if(mood==="angry"){ brow(-s*0.16,-s*0.62,s*0.12); brow(s*0.16,-s*0.62,s*0.12); }
    } else if(kind==="snail"){
      c.fillStyle="#c79a6b"; c.beginPath(); c.ellipse(-s*0.15,s*0.35,s*0.5,s*0.28,0,0,7); c.fill();
      c.fillStyle="#8d5524"; c.beginPath(); c.arc(s*0.15,-s*0.05,s*0.42,0,7); c.fill();
      c.strokeStyle="#5d3a17"; c.lineWidth=s*0.06; c.beginPath();
      for(let a=0;a<7;a+=0.2){ const rr=s*0.05*a,px=s*0.15+Math.cos(a*1.6)*rr,py=-s*0.05+Math.sin(a*1.6)*rr; a===0?c.moveTo(px,py):c.lineTo(px,py);} c.stroke();
      c.strokeStyle="#c79a6b"; c.lineWidth=s*0.05; c.beginPath(); c.moveTo(-s*0.4,s*0.2); c.lineTo(-s*0.52,-s*0.15); c.moveTo(-s*0.28,s*0.18); c.lineTo(-s*0.34,-s*0.18); c.stroke();
      c.fillStyle="#222"; c.beginPath(); c.arc(-s*0.52,-s*0.17,s*0.06,0,7); c.arc(-s*0.34,-s*0.2,s*0.06,0,7); c.fill();
      brow(-s*0.45,-s*0.3,s*0.1);
    } else if(kind==="iguana"){
      c.fillStyle="#7cb342"; c.beginPath(); c.ellipse(0,s*0.3,s*0.58,s*0.32,0,0,7); c.fill();
      c.strokeStyle="#558b2f"; c.lineWidth=s*0.14; c.beginPath(); c.moveTo(s*0.5,s*0.35); c.quadraticCurveTo(s*0.95,s*0.3,s*1.0,0); c.stroke();
      c.fillStyle="#689f38"; for(let i=-2;i<=3;i++){ c.beginPath(); c.moveTo(i*s*0.16,0); c.lineTo(i*s*0.16+s*0.05,-s*0.16); c.lineTo(i*s*0.16+s*0.1,0); c.fill(); }
      c.fillStyle="#7cb342"; c.beginPath(); c.ellipse(-s*0.5,s*0.15,s*0.3,s*0.26,0,0,7); c.fill();
      c.fillStyle="#aed581"; c.beginPath(); c.ellipse(-s*0.55,s*0.4,s*0.16,s*0.12,0,0,7); c.fill();
      eye(-s*0.6,s*0.05,s*0.1); brow(-s*0.6,-s*0.08,s*0.1);
    } else if(kind==="frog"){
      c.fillStyle="#8d6e63"; c.beginPath(); c.ellipse(0,s*0.3,s*0.55,s*0.42,0,0,7); c.fill();
      c.fillStyle="#6d4c41"; for(const p of [[-.3,.45],[.3,.45],[-.1,.55],[.15,.3]]){ c.beginPath(); c.arc(p[0]*s,p[1]*s,s*0.07,0,7); c.fill(); }
      c.fillStyle="#a1887f"; c.beginPath(); c.arc(-s*0.28,-s*0.18,s*0.2,0,7); c.arc(s*0.28,-s*0.18,s*0.2,0,7); c.fill();
      eye(-s*0.28,-s*0.2,s*0.13); eye(s*0.28,-s*0.2,s*0.13);
      if(mood!=="happy"){ brow(-s*0.28,-s*0.38,s*0.13); brow(s*0.28,-s*0.38,s*0.13); }
    } else if(kind==="ibis"){
      c.fillStyle="#fafafa"; c.beginPath(); c.ellipse(0,s*0.25,s*0.5,s*0.4,0,0,7); c.fill();
      c.fillStyle="#222"; c.beginPath(); c.arc(-s*0.2,-s*0.3,s*0.26,0,7); c.fill();
      c.strokeStyle="#222"; c.lineWidth=s*0.08; c.beginPath(); c.moveTo(-s*0.4,-s*0.28); c.quadraticCurveTo(-s*0.85,-s*0.2,-s*0.8,s*0.15); c.stroke();
      eye(-s*0.18,-s*0.34,s*0.08); brow(-s*0.18,-s*0.46,s*0.1);
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
    { key:"leopard", name:"石虎", type:"forest", speed:235, atkDmg:7, atkCd:0.33, reach:64, spName:"突刺", spCd:4.5,
      status:"瀕危・保育類", fact:"台灣唯一的原生貓科動物，夜行性，全台僅存數百隻，棲地破碎與路殺是最大威脅。" },
    { key:"bear", name:"黑熊", type:"forest", speed:160, atkDmg:12, atkCd:0.6, reach:78, spName:"震地", spCd:6.0,
      status:"瀕危・保育類", fact:"台灣唯一原生熊類，胸前有 V 形白斑（月熊）。森林的傘護種，保護牠就保護整片山林。" },
    { key:"cicada", name:"爺蟬", type:"bug", speed:185, atkDmg:6, atkCd:0.4, reach:60, spName:"音波", spCd:5.0,
      status:"台灣特有", fact:"台灣體型最大的蟬之一，鳴聲宏亮可傳數百公尺。幼蟲在地下生活多年才羽化。" },
    { key:"dragonfly", name:"勾蜓", type:"sky", speed:265, atkDmg:6, atkCd:0.3, reach:60, spName:"疾風", spCd:4.5,
      status:"保育類", fact:"無霸勾蜓是台灣最大的蜻蜓，飛行迅速，是乾淨溪流與濕地的指標生物。" },
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
        resultScr=document.getElementById("result"), storyScr=document.getElementById("story"), dexScr=document.getElementById("dex");
  const bSp=document.getElementById("bSp"), bSwap=document.getElementById("bSwap");
  const lobbyScr=document.getElementById("lobby");
  const heroShow=document.getElementById("heroShow"), hctx=heroShow.getContext("2d");
  const LOBBY_TAG={ leopard:"台灣唯一原生貓科 · 夜行獵手", bear:"台灣唯一原生熊 · 森林守護者", cicada:"台灣最大的蟬 · 鳴聲震場", dragonfly:"台灣最快的蜻蜓 · 空中獵手" };
  // 保育行動知識（玩中學）
  const CONS_END={ leopard:"開車經過淺山請減速，避免路殺石虎。", bear:"登山不留廚餘、不餵食野生動物。", cicada:"保留老樹與森林，就是保留昆蟲的家。", dragonfly:"別污染溪流濕地，牠們是水質好壞的指標。" };
  const CONS_INV={ snail:"看到福壽螺的粉紅色卵塊，撥落水中可阻止孵化。", iguana:"養寵物請養到底——綠鬣蜥是因棄養才氾濫的。", frog:"不要隨意放生，外來蛙會排擠台灣原生種。", ibis:"發現外來入侵種，可通報林業保育署協助移除。" };
  let featured=0, hsW=0, hsH=0;
  function getEco(){ try{ return parseInt(localStorage.getItem("shoutu_eco")||"0",10)||0; }catch(e){ return 0; } }
  function setEco(v){ try{ localStorage.setItem("shoutu_eco",String(v)); }catch(e){} }

  let W=0,H=0,GY=0,dpr=1;
  function resize(){ const r=canvas.getBoundingClientRect(); W=r.width; H=r.height; GY=H*0.82;
    dpr=Math.min(window.devicePixelRatio||1,2); canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  window.addEventListener("resize",resize);
  function getUnlocked(){ try{ return parseInt(localStorage.getItem("shoutu_unlocked")||"0",10)||0; }catch(e){ return 0; } }
  function setUnlocked(v){ try{ localStorage.setItem("shoutu_unlocked",String(v)); }catch(e){} }

  /* ===== 狀態 ===== */
  let state="title", chapter=0, elapsed=0, shake=0;
  let matchMode=false, matchLevel=1, hitstop=0;
  let hero, heroDef, boss, team, active, projs, fx, floaters, parts;
  const GRAV=1700, JUMP=-620;
  const input={ left:false, right:false };

  function show(scr){ [titleScr,mapScr,resultScr,dexScr,lobbyScr].forEach(s=>s.classList.add("hide")); storyScr.classList.add("hide"); if(scr) scr.classList.remove("hide"); }
  function setBattleUI(on){ dock.classList.toggle("hide",!on); }
  function goTitle(){ state="title"; setBattleUI(false); show(titleScr); }

  /* ===== 大廳 Lobby ===== */
  function resizeHeroShow(){ const r=heroShow.getBoundingClientRect(); hsW=r.width; hsH=r.height;
    const d=Math.min(window.devicePixelRatio||1,2); heroShow.width=Math.round(hsW*d); heroShow.height=Math.round(hsH*d); hctx.setTransform(d,0,0,d,0,0); }
  function buildRoster(){ const wrap=document.getElementById("roster"); wrap.innerHTML="";
    HEROES.forEach((h,i)=>{ const b=document.createElement("button"); b.className="rb"+(i===featured?" sel":"");
      const cv=document.createElement("canvas"); cv.width=116; cv.height=116; b.appendChild(cv);
      drawCreature(cv.getContext("2d"), h.key, 58, 64, 40, {t:0});
      b.onclick=()=>{ featured=i; updateLobby(); }; wrap.appendChild(b); }); }
  function updateLobby(){ const h=HEROES[featured];
    document.getElementById("hsName").textContent=h.name;
    document.getElementById("hsType").textContent=TYPE[h.type];
    document.getElementById("hsTag").textContent=LOBBY_TAG[h.key]||h.status;
    document.getElementById("ecoVal").textContent=getEco();
    document.getElementById("trophyVal").textContent=Math.floor(getEco()/100)+1;
    [...document.querySelectorAll("#roster .rb")].forEach((b,i)=>b.classList.toggle("sel",i===featured)); }
  function goLobby(){ state="lobby"; setBattleUI(false); show(lobbyScr); buildRoster(); updateLobby(); resizeHeroShow(); }
  const TICKERS=["🌿 石虎全台僅存數百隻，路殺是最大威脅之一","🐻 台灣黑熊胸前的白色 V 是月亮的印記","💧 福壽螺來自南美，是稻田的大害","🦎 綠鬣蜥棄養野化，正衝擊南部生態","🕊 埃及聖䴉搶佔黑面琵鷺的濕地","🪲 爺蟬幼蟲在地下蟄伏多年才羽化"];
  function drawLobby(ts){ if(!hsW) resizeHeroShow(); if(!hsW) return;
    const g=hctx, Wd=hsW, Hd=hsH, tt=ts/1000;
    // 霓虹黃昏天空
    const sky=g.createLinearGradient(0,0,0,Hd); sky.addColorStop(0,"#15233f"); sky.addColorStop(.4,"#244b5e"); sky.addColorStop(.68,"#3f7a4e"); sky.addColorStop(1,"#1d5a2b");
    g.fillStyle=sky; g.fillRect(0,0,Wd,Hd);
    // 月亮光暈
    const moon=g.createRadialGradient(Wd*0.76,Hd*0.15,4,Wd*0.76,Hd*0.15,Hd*0.2); moon.addColorStop(0,"rgba(255,247,210,0.95)"); moon.addColorStop(.3,"rgba(255,240,180,0.5)"); moon.addColorStop(1,"rgba(255,240,180,0)");
    g.fillStyle=moon; g.fillRect(0,0,Wd,Hd);
    // 星 / 螢火
    for(let i=0;i<46;i++){ const x=(i*89.7)%Wd, y=(i*47.3)%(Hd*0.52); const tw=0.4+0.6*(0.5+0.5*Math.sin(tt*2+i*1.3)); g.globalAlpha=tw*0.8; g.fillStyle=i%5===0?"#fff59d":"#ffffff"; g.beginPath(); g.arc(x,y,i%7===0?1.8:1.1,0,7); g.fill(); }
    g.globalAlpha=1;
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
    // 台座
    const py=Hd*0.7, pr=Math.min(Wd,Hd)*0.24;
    g.fillStyle="rgba(0,0,0,0.34)"; g.beginPath(); g.ellipse(Wd/2,py,pr,pr*0.22,0,0,7); g.fill();
    g.strokeStyle="rgba(255,213,79,0.65)"; g.lineWidth=3; g.beginPath(); g.ellipse(Wd/2,py,pr,pr*0.22,0,0,7); g.stroke();
    g.strokeStyle="rgba(255,213,79,0.22)"; g.lineWidth=2; g.beginPath(); g.ellipse(Wd/2,py,pr*1.25,pr*0.28,0,0,7); g.stroke();
    // 角色（站台座上）+ 脈動光環
    const s=Math.min(Wd,Hd)*0.2, h=HEROES[featured], cy=py-s*0.62, pl=0.5+0.5*Math.sin(tt*2);
    const aura=g.createRadialGradient(Wd/2,cy,s*0.2,Wd/2,cy,s*1.8);
    aura.addColorStop(0,"rgba(255,228,130,"+(0.22+0.18*pl).toFixed(3)+")"); aura.addColorStop(1,"rgba(255,228,130,0)");
    g.fillStyle=aura; g.beginPath(); g.arc(Wd/2,cy,s*1.8,0,7); g.fill();
    g.save(); g.translate(Wd/2,cy); g.rotate(Math.sin(tt*1.2)*0.05); const sc=1+0.035*Math.sin(tt*2.2); g.scale(sc,sc);
    drawCreature(g, h.key, 0, 0, s, {t:tt, mood:"happy"}); g.restore();
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
    elapsed=0; shake=0; hitstop=0; projs=[]; fx=[]; floaters=[]; parts=[]; input.left=input.right=false;
    // 隊伍：配對戰可用全部 4 隻；戰役則用已解鎖的
    const cnt = matchMode ? HEROES.length : Math.min(HEROES.length, getUnlocked()+1);
    team=[]; for(let k=0;k<cnt;k++) team.push({idx:k, hp:100, maxhp:100, fainted:false});
    active = matchMode ? Math.min(featured, team.length-1) : Math.min(c.hero, team.length-1);
    hero={ x:W*0.22, y:GY-28, vy:0, onGround:true, face:1, hp:100, maxhp:100, atkT:0, atkCd:0, atkHit:false, spCd:0, invuln:0, hitT:0, dashT:0, dashDir:1, foot:28, key:"leopard", type:"forest" };
    loadActive(active,true);
    const b=c.boss, hpS=matchMode?(0.7+matchLevel*0.18):1, dmgS=matchMode?(0.8+matchLevel*0.08):1;
    boss={ kind:b.kind, name:b.name+(matchMode?(" ★"+matchLevel):""), type:b.type, x:W*0.78, y:GY-b.r*0.7, vy:0, onGround:true, face:-1,
      hp:Math.round(b.hp*hpS), maxhp:Math.round(b.hp*hpS), r:b.r, dmg:Math.round(b.dmg*dmgS), foot:b.r*0.7, st:"idle", t:1.0, stun:0, danger:false, atk:null, hitT:0 };
    bSwap.style.display = team.length>1 ? "flex" : "none";
    updateSp();
  }
  function loadActive(i,instant){ active=i; const m=team[i]; heroDef=HEROES[m.idx];
    hero.key=heroDef.key; hero.type=heroDef.type; hero.maxhp=m.maxhp; hero.hp=m.hp;
    hero.atkT=0; hero.atkCd=0; hero.atkHit=false; hero.spCd=0; hero.dashT=0; hero.invuln=Math.max(hero.invuln, instant?0.3:0.7); updateSp(); }
  function saveActive(){ if(team&&team[active]) team[active].hp=hero.hp; }
  function nextAlive(from){ for(let k=1;k<=team.length;k++){ const j=(from+k)%team.length; if(!team[j].fainted) return j; } return -1; }
  function swapHero(){ if(state!=="play"||team.length<2) return; const j=nextAlive(active); if(j<0||j===active) return; saveActive(); loadActive(j); flo(hero.x,hero.y-52,HEROES[team[j].idx].name+"上!","#80deea"); }

  /* ===== 英雄動作 ===== */
  function heroAttack(){ if(state!=="play"||hero.atkCd>0||hero.dashT>0) return; hero.atkT=0.22; hero.atkCd=heroDef.atkCd; hero.atkHit=false; hero.x+=hero.face*10; }
  function heroJump(){ if(state!=="play"||!hero.onGround) return; hero.vy=JUMP; hero.onGround=false; }
  function heroSpecial(){ if(state!=="play"||hero.spCd>0) return; const k=hero.key; hero.spCd=heroDef.spCd;
    if(k==="leopard"||k==="dragonfly"){ hero.dashT=(k==="dragonfly")?0.34:0.26; hero.dashDir=hero.face; hero.invuln=Math.max(hero.invuln,hero.dashT+0.05); hero.spDmg=(k==="dragonfly")?24:20; hero.spHit=false; flo(hero.x,hero.y-50,heroDef.spName+"!","#fff59d"); }
    else if(k==="bear"){ hero.vy=JUMP*0.7; hero.slamPending=true; flo(hero.x,hero.y-50,"震地!","#fff59d"); }
    else if(k==="cicada"){ projs.push({from:"hero",x:hero.x+hero.face*30,y:hero.y-20,vx:hero.face*460,vy:0,r:18,dmg:16,stun:true,life:1.6,kind:"sonic"}); flo(hero.x,hero.y-50,"音波!","#fff59d"); }
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
    if(hero.atkT>0 && !hero.atkHit){ const gap=Math.abs(hero.x-boss.x)-boss.r; const facing=(boss.x-hero.x)*hero.face>=0; if(gap<heroDef.reach && facing){ hitBoss(heroDef.atkDmg); hero.atkHit=true; } }
    if(hero.dashT>0 && !hero.spHit && (hero.key==="leopard"||hero.key==="dragonfly")){ if(Math.abs(hero.x-boss.x)<boss.r+26){ hitBoss(hero.spDmg); hero.spHit=true; } }
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
  }
  function updateSp(){ const r=Math.max(0,hero?hero.spCd:0); const cd=heroDef?heroDef.spCd:5; bSp.querySelector(".fill").style.height=(r/cd*100)+"%"; bSp.classList.toggle("ready", r<=0); }

  function winChapter(){ if(state!=="play")return;
    if(matchMode){ state="post"; setBattleUI(false); const gain=matchLevel*10; setEco(getEco()+gain);
      const tip="🌱 <b>你可以這樣幫：</b><br>"+CONS_INV[boss.kind]+"<br>"+CONS_END[HEROES[featured].key];
      showResult("🛡️ 驅逐成功！", boss.name+" 被擊退，棲地 +"+gain+" 保育值", tip, "⚔ 再來一場", quickMatch); return; }
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
    showResult("全隊被擊倒了…", CH[chapter].boss.name+"太強了", "撐住！等魔王出招『後』再反擊；按『換手』用屬性剋制牠（🌲>💧>🌪>🪲>🌲）。", "再挑戰一次", ()=>startChapter(chapter)); }
  function showResult(title,sub,body,mainTxt,mainFn){ state="result"; show(resultScr);
    document.getElementById("rTitle").textContent=title; document.getElementById("rSub").textContent=sub;
    document.getElementById("rBody").innerHTML=body; const mb=document.getElementById("rMain"); mb.textContent=mainTxt; mb.onclick=()=>transition(mainFn); }
  function flo(x,y,txt,col){ floaters.push({x,y,txt,col,life:0.8}); }
  // 碰撞/打擊：火花爆發 + 衝擊環
  function burst(x,y,n,col,power){ power=power||1; for(let i=0;i<n;i++){ const a=Math.random()*6.283, sp=(70+Math.random()*200)*power; parts.push({type:"spark",x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-70,life:0.3+Math.random()*0.25,max:0.55,r:1.4+Math.random()*2.6,col}); } if(parts.length>240) parts.splice(0,parts.length-240); }
  function ringAt(x,y,col,maxr){ parts.push({type:"ring",x,y,life:0.28,max:0.28,r0:6,r1:maxr||40,col}); }

  /* ===== 背景 ===== */
  function paintBackground(c,w,h,bg){ let top="#1b5e20",bot="#33691e";
    if(bg==="paddy"){top="#cfe8a0";bot="#9ccc65";} else if(bg==="hill"){top="#a5d6a7";bot="#66946a";}
    else if(bg==="stream"){top="#9fd8f0";bot="#4fa6c9";} else if(bg==="wetland"){top="#a7d7cf";bot="#5a9a8f";}
    const g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,top); g.addColorStop(1,bot); c.fillStyle=g; c.fillRect(0,0,w,h);
    c.globalAlpha=0.18; c.fillStyle="#2e7d32"; c.beginPath(); c.moveTo(0,h*0.62); c.quadraticCurveTo(w*0.3,h*0.46,w*0.55,h*0.6); c.quadraticCurveTo(w*0.8,h*0.72,w,h*0.55); c.lineTo(w,h); c.lineTo(0,h); c.fill(); c.globalAlpha=1; }
  function drawGround(){ ctx.fillStyle="#5d4037"; ctx.fillRect(0,GY,W,H-GY); ctx.fillStyle="#6d4c41"; ctx.fillRect(0,GY,W,6);
    ctx.strokeStyle="rgba(0,0,0,.12)"; ctx.lineWidth=2; for(let x=0;x<W;x+=28){ ctx.beginPath(); ctx.moveTo(x,GY+12); ctx.lineTo(x+10,GY+12); ctx.stroke(); } }

  /* ===== 繪製 ===== */
  function hpBar(x,y,w,frac,col,name){ ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(x,y,w,14); ctx.fillStyle=col; ctx.fillRect(x,y,w*Math.max(0,frac),14);
    ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=2; ctx.strokeRect(x,y,w,14); ctx.fillStyle="#fff"; ctx.font="bold 12px sans-serif"; ctx.textBaseline="alphabetic"; ctx.fillText(name,x,y-5); }
  function draw(){ ctx.save(); if(shake>0) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    paintBackground(ctx,W+1,H+1,CH[chapter]?CH[chapter].bg:"paddy"); drawGround();
    for(const p of projs){ if(p.from==="bossWave"){ ctx.fillStyle="rgba(180,120,80,.6)"; ctx.beginPath(); ctx.ellipse(p.x,GY-6,p.r,p.r*0.5,0,0,7); ctx.fill(); }
      else if(p.from==="boss"){ ctx.fillStyle="#7e57c2"; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); }
      else if(p.kind==="sonic"){ ctx.strokeStyle="rgba(174,213,129,.9)"; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(p.x,p.y,16,0,7); ctx.stroke(); } }
    ctx.textAlign="center"; ctx.textBaseline="middle";
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
  document.getElementById("navReset").onclick=()=>{ setUnlocked(0); updateLobby(); };
  window.__tx=transition;
  window.addEventListener("keydown",(e)=>{ if(state==="play"){ if(e.key==="ArrowLeft"||e.key==="a")input.left=true; else if(e.key==="ArrowRight"||e.key==="d")input.right=true;
      else if(e.key==="ArrowUp"||e.key==="w"||e.code==="Space"){ e.preventDefault(); heroJump(); } else if(e.key==="j"||e.key==="Enter")heroAttack(); else if(e.key==="k"||e.key==="Shift")heroSpecial(); else if(e.key==="q"||e.key==="Tab"){ e.preventDefault(); swapHero(); } }
    else if(state==="story"&&e.code==="Space"){ e.preventDefault(); advance(); } });
  window.addEventListener("keyup",(e)=>{ if(e.key==="ArrowLeft"||e.key==="a")input.left=false; else if(e.key==="ArrowRight"||e.key==="d")input.right=false; });

  resize(); goLobby(); requestAnimationFrame(frame);
  if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }
})();

