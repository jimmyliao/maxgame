/* 音效引擎 — 純程序化 Web Audio（零外部檔案，符合單檔零外部資源鐵則：所有聲音即時合成，不載入任何音檔）
   獨立模組，跟其他模組只透過 window.__sfx 溝通：
   - window.__sfx.play(name)     觸發一個音效（見 SOUNDS）
   - window.__sfx.setMuted(bool) / window.__sfx.toggle() / window.__sfx.muted()
   自動效果：全站按鈕 pointerdown 會自動發出點擊聲，不需改其他檔案。
   AudioContext 依瀏覽器政策必須在使用者手勢後才能啟動，故第一個 pointerdown 才初始化。 */
(() => {
  "use strict";
  let ac=null, master=null, muted=false;
  try{ muted = localStorage.getItem("shoutu_muted")==="1"; }catch(e){}

  function ensure(){ if(ac) return ac;
    try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
      ac=new AC(); master=ac.createGain(); master.gain.value=0.5; master.connect(ac.destination);
    }catch(e){ ac=null; }
    return ac; }
  function now(){ return ac?ac.currentTime:0; }

  // 單一振盪器音（可掃頻），帶 ADSR 包絡
  function tone(freq,dur,type,gain,sweepTo,delay){ if(!ac) return; const t0=now()+(delay||0);
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type||"sine"; o.frequency.setValueAtTime(freq,t0);
    if(sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,sweepTo),t0+dur);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(gain||0.3,t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0+dur+0.02); }
  // 雜訊爆（打擊/爆炸感），經低通
  function noise(dur,gain,filtHz,delay){ if(!ac) return; const t0=now()+(delay||0);
    const n=Math.floor(ac.sampleRate*dur), buf=ac.createBuffer(1,n,ac.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=ac.createBufferSource(); src.buffer=buf;
    const f=ac.createBiquadFilter(); f.type="lowpass"; f.frequency.value=filtHz||1200;
    const g=ac.createGain(); g.gain.setValueAtTime(gain||0.3,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0+dur+0.02); }
  function arp(freqs,step,type,gain){ freqs.forEach((f,i)=>tone(f,step*1.6,type||"triangle",gain||0.25,null,i*step)); }

  const SOUNDS={
    tap:      ()=>{ tone(320,0.05,"square",0.14,520); },
    back:     ()=>{ tone(300,0.07,"square",0.14,180); },
    hit:      ()=>{ noise(0.09,0.28,1600); tone(150,0.09,"sine",0.22,80); },
    bighit:   ()=>{ noise(0.16,0.4,2200); tone(110,0.16,"sine",0.32,60); },
    skill:    ()=>{ tone(420,0.22,"sawtooth",0.22,880); tone(660,0.2,"sine",0.14,1320,0.02); },
    ult:      ()=>{ [261,329,392,523].forEach((f,i)=>tone(f,0.5,"sawtooth",0.2,f*1.5,i*0.04)); noise(0.4,0.3,1800); },
    coin:     ()=>{ tone(880,0.06,"square",0.18,1180); tone(1320,0.09,"square",0.16,1580,0.06); },
    pickup:   ()=>{ arp([523,659,784,1046],0.06,"triangle",0.22); },
    victory:  ()=>{ arp([392,523,659,784,1046],0.11,"triangle",0.28); },
    defeat:   ()=>{ arp([392,330,262,196],0.14,"sine",0.26); },
    beep:     ()=>{ tone(680,0.12,"square",0.2); },
    go:       ()=>{ tone(920,0.28,"square",0.24,1240); tone(460,0.28,"triangle",0.16); },
    plant:    ()=>{ tone(360,0.1,"triangle",0.2,540); },
    harvest:  ()=>{ tone(560,0.09,"triangle",0.2,780); tone(880,0.1,"sine",0.14,1100,0.05); },
    levelup:  ()=>{ arp([523,659,784,1046,1318],0.09,"triangle",0.3); },
    combo:    ()=>{ tone(760,0.07,"square",0.18,1140); },
  };

  function play(name){ if(muted) return; if(!ensure()) return;
    if(ac.state==="suspended"){ try{ ac.resume(); }catch(e){} }
    const fn=SOUNDS[name]; if(fn){ try{ fn(); }catch(e){} } }

  // 全站按鈕自動點擊聲：捕捉階段監聽 pointerdown，命中互動元素就發聲（第一次手勢也順便初始化 AudioContext）
  const SEL="button, .btn, .mbtn, .navb, .rb, .hp-card, .zbtn, .hregion, .cfg-btn, .qmsg, [role=button]";
  document.addEventListener("pointerdown",(e)=>{ ensure(); const el=e.target&&e.target.closest&&e.target.closest(SEL);
    if(el){ const back=/back|close|離開|關閉|回/.test((el.id||"")+" "+(el.className||"")+" "+(el.textContent||"")); play(back?"back":"tap"); } }, true);

  window.__sfx={ play, setMuted:(m)=>{ muted=!!m; try{ localStorage.setItem("shoutu_muted",muted?"1":"0"); }catch(e){} },
    toggle:()=>{ window.__sfx.setMuted(!muted); return muted; }, muted:()=>muted };
})();
