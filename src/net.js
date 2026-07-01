/* 好友連線（真連線多人）— 獨立模組，需要網路；不影響單機部分離線可玩。
   Firebase 專案：maxgame-677be（Realtime Database + 匿名登入）。 */
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

  async function createRoom(){
    netMsg(""); const ok=await ensureFirebase(); if(!ok) return;
    const nick=($("nickInput")&&$("nickInput").value.trim())||"訪客"; setNick(nick);
    const code=genRoomCode();
    const { ref, set } = window.__fb;
    const uid=fbAuth.currentUser.uid;
    await set(ref(fbDb,"rooms/"+code),{ host:uid, status:"waiting", createdAt:Date.now(),
      players:{ [uid]:{ nick, joinedAt:Date.now(), host:true } } });
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
    await update(ref(fbDb,"rooms/"+code+"/players/"+uid),{ nick, joinedAt:Date.now(), host:false });
    isHost=false; enterRoom(code);
  }
  let lastStatus=null;
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
      const wrap=$("roomPlayers"); if(wrap){ wrap.innerHTML="";
        Object.values(roomPlayersCache).forEach(p=>{ const d=document.createElement("div");
          d.style.cssText="background:rgba(255,255,255,.08);border-radius:14px;padding:10px 14px;display:flex;justify-content:space-between;";
          d.innerHTML="<b>"+(p.host?"👑 ":"🌿 ")+escapeHtml(p.nick)+"</b>"; wrap.appendChild(d); }); }
      const st=$("roomStatus"); if(st) st.textContent = data.status==="playing" ? "遊戲進行中…" : "等待玩家加入…（房間代碼："+code+"）";
      const startBtn=$("coopStart"); if(startBtn) startBtn.style.display = isHost ? "" : "none";
      // guest 端：偵測 status 由 waiting → playing，自動進場開始接收 host 廣播
      if(!isHost && data.status==="playing" && lastStatus!=="playing" && !isNetActive){ beginGuestSync(data.size||3); }
      lastStatus=data.status;
    });
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  // ===== 對戰同步（host-authoritative MVP：host 本機正常模擬+節流廣播，guest 純接收快照渲染+送出搖桿輸入） =====
  // 設計理由：MOBA 引擎（AI/入侵種生成/命中判定）已高度耦合在 moba.js 的 step() 內，且非固定 tick 的連續模擬，
  // 要做到雙端各自跑模擬再對帳（lockstep/rollback）風險高、時間內難以收斂到「同步準確又不拖垮單機穩定性」。
  // 因此改採 host-authoritative：guest 完全不跑本地模擬，只負責渲染 host 快照 + 上傳輸入，最小可行且不會累積誤差。
  let stateListenerOff=null, inputListenerOff=null, statusListenerOff=null, netLoopId=0, isNetActive=false;
  const NET_BROADCAST_MS=130, NET_INPUT_MS=110;

  async function startGame(){
    if(!isHost){ netMsg("只有房主可以開始遊戲。"); return; }
    if(!currentRoom || !window.__fb || !window.MOBA){ netMsg("連線尚未就緒，請稍後再試。"); return; }
    try{
      const { ref, update } = window.__fb;
      const size=3;   // MVP：固定 3 人小隊（房主+1 朋友+AI 補位）
      await update(ref(fbDb,"rooms/"+currentRoom),{ status:"playing", size, updatedAt:Date.now() });
      beginHostSync(size);
    }catch(err){ netMsg("開始遊戲失敗，請檢查網路後重試。"); console.error("startGame failed:",err); }
  }

  let roomPlayersCache={};
  function otherPlayerUid(){ const me=fbAuth&&fbAuth.currentUser&&fbAuth.currentUser.uid;
    return Object.keys(roomPlayersCache||{}).find(u=>u!==me)||null; }

  function beginHostSync(size){
    isNetActive=true; hide("coopRoom");
    window.MOBA.startNetHost(size, secondGuardianKind());
    window.__netBroadcast = throttle((snap)=>{ if(!currentRoom||!window.__fb) return;
      const { ref, set } = window.__fb; set(ref(fbDb,"rooms/"+currentRoom+"/state"),snap).catch(()=>{}); }, NET_BROADCAST_MS);
    const guestUid=otherPlayerUid();
    if(guestUid && window.__fb){ const { ref, onValue } = window.__fb;
      if(inputListenerOff) inputListenerOff();
      inputListenerOff = onValue(ref(fbDb,"rooms/"+currentRoom+"/inputs/"+guestUid), (snap)=>{
        const d=snap.val(); if(d && window.__netSetGuestInput) window.__netSetGuestInput(d); }); }
  }
  // host 端次序固定（跟 moba.js setup() 內 GUARDIANS 挑選邏輯一致的前兩個非重複物種），讓朋友操控第二隻守護者
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
    currentRoom=null; isHost=false; hide("coopRoom"); show("coop");
  }
  // 房間畫面按「離開房間」（尚未開始/或想中途放棄）
  async function leaveRoom(){ endNetSync(); await cleanupRoom(); }
  // moba.js 對戰結束/回大廳時呼叫（此時已經在 exitToLobby 內部，不可再呼叫 window.MOBA.exit() 避免遞迴）
  window.__netOnExit=()=>{ endNetSync(); cleanupRoom(); };

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
  tap("coopStart",startGame);
  tap("coopLeave",leaveRoom);
})();
