/* 棲地基地 — 經營/養成（全新性質玩法，非即時戰鬥）
   清除入侵種、種下原生植物；植物依「真實時間」成長，離線也會長大，
   回來後收成保育值。獨立模組，不影響單機對戰／MOBA／好友連線。 */
(() => {
  "use strict";
  const N = 16;                      // 4x4 格
  const SPROUT_S = 60;                // 0~60s：幼苗
  const SAPLING_S = 300;               // 60~300s：小樹
  const MATURE_S = 900;                // 900s+：成熟（可收成）
  const INVADE_S = 240;                // 空地放著超過 4 分鐘 → 長出入侵種
  const TRICKLE_S = 30;                // 成熟後每 30 秒 +1 保育值
  const TRICKLE_CAP = 20;              // 單格未收成上限

  const $ = (id) => document.getElementById(id);
  const now = () => Date.now();

  function load(){ try{ const raw=localStorage.getItem("shoutu_habitat_v1"); if(raw){ const d=JSON.parse(raw); if(d && Array.isArray(d.tiles) && d.tiles.length===N) return d; } }catch(e){}
    const t=now(); const tiles=[];
    for(let i=0;i<N;i++){ if(i%5===0) tiles.push({state:"invasive"}); else tiles.push({state:"unplanted", emptySince:t}); }
    return { tiles };
  }
  function save(d){ try{ localStorage.setItem("shoutu_habitat_v1", JSON.stringify(d)); }catch(e){} }

  let data = load();

  // 依真實時間推導目前顯示階段／狀態（離線時間也正確反映，不需要模擬每個 tick）
  function stageOf(tile){
    if(tile.state==="invasive") return "invasive";
    if(tile.state==="unplanted"){
      if((now()-tile.emptySince)/1000 > INVADE_S){ tile.state="invasive"; delete tile.emptySince; return "invasive"; }
      return "empty";
    }
    // planted
    const el=(now()-tile.plantedAt)/1000;
    if(el<SPROUT_S) return "sprout";
    if(el<SAPLING_S) return "sapling";
    return "mature";
  }
  function storedOf(tile){ if(stageOf(tile)!=="mature") return 0;
    const el=Math.max(0,(now()-(tile.lastCollect||tile.plantedAt))/1000);
    return Math.min(TRICKLE_CAP, Math.floor(el/TRICKLE_S)); }

  const ICON={ invasive:"🥀", empty:"🟫", sprout:"🌱", sapling:"🌿", mature:"🌳" };
  const WEIGHT={ invasive:0, empty:0, sprout:0.3, sapling:0.6, mature:1 };

  function render(){
    const grid=$("habGrid"); if(!grid) return;
    if(grid.children.length!==N){ grid.innerHTML=""; for(let i=0;i<N;i++){ const b=document.createElement("button"); b.className="htile"; b.dataset.i=i;
      b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); tap(i); },{passive:false}); grid.appendChild(b); } }
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
    else if(st==="mature"){ const s=storedOf(tile); if(s>0){ window.__awardEco && window.__awardEco(s); tile.lastCollect=now(); flo(i,"+"+s+" 🌿"); } }
    render(); }
  function pulse(i){ const grid=$("habGrid"); const el=grid && grid.children[i]; if(!el) return; el.style.transform="scale(1.12)"; setTimeout(()=>{ el.style.transform=""; },150); }
  function flo(i,txt){ const grid=$("habGrid"); const el=grid && grid.children[i]; if(!el) return;
    const f=document.createElement("div"); f.textContent=txt; f.style.cssText="position:absolute;left:50%;top:-6px;transform:translateX(-50%);font-size:11px;font-weight:800;color:#ffd54f;pointer-events:none;animation:flo .8s forwards;";
    el.style.position="relative"; el.appendChild(f); setTimeout(()=>f.remove(),800); }

  // 淡出上飄動畫（沿用專案既有 keyframes 命名慣例，範圍侷限於本模組注入的一小段樣式）
  const styleTag=document.createElement("style");
  styleTag.textContent="@keyframes flo{0%{opacity:1;top:-6px;}100%{opacity:0;top:-22px;}}";
  document.head.appendChild(styleTag);

  let tickTimer=null;
  function openHabitat(){ data=load(); render(); if(tickTimer) clearInterval(tickTimer); tickTimer=setInterval(render,1000);
    if(window.__tx) window.__tx(()=>show()); else show(); }
  function show(){ const e=$("habitat"); if(e) e.classList.remove("hide"); }
  function closeHabitat(){ const e=$("habitat"); if(e) e.classList.add("hide"); if(tickTimer){ clearInterval(tickTimer); tickTimer=null; } save(data); }

  const tap2=(id,fn)=>{ const e=$(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); };
  tap2("navHabitat",openHabitat);
  tap2("habBack",closeHabitat);
})();
