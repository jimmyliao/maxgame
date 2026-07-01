/* 好友連線（真連線多人）— 獨立模組，需要網路；不影響單機部分離線可玩。
   目前 FIREBASE_CONFIG 為空：介面已可操作，但連線動作會顯示提示，
   等專案擁有者提供 Firebase 設定後即可接上即時同步（見下方 TODO）。 */
(() => {
  "use strict";

  // ===== TODO：把你在 Firebase Console 拿到的設定貼在這裡，就能啟用真連線 =====
  // 範例：{ apiKey:"...", authDomain:"xxx.firebaseapp.com", databaseURL:"https://xxx.firebaseio.com",
  //         projectId:"xxx", storageBucket:"xxx.appspot.com", messagingSenderId:"...", appId:"..." }
  const FIREBASE_CONFIG = null;

  const $ = (id) => document.getElementById(id);
  function show(id){ const e=$(id); if(e) e.classList.remove("hide"); }
  function hide(id){ const e=$(id); if(e) e.classList.add("hide"); }
  function netMsg(s){ const e=$("coopNet"); if(e) e.textContent=s||""; }

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
  function enterRoom(code){
    currentRoom=code; hide("coop"); show("coopRoom");
    const cEl=$("roomCode"); if(cEl) cEl.textContent=code;
    const { ref, onValue } = window.__fb;
    if(roomListenerOff) roomListenerOff();
    roomListenerOff = onValue(ref(fbDb,"rooms/"+code), (snap)=>{
      const data=snap.val(); if(!data) return;
      const wrap=$("roomPlayers"); if(wrap){ wrap.innerHTML="";
        Object.values(data.players||{}).forEach(p=>{ const d=document.createElement("div");
          d.style.cssText="background:rgba(255,255,255,.08);border-radius:14px;padding:10px 14px;display:flex;justify-content:space-between;";
          d.innerHTML="<b>"+(p.host?"👑 ":"🌿 ")+escapeHtml(p.nick)+"</b>"; wrap.appendChild(d); }); }
      const st=$("roomStatus"); if(st) st.textContent = data.status==="playing" ? "遊戲進行中…" : "等待玩家加入…（房間代碼："+code+"）";
      const startBtn=$("coopStart"); if(startBtn) startBtn.style.display = isHost ? "" : "none";
    });
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  async function leaveRoom(){
    if(currentRoom && window.__fb && fbAuth && fbAuth.currentUser){ const { ref, remove } = window.__fb;
      try{ await remove(ref(fbDb,"rooms/"+currentRoom+"/players/"+fbAuth.currentUser.uid)); }catch(e){} }
    if(roomListenerOff){ roomListenerOff(); roomListenerOff=null; }
    currentRoom=null; hide("coopRoom"); show("coop");
  }
  function startGame(){ netMsg("多人對戰同步引擎尚未接上，敬請期待！"); }

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
