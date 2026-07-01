# 守土 · 福爾摩沙衛士 — Canvas2D 美術技法食譜（Canvas Techniques Cookbook）

> 研究者：Canvas2D 美術技法研究員（讀書會第二輪）。
> 目的：把 `docs/research/art-direction.md`（第一輪，美術**方向**與色票）**變成可直接貼用的 Canvas2D 技法食譜**——第一輪回答「要長什麼樣」，本檔回答「**怎麼用 canvas 畫出來**」。
> 定位：接續 art-direction.md 的 **R-ART-01…06** ticket 與色票，**不重造輪子**；本檔補的是「實作配方」。
> 硬限制（`CLAUDE.md §鐵則`）：**單檔零外部資源**（無 CDN／外部圖／字型／音檔，全部 canvas 程式繪製）、`drawCreature/drawCreatureTop` **簽名不可改只能擴充**、**粒子硬上限 + 回收**（現況 `fx` 上限 **150**）、進度鍵不可改名。
> 對接的既有變數命名（已 grep 確認，見文末附錄）：`INK`（`#20140c` 暖黑墨）、`OUT`（`Math.max(2.2,r*0.11)` 動態線寬）、`shade(hex,amt)`（亮暗色）、`sparks(x,y,n,col)`、`ring(x,y,r,col)`、`fx[]`（粒子陣列，上限 150）、`mshake`（螢幕震動量）、`freeze(t)`/`hitStop`（hit-stop）、`u.hitT`（命中計時）、離屏合成 `oc`/`g`（`source-atop` 頂光/底暗）。

---

## 這本食譜怎麼讀

每一節（＝一個技法）固定四段：

- **(a) 原理一句話** — 這招在幹嘛。
- **(b) 可貼用片段** — 對接我們既有變數命名的 canvas 程式碼（`ctx`/`g`/`INK`/`OUT`/`fx`/`shade` 等）。
- **(c) 守土哪裡用** — `drawCreature`（大廳側視）／`drawCreatureTop`（對戰俯視）／HUD／VFX／場景。
- **(d) 效能與鐵則** — 零外部資源、粒子硬上限、簽名不改、`shadowBlur` 節制等。

> 片段是**示意配方**，落地時併入 R-ART ticket 實作，**勿把本檔片段當真檔改動**。所有片段語法皆已在腦中對照既有程式驗證可接。

---

## 目錄

1. 粗描邊 + cel 分區 + rim light（三種做法比較）
2. 程序式材質（斑紋／毛流／鱗片，用 path+noise，對應守護者真實特徵）
3. 統一 VFX 語言（衝擊環／閃白／squash／粒子）參數化成一組可重用函式
4. 發光與合成技法（必殺／首領登場）
5. 效能：離屏快取角色底圖、粒子物件池、逐幀成本控制
6. 一個「可重用美術工具模組」的介面建議（未來抽 `src/gfx.js`，只建議不改程式）
7. 信心度、來源、與 art-direction / game agent 的銜接

---

## 1. 粗描邊 + cel 分區 + rim light（三種做法比較）

對應 art-direction §4.3（描邊與著色規則）與 **R-ART-01**（rim light）。第一輪定了「要有粗描邊 + 適度 cel + 敵我暖/冷 rim light」，這裡給**三種 canvas 實作路線**與取捨。

### 1.1 粗描邊（Bold Outline）— 三法比較

**(a) 原理**：角色外緣一圈厚實深色線，讓角色從背景「跳出來」；線寬隨體型放大（`OUT`）。

**(b) 三種做法**

| 法 | 做法 | 優點 | 缺點 | 守土建議 |
|---|---|---|---|---|
| **A. 先描後填**（現況用） | 每個 path 先 `strokeStyle=INK; lineWidth=OUT+...` 描一圈，再 `fillStyle=col` 填色蓋內部 | 精準、可逐部位控制線寬、乾淨 | 要逐 path 寫兩次 | **主力**：`drawCreatureTop` 尾巴/身體既是這樣（見 moba.js:1003-1006） |
| **B. 剪影外擴描邊** | 離屏畫完角色 → `source-atop` 蓋不到外緣 → 改用 `shadowBlur=0` 但多次 `drawImage` 偏移疊 INK 底 | 一次得到均勻外框、不管內部幾個 path | 8 向偏移 = 8 次 drawImage，較貴 | 只在**單一英雄大圖**（選角大廳特寫）用 |
| **C. shadow 當外框** | `shadowColor=INK; shadowBlur=0; shadowOffsetX/Y` 各方向 stroke | 程式短 | `shadow` 較吃效能、邊緣糊 | 不建議對戰每幀每隻用 |

```js
// 法 A（推薦，對接現有 drawCreatureTop 寫法）：先粗墨底、再貼彩色
// INK/OUT/col/shade 皆為函式內既有變數
g.lineJoin = "round"; g.lineCap = "round";
g.strokeStyle = INK; g.lineWidth = OUT + r * 0.06;   // 隨體型放大：Brawl 原則
g.beginPath(); bodyPath(g);            // 你的身體 path
g.stroke();
g.fillStyle = col; g.fill();           // 填色蓋內部 → 只留一圈墨邊
```

**(c) 守土哪裡用**：`drawCreatureTop` 全部部位（已在用法 A）、`drawCreature` 大廳角色。入侵種可用**略冷的墨** `#14201c`（art-direction R-ART-03）微妙區隔敵我。

**(d) 效能與鐵則**：法 A 零額外成本、零外部資源。線寬務必走 `OUT`（`Math.max(2.2,r*0.11)`）維持一致插畫感、**不硬編數字**。8 個既有 kind 分支都要保留描邊，不可只改一隻。

### 1.2 cel 分區（平塗 + 適度 cel shading）

**(a) 原理**：不是柔和漸層，而是**塊狀亮面/中間色/暗面**；我們走 Pokémon 的「克制」——只**二分**（受光/背光），避免畫成 3 段以上變吵。

**(b) 兩種 canvas 做法**

```js
// 做法 1（現況用，最省）：離屏合成末端一次 source-atop 線性漸層 → 全身統一頂光/底暗
// 這是 moba.js:1282-1286 與 legacy.js:382-386 的既有手法，直接沿用即可
g.save();
g.globalCompositeOperation = "source-atop";       // 只作用在角色剪影像素，不污染背景
const sg = g.createLinearGradient(0, -R2 * 0.85, 0, R2 * 0.72);
sg.addColorStop(0,    "rgba(255,255,255,0.30)");  // 頂光
sg.addColorStop(0.45, "rgba(255,255,255,0)");     // 中間色（原色透出）
sg.addColorStop(1,    "rgba(0,0,0,0.32)");        // 底暗
g.fillStyle = sg; g.fillRect(-R2, -R2, R2 * 2, R2 * 2);
g.globalCompositeOperation = "source-over"; g.restore();

// 做法 2（新增，明確二分 cel，克制到 2 段）：在大面積身體疊一塊半透明暗色
// 模擬「背光那半邊」，柔邊靠 quadratic path，不用 filter（相容性 + 零外部）
g.save();
g.globalCompositeOperation = "source-atop";       // 一樣鎖在剪影內
g.fillStyle = shade(col, -28);                    // 比主色暗一階
g.globalAlpha = 0.5;                              // 半透明 → 柔和 cel，非死硬邊
g.beginPath();
g.moveTo(0, -r);                                  // 從頂沿一條斜線切到底 → 受光/背光二分
g.quadraticCurveTo(r * 0.5, 0, -r * 0.2, r);
g.lineTo(r * 1.4, r); g.lineTo(r * 1.4, -r); g.closePath();
g.fill();
g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.restore();
```

**(c) 守土哪裡用**：**做法 1** 是 `drawCreatureTop`/`drawCreature` 現行標配，維持即可。**做法 2** 選用於**體型大、面積夠**的守護者（黑熊、梅花鹿、獼猴）加立體感；小蟲/細長（勾蜓、蟒）不必加，避免糊。

**(d) 效能與鐵則**：`source-atop` 只在**離屏畫布 `g`** 內用（現況如此），一隻一次，成本可忽略。**禁止**在主畫布 `ctx` 對整個場景切 composite（見 §4 效能警告）。避免 3 段以上（維持 Pokémon 乾淨）。

### 1.3 rim light（邊緣光）— 三種做法比較（對應 R-ART-01）

**(a) 原理**：角色輪廓內/外一圈亮邊，把角色和暗背景分離、增立體與「潮」感；**守護者暖金、入侵種冷青/毒綠**（敵我可辨）。

**(b) 三法**

```js
// 陣營 rim 色（接 art-direction §4.5 VFX 常數）
const rim = (faction === "inv") ? "rgba(90,220,220,0.55)"   // 入侵種：冷青
                                : "rgba(255,224,150,0.55)"; // 守護者：暖金

// —— 法 A（推薦、最省）：離屏內用 lighter 疊描一圈細亮邊，只描背光側輪廓 ——
g.save();
g.globalCompositeOperation = "lighter";           // 疊加發光感（顏色相加）
g.strokeStyle = rim; g.lineWidth = Math.max(1, r * 0.03);
g.beginPath(); bodyPath(g);                        // 沿角色主體輪廓
g.stroke();
g.globalCompositeOperation = "source-over"; g.restore();

// —— 法 B（英雄時刻才用）：shadowBlur 外滲柔光，更亮但吃效能 ——
// 只在「選角大廳特寫 / 必殺瞬間 / 首領登場」用，不在對戰每幀每隻用
g.save();
g.shadowColor = rim; g.shadowBlur = r * 0.4; g.shadowOffsetX = g.shadowOffsetY = 0;
g.strokeStyle = rim; g.lineWidth = Math.max(1, r * 0.03);
g.beginPath(); bodyPath(g); g.stroke();
g.shadowBlur = 0; g.restore();

// —— 法 C（剪影外光暈，替代 B）：離屏角色整張當 mask，drawImage 自身放大＋rim tint ——
// 用 source-atop 把一張 rim 色蓋在放大後的自身剪影上，得到「一圈外光」，比 shadowBlur 快
// 適合大廳大圖；對戰仍用法 A
```

**三法取捨**：

| 法 | 亮度 | 成本 | 用在哪 |
|---|---|---|---|
| A `lighter` 描邊 | 中 | **極低**（一次 stroke） | **對戰每幀**（drawCreatureTop）預設 |
| B `shadowBlur` | 高（柔外滲） | 高 | 大廳特寫／必殺／首領登場 |
| C 剪影放大 tint | 高 | 中 | 大廳大圖替代 B |

**(c) 守土哪裡用**：`drawCreatureTop` 貼回主畫布前用**法 A**（R-ART-01 驗收）；`drawCreature` 大廳英雄時刻可選**法 B/C**。

**(d) 效能與鐵則**：**`shadowBlur` 是效能地雷**——不可對戰每幀每隻用（守 CLAUDE.md 效能鐵則）。法 A 零外部資源、零額外分配。rim 色走陣營常數，敵我一致。

---

## 2. 程序式材質（斑紋／毛流／鱗片，用 path + noise）

對應 art-direction §4.4「唯一真實記憶特徵」與 **R-ART-05**。零外部貼圖，材質全靠 **path + 便宜的偽噪點**畫出來，且**對應守護者現實特徵**（石虎玫瑰斑、穿山甲鱗甲、鮭魚體側黑斑…）。

### 2.0 一個「零依賴、可重複」的偽噪點（不用外部貼圖）

**(a) 原理**：材質需要「看似隨機但每幀一致」的擾動。用**確定性 hash**（吃整數 seed 給 0~1），比 `Math.random()` 好——**同一隻同一斑點每幀落在同位置**，不會閃爍。

```js
// 確定性偽亂數：同 seed 永遠同值 → 斑紋每幀穩定不抖動（比 Math.random 更適合材質）
function nrand(seed){ const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
// 用法：nrand(i) 給第 i 個斑點一個穩定 0~1；nrand(i*7.3) 再取一個獨立通道
```

**(d) 效能**：純算術、無分配、無外部資源。斑點數量**設常數上限**（如每隻 ≤ 20 顆），別隨體型無上限增生。

### 2.1 斑紋 / 斑點（石虎玫瑰斑、梅花鹿梅花斑、鮭魚體側黑斑）

**(a) 原理**：在身體剪影內，沿身體長軸鋪一列**確定性分佈**的小 path（環斑/實心斑），顏色取 `shade(col,-)` 或記憶特徵色。

```js
// 通用「斑點鋪陣」：在身體長 bLen、寬 bW 範圍內，用 nrand 決定位置，畫 n 顆斑
// spotStyle: "rose"(玫瑰環斑=石虎) | "plum"(白實心=梅花鹿) | "oval"(黑橢圓=鮭魚)
function spots(g, bLen, bW, n, spotStyle, mark){
  g.save();
  g.globalCompositeOperation = "source-atop";        // 斑只落在角色身上，不外溢
  for(let i = 0; i < n; i++){
    const px = (nrand(i) - 0.5) * bLen * 1.4;         // 沿長軸
    const py = (nrand(i * 3.1) - 0.5) * bW * 1.2;     // 沿寬軸
    const rr = bW * (0.06 + nrand(i * 5.7) * 0.05);   // 斑點大小抖動
    if(spotStyle === "rose"){                          // 石虎玫瑰斑：褐色環
      g.strokeStyle = mark; g.lineWidth = rr * 0.5;
      g.beginPath(); g.arc(px, py, rr, 0, 6.28); g.stroke();
    } else {                                           // 梅花斑/黑斑：實心
      g.fillStyle = mark;
      g.beginPath(); g.ellipse(px, py, rr, rr * 0.8, 0, 0, 6.28); g.fill();
    }
  }
  g.globalCompositeOperation = "source-over"; g.restore();
}
// 石虎：spots(g,bLen,bW,14,"rose","#6b4327")
// 梅花鹿：spots(g,bLen,bW,10,"plum","#fbf3e6")   ← 記憶特徵，最亮最清楚
// 鮭魚：spots(g,bLen,bW,8,"oval","#20353c")      ← 體側「一列」橢圓黑斑
```

**(c) 守土哪裡用**：`drawCreatureTop`/`drawCreature` 各 kind 分支，畫在身體填色之後、rim light 之前。**記憶特徵斑（梅花鹿梅花斑、藍鵲紅嘴腳）務必最亮、絕不省略**（R-ART-05 驗收）。

### 2.2 毛流（黑熊、獼猴、石虎胸腹白毛）

**(a) 原理**：短促、順向的小筆觸暗示毛向，**不畫死每根**——沿身體邊緣掃一排帶噪點角度的短線。

```js
// 毛流：沿一段邊緣鋪 n 撮短毛，角度帶 nrand 抖動，顏色比底色亮/暗一階
function fur(g, x, y, len, ang, n, col){
  g.strokeStyle = col; g.lineWidth = Math.max(1, len * 0.08); g.lineCap = "round";
  for(let i = 0; i < n; i++){
    const t = i / n, jx = (nrand(i) - 0.5) * len * 0.3;
    const a = ang + (nrand(i * 2.3) - 0.5) * 0.4;    // 毛向抖動
    const sx = x + Math.cos(ang + 1.57) * (t - 0.5) * len + jx;
    const sy = y + Math.sin(ang + 1.57) * (t - 0.5) * len;
    g.beginPath(); g.moveTo(sx, sy);
    g.lineTo(sx + Math.cos(a) * len * 0.22, sy + Math.sin(a) * len * 0.22);
    g.stroke();
  }
}
// 黑熊背毛：fur(g,-bLen*0.2,-bW*0.4, r*0.4, -0.4, 8, shade(col,26))
```

**(c) 守土哪裡用**：大體型哺乳類（熊/獼猴/石虎）身體邊緣；**克制使用**（Pokémon 乾淨原則），只在剪影邊緣一兩排，別鋪滿。

**(d) 效能**：`n` 設小（6~10），純 stroke。用 `nrand` 保證不抖動。

### 2.3 鱗片（穿山甲覆瓦鱗甲、蟒網紋、鬣蜥背棘）

**(a) 原理**：**覆瓦（overlapping tile）**排列——一排排上緣圓弧的鱗片，行間錯位半格；穿山甲的鱗甲邊線就是它的唯一記憶特徵。

```js
// 覆瓦鱗甲：rows 行 × cols 列，每片畫成一個上緣圓弧 path，行間錯半格 → 覆瓦感
function scales(g, bLen, bW, rows, cols, edge){
  g.save(); g.globalCompositeOperation = "source-atop";
  const sw = bLen * 1.6 / cols, sh = bW * 1.4 / rows;
  g.lineWidth = Math.max(1, sw * 0.12); g.strokeStyle = edge;   // 鱗片邊線＝記憶特徵
  for(let ry = 0; ry < rows; ry++){
    for(let cx = 0; cx < cols; cx++){
      const ox = -bLen * 0.8 + cx * sw + (ry % 2) * sw * 0.5;   // 錯半格
      const oy = -bW * 0.7 + ry * sh;
      g.beginPath();
      g.moveTo(ox, oy + sh);                                     // 鱗片下緣
      g.quadraticCurveTo(ox + sw * 0.5, oy - sh * 0.2, ox + sw, oy + sh); // 上緣圓弧
      g.stroke();
    }
  }
  g.globalCompositeOperation = "source-over"; g.restore();
}
// 穿山甲：scales(g,bLen,bW,5,7,"#7a5a2a")   ← 覆瓦狀鱗片邊，art-direction 記憶特徵
```

**(c) 守土哪裡用**：穿山甲（鱗甲）、蟒（網紋，把上緣圓弧換成菱形網格）、鬣蜥（背棘另用小三角 path 沿背脊）。入侵種的**尖刺/鱗**要帶「陰險」暗示（art-direction §4.4 入侵種剪影）。

**(d) 效能**：`rows*cols` 是總 stroke 數，**設上限**（如 ≤ 40 片），大到看不清就別畫。整塊在離屏 `g` 一次畫完，若角色靜止可快取（見 §5.1）。

---

## 3. 統一 VFX 語言（衝擊環／閃白／squash／粒子）參數化

對應 art-direction §4.5（VFX 視覺語言）與 **R-ART-02 / R-ART-04**。目標：所有特效講**同一套美術語言**，收斂成一組可重用函式與一張常數表。現況 `sparks()`/`ring()` 已存在但參數散落，這裡統一。

### 3.0 VFX 常數表（建議放 moba.js 頂部，全特效共用）

```js
// 一組常數 → 所有 VFX 顏色/上限一致（接 art-direction §4.5）
const VFX = {
  INK:  "#20140c",                     // 特效描邊 = 角色墨色（卡通粗邊感）
  ALLY: "#ffd54f", ALLY2: "#ffe9a8",   // 守護者暖金（火花/衝擊環主色）
  FOE:  "#7fff5a", FOE2:  "#3ac6c6",   // 入侵種毒綠 / 冷青
  FLASH: "rgba(255,255,255,0.75)",     // 命中閃白
  RING_LW: 3,                          // 衝擊環基礎線寬（隨力道放大）
  MAX_FX: 150                          // 沿用既有硬上限（守鐵則）
};
```

### 3.1 圓潤衝擊環（shockwave ring）— 統一 `ring()`

**(a) 原理**：擴張的**描邊圓 + 內側柔光**；外圈粗墨邊給卡通感（Brawl），內圈陣營色柔光（`lighter`）。

**(b) 兩種對接方式**（現況 `ring(x,y,r,col)` 是往 `fx[]` push 一顆 `type:"ring"` 粒子，見 moba.js:739）

```js
// 方式 1（保留既有粒子式 ring，擴充陣營粗邊）——在 fx 的 ring 渲染分支加外墨邊：
// for(const e of fx){ if(e.type==="ring"){ ... 先描 INK 粗邊，再描 e.col 內圈 ...} }
// 渲染分支改成：
//   const rad = e.r0 + (1 - e.life/e.max) * (e.r1 - e.r0);
//   ctx.save(); ctx.globalAlpha = e.life/e.max; ctx.lineJoin="round";
//   ctx.strokeStyle = VFX.INK; ctx.lineWidth = (e.lw||VFX.RING_LW) + 2.5;   // 外粗墨邊
//   ctx.beginPath(); ctx.arc(e.x,e.y,rad,0,7); ctx.stroke();
//   ctx.globalCompositeOperation="lighter";
//   ctx.strokeStyle = e.col; ctx.lineWidth = e.lw||VFX.RING_LW;              // 內陣營柔光
//   ctx.beginPath(); ctx.arc(e.x,e.y,rad,0,7); ctx.stroke(); ctx.restore();

// 方式 2（即畫版，非粒子，用於當幀立即環）：
function ringNow(x, y, rad, lw, col){
  ctx.save(); ctx.lineJoin = "round";
  ctx.strokeStyle = VFX.INK; ctx.lineWidth = lw + 2.5;               // 外粗墨邊
  ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
  ctx.globalCompositeOperation = "lighter";                          // 內陣營柔光
  ctx.strokeStyle = col; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
  ctx.restore();
}
// 普擊小環：ring(x,y,40,"#ffd54f")（保留現有呼叫）
// 必殺/首領三層：for(let k=0;k<3;k++) ring(x,y, 60+k*18, k?VFX.ALLY:VFX.FOE);
```

**(c) 守土哪裡用**：普擊命中、必殺、首領登場/擊破三層環（現況首領擊破已三層 moba.js:428/718，統一其參數）。**保留既有 `ring(x,y,r,col)` 簽名**避免改壞所有呼叫點（約 10 處）。

**(d) 效能與鐵則**：走 `fx[]`（上限 150、每幀 `splice` 回收，moba.js:508）不可繞過。`lighter` 只在畫環那幾筆用、用完 `restore()`。

### 3.2 命中閃白（hit flash）— R-ART-02

**(a) 原理**：被打瞬間角色整體疊一層白（`lighter`），依 `u.hitT` 衰減；輕擊白 0.4、重擊/必殺 0.75。

```js
// u.hitT 是既有命中計時（moba.js 命中後設；貼回主畫布時檢查）
// p = 衝擊強度 0~1
const p = u.hitT > 0 ? (u.hitT / 0.12) : 0;
if(p > 0){
  ctx.save();
  ctx.globalCompositeOperation = "lighter";       // 顏色相加 → 亮白閃
  ctx.globalAlpha = 0.75 * p;                      // 輕擊乘 0.5
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.ellipse(u.x, gy, r * 0.9, r * 0.95, 0, 0, 7); ctx.fill();
  ctx.restore();
}
// 進階（形狀貼合剪影）：不畫橢圓，改把離屏 oc 當 mask 疊白：
//   ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.75*p;
//   ctx.drawImage(ocWhite, ...); ctx.restore();   // ocWhite=同剪影純白版
```

**(c) 守土哪裡用**：`drawCreatureTop` 貼回主畫布後（moba.js:1288 之後）；guest 端可依快照 hp 變化本地觸發（見 ARCHITECTURE §2.3，快照不送 fx）。

**(d) 效能與鐵則**：**純疊層、不進 fx 陣列** → 不吃粒子上限（R-ART-02 驗收）。橢圓版最省；剪影 mask 版多一次 drawImage、更精緻，選用。

### 3.3 squash & stretch — R-ART-02

**(a) 原理**：命中/跳躍/衝撞時角色壓扁拉長，強化 Q 彈動感；**只動 transform，不動資料**。

```js
// 命中壓扁拉長：p 為衝擊強度 0~1，數幀內回 1
const p = u.hitT > 0 ? (u.hitT / 0.12) : 0;
ctx.save();
ctx.translate(u.x, gy);
ctx.scale(1 + p * 0.18, 1 - p * 0.12);    // 橫拉 + 縱壓（守恆感）
ctx.translate(-u.x, -gy);
// …此處貼回離屏角色 oc / drawImage…
ctx.restore();
// 跳躍前搖（蓄力）：起跳前一兩幀 scale(0.9,1.1) 壓蹲，離地瞬間 scale(1.1,0.9) 拉伸
// 入侵種蓄力衝撞（現有機制）：衝出前 scale(0.85,1.15) 誇張壓蹲 → 放大威脅預告
```

**(c) 守土哪裡用**：`drawCreatureTop` 命中、跳躍、入侵種蓄力衝撞前搖。

**(d) 效能與鐵則**：零成本（transform）、零外部。**不改資料合約**（`u.x/u.r` 不動，只在繪製 transform 內縮放）。

### 3.4 粒子火花（sparks）— 統一陣營色

**(a) 原理**：命中噴一撮火花；守護者暖金、入侵種毒綠/冷青。沿用既有 `sparks(x,y,n,col)`（moba.js:738）。

```js
// 沿用既有 sparks，只統一顏色來源與數量上限
sparks(x, y, Math.min(12, n), faction === "inv" ? VFX.FOE : VFX.ALLY);
// sparks 內部已有回收：if(fx.length>150) fx.splice(0,fx.length-150);  ← 守鐵則，勿刪
```

**(c) 守土哪裡用**：所有命中/技能。單次 `n ≤ 12`。

**(d) 效能與鐵則**：**每次 push 後回收**是鐵則（現況已做）。**禁止每幀無上限 push**——連續技要靠 `n` 上限與 `fx` splice 兜住。

---

## 4. 發光與合成技法（必殺／首領登場）

對應 art-direction §4.5 E（大招華麗但可讀）與 §4.6（首領登場運鏡）。核心是**分清「便宜的假發光」與「貴的真發光」**。

### 4.1 合成模式速查（哪個場合用哪個）

| composite | 效果 | 守土用途 | 成本 |
|---|---|---|---|
| `source-over`（預設） | 正常覆蓋 | 一切預設 | **最快** |
| `lighter`（加亮） | 顏色相加、越疊越亮 | **火花/衝擊環/rim/閃白/大招光束**（我們的主力發光） | 中（唯一堪用的發光近似） |
| `source-atop` | 只畫在已有像素上 | **離屏內頂光/底暗/斑紋/鱗片**（鎖在剪影） | 中（僅離屏內用） |
| `screen` | 提亮但不爆白 | 柔和光暈替代 lighter（較不刺眼） | 中 |
| `multiply` | 相乘變暗 | 陰影/暗幕/入侵種毒色染 | 中 |

> **鐵則級效能警告**：Firefox 等瀏覽器上**除 `source-over` 外的所有 composite 都明顯較慢**（來源：Bugzilla 762973）。故——**只在離屏 `g` 或當幀少數幾筆特效上切 composite，用完立刻 `restore()` 回 `source-over`**；**絕不**對整個場景/整幀開著非預設 composite。

### 4.2 發光：`shadowBlur` vs 多層描邊 — 兩法比較

**(a) 原理**：讓輪廓/光點外滲一圈柔光。兩條路：`shadowBlur`（真高斯糊，貴）vs **多層半透明描邊/`lighter` 疊圓**（假發光，便宜）。

```js
// —— 法 A：shadowBlur（真柔光，貴）——只在英雄時刻用
ctx.save();
ctx.shadowColor = VFX.ALLY; ctx.shadowBlur = 24; ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
ctx.fillStyle = VFX.ALLY; drawUltShape();     // 必殺核心形狀
ctx.shadowBlur = 0; ctx.restore();

// —— 法 B：多層 lighter 疊圓（假發光，便宜）——對戰每幀可用
ctx.save(); ctx.globalCompositeOperation = "lighter";
for(let i = 3; i >= 1; i--){                    // 外大內小、外淡內亮 → 疊出光暈
  ctx.globalAlpha = 0.12 * i;
  ctx.fillStyle = VFX.ALLY;
  ctx.beginPath(); ctx.arc(x, y, R * (0.5 + i * 0.35), 0, 7); ctx.fill();
}
ctx.restore();

// —— 法 C：徑向漸層光暈（最省的一種柔光，無 composite 也行）——
const gl = ctx.createRadialGradient(x, y, 0, x, y, R * 1.6);
gl.addColorStop(0, "rgba(255,213,79,0.5)"); gl.addColorStop(1, "rgba(255,213,79,0)");
ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, R * 1.6, 0, 7); ctx.fill();
```

**兩法取捨**：

| 法 | 品質 | 成本 | 用在哪 |
|---|---|---|---|
| A `shadowBlur` | 最好（真糊） | 高 | 必殺瞬間、首領登場名號、選角大廳 |
| B 多層 `lighter` 疊圓 | 好 | 低 | 對戰大招光束/持續光環 |
| C 徑向漸層 | 中（單層柔） | **最低** | 首領不祥光環（現況 moba.js:1295 已用）、地環 |

**(c) 守土哪裡用**：必殺（法 A/B，顏色鎖該守護者記憶特徵色——藍鵲帶紅、帝雉帶金屬藍）；首領登場名號大字（法 A，現況已 `shadowBlur=24` moba.js:821）；首領/精英光環（法 C，現況已用）。

**(d) 效能與鐵則**：`shadowBlur` **只在英雄時刻**（低頻事件）用，不進對戰每幀熱路徑。大招光束**避開 HUD 安全區**（血條/搖桿 `bLeft/bRight/bSp/bAtk` 區）——形狀不遮關鍵資訊（art-direction §4.5 E）。

### 4.3 首領登場電影運鏡（letterbox + 名號 + 掃光）

**(a) 原理**：黑幕 letterbox + 名號大字滑入 + 紅色掃光 + rim。現況已有（moba.js:821-861），這裡把**掃光**規格化成可重用配方。

```js
// 紅色掃光：一條沿 X 掃過的高亮斜帶（lighter），配合名號滑入
// prog 0→1 為進場進度
ctx.save(); ctx.globalCompositeOperation = "lighter";
const sweepX = -W * 0.3 + prog * W * 1.6;         // 從左掃到右
const grd = ctx.createLinearGradient(sweepX - 120, 0, sweepX + 120, 0);
grd.addColorStop(0,   "rgba(255,60,60,0)");
grd.addColorStop(0.5, "rgba(255,80,80,0.28)");    // 掃光帶
grd.addColorStop(1,   "rgba(255,60,60,0)");
ctx.fillStyle = grd; ctx.fillRect(0, cy - 60, W, 120);
ctx.restore();
// letterbox 黑幕（現況深底 #0d1f14）：上下兩條 fillRect，高度隨 prog ease-in
```

**(c) 守土哪裡用**：`moba.js` 首領登場序列（`bossIntro`）。運鏡**節奏歸 game agent**，美術只供掃光/名號視覺配方（art-direction §6 銜接）。

**(d) 效能與鐵則**：登場是**一次性低頻事件**，可用較貴手法（`shadowBlur`/掃光）。零外部資源；字型用系統 `'Noto Sans TC',sans-serif`（現況如此，不載外部字型）。

---

## 5. 效能：離屏快取角色底圖、粒子物件池、逐幀成本控制

守 CLAUDE.md 效能鐵則：**粒子硬上限 + 回收、避免逐幀重算、單檔零外部資源**。

### 5.1 離屏快取角色「靜止底圖」（redraw only when dirty）

**(a) 原理**：角色**沒動作變化的那幾幀**，別重畫整隻——把「一個朝向 + 一個動作幀」畫進離屏快取，之後直接 `drawImage`。現況 `drawCreatureTop._oc` 已是**共用一張離屏臨時畫布**（每幀清空重畫），這裡談**進一步快取成品**。

```js
// 進階快取：以 (kind, elite, cosmetic, 動作幀分桶) 為 key，快取畫好的角色成品
// 只在 key 變了才重畫，否則直接貼 → 靜止/緩動角色省下每幀重畫
drawCreatureTop._cache = drawCreatureTop._cache || new Map();
function cachedCreature(u, r, faction){
  const phase = Math.round((u.moving ? u.anim * 12 : 0) % 6);   // 動作分 6 桶，避免每 px 都重畫
  const key = u.kind + "|" + (u.elite?1:0) + "|" + (u.cos||"-") + "|" + phase + "|" + faction;
  let cv = drawCreatureTop._cache.get(key);
  if(!cv){
    cv = document.createElement("canvas");     // 只在 miss 時建
    // …把該 kind/該幀畫進 cv（沿用現有離屏繪製流程）…
    drawCreatureTop._cache.set(key, cv);
    if(drawCreatureTop._cache.size > 64)       // 快取硬上限，防記憶體膨脹
      drawCreatureTop._cache.delete(drawCreatureTop._cache.keys().next().value);
  }
  ctx.drawImage(cv, u.x - cv.width/2, /*…*/);   // 命中閃白/squash/rim 仍即時疊（見 §3）
}
```

**(c) 守土哪裡用**：`drawCreatureTop`/`drawCreature` 大量同種單位同框時（PVE 一堆入侵種、五人首領戰）收益最大。

**(d) 效能與鐵則**：**快取需硬上限**（如 64 張）並 LRU 淘汰，否則記憶體膨脹。動作分桶（不是每 px 一張）是關鍵。命中閃白/squash/rim 是**即時疊層**、不進快取（否則要無限張）。**權衡**：若角色多樣、幾乎都在動，快取命中率低反而多花記憶體——先量測再上（見 §5.3）。

### 5.2 粒子物件池（object pool）— 免每幀 GC

**(a) 原理**：現況 `fx` 是「push + filter 回收」（moba.js:508），會**每幀產生垃圾物件**（filter 建新陣列、死粒子被 GC）。物件池改成**重用死掉的粒子物件**，零分配、免 GC 卡頓。

```js
// 定容環形/掃描池：固定 MAX_FX 個粒子物件重用，alive 旗標控制生死，永不 new/filter
const POOL_N = 150;                                        // = 現有硬上限
const pool = new Array(POOL_N).fill(0).map(() => ({ alive:false }));
function spawnFx(init){                                    // 取一個死粒子復用
  for(let i = 0; i < POOL_N; i++){
    const p = pool[i];
    if(!p.alive){ Object.assign(p, init); p.alive = true; return p; }
  }
  // 全滿 → 覆蓋最舊（或直接放棄這顆，守上限）
}
function tickFx(dt){
  for(let i = 0; i < POOL_N; i++){
    const p = pool[i]; if(!p.alive) continue;
    p.life -= dt; if(p.life <= 0){ p.alive = false; continue; }  // 回收：只翻旗標，不刪
    if(p.type === "spark"){ p.x += p.vx*dt; p.y += p.vy*dt; }
  }
}
// 渲染：for(const p of pool){ if(!p.alive) continue; … }
```

**(c) 守土哪裡用**：`moba.js` 的 `fx` 系統（`sparks`/`ring`/`slash`/`streak`）。

**(d) 效能與鐵則**：**天然守「硬上限 + 回收」鐵則**（池容量 = 上限，回收 = 翻旗標）。**取捨**：這是**重構**現有 `fx`（改所有 push/filter/render 迴圈），行為需 1:1 對齊——現況 push+filter 已守住上限且夠用，**除非量測到 GC 卡頓，否則不必急著換**；先列為 §6 `src/gfx.js` 的候選。

### 5.3 逐幀成本控制（cheat sheet）

**(a) 原理**：把「每幀對每隻/每顆」的成本壓到最低。

**逐幀該做/不該做**：

| 該做 | 不該做（逐幀熱路徑禁忌） |
|---|---|
| composite 只在離屏 `g` 或少數特效筆用，用完 `restore()` | 整幀/整場景開著 `lighter`/`source-atop` |
| `shadowBlur` 只在英雄時刻低頻事件 | 對戰每幀每隻用 `shadowBlur` rim |
| 漸層/path 常數的先算好、快取（如地環漸層） | 每幀 `createLinearGradient`/`createRadialGradient` 重建不變的漸層 |
| 粒子走上限 + 回收 | 連續技每幀無上限 `push` |
| 用 `nrand(i)` 讓材質穩定 | 用 `Math.random()` 畫斑紋（每幀抖動 + 無法快取） |
| 三角函數結果暫存（`Math.cos(f)` 存變數） | 同一角度 `Math.cos/sin` 一幀算很多次 |
| 離屏尺寸 `Math.max(48,ceil(r*3))` 隨體型（現況） | 離屏開超大畫布每幀 clear |

**量測法（無頭驗收，守 CLAUDE.md 煙霧測試）**：CDP 抓 `performance.now()` 包住 render，或 `Runtime.evaluate` 讀 rAF 間隔；確認 **0 runtime error + 幀時間穩定**（見 CLAUDE.md 無頭 Chromium 流程）。

**(d) 鐵則**：任何新效果上線前跑 `node --check` + 無頭 0 error + **粒子有上限與回收** + **單檔零外部資源**（四項一票否決，CLAUDE.md）。

---

## 6. 可重用美術工具模組介面建議（未來 `src/gfx.js`，只建議不改程式）

art-direction 建議把 `VFX` 常數放 moba.js 頂部；再進一步，可把本檔的可重用配方**收斂成一個薄美術工具模組** `src/gfx.js`，透過 `window.__gfx` 橋接（遵 ARCHITECTURE §1「模組只透過 `window.__` 互通、不互相 import」的約定）。**以下只是介面建議（函式簽名清單），不改任何程式**；抽取時務必保 `drawCreature/drawCreatureTop` 原簽名不動、行為 1:1。

```js
// === src/gfx.js（建議草案，掛 window.__gfx；載入序在 legacy.js 之後、moba.js 之前）===
window.__gfx = {
  // 常數（art-direction §4.5 VFX 表 + 本檔）
  VFX,                                                  // {INK,ALLY,ALLY2,FOE,FOE2,FLASH,RING_LW,MAX_FX}

  // 1. 描邊 / 著色（§1）
  inkStroke(g, pathFn, col, lw),                        // 法 A 先粗墨後填
  celLight(g, R2),                                      // §1.2 做法1：source-atop 頂光底暗
  celSplit(g, r, col, dir),                             // §1.2 做法2：二分 cel 暗面
  rim(g, pathFn, faction, hero /*=false*/),             // §1.3：hero=true 用 shadowBlur(法B)

  // 2. 程序式材質（§2）
  nrand(seed),                                          // 確定性偽亂數（穩定材質）
  spots(g, bLen, bW, n, style, markCol),               // 斑紋（rose/plum/oval）
  fur(g, x, y, len, ang, n, col),                       // 毛流
  scales(g, bLen, bW, rows, cols, edgeCol),             // 覆瓦鱗甲/網紋

  // 3. VFX（§3）—— 與現有 sparks/ring 併存，逐步遷移
  ring(x, y, rad, lw, col),                             // 統一衝擊環（外墨邊+內陣營柔光）
  hitFlash(ctx, x, y, r, p),                            // 命中閃白（p=0~1）
  squash(ctx, x, y, p, drawFn),                         // squash&stretch 包一次繪製
  sparks(x, y, n, faction),                             // 陣營色火花（内部走 fx 上限+回收）

  // 4. 發光 / 合成（§4）
  glow(ctx, x, y, R, col, mode /*"blur"|"stack"|"radial"*/), // 三法選一
  sweep(ctx, W, cy, prog, col),                         // 首領登場掃光

  // 5. 效能（§5）
  cachedDraw(key, w, h, drawFn),                        // 離屏成品快取（LRU 上限 64）
  fxPool: { spawn(init), tick(dt), forEach(fn), reset() } // 粒子物件池（可選，取代 fx）
};
```

**抽取原則（給未來實作者）**：

1. **不改簽名、不改行為**：`drawCreature(c,kind,x,y,s,o)`/`drawCreatureTop(u,r0,faction)` 對外一字不動；`gfx` 只是把它們**內部**重複的描邊/材質/VFX 收成共用函式。
2. **併存遷移**，非一次替換：先讓 `__gfx.ring/sparks` 與現有同名函式併存、逐處替換、每步可回退（遵 CLAUDE.md「可玩可回退」漸進重構）。
3. **守四項一票否決**：抽取後仍 `node --check` 過、無頭 0 error、粒子上限+回收、零外部資源。
4. **PWA**：新增 `src/gfx.js` 要同步 `sw.js` 的 `ASSETS` 並提升 `CACHE` 版本（現況 `shoutu-v99`）。
5. **載入序**：`window.__gfx` 需在 `moba.js`/`legacy.js` 之前掛好（參 ARCHITECTURE §1 載入序表）。

> 這是 **Sprint 0/1 漸進重構「抽美術」步驟**的具體落點（CLAUDE.md 路線圖：抽資料→**抽美術**→抽引擎→拆場景）。本檔提供該步的介面草案，實際開單走 `docs/PROCESS.md`。

---

## 7. 信心度、來源、與 art-direction / game agent 的銜接

### 信心度

- **落地 canvas 做法（§1-§5 全部片段）**：**高**——直接對照本專案現有程式逐行確認可接：`INK/OUT/shade`（moba.js:965,984,745）、`source-atop` 頂光底暗（moba.js:1282-1286 / legacy.js:382-386）、`sparks/ring`（moba.js:738-739）、`fx` 上限 150 + splice 回收（moba.js:508）、`u.hitT`（moba.js:980,1288）、`mshake/freeze/hitStop`（moba.js:93,753）、離屏 `oc/g` 樣板（moba.js:994-997 / legacy.js:31-34）。片段命名皆對接既有變數，可直接併入 R-ART ticket。
- **技法原理（cel/rim/bold outline/juice/composite）**：**高**——多來源一致（見下）：cel shading = 限制色階的塊狀亮暗、rim light 為分離背景的必備光、bold outline 為卡通描邊定義特徵；juice = hit flash + squash&stretch + screen shake + particles + floating numbers；`lighter` 是 canvas 唯一堪用的發光近似。
- **`composite` 效能警告（除 source-over 外皆較慢）**：**中高**——有 Firefox Bugzilla 明確記錄，跨瀏覽器程度不一，但「只在少數筆/離屏用、用完 restore」是安全通則。
- **物件池 vs push+filter（§5.2）**：**中**——池天然守上限且免 GC，但屬**重構**、需 1:1 對齊行為；現況已守鐵則且夠用，列為未來候選而非必做。

### 與 art-direction.md 的銜接（不重造輪子）

- 本檔**接續**其 **R-ART-01**（rim light，§1.3）、**R-ART-02**（閃白+squash，§3.2/3.3）、**R-ART-03**（入侵種毒色/冷墨 `#14201c`，§1.1/§3 陣營色）、**R-ART-04**（統一衝擊環，§3.1）、**R-ART-05**（唯一記憶特徵，§2 材質）、**R-ART-06**（獎勵揭曉，屬 UI/game agent，未在本檔展開）。
- 沿用其**色票**（守護者暖 / 入侵種冷毒 / CTA 黃）與 **VFX 常數表**（§3.0），不另立一套。

### 與 game agent 的銜接

- **首領登場掃光/名號**（§4.3）：美術供視覺配方，**運鏡節奏由 game agent 主導**（同 art-direction §6）。
- **獎勵揭曉 `revealBurst()`**（art-direction R-ART-06）：觸發時機與資料流歸 game agent，美術供放射光束/彈跳/金粒子視覺；本檔的 `glow`/`sparks`/`ring` 可當其零件。

### 來源

- Cel shading / rim light / bold outline 原理：[Fox Render Farm — Cel Shading Tutorial](https://www.foxrenderfarm.com/share/cel-shading-tutorial/)、[GarageFarm — Cel Shading Guide](https://garagefarm.net/blog/cel-shading-a-comprehensive-guide)、[Wayline — Cel Shading Expert Guide](https://www.wayline.io/blog/cel-shading-a-comprehensive-expert-guide)、[Lettier — 3D Game Shaders (Cel Shading)](https://lettier.github.io/3d-game-shaders-for-beginners/cel-shading.html)
- Game feel / juice（hit flash、squash&stretch、screen shake、particle pooling）：[GameAnalytics — Squeezing more juice](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)、[Slicker.me — Game Feel: Juice, Screenshake](https://slicker.me/python/game_feel_pygame.htm)、[Medium — Juice It (Camera Shake)](https://gt3000.medium.com/juice-it-adding-camera-shake-to-your-game-e63e1a16f0a6)、[GameDev Academy — Game Feel](https://gamedevacademy.org/game-feel-tutorial/)
- Canvas 合成模式與效能：[MDN — globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)、[Konva — Blend Mode](https://konvajs.org/docs/styling/Blend_Mode.html)、[ZetCode — globalCompositeOperation](https://zetcode.com/canvas-api/globalcompositeoperation/)、[Mozilla Bugzilla 762973 — 非 source-over composite 較慢](https://bugzilla.mozilla.org/show_bug.cgi?id=762973)
- 本專案程式（最高權重來源）：`src/moba.js`（`drawCreatureTop`/`sparks`/`ring`/`fx`/`mshake`/`freeze`/離屏合成）、`src/legacy.js`（`drawCreature`/`shade`/離屏合成）、`docs/research/art-direction.md`、`docs/ARCHITECTURE.md`、`CLAUDE.md §鐵則`。

---
_維護：本檔屬 `docs/research/`，為 Canvas2D 美術技法研究輸出，接續 `art-direction.md`。落地時把配方併入對應 R-ART ticket；抽 `src/gfx.js` 時走 `docs/PROCESS.md` 開單、同步 `sw.js` 版本。_
