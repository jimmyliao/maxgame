/* 類全螢幕體驗 — 獨立模組（純 JS，零外部資源）：
   1) 載入即輕微捲動隱藏手機網址列（scrollTo(0,1)，Fullscreen 不支援時的優雅降級）
   2) 「開始遊戲」＝大廳「對戰」鈕：點擊時在同一手勢內 requestFullscreen（含跨瀏覽器前綴）＋照常啟動遊戲
   3) 小的全螢幕切換鈕（全螢幕時變 ✕ 退出）
   4) 監聽 fullscreenchange：使用者用返回鍵/上滑離開時，同步更新鈕狀態並重新隱藏網址列
   5) feature detection：iOS Safari 等不支援 Fullscreen API 時隱藏切換鈕，但保留第 1 點捲動隱藏
   對外：window.__fs = { request, exit, toggle, supported(), active() } */
(() => {
  "use strict";
  const docEl = document.documentElement;
  function fsElement(){ return document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement||null; }
  function fsSupported(){ return !!(docEl.requestFullscreen||docEl.webkitRequestFullscreen||docEl.webkitRequestFullScreen||docEl.mozRequestFullScreen||docEl.msRequestFullscreen); }
  function requestFS(){ const el=docEl, fn=el.requestFullscreen||el.webkitRequestFullscreen||el.webkitRequestFullScreen||el.mozRequestFullScreen||el.msRequestFullscreen;
    if(fn){ try{ const p=fn.call(el); if(p&&p.catch) p.catch(()=>{}); }catch(e){} } }
  function exitFS(){ const fn=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen||document.msExitFullscreen;
    if(fn){ try{ const p=fn.call(document); if(p&&p.catch) p.catch(()=>{}); }catch(e){} } }
  function toggleFS(){ if(fsElement()) exitFS(); else requestFS(); }
  function hideBar(){ try{ window.scrollTo(0,1); }catch(e){} }   // 捲動隱藏網址列

  window.__fs = { request:requestFS, exit:exitFS, toggle:toggleFS, supported:fsSupported, active:()=>!!fsElement() };

  function init(){
    // 1) 捲動隱藏網址列：載入、延遲數次、轉向時都補一下（各家瀏覽器時機不同）
    hideBar(); setTimeout(hideBar,300); setTimeout(hideBar,1000);
    window.addEventListener("load",()=>setTimeout(hideBar,200));
    window.addEventListener("orientationchange",()=>setTimeout(hideBar,300));

    // 2) 「對戰」＝開始遊戲：在使用者手勢中 requestFullscreen（capture 階段，先於遊戲自己的 handler），再照常進遊戲
    const play=document.getElementById("playBtn");
    if(play) play.addEventListener("pointerdown",()=>{ if(fsSupported() && !fsElement()) requestFS(); }, true);

    // 3)+5) 支援 Fullscreen API 才放切換鈕；不支援(iOS Safari 等)則優雅降級只保留捲動隱藏
    if(fsSupported()){
      const b=document.createElement("button"); b.id="fsBtn"; b.type="button"; b.setAttribute("aria-label","全螢幕切換");
      b.style.cssText="position:fixed;top:max(4px,env(safe-area-inset-top));left:max(4px,env(safe-area-inset-left));z-index:9998;"+
        "width:30px;height:30px;border-radius:8px;border:none;background:rgba(0,0,0,.4);color:#fff;font-size:15px;line-height:30px;"+
        "padding:0;cursor:pointer;opacity:.5;backdrop-filter:blur(2px);";
      b.textContent="⛶";
      b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); e.stopPropagation(); toggleFS(); },{passive:false});
      document.body.appendChild(b);
      // 4) fullscreenchange：不論是點鈕或系統手勢(返回鍵/上滑)離開，都同步鈕狀態＋重新隱藏網址列
      const sync=()=>{ const on=!!fsElement(); b.textContent=on?"✕":"⛶"; b.style.opacity=on?"0.72":"0.5"; b.style.background=on?"rgba(198,40,40,.55)":"rgba(0,0,0,.4)"; hideBar(); };
      ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"].forEach(ev=>document.addEventListener(ev,sync));
      sync();
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
