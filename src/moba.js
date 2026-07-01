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
                 snail:"#b6884a", iguana:"#54b24a", frog:"#82b24c", ibis:"#e3e9ec", anole:"#8a6a3c",
                 muntjac:"#b8703f", macaque:"#b08f56", salmon:"#3a8a9e", pheasant:"#2a3a7a",
                 // 新增守護者：穿山甲(土黃鱗甲)、黃喉貂(深褐配鮮黃喉)、帝雉(深藍黑金屬光)
                 pangolin:"#b78a4a", yellowmarten:"#5a3c22", mikado:"#26386a",
                 // 新增外來入侵種：海蟾蜍(棕疣毒腺)、緬甸蟒(黃棕網紋)、多線南蜥(古銅褐帶縱紋)
                 canetoad:"#8a6a44", python:"#b79a54", skink:"#7a6a4a" };
  const KNAME = { leopard:"石虎", bear:"黑熊", cicada:"爺蟬", dragonfly:"勾蜓", deer:"梅花鹿", magpie:"藍鵲",
                  snail:"福壽螺", iguana:"綠鬣蜥", frog:"斑腿蛙", ibis:"聖䴉", anole:"沙氏變色蜥",
                  muntjac:"山羌", macaque:"台灣獼猴", salmon:"櫻花鉤吻鮭", pheasant:"藍腹鷴",
                  pangolin:"穿山甲", yellowmarten:"黃喉貂", mikado:"帝雉",
                  canetoad:"海蟾蜍", python:"緬甸蟒", skink:"多線南蜥" };
  // 新增外來入侵種真實生態危害科普（擊殺 toast / 圖鑑用）
  const KFACT = { canetoad:"海蟾蜍全身毒腺，2021 年在台中爆發，毒液會毒死捕食牠的原生蛇類與犬貓！",
                  python:"緬甸蟒是世界最大蛇類之一，纏繞絞殺獵物，會吞食鳥類與哺乳類，破壞在地食物鏈！",
                  skink:"多線南蜥繁殖力驚人、與原生蜥蜴競爭棲地與食物，已在南台灣大量擴散！" };
  const GUARDIANS = ["leopard","bear","dragonfly","magpie","deer","cicada","muntjac","macaque","salmon","pheasant","pangolin","yellowmarten","mikado"];
  const INVADERS  = ["iguana","snail","frog","ibis","canetoad","python","skink"];
  // 各物種體型/身形（讓每隻一眼就不同：大小、身體長寬比）
  const KCFG = {
    leopard:{sz:1.02, long:1.16, wide:0.60}, bear:{sz:1.34, long:0.94, wide:1.02},
    deer:{sz:1.18, long:1.16, wide:0.50},    dragonfly:{sz:0.82, long:1.35, wide:0.24},
    cicada:{sz:0.90, long:0.88, wide:0.52},   magpie:{sz:0.96, long:1.00, wide:0.56},
    iguana:{sz:1.14, long:1.38, wide:0.46},   snail:{sz:1.04, long:0.92, wide:0.74},
    frog:{sz:1.08, long:0.80, wide:1.02},     ibis:{sz:1.12, long:1.02, wide:0.60},
    anole:{sz:0.70, long:1.22, wide:0.38},
    muntjac:{sz:0.88, long:1.02, wide:0.46},   macaque:{sz:0.96, long:0.92, wide:0.62},
    salmon:{sz:1.0, long:1.5, wide:0.36},     pheasant:{sz:1.02, long:1.06, wide:0.58},
    // 穿山甲：厚實拱背坦克；黃喉貂：細長流線刺客；帝雉：雉科水滴身+極長尾
    pangolin:{sz:1.16, long:1.12, wide:0.72},  yellowmarten:{sz:0.9, long:1.34, wide:0.42}, mikado:{sz:1.04, long:1.06, wide:0.58},
    // 海蟾蜍：矮胖蹲姿；緬甸蟒：極細長蛇身；多線南蜥：細長蜥蜴（比沙氏稍大）
    canetoad:{sz:1.18, long:0.82, wide:1.06},  python:{sz:1.05, long:2.6, wide:0.30}, skink:{sz:0.84, long:1.32, wide:0.36}
  };
  const kcfg=(k)=>KCFG[k]||{sz:1,long:1,wide:0.74};
  // 腹部/次要色（胸腹、臉、內側較淺或另一色，讓每隻更接近真實）
  const KBELLY = { leopard:"#f4ecdc", bear:"#efe8df", deer:"#f0e2ca", muntjac:"#e6d3ba",
                   macaque:"#e8b3a2", magpie:"#f5f7fb", pheasant:"#e2e8f4", salmon:"#eef3f4",
                   iguana:"#bde486", frog:"#e8e8b6", ibis:"#ffffff", anole:"#cfbb8c",
                   snail:"#d9c288", cicada:"#cbe0af", dragonfly:"#c3f0f0",
                   pangolin:"#e0c48a", yellowmarten:"#ffe066", mikado:"#dfe6f2",
                   canetoad:"#d8c39a", python:"#e6d49a", skink:"#c8b48c" };
  // 花紋 / 斑點色（清楚可讀、真實物種）
  const KPAT = { leopard:"#2a1808", bear:"#f2ece3", deer:"#fcf5e8", muntjac:"#38220f",
                 macaque:"#6b5334", magpie:"#c0392b", pheasant:"#f2f5fb", salmon:"#ec7386",
                 iguana:"#2d6822", frog:"#233815", ibis:"#161616", anole:"#382810",
                 snail:"#78521f", cicada:"#38581f",
                 pangolin:"#6a4a22", yellowmarten:"#e0a81f", mikado:"#f2f5fb",
                 canetoad:"#4a3620", python:"#5a3d1a", skink:"#3a2c18" };
  const kbelly=(k)=>KBELLY[k]||"#eadfce", kpat=(k)=>KPAT[k]||"#2c1c0c";
  // 圖檔優先：放 assets/top/<kind>.png(俯視角、面向右、去背)就自動改用寫實圖，沒有就用程式圖
  const SPRITES_TOP={};
  ["leopard","bear","cicada","dragonfly","deer","magpie","snail","iguana","frog","ibis","anole","muntjac","macaque","salmon","pheasant","pangolin","yellowmarten","mikado"].forEach(k=>{
    try{ const im=new Image(); im.onload=()=>{ if(im.naturalWidth>0) SPRITES_TOP[k]=im; }; im.onerror=()=>{}; im.src="assets/top/"+k+".png"; }catch(e){} });

  /* ---------- 視窗 / 世界 ---------- */
  let VW=0, VH=0, dpr=1, rot=false;
  const MW=2000, MH=1500;
  // 只有手機/平板才強制橫向；電腦瀏覽器不管視窗形狀都維持原生直式，不套用旋轉戲法
  const isMobileDevice=()=>/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent||"");
  function resize(){ const iw=window.innerWidth, ih=window.innerHeight;
    rot = isMobileDevice() && ih>iw;          // 直握手機 → 旋轉成橫向
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
  let player=null, spawnT=0, restore=0, killCount=0, surgeT=45, finalAssault=false, mshake=0, eliteFlash=0;
  // 「大作」打擊感：hitStop=命中瞬間短暫凍結模擬(freeze frame)增加重量感；bossIntro=首領登場電影運鏡橫幅
  let hitStop=0, bossIntro=null;
  function freeze(t){ hitStop=Math.max(hitStop,t); }   // 命中定格：暫停模擬幾十毫秒，畫面照渲染
  let combo=0, comboT=0, comboBest=0, comboPop=0;   // 連擊系統：短時間內連續驅逐入侵種會疊加，逾時歸零
  // 撿拾式必殺技：地圖四周散落「守護之力」能量球，玩家走過去撿起後才能施放超強範圍必殺，用完冷卻很久（要再撿一顆）
  let relics=[], relicSpawnT=0;
  const RELIC_MAX=3, RELIC_SPAWN=13, RELIC_R=22, ULT_CD=24;   // 節奏調快：每 13 秒補一顆守護之力、施放後 24 秒冷卻，讓必殺高光時刻更頻繁
  // 戰場商店（金幣/購買強化）已抽成獨立模組 src/battleshop.js，這裡只透過 window.__shopXxx 呼叫生命週期鉤子
  let pickMode="normal", timeAttack=false;
  let battleRegion="paddy", healthBonus=0;   // 復育↔對戰核心循環：戰場棲地健康度影響數值加成
  // 好友連線（選用）：netRole=null 純單機（預設，行為完全不變）；"host" 本機模擬+定期廣播；"guest" 不跑模擬，只接收快照渲染+送出操控
  let netRole=null, netBroadcastT=0, netLastRecvT=0, netStale=false;
  // 多人連線：host 端把每個好友 uid 對應到牠操控的守護者(netGuestByUid)、各自的搖桿輸入(netGuestInputs)；
  // netMyUid=本機玩家 uid（host/guest 都設），guest 端靠它從快照的 h.ctrl 認出「哪一隻是我」。
  let netMyUid=null, netPendingGuests=[], netGuestByUid={}, netGuestInputs={};
  const NET_BROADCAST_MS=130, NET_TIMEOUT_MS=6000;
  const REGION_LABEL={ paddy:"稻田", hill:"淺山", stream:"溪流", wetland:"濕地" };

  /* ---------- 晝夜 / 氣候戰場系統：每場開戰隨機挑一種天候，疊加在既有屬性相剋之上 ---------- */
  const WEATHER_KEYS=["sunny","night","cold","storm"];
  const WEATHER_INFO={
    sunny:{icon:"☀",name:"晴天"}, night:{icon:"🌙",name:"夜間"}, cold:{icon:"❄",name:"寒流"}, storm:{icon:"🌧",name:"暴雨"} };
  let weatherBattle="sunny", weatherFx=[];   // weatherFx：雨滴/雪花等天候粒子（獨立於 fx，硬上限＋回收）
  const COLD_BLOODED=["cicada","frog"];      // 變溫動物：寒流中行動遲緩
  const FLYERS_KIND=["dragonfly","magpie","ibis"]; // 空中活動物種：暴雨中命中率下降
  function pickWeather(){
    // 可重現的隨機挑選，現實時段當偏好權重（不硬綁死，方便測試/好玩）
    const hr=new Date().getHours(), weights=WEATHER_KEYS.map(k=>{
      if(k==="night") return (hr>=19||hr<6)?2.2:0.7;
      if(k==="sunny") return (hr>=9&&hr<17)?1.6:0.9;
      return 1; });
    const sum=weights.reduce((a,b)=>a+b,0); let roll=Math.random()*sum;
    for(let i=0;i<WEATHER_KEYS.length;i++){ roll-=weights[i]; if(roll<=0) return WEATHER_KEYS[i]; }
    return "sunny"; }
  function weatherToast(){
    if(weatherBattle==="night") toast("🌙 夜間戰場！石虎夜襲加成生效（攻擊+閃避 +20%）");
    else if(weatherBattle==="cold") toast("❄ 寒流來襲！變溫動物（爺蟬／樹蛙）行動遲緩");
    else if(weatherBattle==="storm") toast("🌧 暴雨戰場！空中守護者／入侵種命中率下降");
    else toast("☀ 晴天戰場・一切如常"); }
  function evadeRoll(u){ return u.kind==="leopard"&&weatherBattle==="night"&&Math.random()<0.20; } // 石虎夜間閃避
  function weatherAtkMul(u){ return (u.kind==="leopard"&&weatherBattle==="night")?1.2:1; }
  function weatherSpeedMul(k){ if(weatherBattle==="cold"&&COLD_BLOODED.indexOf(k)>=0) return 0.75; return 1; }
  function weatherMissRoll(k){ return weatherBattle==="storm"&&FLYERS_KIND.indexOf(k)>=0&&Math.random()<0.18; }

  /* ---------- 生物防治鏈：原生種剋制特定外來種的額外傷害倍率（疊加在大屬性相剋之上） ---------- */
  // 石虎會捕食小型爬蟲類 → 對綠鬣蜥／沙氏變色蜥加成；藍鵲主動驅趕護巢、黑熊體型壓制 → 對埃及聖䴉加成
  const ECO_CHAIN={ leopard:{iguana:1.25,anole:1.3}, magpie:{ibis:1.25}, bear:{ibis:1.2} };
  function ecoChainMul(atkKind,defKind){ const m=ECO_CHAIN[atkKind]; return (m&&m[defKind])||1; }
  const ECO_FACT={ leopard_iguana:"石虎會捕食小型爬蟲類，對綠鬣蜥有天敵壓制力！", leopard_anole:"石虎的掠食本能對沙氏變色蜥格外有效！",
    magpie_ibis:"台灣藍鵲會主動驅趕護巢，克制外來的埃及聖䴉！", bear_ibis:"黑熊體型壓制，讓聖䴉不敢靠近！" };

  /* ---------- PVE 限時外來種防衛戰：清除指定入侵種，時間到未達標即失敗 ---------- */
  let pveEvent=null;   // {target, need, got, timeLeft, active, level}
  const PVE_TARGETS=["iguana","ibis","anole","canetoad","python"];
  const PVE_DUR=90, PVE_NEED={iguana:14, ibis:10, anole:22, canetoad:12, python:8};
  let pvePickTarget="iguana";
  // 單挑首領戰：只有玩家自己 vs 一隻超強首領，不出一般波次，擊敗首領即勝、時限到或神木倒則敗
  let duelEvent=null;   // {timeLeft, active}
  const DUEL_DUR=100, DUEL_BOSSES=["python","iguana","canetoad","ibis"], BOSS_NOVA_R=210, BOSS_INTRO_DUR=2.9;
  // 首領挑戰難度晉級：每打贏一場自動升一級，首領越來越強；最高「大師」級（全域共用一個進度，離線保存）
  const DUEL_TIERS=["見習","初階","中階","高階","大師"];
  function getDuelLevel(){ try{ const v=parseInt(localStorage.getItem("shoutu_duel_level")||"1",10); return Math.min(DUEL_TIERS.length,Math.max(1,isNaN(v)?1:v)); }catch(e){ return 1; } }
  function setDuelLevel(v){ try{ localStorage.setItem("shoutu_duel_level",String(Math.min(DUEL_TIERS.length,Math.max(1,v|0)))); }catch(e){} }
  function duelTierName(lv){ return DUEL_TIERS[Math.min(DUEL_TIERS.length,Math.max(1,lv|0))-1]; }
  function isDuelMaster(){ return getDuelLevel()>=DUEL_TIERS.length; }
  // 首領挑戰陣亡後的觀戰目標：鎖定一位仍存活的隊友（優先非自己），死了才換下一位，避免鏡頭每幀亂跳
  let specHero=null;
  function spectateTarget(){ if(specHero && !specHero.dead) return specHero; specHero=heroes.find(h=>!h.dead && h!==player)||heroes.find(h=>!h.dead)||null; return specHero; }
  // 入侵種強度倍率（PVE 關卡遞增用；一般/限時模式恆為 1）——mkInvader 讀取套用到 hp/dmg
  let invHpMul=1, invDmgMul=1, invSpawnMul=1;
  // pveNextLevel：非 null 時結算畫面提供「下一關（更難）」按鈕；失敗維持 null（moverAgain 重打同關）
  let pveNextLevel=null;
  // 關卡等級（每個 target 各自記錄，離線也正確）：localStorage 鍵 shoutu_pve_level（存 JSON map）
  function pveLevelKey(){ return "shoutu_pve_level"; }
  function getPveLevel(target){ try{ const raw=localStorage.getItem(pveLevelKey()); if(!raw) return 1; const m=JSON.parse(raw); const v=parseInt(m&&m[target],10); return (isNaN(v)||v<1)?1:v; }catch(e){ return 1; } }
  function setPveLevel(target,lv){ try{ let m={}; const raw=localStorage.getItem(pveLevelKey()); if(raw){ try{ m=JSON.parse(raw)||{}; }catch(e){ m={}; } } m[target]=Math.max(1,lv|0); localStorage.setItem(pveLevelKey(),JSON.stringify(m)); }catch(e){} }
  // 純函數：依 target 與 level 算出該關的 need / 秒數 / 敵人強度倍率（離線也一致、不依賴任何執行期狀態）
  //  第 1 關 = 基準；每關 need +3、時限 -6 秒(下限 40)、血量/傷害/生成速度隨關數線性↑
  function pveLevelParams(target, level){
    const lv=Math.max(1,level|0), step=lv-1;
    const baseNeed=PVE_NEED[target]||12;
    const need=baseNeed+step*3;
    const dur=Math.max(40, PVE_DUR-step*6);
    const hpMul=1+step*0.22;      // 入侵種血量隨關遞增
    const dmgMul=1+step*0.12;     // 入侵種攻擊隨關遞增
    const spawnMul=1+step*0.18;   // 生成更快（縮短 spawnT）
    return { need, dur, hpMul, dmgMul, spawnMul };
  }
  function fmtTime(s){ s=Math.max(0,Math.floor(s)); const m=Math.floor(s/60), ss=s%60; return m+":"+(ss<10?"0":"")+ss; }
  function getBest(size){ try{ const v=parseFloat(localStorage.getItem("shoutu_besttime_"+size)); return isNaN(v)?null:v; }catch(e){ return null; } }
  function setBest(size,t){ try{ localStorage.setItem("shoutu_besttime_"+size,String(t)); }catch(e){} }
  // 首領挑戰通關紀錄：每個人數(1~5)各記一筆最佳{time,name}（name 取好友暱稱，沒有就「玩家」）
  const DUEL_SZNAME={1:"單人",2:"雙人",3:"三人",4:"四人",5:"五人"};
  function playerName(){ try{ return (localStorage.getItem("shoutu_nick")||"").trim()||"玩家"; }catch(e){ return "玩家"; } }
  function getDuelRecords(){ try{ return JSON.parse(localStorage.getItem("shoutu_duel_best")||"{}")||{}; }catch(e){ return {}; } }
  function getDuelBest(size){ const r=getDuelRecords(); return r[size]||null; }
  function saveDuelBest(size,t,name){ try{ const r=getDuelRecords(); const cur=r[size];
    if(!cur || t<cur.time){ r[size]={time:t,name:name||"玩家"}; localStorage.setItem("shoutu_duel_best",JSON.stringify(r)); return true; } }catch(e){} return false; }
  // pick 畫面的通關紀錄面板：列出 1~5 人各自的最佳（名字＋時間）
  function renderDuelRecords(){ const box=document.getElementById("duelRecords"); if(!box) return; box.innerHTML="";
    for(let sz=1;sz<=5;sz++){ const rec=getDuelBest(sz);
      const row=document.createElement("div"); row.className="dr-row";
      row.innerHTML='<span class="dr-sz">'+DUEL_SZNAME[sz]+'</span>'+
        (rec? ('<span class="dr-name">🏅 '+escHtml(rec.name)+'</span><span class="dr-time">'+fmtTime(rec.time)+'</span>')
            : '<span class="dr-name dr-empty">— 尚無紀錄，快來當第一個！ —</span><span class="dr-time">—</span>');
      box.appendChild(row); } }
  function escHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  const cam={x:0,y:0}, mv={x:0,y:0};
  let wantSp=false, wantBack=false, wantAtk=false, wantAtkT=0, wantUlt=false;
  let zoom=1, ZMIN=0.62; const ZMAX=1.8;
  // 快捷訊息：指揮 AI 隊友（集合/攻擊/撤退/小心/讚），有實際行為、不只是裝飾文字
  const QMSG={ rally:{icon:"📣",txt:"集合！",dur:5}, focus:{icon:"⚔",txt:"攻擊！",dur:5}, retreat:{icon:"🛡",txt:"撤退！",dur:5}, careful:{icon:"⚠",txt:"小心！",dur:3},
    heal:{icon:"🌿",txt:"治療！",dur:2}, push:{icon:"🔥",txt:"衝了！",dur:5}, thanks:{icon:"🙏",txt:"謝謝！",dur:2}, sorry:{icon:"🙇",txt:"抱歉！",dur:2}, gg:{icon:"👍",txt:"做得好！",dur:2}, cheer:{icon:"💪",txt:"加油！",dur:2} };
  let directive=null, directiveCd=0, bubble=null;
  function setZoom(z){ zoom=clamp(z,ZMIN,ZMAX); }

  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  /* ---------- 建立 ---------- */
  // 角色定位微調（疊在既有 mkHero 基準上，只動既有欄位、不改合約）：
  //  穿山甲=坦克(高血/高減傷/慢/近戰重擊)、黃喉貂=刺客(高速/快攻/低血)、帝雉=遠程(長射程/略脆)
  const KROLE = {
    pangolin:{ hpMul:1.35, dmgMul:1.05, spdMul:0.86, cd:0.7, dr:0.18, range:66, r:26 },
    yellowmarten:{ hpMul:0.82, dmgMul:0.72, spdMul:1.28, cd:0.34, dr:0, range:56, r:22 },
    mikado:{ hpMul:0.9, dmgMul:0.9, spdMul:1.0, cd:0.55, dr:0, range:150, r:23 }
  };
  function mkHero(kind,isPlayer){ const h={ kind, isPlayer:!!isPlayer, x:0,y:0, r:24, hp:340, maxhp:340,
    dmg:28, range:70, cd:0.6, t:0, spCd:0, speed:isPlayer?172:150, face:0, dead:false, respawn:0, name:KNAME[kind]||kind,
    hitT:0, anim:0, moving:false, phase:Math.random()*6.28, atkA:0, mood:"n", moodT:0,
    dr:0, invulnT:0, stealthT:0, shieldT:0, talent:null, blessT:0, ult:false, ultCd:0 };   // dr=天賦減傷 0~1；talent=第3級主動技能旗標；blessT=山羌祝福加速剩餘時間；ult=手上是否握有撿到的必殺；ultCd=施放後長冷卻
    const rl=KROLE[kind]; if(rl){ h.maxhp=Math.round(h.maxhp*rl.hpMul); h.hp=h.maxhp; h.dmg=Math.round(h.dmg*rl.dmgMul);
      h.speed=Math.round(h.speed*rl.spdMul); if(rl.cd) h.cd=rl.cd; if(rl.dr) h.dr=rl.dr; if(rl.range) h.range=rl.range; if(rl.r) h.r=rl.r; }
    return h; }
  const CHARGERS=["iguana","anole","skink"];   // 體型較大/敏捷的入侵種會蓄力衝撞，逼玩家主動走位閃避，不是站樁對打
  // 各外來種相對於基準(64hp)的差異倍率：緬甸蟒血厚移動慢、海蟾蜍略胖、多線南蜥小而快
  const INV_STATS={
    anole:{hp:0.62, dmg:0.7, r:12, speed:104},                    // 沙氏變色蜥：小而快
    skink:{hp:0.7, dmg:0.75, r:12, speed:112},                    // 多線南蜥：更小更快
    canetoad:{hp:1.1, dmg:1.05, r:17, speed:70},                  // 海蟾蜍：略胖略慢、跳躍毒液
    python:{hp:3.2, dmg:1.6, r:22, speed:44, range:40} };         // 緬甸蟒：細長高血量慢速纏繞
  function mkInvader(kind,elite){ const p=edgePoint(), scale=1+Math.min(1.3,clock/120)*0.6; // 隨時間越來越強
    const st=(!elite&&INV_STATS[kind])||null;
    const baseHp=elite?300:(st?64*st.hp:64), baseDmg=elite?18:(st?10*st.dmg:10);
    const hp=Math.round(baseHp*scale*(invHpMul||1));
    const canCharge=CHARGERS.indexOf(kind)>=0 && !elite;
    return { kind, x:p.x, y:p.y, r:elite?30:(st?st.r:16), hp, maxhp:hp, dmg:Math.round(baseDmg*scale*(invDmgMul||1)), range:elite?44:(st&&st.range?st.range:30),
      cd:0.9, t:0, speed:elite?62:(st?st.speed:82), face:0, dead:false, elite, hitT:0, tgt:null, anim:0, moving:false, phase:Math.random()*6.28, atkA:0, stun:0, mood:"n", moodT:0,
      canCharge, chargeCd:canCharge?(1.5+Math.random()*2):0, chargeT:0, chargeDashT:0, chargeDir:0, chargeHit:false,
      // 海蟾蜍跳躍：定時朝目標蛙跳一小段（moving 動畫可讀），到位後噴毒液範圍傷害
      hopCd:kind==="canetoad"?(0.8+Math.random()):0 }; }
  function edgePoint(){ const s=Math.floor(Math.random()*4), u=Math.random();
    if(s===0) return {x:u*MW,y:20}; if(s===1) return {x:u*MW,y:MH-20}; if(s===2) return {x:20,y:u*MH}; return {x:MW-20,y:u*MH}; }

  function setup(size){ teamSize=size; clock=0; ended=false; restore=0; killCount=0; spawnT=2; surgeT=36; finalAssault=false; directive=null; directiveCd=0; bubble=null; eliteFlash=0; timeAttack=(pickMode==="time");
    combo=0; comboT=0; comboBest=0; comboPop=0; hitStop=0; bossIntro=null; specHero=null;
    relics=[]; relicSpawnT=5;   // 開場 5 秒後第一顆守護之力才降臨，避免一開場就有必殺
    if(window.__shopReset) window.__shopReset();
    fx=[]; floats=[]; invaders=[]; hprojs=[]; weatherFx=[];
    weatherBattle=pickWeather();
    // PVE 關卡遞增：讀取該 target 目前關卡，用純函數算出本關 need/時限/難度倍率（離線也正確）
    invHpMul=1; invDmgMul=1; invSpawnMul=1;
    if(pickMode==="pve"){ const lv=getPveLevel(pvePickTarget), pp=pveLevelParams(pvePickTarget,lv);
      invHpMul=pp.hpMul; invDmgMul=pp.dmgMul; invSpawnMul=pp.spawnMul;
      pveEvent={ target:pvePickTarget, need:pp.need, got:0, timeLeft:pp.dur, active:true, level:lv };
    } else pveEvent=null;
    shrine={ x:SHX, y:SHY, r:76, hp:1400, maxhp:1400, kind:"shrine", hitT:0 };
    nurseries=NPOS.map(p=>({ x:p.x, y:p.y, r:34, hp:340, maxhp:340, growth:0.15, contested:false, kind:"nursery" }));
    const myKey=window.__netHostKeyOverride||(window.__featuredKey&&window.__featuredKey())||"leopard";
    // 好友連線：房間裡每個朋友實際選的角色都一定要排進隊伍名單（slot 1..k），不能被固定順序填充蓋掉，
    // 且順序要跟 netPendingGuests 一致，這樣下面才能把每一隻對應回操控牠的好友 uid（多人各自操控的關鍵）。
    const kinds=[myKey];
    for(const g of netPendingGuests){ if(kinds.length>=size) break; if(g.kind && kinds.indexOf(g.kind)<0) kinds.push(g.kind); }
    for(const k of GUARDIANS){ if(kinds.length>=size) break; if(kinds.indexOf(k)<0) kinds.push(k); }
    while(kinds.length<size) kinds.push(GUARDIANS[kinds.length%GUARDIANS.length]);
    healthBonus=(window.__habitatHealth&&window.__habitatHealth(battleRegion))||0;   // 該地區棲地健康度 0~1
    heroes=kinds.map((k,i)=>{ const h=mkHero(k,i===0); const ang=-1.57+(i-(size-1)/2)*0.6; h.x=SHX+Math.cos(ang)*150; h.y=SHY+Math.sin(ang)*150;
      const lv=(window.__heroLevel&&window.__heroLevel(k))||1; h.level=lv; h.maxhp=Math.round(h.maxhp*(1+(lv-1)*0.03)); h.hp=h.maxhp; h.dmg=Math.round(h.dmg*(1+(lv-1)*0.02));
      h.speed=Math.round(h.speed*(1+healthBonus*0.12)*weatherSpeedMul(k)); h.spMax=((SKILL[k]&&SKILL[k].cd)||7)*0.9*(1-healthBonus*0.15);   // 節奏調快：技能冷卻整體 -10%，出招更頻繁
      // 天賦加成（復育中心培養出來的分歧路線）：疊加在既有數值合約上，不覆蓋棲地健康度/天候加成
      const tal=(window.__heroTalent&&window.__heroTalent(k))||null;
      if(tal && tal.mods){ const m=tal.mods;
        if(m.dmg) h.dmg=Math.round(h.dmg*(1+m.dmg));
        if(m.speed) h.speed=Math.round(h.speed*(1+m.speed));
        if(m.spCd) h.spMax=Math.max(1.5,h.spMax*(1+m.spCd));
        if(m.dr) h.dr=clamp(m.dr,0,0.6); }
      h.talent=(tal&&tal.active)?tal.active.effect:null;
      h.baseSpeed=h.speed;   // 山羌靈奔祝福等暫時加速效果的基準值，避免逐幀疊乘暴走
      return h; });
    player=heroes[0];
    // 多人連線：把每隻守護者標記操控者 uid——slot0=host、slot1..k 依序對應 netPendingGuests 的好友，其餘為 AI(ctrl=null)。
    // guest 端靠快照裡的 h.ctrl 認出自己那隻；host 端靠 netGuestByUid 把好友輸入套用到正確的守護者。
    netGuestByUid={};
    heroes.forEach(h=>{ h.ctrl=null; });
    if(netRole==="host"){ if(heroes[0]) heroes[0].ctrl=netMyUid||"host";
      netPendingGuests.forEach((g,i)=>{ const h=heroes[1+i]; if(h && g.kind && h.kind===g.kind){ h.ctrl=g.uid; netGuestByUid[g.uid]=h; } }); }
    cam.x=clamp(player.x-VW/2,0,Math.max(0,MW-VW)); cam.y=clamp(player.y-VH/2,0,Math.max(0,MH-VH));
    // 單挑首領戰：生一隻超強首領（高血高傷大體型），不出一般波次
    duelEvent=null;
    if(pickMode==="duel"){ const lv=getDuelLevel(); const bk=DUEL_BOSSES[Math.floor(Math.random()*DUEL_BOSSES.length)]; const boss=mkInvader(bk,true);
      // 大首領：血量隨挑戰人數變強（人越多首領越壯）＋隨難度等級遞增（打完晉級、最高大師級），體型更大
      const lvHp=1+(lv-1)*0.45, lvDmg=1+(lv-1)*0.11;   // 難度等級越高首領血/傷越強（傷害成長放緩）
      // 首領傷害整體調低：因為首領挑戰不能回神木/復活，傷害太高會太硬，讓玩家靠走位存活久一點
      boss.maxhp=Math.round(boss.maxhp*(2.8+size*1.4)*lvHp); boss.hp=boss.maxhp; boss.dmg=Math.round(boss.dmg*(0.82+size*0.045)*lvDmg); boss.r=Math.round(boss.r*(1.35+size*0.05)); boss.isBoss=true;
      boss.bossSpCd=Math.max(2.6,4-(lv-1)*0.32); boss.bossSpT=0; boss.bossRingT=0; boss.enraged=false;   // 首領專屬：範圍震波冷卻(等級越高越密)/預警、暴走旗標
      boss.x=SHX; boss.y=SHY-320; invaders.push(boss);
      duelEvent={ timeLeft:DUEL_DUR, active:true, bossKind:bk, size:size, level:lv };
      bossIntro={ t:0, name:KNAME[bk]+"王", tier:duelTierName(lv), kind:bk };   // 首領登場電影運鏡
      if(window.__sfx) window.__sfx.play("boss");
      // 首領挑戰玩法/技能跟一般不同：技能冷卻大幅縮短、守護之力更快降臨，逼你用技能與走位打首領、不是站樁清波
      heroes.forEach(h=>{ h.spMax=Math.max(1.5,(h.spMax||8)*0.55); });
      relicSpawnT=3;
      setTimeout(()=>toast("⚔ 首領挑戰・"+duelTierName(lv)+"級！"+DUEL_SZNAME[size]+"挑戰 "+KNAME[bk]+"王　限時 "+DUEL_DUR+" 秒　技能冷卻加快！"),1600); }
    setTimeout(weatherToast,200);   // 讓進場動畫先跑，再顯示天候 toast
    if(pveEvent) setTimeout(()=>toast("🎯 第 "+pveEvent.level+" 關防衛戰！驅逐 "+pveEvent.need+" 隻 "+KNAME[pvePickTarget]),1600);
  }

  /* ---------- 目標 ---------- */
  function aliveNurseries(){ return nurseries.filter(n=>n.hp>0); }
  // 入侵種目標：精英直取神木施壓；一般兵近處英雄優先，否則最近苗圃/神木
  function invaderTarget(v){ if(v.isBoss && duelEvent){ let bh=null,bd=1e9; for(const h of heroes){ if(h.dead) continue; const d=dist(v,h); if(d<bd){bd=d;bh=h;} } return bh||shrine; }   // 首領直接追殺最近的挑戰者
    if(v.elite) return shrine;
    let bh=null,bd=170; for(const h of heroes){ if(h.dead||h.stealthT>0) continue; const d=dist(v,h); if(d<bd){bd=d;bh=h;} }
    if(bh) return bh;
    let best=shrine, bm=dist(v,shrine); for(const n of aliveNurseries()){ const d=dist(v,n); if(d<bm){bm=d;best=n;} } return best; }
  // 英雄目標：最近入侵種
  function nearestInvader(u,maxR){ let best=null,bd=maxR||1e9; for(const v of invaders){ if(v.dead) continue; const d=dist(u,v); if(d<bd){bd=d;best=v;} } return best?{e:best,d:bd}:null; }

  /* ---------- 傷害 ---------- */
  function knock(o,fromX,fromY,amt){ if(!('elite' in o)) return; const a=Math.atan2(o.y-fromY,o.x-fromX), k=o.elite?amt*0.3:amt; o.x+=Math.cos(a)*k; o.y+=Math.sin(a)*k; }
  function hurt(o,amt,by){ if(o.hp<=0) return;
    if(o.isPlayer!==undefined){ // 守護者受傷：天賦無敵/護盾/減傷生效點
      if(o.invulnT>0){ floats.push({x:o.x,y:o.y-o.r-6,txt:"閃避！",col:"#80deea",life:0.5}); return; }
      if(o.shieldT>0){ o.shieldT=0; ring(o.x,o.y,44,"#4dd0e1"); floats.push({x:o.x,y:o.y-o.r-6,txt:"護盾抵銷！",col:"#4dd0e1",life:0.6}); return; }
      if(o.dr>0) amt*=(1-o.dr); }
    if(evadeRoll(o)){ floats.push({x:o.x,y:o.y-o.r-6,txt:"閃避！",col:"#fff59d",life:0.6}); return; } // 夜間石虎閃避加成
    o.hp-=amt; o.hitT=0.14; const big=amt>=40;
    floats.push({x:o.x,y:o.y-o.r-6,txt:"-"+Math.round(amt),col:big?"#fff59d":"#fff",life:0.6,big}); sparks(o.x,o.y,big?9:5,big?"#fff59d":"#fff");
    if(o.hp<=0){ o.hp=0; onDeath(o,by); } }
  function onDeath(o,by){
    if(o.kind==="shrine"){ endGame(false); return; }
    if(o.kind==="nursery"){ ring(o.x,o.y,60,"#ff8a80"); toast("一處復育苗圃被毀！"); return; }
    if(o.isPlayer!==undefined){ // 守護者被擊退（不算入侵種戰果）
      o.dead=true;
      if(duelEvent){ // 首領挑戰：陣亡不復活（死掉就死掉），沒有回神木；改為觀戰隊友
        o.respawn=Infinity; ring(o.x,o.y,52,"#b71c1c"); sparks(o.x,o.y,18,"#ff8a80");
        floats.push({x:o.x,y:o.y-42,txt:KNAME[o.kind]+" 陣亡！",col:"#ff5252",life:1.6,big:true});
        if(o===player) toast("💀 你陣亡了！首領挑戰不能復活——切換觀戰隊友，為他們加油！"); }
      else { o.respawn=4+teamSize*0.6; ring(o.x,o.y,40,"#ef5350");
        floats.push({x:o.x,y:o.y-40,txt:KNAME[o.kind]+" 被擊退！",col:"#ffab91",life:1.1}); }
      if(by && by.elite!==undefined){ by.mood="proud"; by.moodT=1.6; } // 入侵種擊退守護者：得意
      return; }
    // 入侵種
    o.dead=true; killCount++; ring(o.x,o.y,o.elite?60:26,"#cddc39"); sparks(o.x,o.y,o.elite?26:12,o.elite?"#ffca28":"#cddc39");
    if(o.elite){ mshake=Math.max(mshake,10); ring(o.x,o.y,90,"#ffca28"); }
    // 首領被擊敗：電影級爆發（大爆炸粒子＋雙層衝擊環＋強震＋定格），把最爽的一刻放大
    if(o.isBoss){ mshake=Math.max(mshake,18); eliteFlash=0.6; freeze(0.14);
      ring(o.x,o.y,140,"#fff59d"); ring(o.x,o.y,220,"#ffca28"); ring(o.x,o.y,300,"#ff8a65"); sparks(o.x,o.y,60,"#ffe082"); sparks(o.x,o.y,40,"#fff");
      floats.push({x:o.x,y:o.y-o.r-14,txt:"首領擊破！",col:"#ffd54f",life:1.4,big:true}); }
    // 連擊：3.2 秒內連續驅逐會疊加，每 5 連擊多一次爆發回饋（震動/粒子/復原度都加碼），逾時歸零重來
    combo++; comboT=3.2; comboPop=0.5; comboBest=Math.max(comboBest,combo);
    const comboTier=Math.floor(combo/5), comboBonus=1+comboTier*0.35;
    if(combo>=3 && combo%5===0){ mshake=Math.max(mshake,6+comboTier*2); sparks(o.x,o.y,20+comboTier*6,"#ffd54f"); ring(o.x,o.y,70+comboTier*14,"#ffd54f");
      toast("🔥 "+combo+" 連擊！驅逐效率大爆發！"); if(window.__sfx) window.__sfx.play("combo"); }
    restore=clamp(restore+(o.elite?0.06:0.017)*comboBonus,0,1);   // 節奏調快：每次驅逐推進更多復原度，正常場不再拖太久
    floats.push({x:o.x,y:o.y-30,txt:(o.elite?"入侵種王 ":"")+KNAME[o.kind]+" 被驅逐  🌿復原+"+Math.round((o.elite?5:1)*comboBonus)+"%",col:"#c5e1a5",life:1.1});
    if(combo>=2) floats.push({x:o.x,y:o.y-50,txt:combo+" 連擊",col:combo%5===0?"#ffd54f":"#fff59d",life:0.9,big:combo%5===0});
    if(by && by.isPlayer!==undefined){ by.mood="proud"; by.moodT=1.6;
      const fact=ECO_FACT[by.kind+"_"+o.kind]; if(fact && Math.random()<0.5) toast("🔗 "+fact); // 守護者擊退入侵種：得意 + 生物防治鏈科普
      else if(KFACT[o.kind] && Math.random()<0.35) toast("📖 "+KFACT[o.kind]); }   // 新外來種真實生態危害科普
    if(pveEvent && pveEvent.active && o.kind===pveEvent.target){ pveEvent.got++;
      if(pveEvent.got>=pveEvent.need){ pveEvent.active=false; toast("🎯 防衛戰成功！"+KNAME[pveEvent.target]+" 已清除足額！"); endGame(true); } }
    if(window.__shopAddGold) window.__shopAddGold(o.elite?15:3);   // 擊殺額外進帳，主動打怪比純等時間更划算
    if(by && by.isPlayer!==undefined && by.isPlayer && window.__sfx) window.__sfx.play("coin");   // 玩家親手驅逐才發聲，避免 AI 大量擊殺洗版音效
  }

  /* ---------- 攻擊 ---------- */
  function meleeHit(u,tgt,dmg){
    // 暴雨天候：空中守護者攻擊有機率落空（命中率下降）
    if(u.isPlayer!==undefined && weatherMissRoll(u.kind)){ u.t=u.cd*0.6; floats.push({x:u.x,y:u.y-u.r-6,txt:"MISS",col:"#b3e5fc",life:0.5}); return; }
    // 夜間石虎閃避：目標若正被石虎攻擊、且目標是入侵種攻擊石虎本體則另計，這裡處理「u 攻擊 tgt」一般情形不受影響；
    // 閃避判定放在 tgt 端（見下方 hurt 呼叫前的 evadeRoll）
    u.t=u.cd; u.atkA=0.2; u.face=Math.atan2(tgt.y-u.y,tgt.x-u.x);
    fx.push({type:"slash",x:u.x+Math.cos(u.face)*u.r,y:u.y+Math.sin(u.face)*u.r,a:u.face,life:0.16,max:0.16,col:"#fff59d"});
    let mul=1;
    if(u.isPlayer!==undefined) mul*=weatherAtkMul(u);           // 夜間石虎攻擊力 +20%
    if(u.isPlayer!==undefined && tgt.kind) mul*=ecoChainMul(u.kind,tgt.kind); // 生物防治鏈：剋制加成
    const dealt=dmg*mul;
    hurt(tgt,dealt,u); knock(tgt,u.x,u.y,(u.isPlayer?15:11)*(u.knockMul||1)); if(u.isPlayer){ mshake=Math.max(mshake,4); if(dealt>=40) freeze(0.035); if(window.__sfx) window.__sfx.play(dealt>=40?"bighit":"hit"); }
    if(u.lifesteal && u.hp>0){ u.hp=Math.min(u.maxhp,u.hp+dealt*u.lifesteal); } }   // 戰鬥中強化「活力」：攻擊附加生命偷取

  /* ---------- 更新 ---------- */
  function step(dt){
    if(ended) return; clock+=dt; if(mshake>0) mshake=Math.max(0,mshake-dt*38); if(eliteFlash>0) eliteFlash=Math.max(0,eliteFlash-dt*1.6);
    if(bossIntro){ bossIntro.t+=dt; if(bossIntro.t>BOSS_INTRO_DUR) bossIntro=null; }
    if(comboPop>0) comboPop=Math.max(0,comboPop-dt*1.8);
    if(comboT>0){ comboT-=dt; if(comboT<=0) combo=0; }
    if(wantAtkT>0){ wantAtkT-=dt; if(wantAtkT<=0) wantAtk=false; }
    if(window.__shopTick) window.__shopTick(dt);
    // 守護之力能量球：定時在地圖四周（避開中央神木）補充，場上最多 RELIC_MAX 顆
    if(relics.length<RELIC_MAX){ relicSpawnT-=dt; if(relicSpawnT<=0){ relicSpawnT=duelEvent?RELIC_SPAWN*0.6:RELIC_SPAWN; relics.push(spawnRelic()); toast("⭐ 守護之力降臨地圖！撿起可施放必殺"); } }
    // 入侵浪潮：更兇、隨時間加速、精英「入侵種王」
    // PVE 防衛戰模式：入侵種池只出目標種（沙氏變色蜥另建入侵池，一般模式不會自然出現）
    const pveInvPool=pveEvent?[pveEvent.target]:INVADERS;
    const RK=()=>pveInvPool[Math.floor(Math.random()*pveInvPool.length)];
    const pushInv=(el)=>{ if(invaders.length<80){ const v=mkInvader(RK(),el);
      v.speed=Math.round(v.speed*weatherSpeedMul(v.kind));   // 寒流：變溫動物（如樹蛙）移動變慢
      invaders.push(v);
      if(el){ eliteFlash=0.5; mshake=Math.max(mshake,3); toast("👑 "+KNAME[v.kind]+"王　降臨！"); } } };
    if(!duelEvent){   // 單挑模式不出一般波次，只有開場那隻首領
      spawnT-=dt;
      if(spawnT<=0){ const ramp=Math.min(1,clock/110); spawnT=Math.max(0.5, (2.6-ramp*1.8)/(invSpawnMul||1));   // 節奏調快：入侵種來得更密，減少空檔（PVE 高關卡更快）
        const n=2+(Math.random()<ramp?1:0)+(invSpawnMul>1.3?1:0); for(let i=0;i<n;i++) pushInv(false);
        if(!pveEvent && clock>15 && Math.random()<0.2+ramp*0.28) pushInv(true); }   // PVE 防衛戰不出入侵種王，聚焦清剿目標種
      surgeT-=dt; if(surgeT<=0){ surgeT=36; toast("⚠ 入侵潮來襲！"); const c=3+Math.floor(clock/45); for(let i=0;i<c;i++) pushInv(false); if(!pveEvent) pushInv(true); }   // 節奏調快：入侵潮更頻繁
      if(!pveEvent && restore>=0.75 && !finalAssault){ finalAssault=true; toast("⚠ 最終反撲・守住神木！"); for(let i=0;i<6;i++) pushInv(false); pushInv(true); pushInv(true); }
    }

    // 單挑首領戰：擊敗首領即勝、時限到或神木倒則敗
    if(duelEvent && duelEvent.active){ duelEvent.timeLeft-=dt;
      if(invaders.filter(v=>!v.dead).length===0){ duelEvent.active=false; toast("🏆 單挑勝利！擊敗了 "+KNAME[duelEvent.bossKind]+"王！"); endGame(true); }
      else if(heroes.length && heroes.every(h=>h.dead)){ duelEvent.active=false; toast("💀 全員陣亡…首領挑戰失敗"); endGame(false); }   // 首領挑戰不能復活：全員陣亡即敗
      else if(duelEvent.timeLeft<=0){ duelEvent.active=false; duelEvent.timeLeft=0; toast("⏱ 時間到！首領未被擊敗"); endGame(false); } }

    // PVE 限時外來種防衛戰：倒數計時，時間到未達標即失敗
    if(pveEvent && pveEvent.active){ pveEvent.timeLeft-=dt;
      if(pveEvent.timeLeft<=0){ pveEvent.active=false; pveEvent.timeLeft=0; toast("⏱ 時間到！未能清除足額 "+KNAME[pveEvent.target]); endGame(false); } }

    // 入侵種
    for(const v of invaders){ if(v.dead) continue; if(v.hitT>0) v.hitT-=dt; if(v.moodT>0) v.moodT-=dt;
      if(v.stun>0){ v.stun-=dt; v.moving=false; continue; }   // 被震暈：不動不攻
      if(v.chargeCd>0) v.chargeCd-=dt;
      // 單挑首領專屬招式（讓單挑玩起來跟一般清波次完全不同）：暴走 + 蓄力範圍震波
      if(v.isBoss && duelEvent){
        if(!v.enraged && v.hp < v.maxhp*0.3){ v.enraged=true; v.dmg=Math.round(v.dmg*1.4); v.speed=Math.round(v.speed*1.3); eliteFlash=0.6; mshake=Math.max(mshake,8); toast("😤 "+KNAME[v.kind]+"王 暴走！攻擊與速度大幅提升"); }
        if(v.bossSpT>0){ v.moving=false; v.atkA=0.2; v.bossSpT-=dt;
          v.bossRingT-=dt; if(v.bossRingT<=0){ v.bossRingT=0.28; ring(v.x,v.y,BOSS_NOVA_R,"#ff5252"); }   // 擴散紅環預警危險範圍
          if(v.bossSpT<=0){ ring(v.x,v.y,BOSS_NOVA_R,"#ff5252"); ring(v.x,v.y,BOSS_NOVA_R*0.6,"#ff8a80"); sparks(v.x,v.y,26,"#ff8a80"); mshake=Math.max(mshake,11); freeze(0.06);
            for(const cand of [player,...heroes]){ if(!cand||cand.dead) continue; if(dist(v,cand)<BOSS_NOVA_R){ hurt(cand,Math.round(v.dmg*1.3),v); knock(cand,v.x,v.y,42); } }
            v.bossSpCd=(v.enraged?3:4.5)+Math.random()*2; }
          continue; }
        if(v.bossSpCd>0) v.bossSpCd-=dt;
        else if(v.chargeT<=0 && v.chargeDashT<=0){ v.bossSpT=0.7; v.bossRingT=0; toast("⚠ "+KNAME[v.kind]+"王 蓄力震波！快跑出紅圈"); continue; }
      }
      // 蓄力衝撞：先原地預警蓄力，再朝當時鎖定的方向高速衝出，撞到目標會造成大傷害+擊退，逼玩家主動走位閃避
      if(v.chargeDashT>0){ v.moving=true; v.anim+=dt; v.chargeDashT-=dt;
        const px=v.x,py=v.y;
        v.x+=Math.cos(v.chargeDir)*v.speed*3.1*dt; v.y+=Math.sin(v.chargeDir)*v.speed*3.1*dt; v.x=clamp(v.x,20,MW-20); v.y=clamp(v.y,20,MH-20);
        fx.push({type:"streak",x:px,y:py,x2:v.x,y2:v.y,life:0.18,max:0.18,col:"#ff8a65"});
        if(!v.chargeHit){ for(const cand of [player,...heroes,shrine,...nurseries]){ if(!cand||cand.hp<=0||cand.dead) continue; if(dist(v,cand)<v.r+(cand.r||30)){
          hurt(cand,v.dmg*1.8,v); knock(cand,v.x,v.y,cand.isPlayer!==undefined?30:14); v.chargeHit=true;
          if(cand.isPlayer!==undefined) mshake=Math.max(mshake,7); break; } } }
        if(v.chargeDashT<=0){ v.chargeCd=4+Math.random()*2.5; } continue; }
      if(v.chargeT>0){ v.moving=false; v.chargeT-=dt;
        if(v.chargeT<=0){ v.chargeDashT=0.32; v.chargeHit=false; ring(v.x,v.y,v.r*2.2,"#ff5252"); } continue; }
      if(v.t>0) v.t-=dt; if(v.atkA>0) v.atkA-=dt; if(v.hopCd>0) v.hopCd-=dt; v.moving=false;
      const tg=invaderTarget(v); v.tgt=tg; const reach=v.range+(tg.r||0); const dd=dist(v,tg);
      // 海蟾蜍：跳躍逼近，落地時噴灑毒液範圍傷害（辨識度行為），呼應真實毒腺生態
      if(v.kind==="canetoad" && !v.elite && v.hopCd<=0 && dd>reach && dd<260){
        v.hopCd=1.4+Math.random()*0.8; const ang=Math.atan2(tg.y-v.y,tg.x-v.x); v.face=ang;
        const hopD=Math.min(dd-reach+8,90); v.x=clamp(v.x+Math.cos(ang)*hopD,20,MW-20); v.y=clamp(v.y+Math.sin(ang)*hopD,20,MH-20);
        v.moving=true; v.anim+=0.5; ring(v.x,v.y,v.r*1.6,"#9ccc65");
        for(const cand of [player,...heroes,shrine,...nurseries]){ if(!cand||cand.hp<=0||cand.dead) continue; if(dist(v,cand)<v.r+22+(cand.r||0)*0.3){ hurt(cand,v.dmg*0.8,v); } }
        continue; }
      if(v.canCharge && !v.elite && v.chargeCd<=0 && v.t<=0 && dd>reach+30 && dd<280){
        v.chargeT=0.55; v.chargeDir=Math.atan2(tg.y-v.y,tg.x-v.x); v.face=v.chargeDir; continue; }   // 進入蓄力預警
      if(dd<=reach){ if(v.t<=0){ v.t=v.cd; v.face=Math.atan2(tg.y-v.y,tg.x-v.x); v.atkA=0.2; hurt(tg,v.dmg,v);
        // 緬甸蟒：纏繞絞殺——命中守護者時額外定身/延遲對手行動（stun 靠 v 端不適用，改讓守護者 hitT 延長 + 擊退小）
        if(v.kind==="python" && tg.isPlayer!==undefined){ tg.hitT=Math.max(tg.hitT,0.4); ring(tg.x,tg.y,tg.r*1.8,"#8d6e63"); } } }
      else { const ang=Math.atan2(tg.y-v.y,tg.x-v.x); v.face=ang; v.x+=Math.cos(ang)*v.speed*dt; v.y+=Math.sin(ang)*v.speed*dt; v.moving=true; v.anim+=dt; } }
    invaders=invaders.filter(v=>!v.dead);

    // 守護者技能投射物（疾風刃，可穿透）
    for(const p of hprojs){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      for(const v of invaders){ if(v.dead||p.hits.indexOf(v)>=0) continue; if(dist(p,v)<v.r+11){ hurt(v,p.dmg,{isPlayer:true}); knock(v,p.x-p.vx*0.02,p.y-p.vy*0.02,16); p.hits.push(v); p.pierce--; } }
      if(p.pierce<=0) p.life=0; }
    hprojs=hprojs.filter(p=>p.life>0 && p.x>-40 && p.x<MW+40 && p.y>-40 && p.y<MH+40);

    // 快捷指令：倒數、rally 目標點跟隨玩家位置
    if(directiveCd>0) directiveCd-=dt;
    if(directive){ directive.t-=dt; if(directive.type==="rally"&&player){ directive.x=player.x; directive.y=player.y; } if(directive.t<=0) directive=null; }
    if(bubble){ bubble.t-=dt; if(bubble.t<=0) bubble=null; }

    // 英雄
    for(const h of heroes){
      if(h.dead){ h.respawn-=dt; if(h.respawn<=0){ h.dead=false; h.hp=h.maxhp; h.x=SHX+(Math.random()*120-60); h.y=SHY+110; ring(h.x,h.y,40,"#66bb6a"); } continue; }
      if(h.t>0) h.t-=dt; if(h.spCd>0) h.spCd-=dt; if(h.hitT>0) h.hitT-=dt; if(h.atkA>0) h.atkA-=dt; if(h.moodT>0) h.moodT-=dt; h.moving=false;
      if(h.invulnT>0) h.invulnT-=dt; if(h.stealthT>0) h.stealthT-=dt; if(h.ultCd>0) h.ultCd-=dt;
      if(h.blessT>0){ h.blessT-=dt; h.speed=Math.round((h.baseSpeed||h.speed)*1.22); } else if(h.baseSpeed) h.speed=h.baseSpeed;   // 山羌靈奔祝福：暫時加速，逐幀還原避免疊乘
      if(h.isPlayer){ updatePlayer(h,dt); continue; }
      if(h.ctrl && netGuestByUid[h.ctrl]===h){ updateNetGuestHero(h,dt,h.ctrl); continue; }   // 好友連線：這隻由某位遠端好友操控，host 端套用該 uid 的搖桿輸入，不跑 AI
      // AI 守護者：聽從快捷指令（集合/攻擊/撤退），否則優先打靠近苗圃/神木的入侵種
      const dirOn=directive && directive.t>0;
      let tg = (dirOn && directive.type==="focus" && directive.target && !directive.target.dead)
        ? {e:directive.target, d:dist(h,directive.target)} : nearestInvader(h,420);
      if(dirOn && directive.type==="retreat"){
        if(tg && tg.d<=h.range+tg.e.r){ if(h.t<=0) meleeHit(h,tg.e,h.dmg); }
        const ang=Math.atan2(shrine.y-h.y,shrine.x-h.x); if(dist(h,shrine)>150){ h.face=ang; h.x+=Math.cos(ang)*h.speed*dt; h.y+=Math.sin(ang)*h.speed*dt; h.moving=true; h.anim+=dt; }
      } else if(dirOn && (directive.type==="rally"||directive.type==="push")){
        if(tg && tg.d<=h.range+tg.e.r){ if(h.t<=0) meleeHit(h,tg.e,h.dmg); if(h.spCd<=0 && invaders.filter(v=>!v.dead&&dist(v,h)<150).length>=2) castSp(h); }
        const ang=Math.atan2(directive.y-h.y,directive.x-h.x); if(dist(h,directive)>100){ h.face=ang; h.x+=Math.cos(ang)*h.speed*dt; h.y+=Math.sin(ang)*h.speed*dt; h.moving=true; h.anim+=dt; }
      } else if(tg){ const reach=h.range+tg.e.r;
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
    for(const f of floats){ f.life-=dt; f.y-=26*dt; } floats=floats.filter(f=>f.life>0); if(floats.length>60) floats.splice(0,floats.length-60);   // 硬上限+回收（跟 fx 同模式，避免必殺一次大量命中時無天花板）

    // 天候粒子：暴雨雨滴 / 寒流雪花，硬上限＋回收（獨立於 fx，畫在螢幕座標，不受鏡頭平移影響）
    const WFX_MAX=140;
    if(weatherBattle==="storm" && weatherFx.length<WFX_MAX){ for(let i=0;i<4 && weatherFx.length<WFX_MAX;i++)
      weatherFx.push({type:"rain",x:Math.random()*VW,y:-10,vy:900+Math.random()*300,life:2}); }
    else if(weatherBattle==="cold" && weatherFx.length<WFX_MAX*0.6){ for(let i=0;i<1 && weatherFx.length<WFX_MAX*0.6;i++)
      weatherFx.push({type:"snow",x:Math.random()*VW,y:-10,vy:40+Math.random()*30,vx:(Math.random()-0.5)*20,life:6}); }
    for(const w of weatherFx){ w.life-=dt; w.y+=w.vy*dt; if(w.vx) w.x+=w.vx*dt; }
    weatherFx=weatherFx.filter(w=>w.life>0 && w.y<VH+20); if(weatherFx.length>WFX_MAX) weatherFx.splice(0,weatherFx.length-WFX_MAX);

    // 鏡頭（依縮放調整可視範圍）；首領挑戰陣亡後改觀戰仍存活的隊友
    const vw=VW/zoom, vh=VH/zoom, focus=player.dead?(duelEvent?(spectateTarget()||shrine):shrine):player;
    cam.x += (clamp(focus.x-vw/2,0,Math.max(0,MW-vw))-cam.x)*Math.min(1,dt*6);
    cam.y += (clamp(focus.y-vh/2,0,Math.max(0,MH-vh))-cam.y)*Math.min(1,dt*6);

    updateHUD();
    if(!pveEvent && !duelEvent && restore>=1) endGame(true);
    // 好友連線：host 端節流廣播戰場快照給朋友（只送畫面重建需要的最小欄位，不是每幀送）
    if(netRole==="host"){ netBroadcastT-=dt*1000; if(netBroadcastT<=0){ netBroadcastT=NET_BROADCAST_MS; if(window.__netBroadcast) window.__netBroadcast(snapshot()); } }
  }

  /* ---------- 好友連線：快照序列化 / 還原 ---------- */
  // 只送畫面重建需要的最小欄位（不送 fx/floats/hprojs 等純特效資料，guest 端靠自己收到的 hp/位置變化另外觸發本地特效）
  function snapshot(){
    return { t:Math.round(clock*10)/10, restore:Math.round(restore*1000)/1000, kills:killCount,
      shrineHp:Math.round(shrine.hp), shrineMax:shrine.maxhp,
      nurseries:nurseries.map(n=>({hp:Math.round(n.hp),max:n.maxhp,growth:Math.round(n.growth*100)/100})),
      heroes:heroes.map((h,i)=>({i, kind:h.kind, x:Math.round(h.x), y:Math.round(h.y), face:Math.round(h.face*100)/100,
        hp:Math.round(h.hp), max:h.maxhp, dead:h.dead, lv:h.level||1, name:h.name, isPlayer:!!h.isPlayer, ctrl:h.ctrl||null, moving:h.moving, ult:!!h.ult, ultCd:Math.round(h.ultCd*10)/10})),
      invaders:invaders.slice(0,60).map(v=>({kind:v.kind, x:Math.round(v.x), y:Math.round(v.y), face:Math.round(v.face*100)/100,
        hp:Math.round(v.hp), max:v.maxhp, elite:!!v.elite, boss:!!v.isBoss, moving:v.moving})),
      relics:relics.map(r=>({x:Math.round(r.x), y:Math.round(r.y), phase:Math.round(r.phase*100)/100})),
      // 首領挑戰同步：讓 guest 端也能顯示雙方血條/首領資訊/晉級難度（否則 guest 沒有本地 duelEvent 就看不到首領 HUD）
      duel: duelEvent?{ tl:Math.round(duelEvent.timeLeft*10)/10, bk:duelEvent.bossKind, sz:duelEvent.size, lv:duelEvent.level||1 }:null,
      ended, win:ended?(duelEvent?(invaders.filter(v=>v.isBoss&&!v.dead).length===0):(restore>=1)):null };
  }
  // guest 端：用收到的快照直接覆蓋渲染用的陣列/物件，不做本地模擬（reuse render()/drawUnit 等既有繪製函式）
  function applySnapshot(s){
    if(!s) return; netLastRecvT=performance.now(); netStale=false;
    clock=s.t||0; restore=clamp(s.restore||0,0,1); killCount=s.kills||0;
    if(shrine){ shrine.hp=s.shrineHp||0; shrine.maxhp=s.shrineMax||shrine.maxhp; }
    if(Array.isArray(s.nurseries)) nurseries.forEach((n,i)=>{ const d=s.nurseries[i]; if(!d) return; n.hp=d.hp||0; n.maxhp=d.max||n.maxhp; n.growth=d.growth||0; });
    let myHero=null;
    if(Array.isArray(s.heroes)) heroes=s.heroes.map(d=>{ const base=mkHero(d.kind,d.isPlayer); base.x=d.x; base.y=d.y; base.face=d.face||0;
      base.hp=d.hp; base.maxhp=d.max||base.maxhp; base.dead=!!d.dead; base.level=d.lv||1; base.name=d.name||base.name; base.moving=!!d.moving;
      base.ult=!!d.ult; base.ultCd=d.ultCd||0; base.ctrl=d.ctrl||null;
      if(netMyUid && d.ctrl===netMyUid) myHero=base; return base; });
    if(Array.isArray(s.invaders)) invaders=s.invaders.map(d=>{ const v=mkInvader(d.kind,d.elite); v.x=d.x; v.y=d.y; v.face=d.face||0; v.hp=d.hp; v.maxhp=d.max||v.maxhp; v.moving=!!d.moving; v.isBoss=!!d.boss; return v; });
    // 首領挑戰：從快照還原 duelEvent，讓 guest 端顯示雙方血條 HUD（首領血量/計時/難度）
    const hadDuel=!!duelEvent;
    duelEvent = s.duel ? { timeLeft:s.duel.tl||0, active:true, bossKind:s.duel.bk, size:s.duel.sz||teamSize, level:s.duel.lv||1 } : (s.duel===null? null : duelEvent);
    if(duelEvent && !hadDuel && !bossIntro){ bossIntro={ t:0, name:(KNAME[duelEvent.bossKind]||"大首領")+"王", tier:duelTierName(duelEvent.level||1), kind:duelEvent.bossKind }; if(window.__sfx) window.__sfx.play("boss"); }   // guest 端也放首領登場運鏡
    relics=Array.isArray(s.relics)? s.relics.map(r=>({x:r.x, y:r.y, phase:r.phase||0})) : [];
    // guest 端鏡頭/HUD 一定要跟著「我自己操控的守護者」（快照裡 ctrl===我的 uid 那隻），不能落到 isPlayer（那是房主的角色）——
    // 這是造成朋友端「看起來大家都是同一隻」的根因：舊版一律抓 isPlayer，guest 端因此鏡頭黏在房主身上
    player=myHero||heroes.find(h=>h.isPlayer)||heroes[0]||null;
    if(player){ const vw=VW/zoom, vh=VH/zoom, focus=player.dead?(duelEvent?(spectateTarget()||shrine):shrine):player;
      cam.x=clamp(focus.x-vw/2,0,Math.max(0,MW-vw)); cam.y=clamp(focus.y-vh/2,0,Math.max(0,MH-vh)); }
    updateHUD();
    if(s.ended && !ended){ ended=true; running=false; cancelAnimationFrame(raf);
      if(duelEvent){ const bn=KNAME[duelEvent.bossKind]||"大首領", tn=duelTierName(duelEvent.level||1);
        showOver(s.win?"🏆 首領挑戰勝利！":"⚔ 首領挑戰失敗", s.win?("「"+tn+"級」"+bn+"王被擊敗了"):("「"+tn+"級」"+bn+"王太強了…"),
          s.win?("你和隊友一起擊敗了 "+tn+"級 "+bn+"王！回到小隊可挑戰更高難度。"):("這次沒能在時限內擊敗牠，回到小隊再約隊友一起挑戰！")); }
      else showOver(s.win?"🌳 棲地復原成功！":"神木倒下了…", s.win?"枯黃的土地重新長回翠綠":"棲地失守",
        s.win?"你和朋友一起驅逐了外來入侵種、守住台灣神木與復育苗圃！":"別氣餒，再約朋友一起守一次吧。"); }
  }
  window.__netApplySnapshot=applySnapshot;   // net.js 收到 Firebase 資料後呼叫這個把畫面更新成 host 廣播的內容
  window.__netSetMyUid=(uid)=>{ netMyUid=uid||null; };   // net.js 登入後把本機玩家 uid 告訴 moba（host/guest 都要，用來對應/認出自己那隻）
  // guest 端：把某位好友(uid)的搖桿/技能輸入寫進 netGuestInputs[uid]；host 每幀從這裡取用套到對應守護者
  window.__netSetGuestInput=(uid,inp)=>{ if(!uid||!inp) return; const g=netGuestInputs[uid]||(netGuestInputs[uid]={mvx:0,mvy:0,sp:false,back:false,atk:false,ult:false});
    g.mvx=inp.mvx||0; g.mvy=inp.mvy||0; if(inp.sp) g.sp=true; if(inp.back) g.back=true; if(inp.atk) g.atk=true; if(inp.ult) g.ult=true; };
  window.__netLocalInput=()=>{ const inp={ mvx:mv.x, mvy:mv.y, sp:wantSp, back:wantBack, atk:wantAtk, ult:wantUlt }; wantSp=false; wantBack=false; wantAtk=false; wantAtkT=0; wantUlt=false; return inp; };
  window.__netCheckStale=()=>{ if(netRole!=="guest"||!netLastRecvT) return false; netStale=(performance.now()-netLastRecvT)>NET_TIMEOUT_MS; return netStale; };

  function updatePlayer(h,dt){
    const mag=Math.hypot(mv.x,mv.y);
    if(mag>0.12){ const ang=Math.atan2(mv.y,mv.x); h.face=ang; const s=h.speed*Math.min(1,mag); h.x+=Math.cos(ang)*s*dt; h.y+=Math.sin(ang)*s*dt; h.moving=true; h.anim+=dt; }
    keepIn(h);
    tryPickRelic(h);
    if(wantBack){ wantBack=false; if(duelEvent){ toast("⚔ 首領挑戰不能回神木補血——死掉就死掉了，全力應戰！"); } else { h.x=shrine.x; h.y=shrine.y+100; h.hp=h.maxhp; ring(h.x,h.y,46,"#80deea"); toast("回到神木旁・補滿體力"); } }
    if(wantSp){ wantSp=false; if(h.spCd<=0) castSp(h); }
    if(wantUlt){ wantUlt=false; castUlt(h); }
    const tg=nearestInvader(h,h.range+60);
    h.aim=(tg && tg.d<=h.range+tg.e.r+40 && !tg.e.dead)? tg.e : null;
    // 普通攻擊改成按鍵觸發（不再貼近就自動打），角色動作跟玩家操作直接掛勾，戰鬥手感更主動、不生硬。
    // wantAtk 按下後有 0.28 秒輸入緩衝：稍微搶拍按也不會白按，進入射程/冷卻轉好內會自動補發一次。
    if(wantAtk && tg && tg.d<=h.range+tg.e.r && h.t<=0){ wantAtk=false; wantAtkT=0; meleeHit(h,tg.e,h.dmg); }
  }
  // 好友連線：host 端套用某位遠端好友(uid)的搖桿/技能輸入到牠操控的守護者身上（結構同 updatePlayer，資料來源是 netGuestInputs[uid] 而非本機 mv/wantSp）
  function updateNetGuestHero(h,dt,uid){
    const inp=netGuestInputs[uid]; if(!inp){ keepIn(h); return; }
    const ix=inp.mvx||0, iy=inp.mvy||0, mag=Math.hypot(ix,iy);
    if(mag>0.12){ const ang=Math.atan2(iy,ix); h.face=ang; const s=h.speed*Math.min(1,mag); h.x+=Math.cos(ang)*s*dt; h.y+=Math.sin(ang)*s*dt; h.moving=true; h.anim+=dt; }
    keepIn(h);
    tryPickRelic(h);
    if(inp.back){ inp.back=false; h.x=shrine.x; h.y=shrine.y+100; h.hp=h.maxhp; ring(h.x,h.y,46,"#80deea"); }
    if(inp.sp){ inp.sp=false; if(h.spCd<=0) castSp(h); }
    if(inp.ult){ inp.ult=false; castUlt(h); }
    const tg=nearestInvader(h,h.range+60);
    h.aim=(tg && tg.d<=h.range+tg.e.r+40 && !tg.e.dead)? tg.e : null;
    if(inp.atk && tg && tg.d<=h.range+tg.e.r && h.t<=0){ inp.atk=false; meleeHit(h,tg.e,h.dmg); }
  }
  // 點到線段距離（突進命中判定）
  function segDist(px,py,ax,ay,bx,by){ const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1; let t=((px-ax)*dx+(py-ay)*dy)/l2; t=clamp(t,0,1); return Math.hypot(px-(ax+t*dx),py-(ay+t*dy)); }
  // 每隻守護者的專屬技能
  function skDash(h){ const ang=(h.aim&&!h.aim.dead)?Math.atan2(h.aim.y-h.y,h.aim.x-h.x):h.face;
    const ex=clamp(h.x+Math.cos(ang)*210,40,MW-40), ey=clamp(h.y+Math.sin(ang)*210,40,MH-40);
    fx.push({type:"streak",x:h.x,y:h.y,x2:ex,y2:ey,life:0.25,max:0.25,col:"#fff59d"});
    const amb=h.talent==="leopard_ambush", dmul=amb?3.0:2.2;   // 夜襲：突刺附加爆擊傷害
    for(const v of invaders){ if(!v.dead && segDist(v.x,v.y,h.x,h.y,ex,ey)<46){ hurt(v,h.dmg*dmul,h); knock(v,h.x,h.y,34); } }
    if(h.talent==="leopard_evade"){ h.invulnT=1.5; ring(h.x,h.y,50,"#80deea"); }   // 路殺迴避：突刺瞬間無敵
    h.x=ex; h.y=ey; ring(ex,ey,60,"#fff59d"); sparks(ex,ey,amb?24:16,"#fff59d"); }
  function skDive(h){ const swarm=h.talent==="magpie_swarm", nest=h.talent==="magpie_nest", R=swarm?125:95;
    const tg=nearestInvader(h,650); const ex=clamp(tg?tg.e.x:h.x+Math.cos(h.face)*180,40,MW-40), ey=clamp(tg?tg.e.y:h.y+Math.sin(h.face)*180,40,MH-40);
    fx.push({type:"streak",x:h.x,y:h.y,x2:ex,y2:ey,life:0.22,max:0.22,col:"#4fc3f7"}); h.x=ex; h.y=ey; ring(ex,ey,R,"#4fc3f7"); sparks(ex,ey,20,"#81d4fa");
    for(const v of invaders){ if(!v.dead && dist({x:ex,y:ey},v)<R){ hurt(v,h.dmg*2.6,h); knock(v,ex,ey,swarm?42:30); } }
    if(nest){ for(const a of heroes){ if(!a.dead && dist({x:ex,y:ey},a)<210){ a.shieldT=Math.max(a.shieldT,3); floats.push({x:a.x,y:a.y-a.r-12,txt:"護巢屏障",col:"#4dd0e1",life:0.8}); } } } }
  function skSlam(h){ const boost=h.talent==="bear_smash", R1=boost?225:175, R2=boost?150:118;
    ring(h.x,h.y,R1,"#ffd54f"); ring(h.x,h.y,R2,"#ffe082"); sparks(h.x,h.y,26,"#ffd54f"); mshake=Math.max(mshake,11);
    for(const v of invaders){ if(!v.dead && dist(h,v)<R1){ hurt(v,h.dmg*2.4,h); knock(v,h.x,h.y,boost?85:60); v.stun=Math.max(v.stun,boost?1.6:1.2); } }
    if(h.talent==="bear_guard"){ h.shieldT=2; ring(h.x,h.y,50,"#4dd0e1"); } }
  function skSonic(h){ const mimic=h.talent==="cicada_mimic", boom=h.talent==="cicada_boom", R=boom?270:215;
    if(mimic){ h.stealthT=3; ring(h.x,h.y,60,"#b0bec5"); floats.push({x:h.x,y:h.y-h.r-16,txt:"環境擬態",col:"#b0bec5",life:0.9}); }
    ring(h.x,h.y,R,"#b3e5fc"); ring(h.x,h.y,R*0.7,"#e1f5fe"); sparks(h.x,h.y,24,"#b3e5fc"); mshake=Math.max(mshake,8);
    for(const v of invaders){ if(!v.dead && dist(h,v)<R){ hurt(v,h.dmg*1.8,h); knock(v,h.x,h.y,40); v.stun=Math.max(v.stun,boom?2.4:1.6); } } }
  function skShoot(h){ const pierce=h.talent==="dragonfly_pierce", gust=h.talent==="dragonfly_gust";
    if(gust){ const ex=clamp(h.x+Math.cos(h.face)*130,40,MW-40), ey=clamp(h.y+Math.sin(h.face)*130,40,MH-40);
      fx.push({type:"streak",x:h.x,y:h.y,x2:ex,y2:ey,life:0.18,max:0.18,col:"#26c6da"});
      for(const v of invaders){ if(!v.dead && segDist(v.x,v.y,h.x,h.y,ex,ey)<40){ hurt(v,h.dmg*1.4,h); knock(v,h.x,h.y,24); } }
      h.x=ex; h.y=ey; sparks(ex,ey,10,"#26c6da"); }
    for(let i=-1;i<=1;i++){ const a=h.face+i*0.24; hprojs.push({x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r,vx:Math.cos(a)*(pierce?620:540),vy:Math.sin(a)*(pierce?620:540),dmg:h.dmg*1.6,life:1.1,hits:[],pierce:pierce?5:3,col:"#b2ff59"}); } }
  function skHeal(h){ const bless=h.talent==="deer_bless", leap=h.talent==="deer_leap", amt=bless?190:120;
    if(leap){ h.invulnT=1.2; ring(h.x,h.y,44,"#80deea"); }
    ring(h.x,h.y,210,"#a5d6a7"); sparks(h.x,h.y,22,"#a5d6a7");
    for(const a of heroes){ if(!a.dead && dist(h,a)<210){ a.hp=Math.min(a.maxhp,a.hp+amt); floats.push({x:a.x,y:a.y-a.r-12,txt:"+"+amt,col:"#a5d6a7",life:0.9}); } }
    for(const v of invaders){ if(!v.dead && dist(h,v)<155) knock(v,h.x,h.y,52); } }
  // 山羌・靈奔祝福：範圍比復育號角小、治療量較低，但額外賦予短暫加速（森林底層敏捷小鹿的自然療癒特性，差異化於梅花鹿）
  function skMuntjacBless(h){ const R=140, amt=70, spdT=2.6;
    ring(h.x,h.y,R,"#c5e1a5"); ring(h.x,h.y,R*0.6,"#e6f4d9"); sparks(h.x,h.y,18,"#c5e1a5");
    for(const a of heroes){ if(!a.dead && dist(h,a)<R){ a.hp=Math.min(a.maxhp,a.hp+amt); a.blessT=spdT;
      floats.push({x:a.x,y:a.y-a.r-12,txt:"+"+amt+" 疾行",col:"#c5e1a5",life:0.9}); } } }
  // 台灣獼猴・猿躍連擊：連續三段短距離跳躍突進，靈長類敏捷刺客的高機動連段
  function skMacaqueFlurry(h){ let cx=h.x, cy=h.y;
    for(let i=0;i<3;i++){ const tg=nearestInvader({x:cx,y:cy},260);
      const ang=tg?Math.atan2(tg.e.y-cy,tg.e.x-cx):h.face+((Math.random()-0.5)*0.6);
      const ex=clamp(cx+Math.cos(ang)*130,40,MW-40), ey=clamp(cy+Math.sin(ang)*130,40,MH-40);
      fx.push({type:"streak",x:cx,y:cy,x2:ex,y2:ey,life:0.16,max:0.16,col:"#e8d9b8"});
      for(const v of invaders){ if(!v.dead && segDist(v.x,v.y,cx,cy,ex,ey)<40){ hurt(v,h.dmg*1.3,h); knock(v,cx,cy,22); } }
      sparks(ex,ey,10,"#e8d9b8"); cx=ex; cy=ey; }
    h.x=cx; h.y=cy; h.invulnT=Math.max(h.invulnT,0.3); ring(cx,cy,55,"#e8d9b8"); }
  // 台灣櫻花鉤吻鮭・逆流衝刺：呼應洄游意象的衝刺+水花範圍傷害，衝刺瞬間無敵（逆流而上、不畏險阻）
  function skSalmonSurge(h){ const ang=(h.aim&&!h.aim.dead)?Math.atan2(h.aim.y-h.y,h.aim.x-h.x):h.face;
    const ex=clamp(h.x+Math.cos(ang)*240,40,MW-40), ey=clamp(h.y+Math.sin(ang)*240,40,MH-40);
    h.invulnT=Math.max(h.invulnT,0.6);
    fx.push({type:"streak",x:h.x,y:h.y,x2:ex,y2:ey,life:0.28,max:0.28,col:"#7fc4d4"});
    for(const v of invaders){ if(!v.dead && segDist(v.x,v.y,h.x,h.y,ex,ey)<50){ hurt(v,h.dmg*2.0,h); knock(v,h.x,h.y,30); } }
    h.x=ex; h.y=ey;
    ring(ex,ey,90,"#7fc4d4"); ring(ex,ey,60,"#cdeef4"); sparks(ex,ey,22,"#bfe8f0");
    for(const v of invaders){ if(!v.dead && dist(v,{x:ex,y:ey})<95){ hurt(v,h.dmg*1.2,h); knock(v,ex,ey,36); } } }
  // 藍腹鷴・金羽連射：五連發扇形箭羽，遠程專精，射程與投射物數量都優於疾風刃
  function skPheasantVolley(h){ for(let i=-2;i<=2;i++){ const a=h.face+i*0.16;
      hprojs.push({x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r,vx:Math.cos(a)*580,vy:Math.sin(a)*580,dmg:h.dmg*1.35,life:1.3,hits:[],pierce:2,col:"#c0392b"}); }
    ring(h.x,h.y,50,"#2a3a7a"); sparks(h.x,h.y,14,"#c0392b"); }
  // 穿山甲・捲甲防禦：捲成球短暫無敵+護盾+高減傷窗，並震退周圍入侵種（坦克開團/自保）
  function skPangolinCurl(h){ h.invulnT=Math.max(h.invulnT,1.4); h.shieldT=Math.max(h.shieldT,2.6);
    ring(h.x,h.y,60,"#e0c48a"); ring(h.x,h.y,86,"#c9a05a"); sparks(h.x,h.y,20,"#e0c48a"); mshake=Math.max(mshake,7);
    floats.push({x:h.x,y:h.y-h.r-14,txt:"捲甲！無敵",col:"#ffe082",life:0.9});
    for(const v of invaders){ if(!v.dead && dist(h,v)<150){ hurt(v,h.dmg*1.4,h); knock(v,h.x,h.y,70); v.stun=Math.max(v.stun,0.8); } } }
  // 黃喉貂・疾襲連咬：四段極速短衝連咬，敏捷刺客高機動連段（比獼猴更快更多段、單段傷害略低）
  function skMartenRush(h){ let cx=h.x, cy=h.y; h.invulnT=Math.max(h.invulnT,0.4);
    for(let i=0;i<4;i++){ const tg=nearestInvader({x:cx,y:cy},280);
      const ang=tg?Math.atan2(tg.e.y-cy,tg.e.x-cx):h.face+((Math.random()-0.5)*0.5);
      const ex=clamp(cx+Math.cos(ang)*120,40,MW-40), ey=clamp(cy+Math.sin(ang)*120,40,MH-40);
      fx.push({type:"streak",x:cx,y:cy,x2:ex,y2:ey,life:0.14,max:0.14,col:"#ffe066"});
      for(const v of invaders){ if(!v.dead && segDist(v.x,v.y,cx,cy,ex,ey)<38){ hurt(v,h.dmg*1.15,h); knock(v,cx,cy,18); } }
      sparks(ex,ey,8,"#ffe066"); cx=ex; cy=ey; }
    h.x=cx; h.y=cy; ring(cx,cy,52,"#ffe066"); }
  // 帝雉・帝羽箭雨：七連發寬扇形箭羽，高山遠程壓制，射程與涵蓋角度勝過金羽連射
  function skMikadoArrows(h){ for(let i=-3;i<=3;i++){ const a=h.face+i*0.15;
      hprojs.push({x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r,vx:Math.cos(a)*600,vy:Math.sin(a)*600,dmg:h.dmg*1.3,life:1.4,hits:[],pierce:2,col:"#f2f5fb"}); }
    ring(h.x,h.y,54,"#26386a"); sparks(h.x,h.y,16,"#e5342a"); }
  const SKILL={ leopard:{name:"閃電突進",cd:6,fn:skDash}, bear:{name:"震地",cd:9,fn:skSlam}, cicada:{name:"音爆",cd:9,fn:skSonic},
    dragonfly:{name:"疾風刃",cd:6,fn:skShoot}, magpie:{name:"俯衝啄擊",cd:6,fn:skDive}, deer:{name:"復育號角",cd:8,fn:skHeal},
    muntjac:{name:"靈奔祝福",cd:7,fn:skMuntjacBless}, macaque:{name:"猿躍連擊",cd:6,fn:skMacaqueFlurry},
    salmon:{name:"逆流衝刺",cd:6.5,fn:skSalmonSurge}, pheasant:{name:"金羽連射",cd:6,fn:skPheasantVolley},
    pangolin:{name:"捲甲防禦",cd:8,fn:skPangolinCurl}, yellowmarten:{name:"疾襲連咬",cd:5.5,fn:skMartenRush}, mikado:{name:"帝羽箭雨",cd:6.5,fn:skMikadoArrows} };
  function castSp(h){ const s=SKILL[h.kind]; h.spCd=h.spMax||(s&&s.cd)||7; h.atkA=0.3;
    if(h.isPlayer){ mshake=Math.max(mshake,6); toast((s?s.name:"技能")+(h.talent?"！🌟":"！")); if(window.__sfx) window.__sfx.play("skill"); }
    (s?s.fn:skSlam)(h); }

  /* ---------- 撿拾式必殺技：守護之力 ---------- */
  // 在地圖四周（避開中央神木區）隨機生成能量球；用時間相位讓每顆微微上下浮動、發光
  function spawnRelic(){ const edge=Math.floor(Math.random()*4), m=180;
    let x,y;
    if(edge===0){ x=m+Math.random()*(MW-2*m); y=m+Math.random()*180; }
    else if(edge===1){ x=m+Math.random()*(MW-2*m); y=MH-m-Math.random()*180; }
    else if(edge===2){ x=m+Math.random()*180; y=m+Math.random()*(MH-2*m); }
    else { x=MW-m-Math.random()*180; y=m+Math.random()*(MH-2*m); }
    return { x, y, phase:Math.random()*6.28 }; }
  // 只有玩家操控的守護者（本機玩家 / 好友）才能撿；撿起後手上握有一發必殺，冷卻中(ultCd>0)或已握有時不再撿
  function tryPickRelic(h){ if(h.ult || h.ultCd>0 || !relics.length) return;
    for(let i=0;i<relics.length;i++){ const rl=relics[i]; if(dist(h,rl)<h.r+RELIC_R+6){
      relics.splice(i,1); h.ult=true; ring(h.x,h.y,60,"#ffe082"); sparks(h.x,h.y,20,"#ffe082");
      if(h.isPlayer){ mshake=Math.max(mshake,5); toast("⭐ 撿到守護之力！按【必殺】施放毀滅波"); if(window.__sfx) window.__sfx.play("pickup"); }
      return; } } }
  // 必殺：以自身為中心的巨大守護怒濤，重創範圍內所有入侵種（大傷害＋擊退＋震暈），並額外推進棲地復原；用完長冷卻、要再撿一顆
  function castUlt(h){ if(!h.ult) return; h.ult=false; h.ultCd=ULT_CD; h.atkA=0.4;
    const R=340, dmg=130;
    ring(h.x,h.y,R,"#ffd54f"); ring(h.x,h.y,R*0.6,"#fff59d"); sparks(h.x,h.y,40,"#ffe082"); mshake=Math.max(mshake,14); eliteFlash=0.5; freeze(0.09);
    let hitN=0;
    for(const v of invaders){ if(v.dead) continue; if(dist(h,v)<R+v.r){ hurt(v,dmg,{isPlayer:true,kind:h.kind}); knock(v,h.x,h.y,60); v.stun=Math.max(v.stun,1.3); hitN++; } }
    restore=clamp(restore+0.03,0,1);
    if(h.isPlayer){ toast("💥 守護怒濤！橫掃 "+hitN+" 隻入侵種"); if(window.__sfx) window.__sfx.play("ult"); }
    floats.push({x:h.x,y:h.y-h.r-10,txt:"守護怒濤！",col:"#ffd54f",life:1.0,big:true}); }
  function keepIn(h){ h.x=clamp(h.x,40,MW-40); h.y=clamp(h.y,40,MH-40);
    for(const o of [shrine,...nurseries]){ if(o.hp<=0) continue; const d=dist(h,o),min=o.r+h.r; if(d<min&&d>0){ const a=Math.atan2(h.y-o.y,h.x-o.x); h.x=o.x+Math.cos(a)*min; h.y=o.y+Math.sin(a)*min; } } }

  /* ---------- 守護之力能量球繪製：發光星芒 + 上下浮動 + 光暈脈動 ---------- */
  function drawRelics(){ for(const r of relics){ const bob=Math.sin(clock*2+r.phase)*5, pl=0.5+0.5*Math.sin(clock*3+r.phase);
    const x=r.x, y=r.y+bob;
    ctx.save();
    const g=ctx.createRadialGradient(x,y,2,x,y,RELIC_R*1.8); g.addColorStop(0,"rgba(255,236,150,0.9)"); g.addColorStop(0.5,"rgba(255,213,79,0.35)"); g.addColorStop(1,"rgba(255,213,79,0)");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,RELIC_R*1.8*(0.9+pl*0.2),0,7); ctx.fill();
    ctx.globalCompositeOperation="lighter"; ctx.fillStyle="#fff59d"; starG(ctx,x,y,RELIC_R*(0.85+pl*0.15));
    ctx.globalCompositeOperation="source-over"; ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(r.x,r.y+14,RELIC_R*0.7,RELIC_R*0.24,0,0,7); ctx.fill();
    ctx.restore(); } }

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
    const top=mix("#8a9a5e","#4a8a3e",restore), bot=mix("#6b7742","#2f6a26",restore);
    const g=ctx.createLinearGradient(0,0,0,VH); g.addColorStop(0,top); g.addColorStop(1,bot); ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
    ctx.save(); if(mshake>0) ctx.translate((Math.random()-0.5)*mshake,(Math.random()-0.5)*mshake); ctx.scale(zoom,zoom); ctx.translate(-cam.x,-cam.y);
    drawField();
    drawRelics();
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
    // 陽光方向光（左上暖光、右下陰影）讓整體像真實日照場景
    const sunL=ctx.createLinearGradient(0,0,VW*0.85,VH); sunL.addColorStop(0,"rgba(255,244,196,0.13)"); sunL.addColorStop(0.45,"rgba(255,255,255,0)"); sunL.addColorStop(1,"rgba(12,26,8,0.17)");
    ctx.fillStyle=sunL; ctx.fillRect(0,0,VW,VH);
    const vg=ctx.createRadialGradient(VW/2,VH*0.52,VH*0.28,VW/2,VH*0.52,VH*0.75);
    vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.28)"); ctx.fillStyle=vg; ctx.fillRect(0,0,VW,VH);
    // 神木瀕危：紅色警示閃動
    if(shrine.hp/shrine.maxhp<0.3){ const pl=0.5+0.5*Math.sin(clock*6); const rv=ctx.createRadialGradient(VW/2,VH/2,VH*0.3,VW/2,VH/2,VH*0.78);
      rv.addColorStop(0,"rgba(255,0,0,0)"); rv.addColorStop(1,"rgba(255,0,0,"+(0.26*pl).toFixed(3)+")"); ctx.fillStyle=rv; ctx.fillRect(0,0,VW,VH); }
    // 晝夜 / 氣候戰場：整體色調 + 天候粒子（畫在螢幕座標，不受鏡頭縮放/平移影響）
    renderWeather();
    // 入侵種王登場：輕微邊框提示（角色本身的光環已有動漫感，畫面不再全螢幕閃光）
    if(eliteFlash>0){ const a=eliteFlash/0.5;
      ctx.strokeStyle="rgba(255,60,60,"+(0.35*a).toFixed(3)+")"; ctx.lineWidth=10;
      ctx.strokeRect(5,5,VW-10,VH-10); }
    // 連擊計數：右上角浮動數字，每次擊殺都彈一下，5 的倍數時放大變金色，給玩家清楚的節奏爽感
    if(combo>=2){ const pop=1+comboPop*0.5, tier=Math.floor(combo/5), gold=combo%5===0&&comboPop>0.25;
      const cx=VW-70, cy=54;
      ctx.save(); ctx.translate(cx,cy); ctx.scale(pop,pop);
      ctx.font="bold 15px sans-serif"; ctx.textAlign="center"; ctx.fillStyle=gold?"#ffd54f":"rgba(255,255,255,0.85)";
      ctx.strokeStyle="rgba(0,0,0,0.6)"; ctx.lineWidth=3; ctx.strokeText("連擊",0,-13); ctx.fillText("連擊",0,-13);
      ctx.font="bold "+(26+tier*3)+"px sans-serif"; ctx.fillStyle=gold?"#ffd54f":"#fff59d";
      ctx.strokeText(String(combo),0,14); ctx.fillText(String(combo),0,14);
      ctx.restore();
      if(comboT<1){ ctx.save(); ctx.strokeStyle="rgba(255,213,79,"+(comboT*0.7).toFixed(3)+")"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(cx,cy,26,-1.5708,-1.5708+comboT*6.283); ctx.stroke(); ctx.restore(); } }
    if(bossIntro) drawBossIntro();
    if(toastT>0){ toastT-=0.016; if(toastT<=0){ const el=document.getElementById("mtoast"); if(el) el.classList.remove("show"); } }
  }
  // 首領登場電影運鏡：上下黑幕 letterbox + 首領名號/難度等級 大字滑入 + 紅色掃光，把「大作」開場感做出來
  function drawBossIntro(){ const p=Math.min(1,bossIntro.t/BOSS_INTRO_DUR);
    // 黑幕：前 0.3 拉入、後 0.15 收起
    const barIn=Math.min(1,p/0.22), barOut=p>0.85?(1-(p-0.85)/0.15):1, bar=Math.max(0,Math.min(barIn,barOut))*VH*0.15;
    ctx.fillStyle="rgba(0,0,0,0.82)"; ctx.fillRect(0,0,VW,bar); ctx.fillRect(0,VH-bar,VW,bar);
    // 中央整體壓暗
    const dim=Math.max(0,Math.min(barIn,barOut))*0.42; ctx.fillStyle="rgba(0,0,0,"+dim.toFixed(3)+")"; ctx.fillRect(0,bar,VW,VH-bar*2);
    // 文字滑入/滑出
    const app=p<0.75?Math.min(1,(p-0.12)/0.22):(1-(p-0.75)/0.25), a=Math.max(0,Math.min(1,app));
    if(a>0){ const cx=VW/2, cy=VH*0.5, slide=(1-a)*60;
      ctx.save(); ctx.textAlign="center"; ctx.globalAlpha=a;
      // 難度等級小標
      ctx.font="bold 17px sans-serif"; ctx.fillStyle="#ff8a80";
      ctx.fillText("⚔ 首領挑戰 · "+bossIntro.tier+"級", cx, cy-46+slide);
      // 首領名號（紅色光暈大字）
      ctx.font="900 46px 'Noto Sans TC',sans-serif"; ctx.shadowColor="rgba(255,40,40,0.9)"; ctx.shadowBlur=24;
      ctx.fillStyle="#fff"; ctx.fillText(bossIntro.name, cx, cy+6-slide);
      ctx.shadowBlur=0; ctx.strokeStyle="rgba(255,60,60,0.85)"; ctx.lineWidth=2; ctx.strokeText(bossIntro.name, cx, cy+6-slide);
      // 副標
      ctx.font="bold 14px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.82)";
      ctx.fillText("擊敗牠　守護台灣特有種的家園", cx, cy+42+slide);
      ctx.restore(); ctx.globalAlpha=1; }
    // 紅色掃光（一次橫掃）
    if(p<0.6){ const sx=(p/0.6)*VW*1.4-VW*0.2, gw=140;
      const lg=ctx.createLinearGradient(sx-gw,0,sx+gw,0); lg.addColorStop(0,"rgba(255,60,60,0)"); lg.addColorStop(0.5,"rgba(255,90,90,0.28)"); lg.addColorStop(1,"rgba(255,60,60,0)");
      ctx.fillStyle=lg; ctx.fillRect(0,bar,VW,VH-bar*2); }
  }

  // 晝夜/氣候視覺呈現：夜間變暗＋藍紫色調、暴雨雨滴、寒流白霧+雪花（獨立於世界座標，畫在螢幕上）
  function renderWeather(){
    if(weatherBattle==="night"){ ctx.fillStyle="rgba(18,14,48,0.34)"; ctx.fillRect(0,0,VW,VH); }
    else if(weatherBattle==="cold"){ ctx.fillStyle="rgba(200,225,240,0.14)"; ctx.fillRect(0,0,VW,VH); }
    else if(weatherBattle==="storm"){ ctx.fillStyle="rgba(40,50,60,0.22)"; ctx.fillRect(0,0,VW,VH); }
    if(weatherBattle==="storm"){ ctx.strokeStyle="rgba(200,225,255,0.5)"; ctx.lineWidth=1.4; ctx.lineCap="round";
      for(const w of weatherFx){ if(w.type!=="rain") continue; ctx.beginPath(); ctx.moveTo(w.x,w.y); ctx.lineTo(w.x-4,w.y-18); ctx.stroke(); } ctx.lineCap="butt"; }
    else if(weatherBattle==="cold"){ ctx.fillStyle="rgba(255,255,255,0.85)";
      for(const w of weatherFx){ if(w.type!=="snow") continue; ctx.beginPath(); ctx.arc(w.x,w.y,2.2,0,7); ctx.fill(); } }
  }

  function drawField(){
    const gt=clock;
    // 世界邊界：濃密森林牆（雙色樹冠含受光，像真實林線）
    ctx.strokeStyle="rgba(16,36,20,0.95)"; ctx.lineWidth=90; ctx.strokeRect(0,0,MW,MH);
    for(let i=0;i<64;i++){ const t=i/64, rr=26+((i*13)%16);
      const pts=[[t*MW,0],[t*MW,MH],[0,t*MH],[MW,t*MH]];
      for(const[px,py]of pts){ ctx.fillStyle="rgba(8,24,12,0.92)"; ctx.beginPath(); ctx.arc(px,py,rr,0,7); ctx.fill();
        ctx.fillStyle="rgba(64,116,58,0.5)"; ctx.beginPath(); ctx.arc(px-rr*0.3,py-rr*0.34,rr*0.5,0,7); ctx.fill(); } }
    // 大地色塊變化（讓草地不死板）
    ctx.globalAlpha=0.5; for(let i=0;i<26;i++){ const x=hgrid(i,1), y=hgrid(i,2), rr=90+((i*53)%140);
      ctx.fillStyle=mix("#615a35","#33612a",restore); ctx.beginPath(); ctx.ellipse(x,y,rr,rr*0.7,i,0,7); ctx.fill(); } ctx.globalAlpha=1;
    // 蜿蜒溪流（泥沙河岸 + 水體 + 流動反光）
    const riv=(w,st)=>{ ctx.strokeStyle=st; ctx.lineWidth=w; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.beginPath(); ctx.moveTo(-40,MH*0.36); ctx.bezierCurveTo(MW*0.3,MH*0.28,MW*0.62,MH*0.5,MW+40,MH*0.42); ctx.stroke(); };
    riv(84,"rgba(122,108,72,0.55)");                 // 河岸泥沙
    riv(64,mix("#4a5b52","#4fa6c9",restore*0.7+0.3)); // 水體
    riv(30,"rgba(180,225,235,0.25)");                 // 中央淺水高光
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

  function drawShrine(n){ const R=n.r, INK="#20140c", cx=n.x, cy=n.y-R*0.35;
    ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(n.x,n.y+R*0.52,R*1.15,R*0.4,0,0,7); ctx.fill();
    // 樹幹（粗黑描邊 + 高光）
    ctx.beginPath(); ctx.moveTo(n.x-17,n.y+R*0.56); ctx.lineTo(n.x-13,n.y-R*0.18); ctx.lineTo(n.x+13,n.y-R*0.18); ctx.lineTo(n.x+17,n.y+R*0.56); ctx.closePath();
    ctx.fillStyle="#6d4c2f"; ctx.fill(); ctx.strokeStyle=INK; ctx.lineWidth=5; ctx.stroke();
    ctx.fillStyle="#845c38"; ctx.fillRect(n.x-12,n.y-R*0.12,6,R*0.62);
    // 樹冠：黑輪廓底 → 平塗綠 → 硬邊高光/陰影（漫畫賽璐璐）
    const clumps=[[-0.46,-0.32,0.62],[0.46,-0.32,0.62],[0,-0.74,0.72],[-0.22,-0.05,0.5],[0.26,-0.02,0.5]];
    ctx.fillStyle=INK; for(const c of clumps){ ctx.beginPath(); ctx.arc(cx+c[0]*R,cy+c[1]*R,c[2]*R+6,0,7); ctx.fill(); }
    ctx.fillStyle="#3f9e42"; for(const c of clumps){ ctx.beginPath(); ctx.arc(cx+c[0]*R,cy+c[1]*R,c[2]*R,0,7); ctx.fill(); }
    ctx.fillStyle="#6fc46a"; for(const c of [[-0.46,-0.5,0.34],[0,-0.92,0.32],[-0.22,-0.3,0.24]]){ ctx.beginPath(); ctx.arc(cx+c[0]*R,cy+c[1]*R,c[2]*R,0,7); ctx.fill(); }
    ctx.fillStyle="#2c6e2f"; for(const c of [[0.5,-0.12,0.32],[0.32,-0.42,0.26]]){ ctx.beginPath(); ctx.arc(cx+c[0]*R,cy+c[1]*R,c[2]*R,0,7); ctx.fill(); }
    // 光暈 + 血環
    const gl=ctx.createRadialGradient(cx,cy,4,cx,cy,R*1.8); gl.addColorStop(0,"rgba(197,225,165,0.28)"); gl.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(cx,cy,R*1.8,0,7); ctx.fill();
    ctx.lineWidth=6; ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.arc(cx,cy,R*1.2,0,7); ctx.stroke();
    ctx.strokeStyle=n.hp/n.maxhp>0.3?"#66bb6a":"#ef5350"; ctx.beginPath(); ctx.arc(cx,cy,R*1.2,-1.57,-1.57+6.283*(n.hp/n.maxhp)); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font="bold 16px sans-serif"; ctx.textAlign="center"; ctx.fillText("🌳 台灣神木",n.x,n.y+R*0.98);
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
  // 各物種俯視角身形輪廓（面向 +x，中心在原點）；pad 為外框加寬量。
  // 讓每隻不再是同一顆橢圓：熊壯圓、鹿/山羌修長帶頸、石虎精瘦、鮭魚紡錘、鳥類水滴、蜥蜴細長尖吻。
  function bodyPathTop(g,kind,bLen,bW,pad){
    const L=bLen+pad, W=bW+pad, P=g;
    P.beginPath();
    if(kind==="python"){ // 蛇：極細長、頭頸略寬、尾端尖細（近乎等寬的長條）
      P.moveTo(L*1.02,0);
      P.bezierCurveTo(L*0.7,-W*1.2, L*0.2,-W*1.0, -L*0.4,-W*0.7);
      P.bezierCurveTo(-L*0.85,-W*0.5, -L*1.05,-W*0.18, -L*1.05,0);
      P.bezierCurveTo(-L*1.05,W*0.18, -L*0.85,W*0.5, -L*0.4,W*0.7);
      P.bezierCurveTo(L*0.2,W*1.0, L*0.7,W*1.2, L*1.02,0);
    } else if(kind==="salmon"||kind==="iguana"||kind==="anole"||kind==="skink"){ // 紡錘 / 細長：前後皆收尖
      const nose=kind==="salmon"?1.0:1.12;
      P.moveTo(L*nose,0);
      P.bezierCurveTo(L*0.5,-W, -L*0.2,-W, -L*0.9,-W*0.28);
      P.bezierCurveTo(-L*1.02,-W*0.12,-L*1.02,W*0.12,-L*0.9,W*0.28);
      P.bezierCurveTo(-L*0.2,W, L*0.5,W, L*nose,0);
    } else if(kind==="bear"||kind==="pangolin"){ // 壯碩渾圓、肩背寬（穿山甲亦拱背厚實）
      P.moveTo(L*0.96,-W*0.2);
      P.bezierCurveTo(L*1.02,-W*0.85, L*0.2,-W*1.06, -L*0.2,-W*1.02);
      P.bezierCurveTo(-L*0.98,-W*0.96,-L*1.02,W*0.96,-L*0.2,W*1.02);
      P.bezierCurveTo(L*0.2,W*1.06, L*1.02,W*0.85, L*0.96,W*0.2);
      P.bezierCurveTo(L*1.0,0,L*1.0,0,L*0.96,-W*0.2);
    } else if(kind==="deer"||kind==="muntjac"){ // 修長、後臀圓、肩窄（帶頸感）
      P.moveTo(L*1.02,-W*0.5);
      P.bezierCurveTo(L*0.6,-W*0.72, L*0.1,-W*0.9, -L*0.5,-W*0.86);
      P.bezierCurveTo(-L*1.06,-W*0.82,-L*1.06,W*0.82,-L*0.5,W*0.86);
      P.bezierCurveTo(L*0.1,W*0.9, L*0.6,W*0.72, L*1.02,W*0.5);
      P.bezierCurveTo(L*1.1,W*0.2,L*1.1,-W*0.2,L*1.02,-W*0.5);
    } else if(kind==="leopard"||kind==="yellowmarten"){ // 精瘦流線、肩胸略寬於臀（黃喉貂細長流線）
      P.moveTo(L*1.0,-W*0.35);
      P.bezierCurveTo(L*0.55,-W*1.0, L*0.05,-W*0.95, -L*0.55,-W*0.78);
      P.bezierCurveTo(-L*1.04,-W*0.62,-L*1.04,W*0.62,-L*0.55,W*0.78);
      P.bezierCurveTo(L*0.05,W*0.95, L*0.55,W*1.0, L*1.0,W*0.35);
      P.bezierCurveTo(L*1.08,W*0.12,L*1.08,-W*0.12,L*1.0,-W*0.35);
    } else if(kind==="magpie"||kind==="ibis"||kind==="pheasant"||kind==="mikado"){ // 鳥：水滴（胸圓、尾收窄）
      P.moveTo(L*1.02,0);
      P.bezierCurveTo(L*0.6,-W*1.02, -L*0.1,-W*0.98, -L*0.7,-W*0.5);
      P.bezierCurveTo(-L*1.02,-W*0.24,-L*1.02,W*0.24,-L*0.7,W*0.5);
      P.bezierCurveTo(-L*0.1,W*0.98, L*0.6,W*1.02, L*1.02,0);
    } else { // 預設橢圓（螃蟹/蟬/獼猴/青蛙/蝸牛等維持圓身）
      P.ellipse(0,0,L,W,0,0,7);
    }
    P.closePath();
  }
  // 立體感俯視角生物：全身 + 3D 漸層 + 走路/待機/攻擊/拍翅動畫
  function drawCreatureTop(u,r0,faction){
    const col=KCOL[u.kind]||"#888", dark=shade(col,-44), lite=shade(col,52), INK="#20140c";
    const cfg=kcfg(u.kind), r=r0*cfg.sz, gt=clock, f=u.face;
    const flyer=(u.kind==="dragonfly"||u.kind==="cicada"), bird=(u.kind==="magpie"||u.kind==="ibis"||u.kind==="pheasant"||u.kind==="mikado");
    const mammal=(u.kind==="leopard"||u.kind==="bear"||u.kind==="deer"||u.kind==="muntjac"||u.kind==="macaque"||u.kind==="pangolin"||u.kind==="yellowmarten"), angry=u.atkA>0;
    const fish=(u.kind==="salmon");
    const walk=u.moving?Math.sin(u.anim*12):0;
    const bob=u.moving?Math.abs(Math.sin(u.anim*12))*r*0.14:Math.sin(gt*2.2+u.phase)*r*0.05;
    const breath=1+(u.moving?0:Math.sin(gt*2.2+u.phase)*0.03);
    const lunge=u.atkA>0?Math.sin((1-u.atkA/0.2)*3.14159)*r*0.5:0;
    const gy=u.y-bob-(flyer?r*0.5:0);
    // 圖檔優先：有寫實貼圖就用圖（面向右，依朝向旋轉）
    const spr=SPRITES_TOP[u.kind];
    if(spr){ const S=r*2.7*(u.elite?1.15:1);
      ctx.fillStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(u.x+r*0.2,u.y+r*0.6,r*1.0,r*0.38,0,0,7); ctx.fill();
      ctx.fillStyle=faction==="inv"?"rgba(239,83,80,0.28)":"rgba(102,187,106,0.34)"; ctx.beginPath(); ctx.ellipse(u.x,u.y+r*0.55,r*1.05,r*0.4,0,0,7); ctx.fill();
      ctx.save(); ctx.translate(u.x+Math.cos(f)*lunge,gy+Math.sin(f)*lunge*0.4); ctx.rotate(f); if(u.hitT>0) ctx.globalAlpha=0.85;
      ctx.drawImage(spr,-S/2,-S/2,S,S); ctx.restore(); return; }
    const bLen=r*cfg.long, bW=r*cfg.wide;
    const proud=(u.mood==="proud" && u.moodT>0 && !angry);
    const OUT=Math.max(2.2,r*0.11);
    const earKind=(u.kind==="leopard"||u.kind==="bear"||u.kind==="deer"||u.kind==="muntjac"||u.kind==="macaque"||u.kind==="yellowmarten");
    // 影子（方向性、柔和；光源在左上，影子落右下）
    ctx.fillStyle="rgba(0,0,0,0.13)"; ctx.beginPath(); ctx.ellipse(u.x+r*0.28,u.y+r*0.66,bLen*1.08,r*0.42,0,0,7); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.24)"; ctx.beginPath(); ctx.ellipse(u.x+r*0.18,u.y+r*0.62,bLen*0.82,r*0.32,0,0,7); ctx.fill();
    // 陣營地環
    ctx.fillStyle=faction==="inv"?"rgba(239,83,80,0.30)":"rgba(102,187,106,0.4)"; ctx.beginPath(); ctx.ellipse(u.x,u.y+r*0.55,bLen*1.02,r*0.4,0,0,7); ctx.fill();
    // 離屏畫布：先把角色畫在自己的座標系(面向右)，最後統一套「立體上色」再貼回主畫布——
    // 跟大廳 drawCreature 同一套質感手法(source-atop 頂光/底暗)，不再用逐塊硬邊高光/陰影。
    const R2=Math.max(48,Math.ceil(r*3.0));
    const oc=drawCreatureTop._oc||(drawCreatureTop._oc=document.createElement("canvas"));
    const g=drawCreatureTop._g||(drawCreatureTop._g=oc.getContext("2d"));
    if(oc.width!==R2*2){ oc.width=R2*2; oc.height=R2*2; }
    g.setTransform(1,0,0,1,R2,R2); g.clearRect(-R2,-R2,R2*2,R2*2);
    g.save(); g.scale(1,breath);
    // 尾巴（貓/鹿/鬣蜥各異，畫在最底層）
    if(u.kind==="leopard"||u.kind==="deer"||u.kind==="iguana"||u.kind==="anole"||u.kind==="skink"||u.kind==="muntjac"||u.kind==="macaque"||u.kind==="pangolin"||u.kind==="yellowmarten"){
      const tw=Math.sin(gt*3+u.phase)*r*0.4, tl=(u.kind==="iguana"||u.kind==="anole"||u.kind==="skink")?1.7:(u.kind==="pangolin")?1.5:(u.kind==="macaque"||u.kind==="yellowmarten")?1.5:u.kind==="muntjac"?1.05:1.35;
      const tlw=(u.kind==="deer"||u.kind==="muntjac")?0.12:(u.kind==="macaque")?0.1:(u.kind==="skink")?0.14:(u.kind==="pangolin")?0.28:(u.kind==="yellowmarten")?0.16:0.2;
      g.strokeStyle=INK; g.lineWidth=r*tlw+OUT*0.8; g.lineCap="round";
      g.beginPath(); g.moveTo(-bLen*0.8,0); g.quadraticCurveTo(-r*(tl*0.85),tw,-r*tl,tw*1.5); g.stroke();
      g.strokeStyle=col; g.lineWidth=r*tlw;
      g.beginPath(); g.moveTo(-bLen*0.8,0); g.quadraticCurveTo(-r*(tl*0.85),tw,-r*tl,tw*1.5); g.stroke(); g.lineCap="butt"; }
    // 尾鰭（鮭魚洄游擺尾，取代四足動物尾巴）
    if(fish){ const sw2=Math.sin(gt*7+u.phase)*0.35;
      g.save(); g.translate(-bLen*0.92,0); g.rotate(sw2); g.fillStyle=INK;
      g.beginPath(); g.moveTo(0,0); g.lineTo(-r*0.62,-r*0.5); g.lineTo(-r*0.2,0); g.lineTo(-r*0.62,r*0.5); g.closePath(); g.fill();
      g.fillStyle=shade(col,-10);
      g.beginPath(); g.moveTo(r*0.06,0); g.lineTo(-r*0.5,-r*0.4); g.lineTo(-r*0.16,0); g.lineTo(-r*0.5,r*0.4); g.closePath(); g.fill();
      g.restore(); }
    // 共用座標（腳、頭、耳）
    const hx=bLen*(bird?0.62:fish?0.82:0.72), hr=r*(bird?0.32:fish?0.34:0.46);
    const sw=walk*r*0.38, lr=r*(u.kind==="bear"?0.19:(u.kind==="deer"||u.kind==="muntjac")?0.1:0.15);
    // 四肢：每條腿有 [附著x, 附著y, 腳掌x, 腳掌y, 步態相位]，前肢朝前外、後肢朝後外，
    // 爬蟲/青蛙外張更誇張；鳥為雙腿。有明確前後之分＋站姿，不再是身體下塞四顆蛋。
    const reptile=(u.kind==="iguana"||u.kind==="anole"||u.kind==="skink"), ungulate=(u.kind==="deer"||u.kind==="muntjac"), frogK=(u.kind==="frog"||u.kind==="canetoad");
    const lizardSplay=reptile?1.5:ungulate?1.3:1.0;
    const lyA=bW*0.72, lyF=bW*(reptile?1.5:ungulate?1.55:1.02), lxf=bLen*0.5, lxb=bLen*0.52;
    const footFx=reptile?bLen*0.28:ungulate?bLen*0.6:bLen*0.66, footBx=reptile?-bLen*0.72:ungulate?-bLen*0.64:-bLen*0.7;
    // 獼猴：靈長類四肢——前肢(手臂)細長朝前伸、後肢(腿)屈蹲朝外，手腳較小
    const macaqueK=(u.kind==="macaque");
    // 青蛙：前腿短小朝前、後腿肥大屈膝朝後外（蹲姿），另用專屬座標
    const limbs=bird?
      [[-bLen*0.08,-lyA*0.5, -bLen*0.05,bW*1.35, 1,1],[-bLen*0.08,lyA*0.5, -bLen*0.05,bW*1.35, -1,1]]
      :macaqueK?
      [[bLen*0.55,-bW*0.6, bLen*1.05,-bW*1.15, 1,0.75],[bLen*0.55,bW*0.6, bLen*1.05,bW*1.15, -1,0.75],
       [-bLen*0.5,-bW*0.7, -bLen*0.85,-bW*1.25, -1,0.8],[-bLen*0.5,bW*0.7, -bLen*0.85,bW*1.25, 1,0.8]]
      :frogK?
      [[bLen*0.5,-bW*0.55, bLen*0.85,-bW*0.85, 1,0.8],[bLen*0.5,bW*0.55, bLen*0.85,bW*0.85, -1,0.8],
       [-bLen*0.2,-bW*0.7, -bLen*0.95,-bW*1.15, -1,1.6],[-bLen*0.2,bW*0.7, -bLen*0.95,bW*1.15, 1,1.6]]
      :[[lxf,-lyA, footFx,-lyF*lizardSplay, 1,1],[lxf,lyA, footFx,lyF*lizardSplay, -1,1],
        [-lxb,-lyA, footBx,-lyF*lizardSplay, -1,1],[-lxb,lyA, footBx,lyF*lizardSplay, 1,1]];
    const earR=hr*(u.kind==="bear"?0.5:u.kind==="macaque"?0.4:0.44);
    const noLegs=flyer||fish||u.kind==="snail"||u.kind==="python";
    const limbW=r*(u.kind==="bear"?0.2:u.kind==="deer"||u.kind==="muntjac"?0.13:u.kind==="macaque"?0.11:reptile?0.09:0.15);
    // 一條腿：大腿骨（描邊）+ 腳掌（橢圓），可帶步態擺動
    function drawLimb(L,wOut,limbCol,footCol2){ const ph=L[4]*sw, sc=L[5]||1, flr=lr*sc;
      const ax=L[0], ay=L[1], fx=L[2]+ph, fy=L[3];
      g.strokeStyle=wOut>0?INK:limbCol; g.lineWidth=limbW*sc+wOut; g.lineCap="round";
      g.beginPath(); g.moveTo(ax,ay); g.lineTo(fx,fy); g.stroke();
      if(wOut>0){ g.fillStyle=INK; g.beginPath(); g.ellipse(fx,fy,flr+wOut*0.7,flr*0.9+wOut*0.7,L[4]*0.3,0,7); g.fill(); }
      else { g.fillStyle=footCol2; g.beginPath(); g.ellipse(fx,fy,flr,flr*0.9,L[4]*0.3,0,7); g.fill();
        g.strokeStyle="rgba(0,0,0,0.25)"; g.lineWidth=Math.max(1,r*0.03);
        for(const tn of [-0.4,0,0.4]){ g.beginPath(); g.moveTo(fx+tn*flr,fy+fy*0.02); g.lineTo(fx+tn*flr*1.5,fy+(fy>0?flr:-flr)*0.9); g.stroke(); } } }
    g.lineCap="butt";

    // 頸子（鹿/山羌/獼猴有明顯頸部，接在頭與身體之間，讓側影一眼不同）
    const necked=(u.kind==="deer"||u.kind==="muntjac"||u.kind==="macaque");
    const neckW=hr*(u.kind==="macaque"?0.72:0.6);
    function drawNeck(w){ g.save(); g.lineCap="round"; g.lineWidth=neckW*2+w; g.strokeStyle=g.strokeStyle;
      g.beginPath(); g.moveTo(bLen*0.55,0); g.lineTo(hx-hr*0.2,0); g.stroke(); g.restore(); }
    // 有吻部（鼻口向前突出）的哺乳類，用長吻取代圓臉
    const snouted=(u.kind==="leopard"||u.kind==="bear"||u.kind==="deer"||u.kind==="muntjac"||u.kind==="pangolin"||u.kind==="yellowmarten");
    const snoutL=hr*(u.kind==="bear"?0.7:u.kind==="leopard"?0.55:u.kind==="deer"?0.62:u.kind==="pangolin"?0.85:u.kind==="yellowmarten"?0.7:0.58), snoutW=hr*(u.kind==="bear"?0.55:u.kind==="deer"||u.kind==="muntjac"?0.36:u.kind==="pangolin"?0.3:u.kind==="yellowmarten"?0.32:0.42);

    // ===== 第一遍：黑色輪廓底（整隻放大一圈，畫出唯一乾淨外框，不再有接縫）=====
    g.fillStyle=INK;
    if(!noLegs) for(const L of limbs){ drawLimb(L,OUT*1.2); }
    if(necked){ g.strokeStyle=INK; drawNeck(OUT*1.4); }
    bodyPathTop(g,u.kind,bLen,bW,OUT); g.fill();
    if(earKind) for(const s of [-1,1]){ g.beginPath(); g.arc(hx-hr*0.15,s*hr*0.9,earR+OUT*0.7,0,7); g.fill(); }
    g.beginPath(); g.arc(hx,0,hr+OUT,0,7); g.fill();
    if(snouted){ g.beginPath(); g.ellipse(hx+hr*0.62,0,snoutL+OUT*0.7,snoutW+OUT*0.7,0,0,7); g.fill(); }
    else if(mammal){ g.beginPath(); g.ellipse(hx+hr*0.58,0,hr*0.5+OUT*0.7,hr*0.4+OUT*0.7,0,0,7); g.fill(); }
    if(u.kind==="frog"||u.kind==="canetoad"){ g.beginPath(); g.arc(hx,-hr*0.8,hr*0.5+OUT*0.6,0,7); g.arc(hx,hr*0.8,hr*0.5+OUT*0.6,0,7); g.fill(); }
    // 蝸牛肌肉腹足（伸長超出殼、前端圓、拖尾尖）
    if(u.kind==="snail"){ g.beginPath(); g.moveTo(hx+hr*1.1+OUT,0); g.bezierCurveTo(hx+hr*0.6,-bW*0.62-OUT,-bLen*0.4,-bW*0.5-OUT,-bLen*1.2-OUT,0);
      g.bezierCurveTo(-bLen*0.4,bW*0.5+OUT,hx+hr*0.6,bW*0.62+OUT,hx+hr*1.1+OUT,0); g.closePath(); g.fill(); }

    // ===== 第二遍：平塗正色（不再逐一描邊，靠底圖露邊當外框；立體感留給最後的整體頂光/底暗）=====
    if(!noLegs){ const cc=hex(col), lum=cc[0]*0.299+cc[1]*0.587+cc[2]*0.114; const footCol=lum<95?shade(col,58):shade(col,-38);
      const limbCol=shade(col,-10);
      for(const L of limbs){ drawLimb(L,0,limbCol,footCol); } }
    if(necked){ g.strokeStyle=col; drawNeck(0); }
    bodyPathTop(g,u.kind,bLen,bW,0); g.fillStyle=u.hitT>0?"#fff":col; g.fill();
    const BELLY=kbelly(u.kind), PAT=kpat(u.kind);
    // 腹部/次要色：在身體剪影內畫一塊較淺的腹面（用 clip 保證不出框）
    if(!(u.hitT>0) && (mammal||fish||bird||u.kind==="iguana"||u.kind==="anole"||u.kind==="skink"||u.kind==="frog"||u.kind==="canetoad")){
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip(); g.fillStyle=BELLY;
      if(fish){ g.beginPath(); g.ellipse(-bLen*0.05,bW*0.42,bLen*0.95,bW*0.62,0,0,7); g.fill(); } // 鮭魚銀白腹
      else if(bird){ g.beginPath(); g.ellipse(bLen*0.35,0,bLen*0.55,bW*0.7,0,0,7); g.fill(); }   // 鳥胸腹淺色
      else { g.beginPath(); g.ellipse(bLen*0.05,bW*0.5,bLen*0.85,bW*0.62,0,0,7); g.fill(); }       // 哺乳/蜥蜴腹面
      g.restore(); }
    // 背部花紋 / 殼 / 棘（放大加深、小尺寸也讀得出）
    if(u.kind==="leopard"){ // 成列黑褐色斑點（石虎標誌）
      g.fillStyle=PAT; for(const o of [[-.5,-.28],[-.22,-.34],[.08,-.3],[.34,-.2],[-.36,.02],[-.06,-.02],[.24,.06],[-.5,.3],[-.2,.34],[.12,.3],[.36,.2]]){
        g.beginPath(); g.ellipse(o[0]*bLen,o[1]*bW*1.15,r*0.11,r*0.09,0,0,7); g.fill(); } }
    else if(u.kind==="bear"){ // 胸前白 V（俯視角於前胸）
      g.strokeStyle=PAT; g.lineWidth=r*0.16; g.lineCap="round";
      g.beginPath(); g.moveTo(bLen*0.6,-bW*0.42); g.lineTo(bLen*0.82,0); g.lineTo(bLen*0.6,bW*0.42); g.stroke(); g.lineCap="butt"; }
    else if(u.kind==="deer"){ // 明顯白斑列 + 背中線
      g.strokeStyle="rgba(120,80,40,0.45)"; g.lineWidth=r*0.05; g.beginPath(); g.moveTo(bLen*0.5,0); g.lineTo(-bLen*0.85,0); g.stroke();
      g.fillStyle=PAT; for(const o of [[-.55,-.42],[-.55,.42],[-.28,-.5],[-.28,.5],[0,-.42],[0,.42],[.28,-.34],[.28,.34],[-.42,0],[-.14,0],[.14,0]]){
        g.beginPath(); g.arc(o[0]*bLen,o[1]*bW,r*0.075,0,7); g.fill(); } }
    else if(u.kind==="snail"){ // 福壽螺：肉色腹足 + 褐色螺殼（同心旋紋）
      g.fillStyle=u.hitT>0?"#fff":"#ddcca8"; g.beginPath(); g.moveTo(hx+hr*1.1,0); g.bezierCurveTo(hx+hr*0.6,-bW*0.62,-bLen*0.4,-bW*0.5,-bLen*1.2,0);
      g.bezierCurveTo(-bLen*0.4,bW*0.5,hx+hr*0.6,bW*0.62,hx+hr*1.1,0); g.closePath(); g.fill();
      g.strokeStyle="rgba(120,100,70,0.35)"; g.lineWidth=Math.max(1,r*0.03); g.beginPath(); g.moveTo(hx+hr*0.9,0); g.lineTo(-bLen*1.0,0); g.stroke(); // 足面中溝
      g.fillStyle=shade(col,-6); g.beginPath(); g.arc(-bLen*0.02,-bW*0.12,bW*1.02,0,7); g.fill();  // 殼（略偏後上）
      g.fillStyle=shade(col,22); g.beginPath(); g.arc(bLen*0.06,-bW*0.3,bW*0.6,0,7); g.fill();
      g.strokeStyle=PAT; g.lineWidth=r*0.14; g.lineCap="round"; g.beginPath();
      for(let a=0;a<20;a++){ const rr=bW*0.98*(1-a/24),px=-bLen*0.02+Math.cos(a*0.85)*rr,py=-bW*0.12+Math.sin(a*0.85)*rr; a?g.lineTo(px,py):g.moveTo(px,py); } g.stroke(); g.lineCap="butt"; }
    else if(u.kind==="iguana"){ // 翠綠橫紋 + 背棘（更綠更清楚）
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      g.fillStyle="rgba(30,90,25,0.5)"; for(let i=-3;i<=3;i++){ g.beginPath(); g.ellipse(i*bLen*0.24,0,bLen*0.07,bW*1.1,0,0,7); g.fill(); } g.restore();
      g.fillStyle=shade(col,-22); for(let i=-4;i<=4;i++){ g.beginPath(); g.moveTo(i*bLen*0.14,-bW*0.55); g.lineTo(i*bLen*0.14-r*0.05,-bW*1.02); g.lineTo(i*bLen*0.14+r*0.05,-bW*0.55); g.closePath(); g.fill(); } }
    else if(u.kind==="anole"){ // 沙氏變色蜥：褐體側深色菱斑 + 攻擊展開紅喉扇
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      g.fillStyle="rgba(45,32,12,0.5)"; for(let i=-2;i<=2;i++){ g.beginPath(); g.ellipse(i*bLen*0.32,0,bLen*0.08,bW*0.9,0,0,7); g.fill(); } g.restore();
      if(angry||u.atkA>0){ g.fillStyle="#e05a3a"; g.beginPath(); g.moveTo(hx+hr*0.3,0); g.lineTo(hx+hr*1.0,hr*1.6); g.lineTo(hx-hr*0.3,hr*0.3); g.closePath(); g.fill();
        g.strokeStyle="rgba(0,0,0,0.3)"; g.lineWidth=Math.max(1,r*0.03); g.stroke(); } }
    else if(u.kind==="frog"){ // 斑腿樹蛙：褐綠底深色不規則斑（腿部條紋於腳）
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip(); g.fillStyle=PAT;
      for(const o of [[-.28,-.32],[.14,.36],[.3,-.22],[-.1,.05],[.02,-.4]]){ g.beginPath(); g.ellipse(o[0]*bLen*1.1,o[1]*bW,r*0.14,r*0.1,0.5,0,7); g.fill(); } g.restore(); }
    else if(u.kind==="canetoad"){ // 海蟾蜍：粗糙疣粒 + 耳後大型毒腺（招牌特徵）
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      g.fillStyle=shade(col,-24); // 全身褐色疣粒
      for(const o of [[-.4,-.4],[-.15,.42],[.2,-.35],[.1,.15],[-.3,.05],[.35,.28],[-.05,-.15],[.28,-.1]]){ g.beginPath(); g.arc(o[0]*bLen,o[1]*bW,r*0.09,0,7); g.fill(); }
      g.restore();
      // 耳後毒腺（parotoid gland）：頭部兩側鼓起的大橢圓，深褐帶高光
      g.fillStyle=shade(col,-30); for(const s of [-1,1]){ g.beginPath(); g.ellipse(hx-hr*0.55,s*hr*0.95,hr*0.6,hr*0.42,s*0.3,0,7); g.fill(); }
      g.fillStyle="rgba(255,255,255,0.18)"; for(const s of [-1,1]){ g.beginPath(); g.ellipse(hx-hr*0.65,s*hr*0.85,hr*0.28,hr*0.18,s*0.3,0,7); g.fill(); } }
    else if(u.kind==="python"){ // 緬甸蟒：黃棕底 + 深褐網狀鞍斑（沿背脊成列）
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      g.fillStyle=PAT; for(let i=-4;i<=4;i++){ const px=i*bLen*0.22;
        g.beginPath(); g.moveTo(px-bLen*0.06,-bW*0.9); g.quadraticCurveTo(px+bLen*0.04,0,px-bLen*0.06,bW*0.9);
        g.quadraticCurveTo(px+bLen*0.12,0,px-bLen*0.06,-bW*0.9); g.closePath(); g.fill(); }
      // 網紋淺色鑲邊
      g.strokeStyle="rgba(240,225,170,0.5)"; g.lineWidth=Math.max(1,r*0.03);
      for(let i=-4;i<=4;i++){ const px=i*bLen*0.22; g.beginPath(); g.ellipse(px,0,bLen*0.09,bW*0.85,0,0,7); g.stroke(); }
      g.restore(); }
    else if(u.kind==="skink"){ // 多線南蜥：古銅褐底 + 數條深色縱紋（招牌「多線」特徵）
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      g.strokeStyle=PAT; g.lineWidth=Math.max(1.2,r*0.05);
      for(const yy of [-0.55,-0.2,0.2,0.55]){ g.beginPath(); g.moveTo(bLen*0.9,yy*bW); g.lineTo(-bLen*0.95,yy*bW*0.6); g.stroke(); }
      g.strokeStyle="rgba(240,230,200,0.45)"; g.lineWidth=Math.max(1,r*0.03);
      for(const yy of [-0.38,0.38]){ g.beginPath(); g.moveTo(bLen*0.85,yy*bW); g.lineTo(-bLen*0.9,yy*bW*0.6); g.stroke(); }
      g.restore(); }
    else if(u.kind==="muntjac"){ // 山羌暗紅褐、背中線深
      g.strokeStyle=PAT; g.lineWidth=r*0.06; g.beginPath(); g.moveTo(bLen*0.4,0); g.lineTo(-bLen*0.6,0); g.stroke(); }
    else if(u.kind==="macaque"){ // 台灣獼猴：背灰褐 + 腹淺，臀部白斑
      g.fillStyle="rgba(255,255,255,0.4)"; g.beginPath(); g.ellipse(-bLen*0.5,0,bLen*0.22,bW*0.5,0,0,7); g.fill(); }
    else if(u.kind==="pangolin"){ // 穿山甲：覆瓦狀角質鱗甲（招牌特徵），由頭至尾成列三角鱗
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      for(let row=-1;row<=3;row++){ const cols=4-Math.abs(row-1); const px0=-bLen*0.7+row*bLen*0.34;
        for(let cc2=-cols;cc2<=cols;cc2++){ const py=cc2*bW*0.26+(row%2?bW*0.13:0), px=px0;
          g.fillStyle=shade(col,-8+((cc2+row)%2)*22); g.beginPath();
          g.moveTo(px-bLen*0.14,py); g.lineTo(px+bLen*0.02,py-bW*0.24); g.lineTo(px+bLen*0.18,py); g.lineTo(px+bLen*0.02,py+bW*0.24); g.closePath(); g.fill();
          g.strokeStyle="rgba(60,42,20,0.55)"; g.lineWidth=Math.max(1,r*0.03); g.stroke(); } }
      g.restore(); }
    else if(u.kind==="yellowmarten"){ // 黃喉貂：深褐體 + 鮮黃喉胸斑（招牌特徵，位於前胸/頸下）
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      g.fillStyle=PAT; g.beginPath(); g.ellipse(bLen*0.42,0,bLen*0.36,bW*0.72,0,0,7); g.fill(); // 黃喉胸
      g.fillStyle="rgba(255,255,255,0.25)"; g.beginPath(); g.ellipse(-bLen*0.55,0,bLen*0.28,bW*0.5,0,0,7); g.fill(); // 尾根較淺
      g.restore(); }
    else if(fish){ // 櫻花鉤吻鮭：側面粉紅縱帶 + 黑點
      g.save(); bodyPathTop(g,u.kind,bLen,bW,0); g.clip();
      g.fillStyle="rgba(45,90,70,0.5)"; g.beginPath(); g.ellipse(0,-bW*0.45,bLen*0.95,bW*0.55,0,0,7); g.fill(); // 背側青綠
      g.strokeStyle=PAT; g.lineWidth=r*0.14; g.beginPath(); g.moveTo(bLen*0.7,-bW*0.05); g.quadraticCurveTo(0,bW*0.1,-bLen*0.75,-bW*0.02); g.stroke(); // 粉紅縱帶
      g.fillStyle="rgba(30,25,20,0.7)"; for(const o of [[-.55,-.35],[-.25,-.5],[.05,-.4],[.35,-.3],[-.4,-.15],[-.1,-.2],[.2,-.15]]){ g.beginPath(); g.arc(o[0]*bLen,o[1]*bW,r*0.05,0,7); g.fill(); } // 黑點
      g.restore(); }
    // 耳：正色 + 粉內耳（外框已由底圖給了，這裡不再描邊）
    if(earKind) for(const s of [-1,1]){ g.fillStyle=shade(col,10); g.beginPath(); g.arc(hx-hr*0.15,s*hr*0.9,earR,0,7); g.fill();
      if(u.kind!=="bear"){ g.fillStyle="#e79ab0"; g.beginPath(); g.arc(hx-hr*0.1,s*hr*0.9,earR*0.5,0,7); g.fill(); } }
    // 頭：正色（獼猴為粉膚色臉、鮭魚頭偏暗青）
    const headCol=u.hitT>0?"#fff":(u.kind==="macaque"?"#e8b3a2":u.kind==="salmon"?shade(col,-20):shade(col,14));
    g.beginPath(); g.arc(hx,0,hr,0,7); g.fillStyle=headCol; g.fill();
    // 獼猴粉紅裸臉（正面圓盤）
    if(u.kind==="macaque" && !(u.hitT>0)){ g.fillStyle="#f0c0b2"; g.beginPath(); g.ellipse(hx+hr*0.25,0,hr*0.62,hr*0.78,0,0,7); g.fill();
      g.fillStyle="rgba(120,70,55,0.25)"; g.beginPath(); g.arc(hx+hr*0.55,0,hr*0.16,0,7); g.fill(); } // 口鼻凸
    // 口鼻（吻部）：石虎/熊/鹿/山羌長吻，其他哺乳圓鼻
    if(snouted){ g.fillStyle=u.hitT>0?"#fff":(u.kind==="bear"?shade(col,32):lite); g.beginPath(); g.ellipse(hx+hr*0.62,0,snoutL,snoutW,0,0,7); g.fill();
      if(u.kind==="leopard"){ g.strokeStyle="rgba(255,255,255,0.75)"; g.lineWidth=r*0.045; for(const s of [-1,1]){ g.beginPath(); g.moveTo(hx+hr*0.35,s*hr*0.5); g.lineTo(hx-hr*0.15,s*hr*0.85); g.stroke(); } } } // 石虎額白紋
    else if(mammal){ g.fillStyle=u.hitT>0?"#fff":lite; g.beginPath(); g.ellipse(hx+hr*0.58,0,hr*0.5,hr*0.4,0,0,7); g.fill(); }
    // 鮭魚鉤吻（成熟雄魚下顎上鉤，招牌特徵）
    if(fish){ g.fillStyle=u.hitT>0?"#fff":shade(col,-28); g.beginPath();
      g.moveTo(hx+hr*0.4,hr*0.1); g.quadraticCurveTo(hx+hr*1.35,hr*0.55,hx+hr*1.05,-hr*0.15); g.quadraticCurveTo(hx+hr*0.9,-hr*0.05,hx+hr*0.4,-hr*0.05); g.closePath(); g.fill(); }
    // 青蛙/海蟾蜍凸眼底座
    if(u.kind==="frog"||u.kind==="canetoad"){ g.fillStyle=shade(col,25); g.beginPath(); g.arc(hx,-hr*0.8,hr*0.5,0,7); g.arc(hx,hr*0.8,hr*0.5,0,7); g.fill(); }
    // 緬甸蟒：吐信（分岔紅舌，招牌蛇類特徵，攻擊時更長）
    if(u.kind==="python"){ const tl2=hr*(1+(u.atkA>0?1.2:0.5)*(0.6+0.4*Math.sin(gt*9+u.phase)));
      g.strokeStyle="#d81b60"; g.lineWidth=Math.max(1,r*0.04); g.lineCap="round";
      g.beginPath(); g.moveTo(hx+hr*0.7,0); g.lineTo(hx+hr*0.7+tl2,0); g.stroke();
      g.beginPath(); g.moveTo(hx+hr*0.7+tl2,0); g.lineTo(hx+hr*0.7+tl2*1.35,-hr*0.22); g.moveTo(hx+hr*0.7+tl2,0); g.lineTo(hx+hr*0.7+tl2*1.35,hr*0.22); g.stroke(); g.lineCap="butt"; }
    // 鹿角
    if(u.kind==="deer"){ g.strokeStyle="#6d4c2f"; g.lineWidth=r*0.08+2; g.lineCap="round";
      for(const s of [-1,1]){ g.beginPath(); g.moveTo(hx,s*hr*0.6); g.lineTo(hx+r*0.4,s*hr*1.3); g.moveTo(hx+r*0.22,s*hr*1.0); g.lineTo(hx+r*0.45,s*hr*0.6); g.stroke(); }
      g.strokeStyle="#8d6e63"; g.lineWidth=r*0.08;
      for(const s of [-1,1]){ g.beginPath(); g.moveTo(hx,s*hr*0.6); g.lineTo(hx+r*0.4,s*hr*1.3); g.moveTo(hx+r*0.22,s*hr*1.0); g.lineTo(hx+r*0.45,s*hr*0.6); g.stroke(); } g.lineCap="butt"; }
    // 山羌短角（僅雄性微凸，簡化呈現）
    if(u.kind==="muntjac"){ g.strokeStyle="#7a5230"; g.lineWidth=r*0.06+1.4; g.lineCap="round";
      for(const s of [-1,1]){ g.beginPath(); g.moveTo(hx,s*hr*0.55); g.lineTo(hx+r*0.18,s*hr*0.9); g.stroke(); } g.lineCap="butt"; }
    // 鮭魚背鰭（洄游意象，畫在身體中段）
    if(fish){ g.fillStyle=shade(col,-18); g.beginPath(); g.moveTo(-r*0.05,-bW*0.9); g.lineTo(r*0.15,-bW*1.7); g.lineTo(r*0.35,-bW*0.85); g.closePath(); g.fill();
      g.strokeStyle="rgba(0,0,0,0.2)"; g.lineWidth=Math.max(1,r*0.03); g.stroke(); }
    // 鳥翼（俯視：雙翼收合貼背、尖端朝後；小尺寸可讀——用單一乾淨葉形+一道飛羽切痕）
    if(bird){ const wf=u.moving?bW*0.12*Math.abs(Math.sin(gt*10+u.phase)):bW*0.04;
      const wingCol=u.kind==="magpie"?"#123f8c":u.kind==="pheasant"?"#1a2a52":"#eef1f6";
      const tipCol=u.kind==="ibis"?"#111":shade(wingCol,-34);
      for(const s of [-1,1]){ const wy=s*(bW*0.52+wf);
        // 收合翼：前寬後尖的葉形（葉尖朝後）
        g.fillStyle=INK; g.beginPath(); g.moveTo(bLen*0.35,wy*0.5); g.quadraticCurveTo(-bLen*0.1,wy*1.5,-bLen*0.78,wy*0.7); g.quadraticCurveTo(-bLen*0.1,wy*0.2,bLen*0.35,wy*0.5); g.fill();
        g.fillStyle=wingCol; g.beginPath(); g.moveTo(bLen*0.3,wy*0.55); g.quadraticCurveTo(-bLen*0.08,wy*1.4,-bLen*0.72,wy*0.72); g.quadraticCurveTo(-bLen*0.08,wy*0.28,bLen*0.3,wy*0.55); g.fill();
        // 翼尖深色（初級飛羽，單塊粗色，小尺寸也看得出）
        g.fillStyle=tipCol; g.beginPath(); g.moveTo(-bLen*0.4,wy*0.95); g.quadraticCurveTo(-bLen*0.8,wy*0.75,-bLen*0.72,wy*0.55); g.quadraticCurveTo(-bLen*0.55,wy*0.85,-bLen*0.4,wy*0.95); g.fill(); }
      // 尾羽扇（單塊三角扇，收窄朝後；高對比）
      const tailCol=u.kind==="ibis"?INK:wingCol;
      g.fillStyle=INK; g.beginPath(); g.moveTo(-bLen*0.6,-bW*0.32); g.lineTo(-bLen*1.28,-bW*0.5); g.lineTo(-bLen*1.4,0); g.lineTo(-bLen*1.28,bW*0.5); g.lineTo(-bLen*0.6,bW*0.32); g.closePath(); g.fill();
      g.fillStyle=tailCol; g.beginPath(); g.moveTo(-bLen*0.58,-bW*0.24); g.lineTo(-bLen*1.18,-bW*0.4); g.lineTo(-bLen*1.28,0); g.lineTo(-bLen*1.18,bW*0.4); g.lineTo(-bLen*0.58,bW*0.24); g.closePath(); g.fill();
      // 尾羽分隔線（兩道，增加羽片辨識）
      g.strokeStyle="rgba(0,0,0,0.3)"; g.lineWidth=Math.max(1,r*0.03);
      for(const s of [-1,1]){ g.beginPath(); g.moveTo(-bLen*0.7,s*bW*0.1); g.lineTo(-bLen*1.24,s*bW*0.22); g.stroke(); }
      // 鳥腳（兩隻細腳伸出腹側）
      g.strokeStyle="#d9a23a"; if(u.kind==="ibis") g.strokeStyle="#333"; g.lineWidth=Math.max(1.4,r*0.05); g.lineCap="round";
      for(const s of [-1,1]){ g.beginPath(); g.moveTo(bLen*0.1,s*bW*0.3); g.lineTo(bLen*0.05,s*bW*0.95); g.stroke(); } g.lineCap="butt"; }
    // 鳥喙 + 藍鵲/藍腹鷴長尾
    if(bird){ g.fillStyle=INK; g.beginPath(); g.moveTo(hx+hr*0.55,-hr*0.2); g.lineTo(hx+hr*(u.kind==="ibis"?2.65:1.55),u.kind==="ibis"?hr*0.55:0); g.lineTo(hx+hr*0.55,hr*0.2); g.closePath(); g.fill();
      g.fillStyle=u.kind==="ibis"?"#333":"#e8a13a"; g.beginPath(); g.moveTo(hx+hr*0.6,-hr*0.15); g.lineTo(hx+hr*(u.kind==="ibis"?2.6:1.5),u.kind==="ibis"?hr*0.5:0); g.lineTo(hx+hr*0.6,hr*0.15); g.closePath(); g.fill();
      if(u.kind==="ibis"){ g.fillStyle="#222"; g.beginPath(); g.arc(hx,0,hr*0.9,0,7); g.fill(); }
      if(u.kind==="magpie"){ g.strokeStyle=INK; g.lineWidth=r*0.26+3; g.lineCap="round"; g.beginPath(); g.moveTo(-bLen*0.8,0); g.lineTo(-r*1.7,Math.sin(gt*3+u.phase)*r*0.25); g.stroke();
        g.strokeStyle="#1565c0"; g.lineWidth=r*0.26; g.beginPath(); g.moveTo(-bLen*0.8,0); g.lineTo(-r*1.7,Math.sin(gt*3+u.phase)*r*0.25); g.stroke(); g.lineCap="butt"; }
      if(u.kind==="pheasant"){ g.strokeStyle=INK; g.lineWidth=r*0.22+3; g.lineCap="round"; g.beginPath(); g.moveTo(-bLen*0.8,0); g.lineTo(-r*2.0,Math.sin(gt*2.5+u.phase)*r*0.2); g.stroke();
        g.strokeStyle="#1a2f5c"; g.lineWidth=r*0.22; g.beginPath(); g.moveTo(-bLen*0.8,0); g.lineTo(-r*2.0,Math.sin(gt*2.5+u.phase)*r*0.2); g.stroke(); g.lineCap="butt";
        g.fillStyle="#c0392b"; g.beginPath(); g.ellipse(hx-hr*0.1,0,hr*0.32,hr*0.24,0,0,7); g.fill(); } // 紅色肉垂
      if(u.kind==="mikado"){ // 帝雉：更長的藍黑尾羽 + 白色橫帶（招牌特徵）+ 眼周紅斑
        const ty=Math.sin(gt*2.3+u.phase)*r*0.18, tex=-r*2.3;
        g.strokeStyle=INK; g.lineWidth=r*0.2+3; g.lineCap="round"; g.beginPath(); g.moveTo(-bLen*0.8,0); g.lineTo(tex,ty); g.stroke();
        g.strokeStyle="#12203f"; g.lineWidth=r*0.2; g.beginPath(); g.moveTo(-bLen*0.8,0); g.lineTo(tex,ty); g.stroke(); g.lineCap="butt";
        // 白色橫帶：沿尾羽等距畫短白條
        g.strokeStyle="#f2f5fb"; g.lineWidth=r*0.09;
        for(const tt of [0.35,0.55,0.75,0.92]){ const bx=-bLen*0.8+(tex-(-bLen*0.8))*tt, by=ty*tt;
          g.beginPath(); g.moveTo(bx,by-r*0.14); g.lineTo(bx,by+r*0.14); g.stroke(); }
        g.fillStyle="#e5342a"; g.beginPath(); g.ellipse(hx+hr*0.1,0,hr*0.34,hr*0.26,0,0,7); g.fill(); } } // 眼周紅斑
    // 蝸牛觸角（末端小眼點）
    if(u.kind==="snail"){ g.strokeStyle=shade(col,-20); g.lineWidth=r*0.06; g.lineCap="round"; for(const s of [-1,1]){ g.beginPath(); g.moveTo(hx,s*hr*0.35); g.lineTo(hx+r*0.3,s*hr*0.95); g.stroke();
      g.fillStyle="#2a1a10"; g.beginPath(); g.arc(hx+r*0.3,s*hr*0.95,r*0.05,0,7); g.fill(); } g.lineCap="butt"; }
    // 蜻蜓細長腹部（分節，招牌流線尾）
    if(u.kind==="dragonfly"){ g.strokeStyle=INK; g.lineWidth=r*0.22+OUT; g.lineCap="round"; g.beginPath(); g.moveTo(-bLen*0.3,0); g.lineTo(-bLen*1.7,0); g.stroke();
      g.strokeStyle=col; g.lineWidth=r*0.22; g.beginPath(); g.moveTo(-bLen*0.3,0); g.lineTo(-bLen*1.7,0); g.stroke();
      g.strokeStyle=shade(col,-30); g.lineWidth=Math.max(1,r*0.04); for(let i=1;i<=5;i++){ const px=-bLen*(0.3+i*0.28); g.beginPath(); g.moveTo(px,-r*0.13); g.lineTo(px,r*0.13); g.stroke(); } g.lineCap="butt"; }
    // 翅（拍動）：蜻蜓四翅透明帶翅脈；蟬雙對膜翅
    if(flyer){ const flap=0.4+0.6*Math.abs(Math.sin(gt*20+u.phase)); g.fillStyle=u.kind==="dragonfly"?"rgba(200,245,252,0.5)":"rgba(214,228,204,0.58)";
      const pairs=u.kind==="dragonfly"?[[r*0.4,1.5],[-r*0.5,1.35]]:[[r*0.15,1.0]];
      for(const s of [-1,1]) for(const w of pairs){ g.save(); g.scale(1,s*flap); g.beginPath(); g.ellipse(w[0],bW*2.1,r*w[1],r*0.3,0.15,0,7); g.fill();
        g.strokeStyle="rgba(120,160,170,0.4)"; g.lineWidth=Math.max(0.8,r*0.02); g.beginPath(); g.moveTo(w[0]-r*w[1]*0.7,bW*2.1); g.lineTo(w[0]+r*w[1]*0.7,bW*2.1); g.stroke(); g.restore(); } }

    // ===== 表情：眼睛 + 嘴巴 + 生氣/得意 特效 =====
    if(u.kind!=="snail"){ const froglike=(u.kind==="frog"||u.kind==="canetoad"); const eyx=froglike?hx:hx+hr*0.32, eyy=froglike?hr*0.82:hr*0.4, er=hr*0.3;
      if(flyer){ for(const s of [-1,1]){ g.fillStyle=shade(col,-22); g.beginPath(); g.arc(hx+hr*0.15,s*hr*0.55,hr*0.5,0,7); g.fill(); g.fillStyle="rgba(255,255,255,0.45)"; g.beginPath(); g.arc(hx+hr*0.3,s*hr*0.42,hr*0.16,0,7); g.fill(); } }
      else if(proud){ // 得意：瞇眼笑 + 腮紅 + 得意嘴 + 頭上星星
        g.strokeStyle=INK; g.lineWidth=Math.max(1.8,r*0.1); g.lineCap="round";
        for(const s of [-1,1]){ g.beginPath(); g.moveTo(eyx-er*0.85,s*eyy); g.quadraticCurveTo(eyx,s*eyy-s*er*0.95,eyx+er*0.85,s*eyy); g.stroke(); }
        g.lineCap="butt";
        g.fillStyle="rgba(255,138,128,0.55)"; for(const s of [-1,1]){ g.beginPath(); g.ellipse(eyx-hr*0.05,s*eyy*1.7,hr*0.22,hr*0.15,0,0,7); g.fill(); }
        g.strokeStyle=INK; g.lineWidth=Math.max(1.6,r*0.09); g.lineCap="round";
        g.beginPath(); g.moveTo(hx+hr*0.75,-hr*0.12); g.quadraticCurveTo(hx+hr*1.05,hr*0.12,hx+hr*0.55,hr*0.28); g.stroke(); g.lineCap="butt";
        const sp=1+0.25*Math.sin(gt*8); g.fillStyle="#ffd54f";
        for(const sd of [[hr*0.3,-hr*1.5,0.16],[hr*1.1,-hr*0.9,0.11]]){ starG(g,hx+sd[0],sd[1],hr*sd[2]*sp); }
      } else { // 一般 / 生氣
        for(const s of [-1,1]){ g.fillStyle="#fff"; g.beginPath(); g.arc(eyx,s*eyy,er,0,7); g.fill();
          g.strokeStyle="rgba(0,0,0,0.35)"; g.lineWidth=Math.max(0.9,r*0.03); g.stroke();
          g.fillStyle=angry?"#d32f2f":"#3a2a1a"; g.beginPath(); g.arc(eyx+er*0.35,s*eyy,er*0.62,0,7); g.fill();
          g.fillStyle="#1a0f08"; g.beginPath(); g.arc(eyx+er*0.35,s*eyy,er*0.28,0,7); g.fill();
          g.fillStyle="#fff"; g.beginPath(); g.arc(eyx+er*0.08,s*eyy-er*0.35,er*0.3,0,7); g.fill(); }
        if(mammal){ g.fillStyle="#3a2a20"; g.beginPath(); g.arc(hx+hr*0.98,0,hr*0.15,0,7); g.fill(); }
        if(angry){
          g.strokeStyle=INK; g.lineWidth=Math.max(1.4,r*0.07); g.lineCap="round";
          for(const s of [-1,1]){ g.beginPath(); g.moveTo(eyx-hr*0.18,s*eyy-hr*0.52); g.lineTo(eyx+hr*0.42,s*eyy-hr*0.24); g.stroke(); }
          g.lineCap="butt";
          // 青筋（漫畫生氣符號）
          g.strokeStyle="#e53935"; g.lineWidth=Math.max(1.3,r*0.06);
          const vx=hx-hr*0.55, vy=-hr*1.05;
          g.beginPath(); g.moveTo(vx-5,vy); g.lineTo(vx+3,vy+6); g.lineTo(vx-2,vy+5); g.lineTo(vx+6,vy+12); g.stroke();
          if(mammal){ g.fillStyle="#fff"; for(const s of [-1,1]){ g.beginPath(); g.moveTo(hx+hr*0.2,s*hr*0.22); g.lineTo(hx+hr*0.42,s*hr*0.1); g.lineTo(hx+hr*0.42,s*hr*0.3); g.closePath(); g.fill(); } } // 齜牙
        } else if(mammal||u.kind==="frog"||u.kind==="canetoad"){ g.strokeStyle=INK; g.lineWidth=Math.max(1.3,r*0.06); g.lineCap="round";
          g.beginPath(); g.moveTo(hx+hr*0.6,-hr*0.14); g.quadraticCurveTo(hx+hr*0.82,0,hx+hr*0.6,hr*0.14); g.stroke(); g.lineCap="butt"; } } }
    g.restore();
    // 立體上色：頂光 + 底暗，只作用在角色剪影上（source-atop，跟大廳 drawCreature 同一套質感）
    g.save(); g.globalCompositeOperation="source-atop";
    const sg=g.createLinearGradient(0,-R2*0.85,0,R2*0.72);
    sg.addColorStop(0,"rgba(255,255,255,0.30)"); sg.addColorStop(0.45,"rgba(255,255,255,0)"); sg.addColorStop(1,"rgba(0,0,0,0.32)");
    g.fillStyle=sg; g.fillRect(-R2,-R2,R2*2,R2*2);
    g.globalCompositeOperation="source-over"; g.restore();
    // 合成到主畫布（旋轉貼上，跟隨移動方向）
    ctx.save(); ctx.translate(u.x+Math.cos(f)*lunge,gy+Math.sin(f)*lunge*0.4); ctx.rotate(f); if(u.hitT>0) ctx.globalAlpha=0.9;
    ctx.drawImage(oc,-R2,-R2,R2*2,R2*2);
    ctx.restore();
  }
  function drawUnit(u,r,isInv){ const R0=r*kcfg(u.kind).sz;
    if(isInv && u.elite){ // 入侵種王：不祥暗紅光環，隨時提醒這是大威脅
      const pl=0.5+0.5*Math.sin(clock*3+u.phase);
      const aura=ctx.createRadialGradient(u.x,u.y,R0*0.4,u.x,u.y,R0*2.2);
      aura.addColorStop(0,"rgba(180,0,30,"+(0.16+0.1*pl).toFixed(3)+")"); aura.addColorStop(1,"rgba(180,0,30,0)");
      ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(u.x,u.y,R0*2.2,0,7); ctx.fill();
      ctx.strokeStyle="rgba(255,40,40,"+(0.35+0.25*pl).toFixed(3)+")"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(u.x,u.y,R0*1.35,0,7); ctx.stroke(); }
    // 衝撞蓄力預警：紅色扇形箭頭指向衝撞方向，讓玩家有時間反應閃避
    if(isInv && u.chargeT>0){ const pw=1-u.chargeT/0.55;
      ctx.save(); ctx.translate(u.x,u.y); ctx.rotate(u.chargeDir);
      ctx.fillStyle="rgba(255,50,50,"+(0.18+0.35*pw).toFixed(3)+")";
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R0*4.5,-0.28,0.28); ctx.closePath(); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,"+(0.4+0.4*pw).toFixed(3)+")"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(R0*1.3,0); ctx.lineTo(R0*3.8,0); ctx.moveTo(R0*3.2,-8); ctx.lineTo(R0*3.8,0); ctx.lineTo(R0*3.2,8); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle="rgba(255,60,60,0.8)"; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(u.x,u.y,R0*(1+pw*0.5),0,7); ctx.stroke(); }
    drawCreatureTop(u,r,isInv?"inv":"ally"); const R=R0;
    if(isInv){ if(u.elite){ ctx.fillStyle="#ffca28"; ctx.font="bold 11px sans-serif"; ctx.textAlign="center"; ctx.fillText("👑"+KNAME[u.kind]+"王",u.x,u.y-R-12); }
      if(u.hp<u.maxhp) bar(u.x,u.y-R-8,u.elite?40:26,u.hp/u.maxhp,"#ff8a80");
      if(u.stun>0){ ctx.fillStyle="#ffe082"; for(let s=0;s<3;s++){ const a=clock*7+s*2.1; ctx.beginPath(); ctx.arc(u.x+Math.cos(a)*R*0.9,u.y-R-2+Math.sin(a)*3,2.4,0,7); ctx.fill(); } } } }
  // 服裝店買的裝飾在戰場也看得到：畫在守護者頭上/周圍（螢幕空間、不隨朝向旋轉），純程序繪製無粒子洩漏
  function drawCosmeticTop(x,y,R,key){ const t=clock; ctx.save();
    if(key==="crown"){ const cy=y-R-4,w=R*0.7,h=R*0.42; ctx.fillStyle="#ffd54f"; ctx.strokeStyle="#b8860b"; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(x-w/2,cy); ctx.lineTo(x-w/2,cy-h*0.4); ctx.lineTo(x-w*0.25,cy-h); ctx.lineTo(x,cy-h*0.4); ctx.lineTo(x+w*0.25,cy-h); ctx.lineTo(x+w/2,cy-h*0.4); ctx.lineTo(x+w/2,cy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if(key==="bow"){ const cy=y-R-4,r=R*0.22; ctx.fillStyle="#ff6f91"; for(const s of[-1,1]){ ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x+s*r*1.6,cy-r); ctx.lineTo(x+s*r*1.6,cy+r); ctx.closePath(); ctx.fill(); } ctx.fillStyle="#e91e63"; ctx.beginPath(); ctx.arc(x,cy,r*0.5,0,7); ctx.fill(); }
    else if(key==="wreath"){ const n=8; for(let i=0;i<n;i++){ const a=i/n*6.283+t*0.4; ctx.fillStyle=i%2?"#ffb7c5":"#fff59d"; ctx.beginPath(); ctx.arc(x+Math.cos(a)*R*1.2,y+Math.sin(a)*R*1.2,R*0.11,0,7); ctx.fill(); } }
    else if(key==="star"){ ctx.globalCompositeOperation="lighter"; for(let i=0;i<6;i++){ const a=t*1.8+i*1.047, tw=0.5+0.5*Math.sin(t*4+i); ctx.fillStyle="rgba(255,240,150,"+tw.toFixed(2)+")"; ctx.beginPath(); ctx.arc(x+Math.cos(a)*R*1.25,y+Math.sin(a)*R*1.25,R*0.1*tw+1,0,7); ctx.fill(); } }
    else if(key==="leaf"){ for(let i=0;i<5;i++){ const a=t*1.2+i*1.257; ctx.save(); ctx.translate(x+Math.cos(a)*R*1.2,y+Math.sin(a)*R*1.2); ctx.rotate(a+t); ctx.fillStyle=i%2?"#c0894a":"#8a5a2b"; ctx.beginPath(); ctx.ellipse(0,0,R*0.16,R*0.08,0,0,7); ctx.fill(); ctx.restore(); } }
    else if(key==="snow"){ ctx.fillStyle="rgba(255,255,255,0.9)"; for(let i=0;i<8;i++){ const px=x+(-1+((i*0.27)%2))*R, py=y+(((t*0.5+i*0.4)%2)-1)*R; ctx.beginPath(); ctx.arc(px,py,R*0.05,0,7); ctx.fill(); } }
    // 通行證專屬特殊服裝（戰場俯視版）
    else if(key==="halo"){ ctx.globalCompositeOperation="lighter"; ctx.strokeStyle="rgba(255,224,130,0.85)"; ctx.lineWidth=R*0.14; ctx.beginPath(); ctx.ellipse(x,y-R-2,R*0.85,R*0.32,0,0,7); ctx.stroke();
      for(let i=0;i<6;i++){ const a=t*1.4+i*1.047, tw=0.5+0.5*Math.sin(t*4+i); ctx.fillStyle="rgba(255,245,180,"+tw.toFixed(2)+")"; ctx.beginPath(); ctx.arc(x+Math.cos(a)*R*0.85,y-R-2+Math.sin(a)*R*0.32,R*0.09*tw+1,0,7); ctx.fill(); } ctx.globalCompositeOperation="source-over"; }
    else if(key==="flame"){ ctx.globalCompositeOperation="lighter"; for(let i=0;i<10;i++){ const a=i/10*6.283, fl=0.5+0.5*Math.sin(t*8+i*1.7); ctx.fillStyle="rgba(255,"+(110+(fl*110|0))+",40,"+(0.3+fl*0.4).toFixed(2)+")"; ctx.beginPath(); ctx.arc(x+Math.cos(a)*R*1.25,y+Math.sin(a)*R*1.25,R*0.12*(0.6+fl),0,7); ctx.fill(); } ctx.globalCompositeOperation="source-over"; }
    else if(key==="aurora"){ ctx.globalCompositeOperation="lighter"; const cols=["#7cf6c8","#8bd3ff","#c69cff","#8bffdd"]; for(let i=0;i<8;i++){ const a=t*1.5+i*0.785, tw=0.5+0.5*Math.sin(t*3+i); ctx.fillStyle=cols[i%4]; ctx.globalAlpha=0.3+0.35*tw; ctx.beginPath(); ctx.arc(x+Math.cos(a)*R*1.3,y+Math.sin(a)*R*1.3,R*0.11,0,7); ctx.fill(); } ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over"; }
    else if(key==="phoenix"){ for(let i=0;i<6;i++){ const a=-2.4+i*0.5+Math.sin(t*2)*0.05; ctx.save(); ctx.translate(x,y); ctx.rotate(a); const grd=ctx.createLinearGradient(0,-R*0.4,0,-R*1.5); grd.addColorStop(0,"#ffca28"); grd.addColorStop(1,"#ff3d00"); ctx.fillStyle=grd; ctx.beginPath(); ctx.ellipse(0,-R,R*0.11,R*0.5,0,0,7); ctx.fill(); ctx.restore(); } }
    ctx.restore(); }
  function drawHero(h){ const r=h.r, R=r*kcfg(h.kind).sz;
    if(h._cos===undefined) h._cos=(window.__cosmeticOf&&window.__cosmeticOf(h.kind))||"";   // 一次性快取該守護者的裝備服裝，避免逐幀讀 localStorage
    // 手上握有撿到的守護之力：腳下金色脈動光環，提醒可以按【必殺】
    if(h.ult){ const pl=0.5+0.5*Math.sin(clock*4); ctx.save(); ctx.globalCompositeOperation="lighter";
      const ag=ctx.createRadialGradient(h.x,h.y,R*0.3,h.x,h.y,R*1.9); ag.addColorStop(0,"rgba(255,213,79,"+(0.28+0.15*pl).toFixed(3)+")"); ag.addColorStop(1,"rgba(255,213,79,0)");
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(h.x,h.y,R*1.9,0,7); ctx.fill(); ctx.restore();
      ctx.strokeStyle="rgba(255,236,150,"+(0.5+0.4*pl).toFixed(3)+")"; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(h.x,h.y,R*1.35,0,7); ctx.stroke(); }
    const stealthy=h.stealthT>0; if(stealthy) ctx.globalAlpha=0.4;
    drawCreatureTop(h,r,"ally");
    if(stealthy){ ctx.globalAlpha=1; ctx.fillStyle="#b0bec5"; ctx.font="12px sans-serif"; ctx.textAlign="center"; ctx.fillText("👻",h.x,h.y-R-30); }
    if(h._cos && !stealthy) drawCosmeticTop(h.x,h.y,R,h._cos);   // 戰場上顯示裝備的服裝
    if(h.shieldT>0){ ctx.strokeStyle="rgba(77,208,225,0.85)"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(h.x,h.y,R*1.25,0,7); ctx.stroke(); }
    if(h.invulnT>0){ ctx.strokeStyle="rgba(128,222,234,0.7)"; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(h.x,h.y,R*1.15,0,7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.globalAlpha=1;
    if(h===player){ const bY=h.y-R*1.8-Math.sin(clock*4)*3; ctx.fillStyle="#ffd54f"; ctx.beginPath(); ctx.moveTo(h.x,bY+10); ctx.lineTo(h.x-7,bY); ctx.lineTo(h.x+7,bY); ctx.fill();
      if(bubble && bubble.t>0){ const a=Math.min(1,bubble.t*2.4), by=bY-30, bw=Math.max(58,bubble.txt.length*13+34);
        ctx.globalAlpha=a; ctx.fillStyle="#fff"; ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(h.x-10,by+16); ctx.lineTo(h.x,by+28); ctx.lineTo(h.x+6,by+15);
        const rr=12, bx=h.x-bw/2, byy=by-16;
        ctx.moveTo(bx+rr,byy); ctx.arcTo(bx+bw,byy,bx+bw,byy+32,rr); ctx.arcTo(bx+bw,byy+32,bx,byy+32,rr); ctx.arcTo(bx,byy+32,bx,byy,rr); ctx.arcTo(bx,byy,bx+bw,byy,rr); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.font="14px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#222"; ctx.fillText(bubble.icon+" "+bubble.txt,h.x,byy+21);
        ctx.globalAlpha=1; } }
    bar(h.x,h.y-R-14,42,h.hp/h.maxhp,"#66bb6a");
    ctx.font="bold 12px sans-serif"; ctx.textAlign="center"; ctx.fillStyle="#fff"; ctx.fillText(h.name,h.x-9,h.y-R-20);
    ctx.fillStyle="#ffd54f"; ctx.fillText(" Lv"+(h.level||1),h.x+h.name.length*6,h.y-R-20); }
  function bar(x,y,w,frac,col){ ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(x-w/2,y,w,5); ctx.fillStyle=col; ctx.fillRect(x-w/2,y,w*clamp(frac,0,1),5); }
  function starG(g2,x,y,r){ g2.beginPath(); for(let i=0;i<4;i++){ const a=i*1.5708; g2.moveTo(x,y); g2.lineTo(x+Math.cos(a-0.32)*r,y+Math.sin(a-0.32)*r); g2.lineTo(x+Math.cos(a)*r*1.8,y+Math.sin(a)*r*1.8); g2.lineTo(x+Math.cos(a+0.32)*r,y+Math.sin(a+0.32)*r); } g2.closePath(); g2.fill(); }

  /* ---------- HUD ---------- */
  function updateHUD(){
    // 單挑首領戰：上方改成雙方血條（你 vs 首領），隱藏神木/復原度那組 HUD
    const dh=document.getElementById("mDuelHud"), mh=document.getElementById("mhud");
    if(duelEvent){ if(mh) mh.style.display="none"; if(dh) dh.classList.remove("hide");
      const boss=invaders.find(v=>v.isBoss&&!v.dead);
      const dead=player&&player.dead, spec=dead?spectateTarget():null, view=(dead&&spec)?spec:player;
      setW("dhYou", view? view.hp/view.maxhp : 0);
      setW("dhBoss", boss? boss.hp/boss.maxhp : 0);
      txt("dhYouName", dead?(spec?("💀 觀戰隊友："+(KNAME[spec.kind]||"隊友")):"💀 你已陣亡"):(player?KNAME[player.kind]||"你":"你"));
      txt("dhBossName", KNAME[duelEvent.bossKind]+"王");
      txt("dhTimer", "⚔ "+fmtTime(duelEvent.timeLeft)); }
    else { if(mh) mh.style.display=""; if(dh && !dh.classList.contains("hide")) dh.classList.add("hide");
      setW("mhpAlly",shrine.hp/shrine.maxhp); txt("mhpAllyTxt",Math.ceil(shrine.hp));
      setW("mRestore",restore); txt("mRestoreTxt",Math.floor(restore*100)+"%");
      const mm=Math.floor(clock/60),ss=Math.floor(clock%60); txt("mclock",mm+":"+(ss<10?"0":"")+ss);
      if(pveEvent){ txt("mBest","🎯 第"+(pveEvent.level||1)+"關 "+KNAME[pveEvent.target]+" "+pveEvent.got+"/"+pveEvent.need+"　⏱ "+fmtTime(pveEvent.timeLeft)); }
      else if(timeAttack){ const b=getBest(teamSize); txt("mBest", b?("🏆 最佳 "+fmtTime(b)):"⏱ 挑戰紀錄中"); } else txt("mBest",""); }
    const bBack=document.getElementById("mBack"); if(bBack) bBack.style.display=duelEvent?"none":"";   // 首領挑戰不能回神木，隱藏該鈕
    const sp=document.getElementById("mSp"); if(sp){ const mx=(player&&player.spMax)||8, cd=player&&player.spCd>0?player.spCd:0; sp.querySelector(".fill").style.height=(cd/mx*100)+"%"; sp.classList.toggle("ready",cd<=0); }
    // 必殺鈕：握有守護之力＝金色可施放（ready）；冷卻中＝倒數遮罩由下往上退；空手＝上鎖(locked)提示去撿
    const ub=document.getElementById("mUlt");
    if(ub){ const hasUlt=!!(player&&player.ult), cd=(player&&player.ultCd>0)?player.ultCd:0;
      ub.classList.toggle("ready",hasUlt); ub.classList.toggle("locked",!hasUlt);
      const fill=ub.querySelector(".fill"); if(fill) fill.style.height=(!hasUlt&&cd>0)?((cd/ULT_CD*100)+"%"):"0%"; } }
  function setW(id,f){ const el=document.getElementById(id); if(el) el.style.width=(clamp(f,0,1)*100)+"%"; }
  function txt(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }

  /* ---------- 迴圈 / 流程 ---------- */
  function loop(ts){ if(!running) return; const dt=Math.min(0.04,(ts-lastT)/1000||0); lastT=ts;
    if(netRole==="guest"){ if(window.__netCheckStale&&window.__netCheckStale()) toast("⚠ 對方已離線…"); if(bossIntro) bossIntro.t+=dt; render(); }
    else if(hitStop>0){ hitStop=Math.max(0,hitStop-dt); if(bossIntro) bossIntro.t+=dt; render(); }   // 命中定格：只推進登場運鏡與畫面，不推進模擬
    else { step(dt); render(); }
    raf=requestAnimationFrame(loop); }
  // 共用進場：先把 netRole/netPendingGuests 設好「再」跑 setup()，這樣 setup() 才能正確把每隻守護者對應回操控者 uid
  // （關鍵：netPendingGuests 一定要在 setup 之前就位，不能被 start 清掉，否則多人 ctrl 對應會全空 → 大家都變同一隻）
  function _begin(size, role, guests){ netRole=role||null; netPendingGuests=guests||[]; netGuestByUid={}; netGuestInputs={};
    root.classList.remove("mhide"); hide("mpick"); hide("mover"); zoom=1; resize(); setup(size); running=true; ended=false; lastT=0; raf=requestAnimationFrame(loop); }
  function start(size){ _begin(size, null, []); }
  // 多人連線：host 端照舊本機模擬全場，但標記 netRole="host" 以便定期廣播 + 收好友輸入；guests=[{uid,kind}] 依 slot 順序的好友清單。
  function startNetHost(size,guests){ _begin(size, "host", Array.isArray(guests)?guests.filter(g=>g&&g.uid&&g.kind):[]); netBroadcastT=0; }
  // 好友連線：guest 端不跑本機模擬，畫面完全來自 host 廣播的快照；先用一個佔位場景渲染，等第一份快照送達再覆蓋
  function startNetGuest(size){ _begin(size, "guest", []); netLastRecvT=performance.now(); netStale=false; }
  function stop(){ running=false; cancelAnimationFrame(raf); }
  function exitToLobby(){ stop(); const wasNet=!!netRole; netRole=null; netPendingGuests=[]; netGuestByUid={}; netGuestInputs={}; root.classList.add("mhide"); hide("mover"); hide("mpick"); mv.x=mv.y=0;
    if(wasNet && window.__netOnExit) window.__netOnExit();   // 好友連線「離開小隊」：讓 net.js 收尾房間與監聽器
    if(window.__lobbyRefresh) window.__lobbyRefresh(); }
  // 好友連線對戰結束「回到小隊」：只停止對戰畫面，房間與監聽器保留，交給 net.js 把大家帶回共享房間（可再玩一場或離開）
  function toRoom(){ stop(); netRole=null; netPendingGuests=[]; netGuestByUid={}; netGuestInputs={}; root.classList.add("mhide"); hide("mover"); hide("mpick"); mv.x=mv.y=0; }
  function endGame(win){ if(ended) return; ended=true; running=false; cancelAnimationFrame(raf);
    pveNextLevel=null;   // 預設清掉「下一關」旗標；只有 PVE 過關時 endGamePve 會重新設定
    const key=(window.__featuredKey&&window.__featuredKey())||"leopard", before=(window.__heroLevel&&window.__heroLevel(key))||1;
    if(duelEvent){ endGameDuel(win,key,before); return; }
    if(pveEvent){ endGamePve(win,key,before); return; }
    if(win){ const eco=teamSize*20+killCount, xp=60+teamSize*10+killCount;
      window.__awardEco&&window.__awardEco(eco); window.__awardXP&&window.__awardXP(key,xp); window.__bumpWin&&window.__bumpWin();
      const boostN=6+Math.min(killCount,10);
      window.__habitatBoost&&window.__habitatBoost(battleRegion,boostN);
      const after=(window.__heroLevel&&window.__heroLevel(key))||before;
      let timeLine="";
      if(timeAttack){ const prev=getBest(teamSize), newRecord=!prev||clock<prev; if(newRecord) setBest(teamSize,clock);
        timeLine="<br><br>⏱ 用時 <b>"+fmtTime(clock)+"</b>"+(newRecord?"　🏆 新紀錄！":("　（歷史最佳 "+fmtTime(prev)+"）")); }
      const comboLine=comboBest>=3?("　🔥 最高連擊 "+comboBest):"";
      showOver("🌳 棲地復原成功！","枯黃的土地重新長回翠綠","你和守護者小隊驅逐了外來入侵種、守住台灣神木與復育苗圃。<br>🌿 保育值 +"+eco+"　驅逐 "+killCount+" 隻"+comboLine+"　"+(KNAME[key]||"")+" EXP +"+xp+"　Lv"+before+(after>before?(" → "+after+" ⬆升級！"):"")+
        "<br>🌱 "+(REGION_LABEL[battleRegion]||battleRegion)+"棲地獲得復育核心資產，成長加速！"+timeLine); }
    else { const xp=8+killCount; window.__awardXP&&window.__awardXP(key,xp);  // 輸了也給少量經驗——等級只升不降
      showOver("神木倒下了…","棲地失守","別氣餒！多回防受威脅的苗圃、善用『守護爆發』與『回神木』補血，再守一次。<br>"+(KNAME[key]||"")+" 仍獲得 EXP +"+xp+"（等級永不下降・目前 Lv"+before+"）"); } }
  // PVE 限時外來種防衛戰：獨立的結算文案（達標＝成功→過關升級，時間到未達標＝失敗→可重打同關）
  function endGamePve(win,key,before){
    const tKind=pveEvent.target, got=pveEvent.got, need=pveEvent.need, lv=pveEvent.level||1;
    pveNextLevel=null;
    if(win){ const eco=teamSize*16+got*3+lv*4, xp=50+teamSize*8+got*2+lv*3;   // 越後面的關卡獎勵越多
      window.__awardEco&&window.__awardEco(eco); window.__awardXP&&window.__awardXP(key,xp); window.__bumpWin&&window.__bumpWin();
      const after=(window.__heroLevel&&window.__heroLevel(key))||before;
      const nextLv=lv+1; setPveLevel(tKind,nextLv); pveNextLevel=nextLv;   // 過關→永久解鎖下一關（離線保存）
      const np=pveLevelParams(tKind,nextLv);
      showOver("🎯 第 "+lv+" 關過關！","外來種入侵已排除","你和守護者小隊在限時內清除了 "+got+"/"+need+" 隻 "+KNAME[tKind]+"，棲地危機解除！<br>🌿 保育值 +"+eco+"　"+(KNAME[key]||"")+" EXP +"+xp+"　Lv"+before+(after>before?(" → "+after+" ⬆升級！"):"")+
        "<br><br>⚠ 下一關（第 "+nextLv+" 關）更難：需驅逐 "+np.need+" 隻・限時 "+np.dur+" 秒・入侵種更強更多！"); }
    else { const xp=6+got*2; window.__awardXP&&window.__awardXP(key,xp);
      showOver("⏱ 第 "+lv+" 關失敗","防衛戰未達標","限時內只清除了 "+got+"/"+need+" 隻 "+KNAME[tKind]+"，外來種仍在擴散……可以重打這一關！<br>"+(KNAME[key]||"")+" 仍獲得 EXP +"+xp); } }
  // 單挑首領戰結算
  function endGameDuel(win,key,before){ const bk=(duelEvent&&duelEvent.bossKind)||"iguana", sz=(duelEvent&&duelEvent.size)||teamSize||1;
    const curLv=(duelEvent&&duelEvent.level)||getDuelLevel();
    if(win){ const eco=60+Math.floor(clock)+sz*10+curLv*8, xp=70+sz*8+curLv*6;   // 難度越高獎勵越多
      window.__awardEco&&window.__awardEco(eco); window.__awardXP&&window.__awardXP(key,xp); window.__bumpWin&&window.__bumpWin();
      window.__taskBump&&window.__taskBump("boss",1);   // 每日任務：擊敗大首領
      const after=(window.__heroLevel&&window.__heroLevel(key))||before;
      // 記錄本次通關時間（每個人數各存一筆最佳，含玩家名字）
      const nm=playerName(), prev=getDuelBest(sz), isNew=saveDuelBest(sz,clock,nm);
      const recLine = isNew ? ("<br>🏅 <b>"+DUEL_SZNAME[sz]+"新紀錄！</b> "+escHtml(nm)+"　用時 "+fmtTime(clock))
                            : ("<br>⏱ 用時 "+fmtTime(clock)+(prev?("　（"+DUEL_SZNAME[sz]+"最佳 "+escHtml(prev.name)+" "+fmtTime(prev.time)+"）"):""));
      // 難度晉級：打贏就升一級，最高「大師」級；已是大師則封頂顯示榮耀
      let tierLine;
      if(curLv<DUEL_TIERS.length){ setDuelLevel(curLv+1);
        tierLine="<br>⬆ <b>難度晉級："+duelTierName(curLv)+" → "+duelTierName(curLv+1)+"級！</b>下一場首領更強。"; }
      else tierLine="<br>👑 <b>你已是大師級守護者！</b>最強的首領也被你征服了。";
      showOver("🏆 首領挑戰勝利！","「"+duelTierName(curLv)+"級」大首領被擊敗了","你們"+DUEL_SZNAME[sz]+"擊敗了 "+duelTierName(curLv)+"級 "+KNAME[bk]+"王！<br>🌿 保育值 +"+eco+"　"+(KNAME[key]||"")+" EXP +"+xp+"　Lv"+before+(after>before?(" → "+after+" ⬆升級！"):"")+recLine+tierLine); }
    else { const xp=12; window.__awardXP&&window.__awardXP(key,xp);
      showOver("⚔ 首領挑戰失敗","「"+duelTierName(curLv)+"級」大首領太強了…","限時內沒能擊敗 "+duelTierName(curLv)+"級 "+KNAME[bk]+"王（難度不變，可再挑戰）——升級守護者、多找幾個人或換剋制屬性再來！<br>"+(KNAME[key]||"")+" 仍獲得 EXP +"+xp); } }
  function showOver(t,s,b){ root.classList.add("mhide"); txt("moverT",t); txt("moverS",s); const el=document.getElementById("moverB"); if(el) el.innerHTML=b;
    if(window.__sfx) window.__sfx.play(/成功|勝利|過關/.test(t)?"victory":"defeat");   // 勝利/失敗結算音效
    const again=document.getElementById("moverAgain"); const next=document.getElementById("moverNext");
    // PVE 過關（pveNextLevel!=null）：主按鈕改成「下一關（更難）」，再守一場保留為重打（同樣讀已推進的關卡）
    if(pveNextLevel){ if(again) again.classList.add("hide");
      if(next){ next.textContent="➡ 挑戰下一關（第 "+pveNextLevel+" 關・更難）"; next.classList.remove("hide"); } }
    else { if(again){ again.textContent="⚔ 再守一場"; again.classList.remove("hide"); } if(next) next.classList.add("hide"); }
    // 好友連線：結算按鈕改成「回到小隊」（回共享房間可再玩或離開），家/離開鈕改成「離開小隊」
    if(netRole){ if(again){ again.textContent="↩ 回到小隊"; again.classList.remove("hide"); } if(next) next.classList.add("hide");
      const home=document.getElementById("moverHome"); if(home) home.textContent="🚪 離開小隊"; }
    else { const home=document.getElementById("moverHome"); if(home) home.textContent="🏠 回大廳"; }
    show("mover"); }
  function show(id){ const e=document.getElementById(id); if(e) e.classList.remove("hide"); }
  function hide(id){ const e=document.getElementById(id); if(e) e.classList.add("hide"); }
  // 開場 3-2-1 倒數（所有對戰模式共用）：蓋在戰場上數 3→2→1→開始！數完才真正 start()。好友連線走 net.js 自己的倒數，這裡只給單機各模式用。
  function mCountdown(fn){ const ov=document.getElementById("mCountdown"); if(!ov){ fn(); return; }
    root.classList.remove("mhide"); hide("mpick"); hide("mover"); ov.classList.remove("hide");
    const num=document.getElementById("mccNum"); let n=3;
    (function tick(){ if(n>=1){ if(num){ num.textContent=String(n); num.style.animation="none"; void num.offsetWidth; num.style.animation="ccPop .8s ease"; } n--; setTimeout(tick,700); }
      else { if(num){ num.textContent="開始！"; num.style.animation="none"; void num.offsetWidth; num.style.animation="ccPop .8s ease"; } setTimeout(()=>{ ov.classList.add("hide"); fn(); },650); } })(); }

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
  tap("mSp",()=>{ wantSp=true; }); tap("mBack",()=>{ wantBack=true; }); tap("mAtk",()=>{ wantAtk=true; wantAtkT=0.28; });
  tap("mUlt",()=>{ if(player&&player.ult) wantUlt=true; else toast("先到地圖四周撿一顆 ⭐ 守護之力才能施放必殺"); });
  // 縮放：＋/－ 鈕、雙指縮放、滾輪
  tap("mZoomIn",()=>setZoom(zoom+0.2)); tap("mZoomOut",()=>setZoom(zoom-0.2));
  // 快捷訊息：開合輪盤 + 送出指令（真的會指揮 AI 隊友，不只是裝飾）
  function sendQuickMsg(key){ const q=QMSG[key]; if(!q||!player||player.dead) return; if(directiveCd>0) return;
    directiveCd=4;
    if(key==="rally") directive={type:"rally",x:player.x,y:player.y,t:q.dur};
    else if(key==="retreat") directive={type:"retreat",t:q.dur};
    else if(key==="push") directive={type:"push",x:clamp(player.x+Math.cos(player.face)*420,40,MW-40),y:clamp(player.y+Math.sin(player.face)*420,40,MH-40),t:q.dur};
    else if(key==="focus"){ const tg=nearestInvader(player,260); if(tg) directive={type:"focus",target:tg.e,t:q.dur}; }
    else if(key==="heal"){ const dr=heroes.find(h=>h.kind==="deer"&&!h.dead&&h.spCd<=0); if(dr) castSp(dr); }
    bubble={icon:q.icon,txt:q.txt,t:1.8}; toast(q.icon+" "+q.txt);
    const w=document.getElementById("mChatWheel"); if(w) w.classList.add("hide"); }
  tap("mChatBtn",()=>{ const w=document.getElementById("mChatWheel"); if(w) w.classList.toggle("hide"); });
  document.querySelectorAll("#mChatWheel .qmsg").forEach(b=>{ b.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); sendQuickMsg(b.dataset.q); },{passive:false}); });
  const pts=new Map(); let pinchD=0, pinchZ=1;
  cv.addEventListener("pointerdown",(e)=>{ pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pts.size===2){ const a=[...pts.values()]; pinchD=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1; pinchZ=zoom; } },{passive:false});
  cv.addEventListener("pointermove",(e)=>{ if(!pts.has(e.pointerId))return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pts.size===2){ e.preventDefault(); const a=[...pts.values()], d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1; setZoom(pinchZ*d/pinchD); } },{passive:false});
  const rmPt=(e)=>pts.delete(e.pointerId); cv.addEventListener("pointerup",rmPt); cv.addEventListener("pointercancel",rmPt); cv.addEventListener("pointerleave",rmPt);
  cv.addEventListener("wheel",(e)=>{ if(!running)return; e.preventDefault(); setZoom(zoom-Math.sign(e.deltaY)*0.12); },{passive:false});

  /* ---------- 接到大廳「對戰」 ---------- */
  function openPick(){ const e=document.getElementById("mpick"); if(e) e.classList.remove("hide"); setPickMode("duel"); setBattleRegion(battleRegion);   // 對戰統一為「首領挑戰」：只選人數，難度打完自動晉級到大師
    const key=(window.__featuredKey&&window.__featuredKey())||"leopard", tal=(window.__heroTalent&&window.__heroTalent(key))||null;
    const hint=document.getElementById("talentHintInfo");
    if(hint){ if(tal){ hint.textContent="🌟 "+(KNAME[key]||key)+"　目前天賦："+tal.pathName+" Lv."+tal.tier+(tal.active?"（主動："+tal.active.name+"）":"")+"　出戰時自動生效"; hint.classList.remove("hide"); }
      else hint.classList.add("hide"); } }
  const pb=document.getElementById("playBtn"); if(pb) pb.onclick=openPick;
  // 復育↔對戰核心循環：戰場選在哪個地區，就吃該地區棲地基地的健康度加成
  function setBattleRegion(r){ battleRegion=r;
    document.querySelectorAll("#battleRegions .hregion").forEach(b=>b.classList.toggle("on",b.dataset.r===r));
    const h=(window.__habitatHealth&&window.__habitatHealth(r))||0, pct=Math.round(h*100);
    const el=document.getElementById("battleBonusInfo");
    // 棲地模式已移除：只顯示戰場地區；若舊存檔仍有棲地健康度，保留其加成顯示（不再引導去棲地基地）
    if(el) el.textContent="🗺 戰場："+(REGION_LABEL[r]||r)+(h>0.01?("　🌱 加成 出戰速度 +"+Math.round(h*12)+"%・技能冷卻 -"+Math.round(h*15)+"%"):""); }
  document.querySelectorAll("#battleRegions .hregion").forEach(b=>b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); setBattleRegion(b.dataset.r); },{passive:false}));
  function setPickMode(m){ pickMode=m;
    const nT=document.getElementById("modeNormal"), tT=document.getElementById("modeTime"), pT=document.getElementById("modePve"), dT=document.getElementById("modeDuel");
    if(nT) nT.classList.toggle("on",m==="normal"); if(tT) tT.classList.toggle("on",m==="time"); if(pT) pT.classList.toggle("on",m==="pve"); if(dT) dT.classList.toggle("on",m==="duel");
    const dLv=getDuelLevel(), dTier=duelTierName(dLv);
    txt("mpickTitle", m==="time" ? "⏱ 限時復育挑戰" : m==="pve" ? "🎯 外來種防衛戰" : m==="duel" ? ("⚔ 首領挑戰・"+dTier+"級"+(isDuelMaster()?" 👑":"")) : "🌳 棲地復育保衛戰");
    const descEl=document.getElementById("mpickDesc");
    if(descEl) descEl.innerHTML = m==="time" ? "目標不是守住不倒，而是盡快把棲地復原到 100%！<br>擊退入侵種、守住苗圃，比比看你多快能讓棲地重新翠綠。"
      : m==="pve" ? "選一種外來入侵種當清除目標，限時內驅逐足額數量就成功！<br>善用原生種的生態優勢（生物防治鏈）能大幅提升效率。"
      : m==="duel" ? ("選 <b>單人～五人</b> 一起挑戰一隻超強大首領（人越多首領越強）！限時內擊敗就贏。<br>目前難度：<b style='color:#ffd54f'>"+dTier+"級</b>"+(isDuelMaster()?"（已達最高的大師級 👑）":"　—　每打贏一場自動晉級，最高「大師」級！")+"<br>走位閃避牠的範圍震波與蓄力衝撞、撿守護之力放必殺。")
      : "守護台灣神木與復育苗圃，擊退四面湧入的外來入侵種——讓枯黃的棲地一吋吋復原成翠綠，復原度滿 100% 就守護成功！";
    const info=document.getElementById("bestTimeInfo");
    if(info){ if(m==="time"){ const b3=getBest(3), b5=getBest(5);
        info.innerHTML="🏆 最佳紀錄　3守護者："+(b3?fmtTime(b3):"—")+"　5守護者："+(b5?fmtTime(b5):"—"); info.classList.remove("hide"); }
      else info.classList.add("hide"); }
    const pvR=document.getElementById("pveTargets"); if(pvR) pvR.classList.toggle("hide",m!=="pve");
    // 首領挑戰：隱藏一般隊伍人數列，改顯示 1~5 人挑戰選擇 + 通關紀錄面板
    const tsr=document.getElementById("teamSizeRow"); if(tsr) tsr.classList.toggle("hide",m==="duel");
    const db=document.getElementById("duelBox"); if(db) db.classList.toggle("hide",m!=="duel");
    // 精簡首領挑戰畫面：只留「模式頁籤 + 單人~五人 + 紀錄」，戰場地區/加成/天賦提示這些額外列在首領挑戰時一律收起，避免太複雜
    const duel=(m==="duel");
    const br=document.getElementById("battleRegions"); if(br) br.classList.toggle("hide",duel);
    const bb=document.getElementById("battleBonusInfo"); if(bb) bb.classList.toggle("hide",duel);
    const th=document.getElementById("talentHintInfo"); if(th && duel) th.classList.add("hide");
    if(m==="duel") renderDuelRecords();
    updatePveLevelInfo(); }
  tap("modeNormal",()=>setPickMode("normal")); tap("modeTime",()=>setPickMode("time")); tap("modePve",()=>setPickMode("pve")); tap("modeDuel",()=>setPickMode("duel"));
  document.querySelectorAll("#duelSizeRow .duel-sz").forEach(b=>b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); const n=parseInt(b.dataset.n,10)||1; mCountdown(()=>start(n)); },{passive:false}));
  window.__mobaSetPickMode=(m)=>{ if(["normal","time","pve","siege","duel"].indexOf(m)>=0) setPickMode(m); };   // 好友房間房主選的模式帶進對戰（含首領挑戰）
  function setPveTarget(k){ pvePickTarget=k; document.querySelectorAll("#pveTargets .hregion").forEach(b=>b.classList.toggle("on",b.dataset.pv===k)); updatePveLevelInfo(); }
  // PVE 關卡進度提示：顯示目前選定目標已解鎖到第幾關、該關需求
  function updatePveLevelInfo(){ const el=document.getElementById("pveLevelInfo"); if(!el) return;
    if(pickMode!=="pve"){ el.classList.add("hide"); return; }
    const lv=getPveLevel(pvePickTarget), pp=pveLevelParams(pvePickTarget,lv);
    el.textContent="🎯 "+(KNAME[pvePickTarget]||pvePickTarget)+"　第 "+lv+" 關　需驅逐 "+pp.need+" 隻・限時 "+pp.dur+" 秒"+(lv>1?"（越後面越難！）":"");
    el.classList.remove("hide"); }
  document.querySelectorAll("#pveTargets .hregion").forEach(b=>b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); setPveTarget(b.dataset.pv); },{passive:false}));
  tap("pick3",()=>mCountdown(()=>start(3))); tap("pick5",()=>mCountdown(()=>start(5))); tap("pickBack",()=>hide("mpick"));
  tap("moverAgain",()=>{ if(netRole && window.__netReturnToRoom) window.__netReturnToRoom(); else mCountdown(()=>start(teamSize)); });
  tap("moverHome",exitToLobby);
  // PVE 過關「下一關」：關卡已在 endGamePve 推進並存進 localStorage，start() 會自動載入更難的那關
  tap("moverNext",()=>mCountdown(()=>start(teamSize)));
  window.addEventListener("keydown",(e)=>{ if(!running) return; if(e.key==="ArrowLeft"||e.key==="a")mv.x=-1; else if(e.key==="ArrowRight"||e.key==="d")mv.x=1; else if(e.key==="ArrowUp"||e.key==="w")mv.y=-1; else if(e.key==="ArrowDown"||e.key==="s")mv.y=1; else if(e.key==="k"||e.key==="Shift")wantSp=true; else if(e.key==="b")wantBack=true; else if(e.key==="j"||e.key===" "){ wantAtk=true; wantAtkT=0.28; } else if(e.key==="l"){ if(player&&player.ult) wantUlt=true; } });
  window.addEventListener("keyup",(e)=>{ if(["ArrowLeft","a","ArrowRight","d"].includes(e.key))mv.x=0; if(["ArrowUp","w","ArrowDown","s"].includes(e.key))mv.y=0; });

  window.MOBA={ start, exit:exitToLobby, toRoom, startNetHost, startNetGuest,
    // 除錯／QA 用內部狀態快照（不影響玩法，方便無頭瀏覽器驗收天候・PVE 數值是否真的生效）
    debug:()=>({ weatherBattle, pveEvent, netRole, netMyUid, heroes:heroes.map(h=>({kind:h.kind,speed:h.speed,dmg:h.dmg,isPlayer:!!h.isPlayer,ctrl:h.ctrl||null})), playerKind:player&&player.kind, guestCount:Object.keys(netGuestByUid).length, weatherFxLen:weatherFx.length, invadersLen:invaders.length,
      relics:relics.length, playerUlt:!!(player&&player.ult), playerUltCd:player?Math.round((player.ultCd||0)*10)/10:0 }),
    snapshot:()=>snapshot(), applySnapshot:(s)=>applySnapshot(s),   // 除錯／QA 用：無頭瀏覽器模擬「host 廣播 → guest 套用」全流程驗證好友連線鏡頭是否正確
    // 除錯／QA 用：撿拾式必殺技全流程——強制生一顆能量球到玩家腳下、觸發撿拾、施放必殺
    dbgRelicAt:()=>{ if(player) relics.push({x:player.x+10,y:player.y,phase:0}); return relics.length; },
    dbgPick:()=>{ if(player) tryPickRelic(player); return !!(player&&player.ult); },
    dbgUlt:()=>{ const n=invaders.length; if(player&&player.ult) castUlt(player); return { firedCd:player?player.ultCd:0, invBefore:n, invAfter:invaders.length }; },
    forceWeather:(w)=>{ if(WEATHER_KEYS.indexOf(w)>=0){ weatherBattle=w; heroes.forEach(h=>{ h.speed=Math.round(h.speed*weatherSpeedMul(h.kind)); }); } },
    // 除錯／QA 用：PVE 關卡遞增——查目前關卡、強制生指定新敵人、強制達標過關驗證下一關流程
    dbgPveLevel:(t)=>getPveLevel(t||pvePickTarget),
    dbgPveParams:(t,lv)=>pveLevelParams(t||pvePickTarget,lv||getPveLevel(t||pvePickTarget)),
    dbgSpawnKind:(kind)=>{ if(invaders.length<80){ const v=mkInvader(kind,false); invaders.push(v); return {kind:v.kind,r:v.r,hp:v.hp,speed:v.speed}; } return null; },
    dbgInvaderKinds:()=>invaders.map(v=>v.kind),
    dbgPveWin:()=>{ if(pveEvent&&pveEvent.active){ pveEvent.got=pveEvent.need; pveEvent.active=false; endGame(true); return {level:pveEvent.level, next:pveNextLevel}; } return null; },
    dbgSetPveTarget:(t)=>{ if(PVE_TARGETS.indexOf(t)>=0) setPveTarget(t); return pvePickTarget; } };

  // 給獨立模組 src/battleshop.js 用的橋接（玩家物件/提示文字/購買特效），不直接暴露內部狀態
  window.__mobaPlayer=()=>player;
  window.__mobaToast=(s)=>toast(s);
  window.__mobaFx=(x,y)=>{ ring(x,y,60,"#ffd54f"); sparks(x,y,18,"#ffd54f"); mshake=Math.max(mshake,5); };
})();
