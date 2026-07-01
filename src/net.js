/* 好友連線（真連線多人）— 獨立模組，需要網路；不影響單機部分離線可玩。
   Firebase 專案：maxgame-677be（Realtime Database + 匿名登入）。
   流程：大廳「📨 邀請好友」→ 建立/加入房間 → 進到仿大廳風格的 #coopRoom（兩人並肩選角）→
        各自選一隻守護者（不可相同）＋按「準備完成」→ 雙方都準備完成，房主才能「開始對戰」。 */
(() => {
  "use strict";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCn8O6w4pRHa7JoRJ_VWRrV-MHv672xh8k",
    authDomain: "maxgame-677be.firebaseapp.com",
    databaseURL: "https://maxgame-677be-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "maxgame-677be",
    storageBucket: "maxgame-677be.firebasestorage.app",
    messagingSenderId: "816965458215",
    appId: "1:816965458215:web:9df19b4b018b050b54f102",
  };

  const $ = (id) => document.getElementById(id);
  function show(id){ const e=$(id); if(e) e.classList.remove("hide"); }
  function hide(id){ const e=$(id); if(e) e.classList.add("hide"); }
  function netMsg(s){ const e=$("coopNet"); if(e) e.textContent=s||""; const r=$("coopRoomNet"); if(r) r.textContent=s||""; }

  // ===== 暱稱（本機記住） =====
  function getNick(){ try{ return localStorage.getItem("shoutu_nick")||""; }catch(e){ return ""; } }
  function setNick(v){ try{ localStorage.setItem("shoutu_nick",v); }catch(e){} }

  // ===== 房間代碼 =====
  function genRoomCode(){ const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s=""; for(let i=0;i<5;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }

  // ===== 守護者清單（讀 legacy.js 匯出的唯讀清單；離線/尚未載入時給個保底清單，不噴例外） =====
  function heroList(){ try{ const l=window.__heroList&&window.__heroList(); return (Array.isArray(l)&&l.length)?l:[{key:"leopard",name:"石虎"}]; }catch(e){ return [{key:"leopard",name:"石虎"}]; } }
  function heroName(key){ const h=heroList().find(x=>x.key===key); return h?h.name:key; }

  let fbReady=false, fbApp=null, fbDb=null, fbAuth=null;
  // 動態載入 Firebase（只有在真的要連線、且已設定 config 時才載入，離線/未設定時完全不影響其他功能）
  async function ensureFirebase(){
    if(!FIREBASE_CONFIG){ netMsg("⚠ 尚未設定連線服務，請聯絡開發者完成 Firebase 設定後再試。"); return false; }
    if(fbReady) return true;
    try{
      const [{ initializeApp }, { getDatabase, ref, set, onValue, update, remove, get, child }, { getAuth, signInAnonymously }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js"),
        import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js"),
      ]);
      fbApp=initializeApp(FIREBASE_CONFIG); fbDb=getDatabase(fbApp); fbAuth=getAuth(fbApp);
      await signInAnonymously(fbAuth);
      window.__fb={ ref, set, onValue, update, remove, get, child };
      fbReady=true; return true;
    }catch(err){ netMsg("⚠ 連線服務初始化失敗，請檢查網路或稍後再試。"); console.error("Firebase init failed:",err); return false; }
  }

  let currentRoom=null, isHost=false, roomListenerOff=null;

  function pickDefaultHero(taken){ const list=heroList(); const free=list.find(h=>h.key!==taken); return (free||list[0]).key; }

  async function createRoom(){
    netMsg(""); const ok=await ensureFirebase(); if(!ok) return;
    const nick=($("nickInput")&&$("nickInput").value.trim())||"訪客"; setNick(nick);
    const code=genRoomCode();
    const { ref, set } = window.__fb;
    const uid=fbAuth.currentUser.uid;
    const heroKey=(window.__featuredKey&&window.__featuredKey())||pickDefaultHero(null);
    // mode:"invite"（好友邀請碼房間）——欄位保留給未來「配對中」房型（如 mode:"quickmatch"）共用同一套 rooms/ schema，不寫死只能靠邀請碼
    await set(ref(fbDb,"rooms/"+code),{ host:uid, mode:"invite", status:"waiting", createdAt:Date.now(),
      players:{ [uid]:{ nick, joinedAt:Date.now(), host:true, heroKey, ready:false } } });
    isHost=true; enterRoom(code);
  }
  async function joinRoom(code){
    netMsg(""); const ok=await ensureFirebase(); if(!ok) return;
    code=(code||"").toUpperCase().trim(); if(code.length<3){ netMsg("請輸入正確的房間代碼"); return; }
    const nick=($("nickInput")&&$("nickInput").value.trim())||"訪客"; setNick(nick);
    const { ref, get, update } = window.__fb;
    const snap=await get(ref(fbDb,"rooms/"+code));
    if(!snap.exists()){ netMsg("找不到這個房間，請確認代碼是否正確。"); return; }
    const uid=fbAuth.currentUser.uid;
    const data=snap.val()||{}; const others=Object.values(data.players||{});
    const takenKey=others.length?others[0].heroKey:null;
    const heroKey=pickDefaultHero(takenKey);
    await update(ref(fbDb,"rooms/"+code+"/players/"+uid),{ nick, joinedAt:Date.now(), host:false, heroKey, ready:false });
    isHost=false; enterRoom(code);
  }
  let lastStatus=null, roomPlayersCache={}, myHeroKey=null;
  function enterRoom(code){
    currentRoom=code; hide("coop"); show("coopRoom"); lastStatus=null;
    const cEl=$("roomCode"); if(cEl) cEl.textContent=code;
    const { ref, onValue } = window.__fb;
    if(roomListenerOff) roomListenerOff();
    roomListenerOff = onValue(ref(fbDb,"rooms/"+code), (snap)=>{
      const data=snap.val(); if(!data){ // 房間被移除（房主離開/解散）
        if(isNetActive){ netMsg("房間已解散。"); if(window.MOBA) window.MOBA.exit(); else endNetSync(); }
        return; }
      roomPlayersCache=data.players||{};
      renderRoom(data);
      // guest 端：偵測 status 由 waiting → playing，自動進場開始接收 host 廣播
      if(!isHost && data.status==="playing" && lastStatus!=="playing" && !isNetActive){ beginGuestSync(data.size||3, data.guestHeroKey); }
      lastStatus=data.status;
    });
  }

  // ===== 好友大廳畫面渲染（仿大廳風格：兩人並肩站在同一個共享房間，而非抽象文字列表） =====
  function myUid(){ return fbAuth&&fbAuth.currentUser&&fbAuth.currentUser.uid; }
  function otherPlayerUid(){ const me=myUid(); return Object.keys(roomPlayersCache||{}).find(u=>u!==me)||null; }
  function drawPortrait(canvasId,key){ const cv=$(canvasId); if(!cv||!key) return;
    const cc=cv.getContext("2d"); cc.clearRect(0,0,cv.width,cv.height);
    if(window.__drawCreature){ try{ window.__drawCreature(cc,key,cv.width/2,cv.height*0.62,cv.height*0.42,{t:0}); }catch(e){} } }

  function renderRoom(data){
    const me=roomPlayersCache[myUid()]||null, otherUid=otherPlayerUid(), other=otherUid?roomPlayersCache[otherUid]:null;
    if(me) myHeroKey=me.heroKey||myHeroKey;
    const st=$("roomStatus"); if(st) st.textContent = data.status==="playing" ? "遊戲進行中…" : "等待朋友加入…（房間代碼："+(currentRoom||"")+"）";

    const nickMe=$("csNickMe"); if(nickMe) nickMe.textContent=(isHost?"👑 ":"🌿 ")+((me&&me.nick)||getNick()||"我");
    const readyMe=$("csReadyMe"); if(readyMe){ readyMe.textContent=(me&&me.ready)?"✅ 準備完成":"未準備"; readyMe.classList.toggle("on",!!(me&&me.ready)); }
    const heroMe=$("csHeroMe"); if(heroMe) heroMe.textContent=(me&&me.heroKey)?heroName(me.heroKey):"請選擇守護者";
    if(me&&me.heroKey) drawPortrait("csPortraitMe",me.heroKey);

    const nickOther=$("csNickOther"); const readyOther=$("csReadyOther"); const heroOther=$("csHeroOther");
    if(other){
      if(nickOther) nickOther.textContent=(other.host?"👑 ":"🌿 ")+(other.nick||"朋友");
      if(readyOther){ readyOther.textContent=other.ready?"✅ 準備完成":"未準備"; readyOther.classList.toggle("on",!!other.ready); }
      if(heroOther) heroOther.textContent=other.heroKey?heroName(other.heroKey):"選角中…";
      if(other.heroKey) drawPortrait("csPortraitOther",other.heroKey);
    } else {
      if(nickOther) nickOther.textContent="朋友";
      if(readyOther){ readyOther.textContent="未準備"; readyOther.classList.remove("on"); }
      if(heroOther) heroOther.textContent="尚未加入";
      const cv=$("csPortraitOther"); if(cv) cv.getContext("2d").clearRect(0,0,cv.width,cv.height);
    }

    buildPicker(me, other);

    const sameHero = !!(me&&other&&me.heroKey&&other.heroKey&&me.heroKey===other.heroKey);
    const warn=$("coopSameHeroWarn"); if(warn) warn.textContent=sameHero?"⚠ 你們選了同一隻守護者，請至少一人換一隻不同的！":"";

    const readyBtn=$("coopReady"); if(readyBtn) readyBtn.classList.toggle("on",!!(me&&me.ready));
    const bothReady = !!(me&&me.ready&&other&&other.ready);
    const startBtn=$("coopStart");
    if(startBtn){ startBtn.style.display = isHost ? "" : "none";
      startBtn.disabled = !(bothReady && other && !sameHero);
      startBtn.textContent = !other ? "⚔ 等待朋友加入" : sameHero ? "⚔ 請選不同守護者" : !bothReady ? "⚔ 等待雙方準備完成" : "⚔ 開始對戰"; }
  }

  function buildPicker(me,other){
    const wrap=$("croomPick"); if(!wrap) return; wrap.innerHTML="";
    const otherKey=other?other.heroKey:null;
    heroList().forEach(h=>{
      const b=document.createElement("button"); const mine=me&&me.heroKey===h.key; const taken=otherKey===h.key && !mine;
      b.className="rb"+(mine?" sel":"")+(taken?" taken":"");
      const cv=document.createElement("canvas"); cv.width=96; cv.height=96; b.appendChild(cv);
      const cc=cv.getContext("2d"); if(window.__drawCreature){ try{ window.__drawCreature(cc,h.key,48,54,34,{t:0}); }catch(e){} }
      if(taken){ cc.fillStyle="rgba(0,0,0,.5)"; cc.fillRect(0,0,96,96); }
      b.title=h.name;
      b.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); if(taken) return; chooseHero(h.key); },{passive:false});
      wrap.appendChild(b);
    });
  }

  async function chooseHero(key){
    if(!currentRoom||!window.__fb||!fbAuth||!fbAuth.currentUser) return;
    myHeroKey=key;
    const { ref, update } = window.__fb;
    try{ await update(ref(fbDb,"rooms/"+currentRoom+"/players/"+fbAuth.currentUser.uid),{ heroKey:key, ready:false }); }catch(e){}   // 換角自動取消準備，避免雙方認知不同步
  }
  async function toggleReady(){
    if(!currentRoom||!window.__fb||!fbAuth||!fbAuth.currentUser) return;
    const me=roomPlayersCache[fbAuth.currentUser.uid]; if(!me||!me.heroKey) return;
    const { ref, update } = window.__fb;
    try{ await update(ref(fbDb,"rooms/"+currentRoom+"/players/"+fbAuth.currentUser.uid),{ ready:!me.ready }); }catch(e){}
  }

  // ===== 對戰同步（host-authoritative MVP：host 本機正常模擬+節流廣播，guest 純接收快照渲染+送出搖桿輸入） =====
  // 設計理由：MOBA 引擎（AI/入侵種生成/命中判定）已高度耦合在 moba.js 的 step() 內，且非固定 tick 的連續模擬，
  // 要做到雙端各自跑模擬再對帳（lockstep/rollback）風險高、時間內難以收斂到「同步準確又不拖垮單機穩定性」。
  // 因此改採 host-authoritative：guest 完全不跑本地模擬，只負責渲染 host 快照 + 上傳輸入，最小可行且不會累積誤差。
  let stateListenerOff=null, inputListenerOff=null, netLoopId=0, isNetActive=false;
  const NET_BROADCAST_MS=130, NET_INPUT_MS=110;

  async function startGame(){
    if(!isHost){ netMsg("只有房主可以開始對戰。"); return; }
    if(!currentRoom || !window.__fb || !window.MOBA){ netMsg("連線尚未就緒，請稍後再試。"); return; }
    const me=roomPlayersCache[myUid()], otherUid=otherPlayerUid(), other=otherUid?roomPlayersCache[otherUid]:null;
    if(!me||!other){ netMsg("請等朋友加入小隊。"); return; }
    if(!me.ready||!other.ready){ netMsg("請雙方都按「準備完成」後再開始。"); return; }
    if(!me.heroKey||!other.heroKey||me.heroKey===other.heroKey){ netMsg("請選擇不同的守護者。"); return; }
    try{
      const { ref, update } = window.__fb;
      const size=3;   // MVP：固定 3 人小隊（房主+1 朋友+AI 補位）
      await update(ref(fbDb,"rooms/"+currentRoom),{ status:"playing", size, guestHeroKey:other.heroKey, updatedAt:Date.now() });
      beginHostSync(size, me.heroKey, other.heroKey);
    }catch(err){ netMsg("開始對戰失敗，請檢查網路後重試。"); console.error("startGame failed:",err); }
  }

  function beginHostSync(size,myKey,guestKey){
    isNetActive=true; hide("coopRoom");
    window.__netHostKeyOverride=myKey||null;   // 讓 moba.js setup() 用房間內選的角色，而不是大廳目前 featured 的角色
    try{ window.MOBA.startNetHost(size, guestKey||secondGuardianKind()); }
    finally{ window.__netHostKeyOverride=null; }
    window.__netBroadcast = throttle((snap)=>{ if(!currentRoom||!window.__fb) return;
      const { ref, set } = window.__fb; set(ref(fbDb,"rooms/"+currentRoom+"/state"),snap).catch(()=>{}); }, NET_BROADCAST_MS);
    const guestUid=otherPlayerUid();
    if(guestUid && window.__fb){ const { ref, onValue } = window.__fb;
      if(inputListenerOff) inputListenerOff();
      inputListenerOff = onValue(ref(fbDb,"rooms/"+currentRoom+"/inputs/"+guestUid), (snap)=>{
        const d=snap.val(); if(d && window.__netSetGuestInput) window.__netSetGuestInput(d); }); }
  }
  // 保底：房間資料異常缺 guestHeroKey 時（理論上不會發生，startGame 已擋下），退回舊的自動挑選邏輯避免整段連線功能掛掉
  function secondGuardianKind(){ const G=["leopard","bear","dragonfly","magpie","deer","cicada"];
    const mine=(window.__featuredKey&&window.__featuredKey())||"leopard"; return G.find(k=>k!==mine)||G[0]; }

  function beginGuestSync(size){
    isNetActive=true; hide("coopRoom");
    window.MOBA.startNetGuest(size);
    const { ref, onValue } = window.__fb;
    if(stateListenerOff) stateListenerOff();
    stateListenerOff = onValue(ref(fbDb,"rooms/"+currentRoom+"/state"), (snap)=>{
      const d=snap.val(); if(d && window.__netApplySnapshot) window.__netApplySnapshot(d); });
    const uid=fbAuth.currentUser.uid;
    const pushInput = throttle(()=>{ if(!window.__netLocalInput) return; const { ref, set } = window.__fb;
      set(ref(fbDb,"rooms/"+currentRoom+"/inputs/"+uid),window.__netLocalInput()).catch(()=>{}); }, NET_INPUT_MS);
    clearInterval(netLoopId); netLoopId=setInterval(pushInput,NET_INPUT_MS);
  }
  function throttle(fn,ms){ let last=0,pending=null;
    return (arg)=>{ const now=Date.now(); if(now-last>=ms){ last=now; fn(arg); } else { pending=arg; } }; }

  function endNetSync(){
    isNetActive=false; window.__netBroadcast=null; clearInterval(netLoopId); netLoopId=0;
    if(stateListenerOff){ stateListenerOff(); stateListenerOff=null; }
    if(inputListenerOff){ inputListenerOff(); inputListenerOff=null; }
  }
  // 離開房間：對戰中離開也要優雅收尾（停止同步、跳回大廳），不讓另一方卡死——採「不做重連」的簡化版：
  // host 離開＝整個房間直接刪除（guest 端會在 enterRoom 監聽到 !data 而顯示「房間已解散」並退回大廳）；
  // guest 離開＝只移除自己這個 player 節點，host 端會因收不到新的 inputs 而讓那隻守護者停在原地（不影響 host 端其餘模擬）。
  async function cleanupRoom(){
    if(currentRoom && window.__fb && fbAuth && fbAuth.currentUser){
      const { ref, remove } = window.__fb;
      try{ if(isHost) await remove(ref(fbDb,"rooms/"+currentRoom)); else await remove(ref(fbDb,"rooms/"+currentRoom+"/players/"+fbAuth.currentUser.uid)); }catch(e){}
    }
    if(roomListenerOff){ roomListenerOff(); roomListenerOff=null; }
    currentRoom=null; isHost=false; roomPlayersCache={}; hide("coopRoom"); show("coop");
  }
  // 房間畫面按「離開房間」（尚未開始/或想中途放棄）
  async function leaveRoom(){ endNetSync(); await cleanupRoom(); }
  // moba.js 對戰結束/回大廳時呼叫（此時已經在 exitToLobby 內部，不可再呼叫 window.MOBA.exit() 避免遞迴）
  window.__netOnExit=()=>{ endNetSync(); cleanupRoom(); };

  // 除錯／QA 用：離線環境無法真連 Firebase 測兩人房間畫面時，用假資料直接餵 renderRoom 驗證 UI 邏輯（不影響正式連線流程）
  window.__netDebugRoom=(data,uid,hostFlag)=>{ isHost=!!hostFlag; roomPlayersCache=(data&&data.players)||{};
    if(uid) fbAuth={currentUser:{uid}}; currentRoom=currentRoom||"DEBUG"; show("coopRoom"); renderRoom(data||{}); };

  // ===== 事件綁定 =====
  function tap(id,fn){ const e=$(id); if(e) e.addEventListener("pointerdown",(ev)=>{ ev.preventDefault(); fn(); },{passive:false}); }
  document.addEventListener("DOMContentLoaded",()=>{
    const ni=$("nickInput"); if(ni) ni.value=getNick();
  });
  tap("coopBtn",()=>{ const ni=$("nickInput"); if(ni) ni.value=getNick(); netMsg(FIREBASE_CONFIG?"":"⚠ 連線服務尚未設定，介面可先體驗，實際連線功能等開發者完成設定。"); if(window.__tx) window.__tx(()=>show("coop")); else show("coop"); });
  tap("coopBack",()=>{ hide("coop"); });
  tap("coopCreate",createRoom);
  tap("coopJoinBtn",()=>{ const r=$("coopJoinRow"); if(r) r.classList.toggle("hide"); });
  tap("coopJoinGo",()=>{ const ci=$("roomCodeInput"); joinRoom(ci?ci.value:""); });
  // 「邀請隊友」流程收尾：務實做法——沒有使用者目錄可搜尋朋友帳號，所以延用房間代碼機制，
  // 但包裝成「複製代碼傳給隊友」的邀請語感（可貼到 LINE/訊息軟體），而不是讓玩家感覺在操作抽象房間系統。
  tap("coopCopyCode",()=>{ const code=currentRoom||""; if(!code) return; const text="一起來守土 · 福爾摩沙衛士 🌳 我的隊友邀請碼："+code+"　打開遊戲 → 邀請隊友 → 輸入這組代碼加入我！";
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(()=>netMsg("✅ 邀請訊息已複製，貼給隊友吧！")).catch(()=>netMsg("邀請碼："+code)); }
    else { netMsg("邀請碼："+code); } });
  tap("coopReady",toggleReady);
  tap("coopStart",startGame);
  tap("coopLeave",leaveRoom);
})();
