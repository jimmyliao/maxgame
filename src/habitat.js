/* 棲地基地 — 經營/養成（全新性質玩法，非即時戰鬥）
   清除入侵種、種下「真實台灣特有種植物」；植物依真實時間成長，離線也會長大，
   回來收成保育值。可選台灣棲地類型（結合地區特色）+ 模擬天氣/晝夜循環。
   獨立模組，不影響單機對戰／MOBA／好友連線。 */
(() => {
  "use strict";
  const N = 16;                        // 4x4 格
  const SPROUT_S = 60;                  // 基準：0~60s 幼苗
  const SAPLING_S = 300;                 // 基準：60~300s 小樹
  const MATURE_S = 900;                  // 基準：900s+ 成熟（可收成）
  const INVADE_S = 240;                  // 空地放著超過 4 分鐘 → 長出入侵種
  const TRICKLE_S = 30;                  // 基準：成熟後每 30 秒 +1 保育值
  const TRICKLE_CAP = 20;                // 單格未收成上限
  const WEATHER_PERIOD_MS = 3*60*1000;   // 天氣區塊長度（真實時間）

  // 每個棲地類型對應一種真實台灣原生／特有種植物（教育向：玩中認識真實物種）
  const REGION_INFO = {
    paddy:   { label:"稻田",  plant:"台灣萍蓬草", fact:"台灣特有水生植物，僅存於桃園、南投等少數埤塘濕地，是台灣原生睡蓮科植物中最稀有的一種。",
               sky:["#5b6d33","#7c8f45"], night:["#1c2414","#2a331c"] },
    hill:    { label:"淺山",  plant:"台灣欒樹", fact:"台灣特有種喬木，秋天開黃花、結紅色蒴果，是淺山生態系的重要指標樹種，也是許多昆蟲的蜜源植物。",
               sky:["#2f5a2f","#3f7a3f"], night:["#132015","#1c2e1c"] },
    stream:  { label:"溪流",  plant:"台灣杉", fact:"台灣特有種，是唯一以「台灣」命名的針葉巨木，生長在中海拔溪谷雲霧帶，為台灣森林的珍貴象徵。",
               sky:["#2a5a5f","#3f7a80"], night:["#12262a","#1a3438"] },
    wetland: { label:"濕地",  plant:"水筆仔", fact:"台灣原生紅樹林植物，胎生苗會直接在母株上發芽，是淡水河口濕地重要的護岸與棲地植物。",
               sky:["#6b4a3f","#8a6a55"], night:["#2c1f1a","#3d2c24"] },
  };
  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();

  function load(){ try{ const raw=localStorage.getItem("shoutu_habitat_v1"); if(raw){ const d=JSON.parse(raw); if(d && Array.isArray(d.tiles) && d.tiles.length===N){ if(!d.region) d.region="paddy"; return d; } } }catch(e){}
    const t=now(); const tiles=[];
    for(let i=0;i<N;i++){ if(i%5===0) tiles.push({state:"invasive"}); else tiles.push({state:"unplanted", emptySince:t}); }
    return { tiles, region:"paddy" };
  }
  function save(d){ try{ localStorage.setItem("shoutu_habitat_v1", JSON.stringify(d)); }catch(e){} }

  let data = load();

  // ===== 模擬天氣 / 晝夜（純時間函數，離線/重載都一致，不需儲存歷史） =====
  function weatherNow(){ const t=Math.floor(now()/WEATHER_PERIOD_MS); const pat=["sunny","sunny","rain","cloudy","sunny","rain"]; return pat[((t%pat.length)+pat.length)%pat.length]; }
  function isNight(){ const h=new Date().getHours(); return h<6||h>=18; }
  function growMult(){ return weatherNow()==="rain" ? 0.8 : 1; }   // 下雨：生長門檻打 8 折（長得快）
  function trickleMult(){ return weatherNow()==="rain" ? 0.75 : 1; } // 下雨：收成間隔也變短

  // 依真實時間推導目前顯示階段／狀態（離線時間也正確反映，不需要模擬每個 tick）
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

  const ICON={ invasive:"🥀", empty:"🟫", sprout:"🌱", sapling:"🌿", mature:"🌳" };
  const WEIGHT={ invasive:0, empty:0, sprout:0.3, sapling:0.6, mature:1 };
  const WMETA={ sunny:{icon:"☀️",txt:"晴天"}, cloudy:{icon:"☁️",txt:"陰天"}, rain:{icon:"🌧️",txt:"下雨中・生長加速！"} };

  function applyTheme(){
    const info=REGION_INFO[data.region]||REGION_INFO.paddy, night=isNight(), w=weatherNow();
    const pal = night ? info.night : info.sky;
    const tint = w==="rain" ? "rgba(60,90,120,.35)" : w==="cloudy" ? "rgba(90,90,90,.25)" : "rgba(255,220,140,.12)";
    const bg=$("habBg"); if(bg) bg.style.background = "linear-gradient(160deg,"+pal[0]+","+pal[1]+"), linear-gradient(0deg,"+tint+","+tint+")";
    document.querySelectorAll(".hregion").forEach(b=>b.classList.toggle("on", b.dataset.r===data.region));
    const wm=WMETA[w];
    $("habWeather") && ($("habWeather").textContent=(night?"🌙 夜間":"☀️ 白天")+"　"+wm.icon+" "+wm.txt);
    $("habSpecies") && ($("habSpecies").textContent="🌳 本區培育："+info.plant+"——"+info.fact);
  }

  function render(){
    const grid=$("habGrid"); if(!grid) return;
    if(grid.children.length!==N){ grid.innerHTML=""; for(let i=0;i<N;i++){ const b=document.createElement("button"); b.className="htile"; b.dataset.i=i;
      b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); tap(i); },{passive:false}); grid.appendChild(b); } }
    applyTheme();
    let totalW=0, totalStored=0;
    for(let i=0;i<N;i++){ const tile=data.tiles[i], st=stageOf(tile), el=grid.children[i];
      el.className="htile "+st; el.innerHTML="";
      const ic=document.createElement("span"); ic.textContent=ICON[st]; el.appendChild(ic);
      totalW+=WEIGHT[st];
      if(st==="mature"){ const s=storedOf(tile); totalStored+=s;
        if(s>0){ el.classList.add("ripe"); const pip=document.createElement("span"); pip.className="hpip"; pip.textContent="+"+s; el.appendChild(pip); } } }
    save(data);
    const pct=Math.round(totalW/N*100);
    $("habRestoreTxt") && ($("habRestoreTxt").textContent="復原度 "+pct+"%");
    $("habRestoreBar") && ($("habRestoreBar").style.width=pct+"%");
    $("habEcoTxt") && ($("habEcoTxt").textContent="🌿 可收成 "+totalStored);
  }

  function tap(i){ const tile=data.tiles[i], st=stageOf(tile);
    if(st==="invasive"){ tile.state="unplanted"; tile.emptySince=now(); pulse(i); }
    else if(st==="empty"){ tile.state="planted"; tile.plantedAt=now(); tile.lastCollect=now(); delete tile.emptySince; pulse(i); }
    else if(st==="mature"){ const s=storedOf(tile); if(s>0){ harvestTile(i,tile,s); } }
    render(); }
  function harvestTile(i,tile,s){ window.__awardEco && window.__awardEco(s); tile.lastCollect=now();
    flo(i,"+"+s+" 🌿"); burst(i); const grid=$("habGrid"); const el=grid && grid.children[i]; if(el){ el.classList.remove("harvest"); void el.offsetWidth; el.classList.add("harvest"); }
    const info=REGION_INFO[data.region]||REGION_INFO.paddy; banner("🧺 收成 "+info.plant+" +"+s+" 保育值！"); }
  function collectAll(){ let total=0, n=0;
    for(let i=0;i<N;i++){ const tile=data.tiles[i]; if(stageOf(tile)==="mature"){ const s=storedOf(tile); if(s>0){ total+=s; n++; tile.lastCollect=now();
      const grid=$("habGrid"); const el=grid && grid.children[i]; if(el){ el.classList.remove("harvest"); void el.offsetWidth; el.classList.add("harvest"); burst(i); } } } }
    if(total>0){ window.__awardEco && window.__awardEco(total); banner("🧺 一次收成 "+n+" 棵，共 +"+total+" 保育值！"); } else banner("目前還沒有成熟可收成的植物");
    render(); }
  function pulse(i){ const grid=$("habGrid"); const el=grid && grid.children[i]; if(!el) return; el.style.transform="scale(1.12)"; setTimeout(()=>{ el.style.transform=""; },150); }
  function flo(i,txt){ const grid=$("habGrid"); const el=grid && grid.children[i]; if(!el) return;
    const f=document.createElement("div"); f.textContent=txt; f.style.cssText="position:absolute;left:50%;top:-6px;transform:translateX(-50%);font-size:12px;font-weight:800;color:#ffd54f;pointer-events:none;animation:flo .8s forwards;z-index:2;";
    el.style.position="relative"; el.appendChild(f); setTimeout(()=>f.remove(),800); }
  function burst(i){ const grid=$("habGrid"); const el=grid && grid.children[i]; if(!el) return;
    for(let k=0;k<6;k++){ const p=document.createElement("span"); p.textContent="🌿"; const a=Math.random()*6.28, d=18+Math.random()*14;
      p.style.cssText="position:absolute;left:50%;top:50%;font-size:12px;pointer-events:none;z-index:2;transition:transform .5s ease-out, opacity .5s;transform:translate(-50%,-50%);opacity:1;";
      el.style.position="relative"; el.appendChild(p);
      requestAnimationFrame(()=>{ p.style.transform="translate("+(Math.cos(a)*d-6)+"px,"+(Math.sin(a)*d-6)+"px) scale(0.6)"; p.style.opacity="0"; });
      setTimeout(()=>p.remove(),520); } }
  let bannerT=null;
  function banner(txt){ const b=$("habBanner"); if(!b) return; b.textContent=txt; b.classList.add("show");
    if(bannerT) clearTimeout(bannerT); bannerT=setTimeout(()=>b.classList.remove("show"),1600); }

  const styleTag=document.createElement("style");
  styleTag.textContent="@keyframes flo{0%{opacity:1;top:-6px;}100%{opacity:0;top:-22px;}}";
  document.head.appendChild(styleTag);

  function setRegion(r){ if(!REGION_INFO[r]) return; data.region=r; save(data); render(); banner("🌏 已切換到"+REGION_INFO[r].label+"棲地——培育"+REGION_INFO[r].plant); }

  let tickTimer=null;
  function openHabitat(){ data=load(); render(); if(tickTimer) clearInterval(tickTimer); tickTimer=setInterval(render,1000);
    if(window.__tx) window.__tx(()=>show()); else show(); }
  function show(){ const e=$("habitat"); if(e) e.classList.remove("hide"); }
  function closeHabitat(){ const e=$("habitat"); if(e) e.classList.add("hide"); if(tickTimer){ clearInterval(tickTimer); tickTimer=null; } save(data); }

  const tap2=(id,fn)=>{ const e=$(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); };
  tap2("navHabitat",openHabitat);
  tap2("habBack",closeHabitat);
  tap2("habCollectAll",collectAll);
  document.querySelectorAll(".hregion").forEach(b=> b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); setRegion(b.dataset.r); },{passive:false}));
})();
