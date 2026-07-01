/* 戰場商店 — 獨立模組（MOBA 對戰中花金幣買強化）
   刻意跟 src/moba.js 分開放，方便之後單獨討論/修改這個系統的規則、不用改到戰鬥核心程式碼。
   跟 moba.js 之間只透過 window.__ 橋接溝通，不直接碰對方的內部變數（沿用專案既有的跨模組慣例）：
   - moba.js 提供：window.__mobaPlayer()（目前玩家操控的守護者物件）、
     window.__mobaToast(msg)（彈提示文字）、window.__mobaFx(x,y)（購買成功的粒子+震動回饋）
   - 本檔案提供：window.__shopReset()（開新戰場時歸零）、window.__shopTick(dt)（每幀累積金幣+刷新面板）、
     window.__shopAddGold(n)（擊殺獎勵金幣） */
(() => {
  "use strict";
  const GOLD_RATE = 4;   // 每秒累積金幣，3~5 分鐘一場，數值刻意保持簡單好懂
  const UPGRADE_POOL = [
    { key:"dmg", icon:"⚔️", name:"猛擊", desc:"攻擊力 +18%", cost:35, apply:h=>{ h.dmg=Math.round(h.dmg*1.18); } },
    { key:"speed", icon:"💨", name:"疾風", desc:"移動速度 +12%", cost:35, apply:h=>{ h.speed=Math.round(h.speed*1.12); h.baseSpeed=h.speed; } },
    { key:"range", icon:"🎯", name:"廣域", desc:"攻擊距離 +15%", cost:40, apply:h=>{ h.range=Math.round(h.range*1.15); } },
    { key:"cdr", icon:"⏱️", name:"敏捷", desc:"技能冷卻 -12%", cost:45, apply:h=>{ h.spMax=Math.max(1.5,h.spMax*0.88); } },
    { key:"hp", icon:"❤️", name:"強韌", desc:"最大生命 +18%，立即回滿", cost:40, apply:h=>{ const add=Math.round(h.maxhp*0.18); h.maxhp+=add; h.hp=h.maxhp; } },
    { key:"lifesteal", icon:"🩸", name:"活力", desc:"攻擊附加生命偷取 +8%", cost:55, apply:h=>{ h.lifesteal=(h.lifesteal||0)+0.08; } },
    { key:"dr", icon:"🛡️", name:"堅甲", desc:"受到傷害 -8%", cost:55, apply:h=>{ h.dr=Math.min(0.6,(h.dr||0)+0.08); } },
    { key:"knock", icon:"🌀", name:"重擊", desc:"擊退幅度提升", cost:30, apply:h=>{ h.knockMul=(h.knockMul||1)+0.5; } },
  ];
  let gold=0, shopOpen=false, upgradeLevels={}, shopRefreshT=0;

  function upgradeCost(u){ const lv=upgradeLevels[u.key]||0; return Math.round(u.cost*Math.pow(1.55,lv)); }
  function toggleShop(force){ const panel=document.getElementById("mShop"); if(!panel) return;
    shopOpen=(force!==undefined)?force:!shopOpen; panel.classList.toggle("hide",!shopOpen); if(shopOpen) renderShop(); }
  function renderShop(){ const box=document.getElementById("mShopCards"); if(!box) return;
    box.innerHTML="";
    UPGRADE_POOL.forEach(u=>{ const lv=upgradeLevels[u.key]||0, cost=upgradeCost(u), afford=gold>=cost;
      const b=document.createElement("button"); b.className="mu-card"+(afford?"":" mu-disabled");
      b.innerHTML='<div class="mu-icon">'+u.icon+'</div><div class="mu-name">'+u.name+(lv>0?(' Lv.'+lv):'')+'</div>'+
        '<div class="mu-desc">'+u.desc+'</div><div class="mu-cost">💰'+cost+'</div>';
      b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); buyUpgrade(u); },{passive:false});
      box.appendChild(b); }); }
  function buyUpgrade(u){ const cost=upgradeCost(u); if(gold<cost) return;
    const player=window.__mobaPlayer && window.__mobaPlayer(); if(!player) return;
    gold-=cost; upgradeLevels[u.key]=(upgradeLevels[u.key]||0)+1;
    u.apply(player);
    if(window.__mobaFx) window.__mobaFx(player.x,player.y);
    if(window.__mobaToast) window.__mobaToast("🛒 購入「"+u.name+"」"+u.desc);
    renderShop(); }

  const tap=(id,fn)=>{ const e=document.getElementById(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); };
  tap("mShopBtn",()=>toggleShop());
  tap("mShopClose",()=>toggleShop(false));

  window.__shopReset=()=>{ gold=0; shopOpen=false; upgradeLevels={}; shopRefreshT=0;
    const panel=document.getElementById("mShop"); if(panel) panel.classList.add("hide"); };
  window.__shopTick=(dt)=>{ gold+=GOLD_RATE*dt;
    const g=document.getElementById("mGoldTxt"); if(g) g.textContent="💰"+Math.floor(gold);
    if(shopOpen){ shopRefreshT-=dt; if(shopRefreshT<=0){ shopRefreshT=0.3; renderShop(); } } };
  window.__shopAddGold=(n)=>{ gold+=n||0; };
})();
