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
      ac=new AC(); master=ac.createGain(); master.gain.value=0.3; master.connect(ac.destination);   // 整體音量調柔和
    }catch(e){ ac=null; }
    return ac; }
  function now(){ return ac?ac.currentTime:0; }

  // 單一振盪器音（可掃頻），柔和淡入淡出包絡（較長的 attack/release，聽起來圓潤不刺耳）
  function tone(freq,dur,type,gain,sweepTo,delay){ if(!ac) return; const t0=now()+(delay||0);
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type||"sine"; o.frequency.setValueAtTime(freq,t0);
    if(sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,sweepTo),t0+dur);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(gain||0.2,t0+Math.min(0.03,dur*0.25));   // 較緩的起音，去掉點擊爆音
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

  // 全面改成柔和的 sine/triangle（不再用刺耳的 square/sawtooth 與大量白噪），走溫暖、圓潤、音樂性的音色
  const SOUNDS={
    tap:      ()=>{ tone(523,0.05,"sine",0.09,660); },                                   // 清脆柔和的點一下
    back:     ()=>{ tone(392,0.07,"sine",0.09,294); },                                   // 返回：柔和下行
    hit:      ()=>{ tone(200,0.08,"sine",0.13,150); noise(0.03,0.04,700); },              // 悶柔一擊（微量低頻噪音當觸感）
    bighit:   ()=>{ tone(150,0.14,"sine",0.18,100); noise(0.05,0.07,800); },              // 重擊：低沉但不刺耳
    skill:    ()=>{ tone(523,0.18,"triangle",0.12,784); tone(784,0.16,"sine",0.07,1047,0.03); }, // 柔和上揚泛音
    ult:      ()=>{ [392,523,659].forEach((f,i)=>tone(f,0.55,"triangle",0.11,f,i*0.05)); tone(1047,0.55,"sine",0.06,1047,0.12); }, // 溫暖大三和弦
    coin:     ()=>{ tone(784,0.09,"sine",0.11,880); tone(1175,0.12,"sine",0.09,1319,0.07); },    // 悅耳「叮」
    pickup:   ()=>{ arp([523,659,784,1047],0.07,"sine",0.11); },                          // 上行琶音
    victory:  ()=>{ arp([523,659,784,1047,1319],0.13,"triangle",0.14); },                 // 明亮鐘聲勝利
    defeat:   ()=>{ arp([440,349,294,220],0.16,"sine",0.13); },                           // 柔和下行失落
    beep:     ()=>{ tone(660,0.1,"sine",0.12); },                                         // 倒數：溫和嗶
    go:       ()=>{ tone(880,0.26,"triangle",0.15,1047); },                               // 開始：柔亮長音
    plant:    ()=>{ tone(392,0.12,"sine",0.11,523); },
    harvest:  ()=>{ tone(587,0.1,"sine",0.11,784); tone(880,0.1,"sine",0.07,1047,0.05); },
    levelup:  ()=>{ arp([523,659,784,1047,1319],0.1,"triangle",0.15); },
    combo:    ()=>{ tone(784,0.08,"sine",0.1,988); },
    boss:     ()=>{ tone(90,0.8,"sine",0.18,60); tone(135,0.8,"triangle",0.10,110,0.04); noise(0.55,0.09,260); tone(220,0.5,"sine",0.06,175,0.18); }, // 首領登場：低沉威壓悶鳴（不刺耳）
  };

  function play(name){ if(muted) return; if(!ensure()) return;
    if(ac.state==="suspended"){ try{ ac.resume(); }catch(e){} }
    const fn=SOUNDS[name]; if(fn){ try{ fn(); }catch(e){} } }

  // 全站按鈕自動點擊聲：捕捉階段監聽 pointerdown，命中互動元素就發聲（第一次手勢也順便初始化 AudioContext）
  const SEL="button, .btn, .mbtn, .navb, .rb, .hp-card, .zbtn, .hregion, .cfg-btn, .qmsg, [role=button]";
  document.addEventListener("pointerdown",(e)=>{ ensure(); const el=e.target&&e.target.closest&&e.target.closest(SEL);
    if(el){ const back=/back|close|離開|關閉|回/.test((el.id||"")+" "+(el.className||"")+" "+(el.textContent||"")); play(back?"back":"tap"); } }, true);

  window.__sfx={ play, setMuted:(m)=>{ muted=!!m; try{ localStorage.setItem("shoutu_muted",muted?"1":"0"); }catch(e){} refreshSetBtn(); },
    toggle:()=>{ window.__sfx.setMuted(!muted); return muted; }, muted:()=>muted };

  // 設定畫面的「音效：開/關」按鈕，自成一體在本模組接線（不需改 legacy.js）
  function refreshSetBtn(){ const b=document.getElementById("setSound"); if(b) b.textContent=muted?"🔇 音效：關":"🔊 音效：開"; }
  function wireSetBtn(){ const b=document.getElementById("setSound"); if(!b) return; refreshSetBtn();
    b.addEventListener("pointerdown",(e)=>{ e.preventDefault(); const m=window.__sfx.toggle(); if(!m){ ensure(); play("tap"); } },{passive:false}); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",wireSetBtn); else wireSetBtn();
})();
