# 守土 · 福爾摩沙衛士 — 美術方向規格（Art Direction）

> 研究者：美術總監研究員（art agent）。
> 目的：借鏡《荒野亂鬥 Brawl Stars》與《寶可夢 Pokémon》的美術**原則**，轉成一份**守土·福爾摩沙衛士**能用 **Canvas2D 程式繪製**直接落地的**原創**美術方向——借鏡原則，絕不抄襲任一方。
> 硬限制（`CLAUDE.md §鐵則`）：**單檔零外部資源**，所有美術都是 canvas 畫出來的規則（形狀、路徑、漸層、陰影、合成模式、粒子），不是 sprite sheet。既有繪製函式 `drawCreature(c,kind,x,y,s,o)`（大廳側視）、`drawCreatureTop(u,r0,faction)`（對戰俯視）**簽名不可改，只能擴充畫法**。
> 對應版本：Beta 1.0（`8c53e28` / `shoutu-v98`）。與「game agent」同讀書會：流程/過場玩法交給他，本檔專攻**美術**，銜接點在文末標明。

---

## 目錄

1. Brawl Stars 美術原則拆解（5 大要素）
2. Pokémon 角色美術風格拆解
3. Brawl Stars vs Pokémon 風格比較（對照表）
4. ★守土原創美術方向（融合兩者精華 + 台灣生態寫實）
   - 4.1 我們的甜蜜點（原創定位）
   - 4.2 色彩計畫（HEX 色票）
   - 4.3 描邊與著色規則（canvas 可實作）
   - 4.4 比例與剪影（chibi 化 + 記憶特徵）
   - 4.5 VFX 視覺語言（統一參數）
   - 4.6 UI 風格指南
5. ★落地 ticket（R-ART-01…）＋示意程式碼片段
6. 資料信心度、來源、與 game agent 的銜接點

---

## 1. Brawl Stars 美術原則拆解

濃縮成「可學的規律」，每點都對應到我們能不能用 canvas 做到。

### 1-A 角色造型：大頭短身 + 粗黑描邊 + 剪影辨識
- **比例**：明顯的**大頭短身（chibi）**，頭約佔全身 1/3~1/2；四肢短粗（short & stubby），手腳圓潤。
- **粗黑描邊（bold outline）**：角色外緣一圈厚實深色線，讓角色從背景「跳出來」。線寬**隨體型放大**（大角色線更粗），維持一致的插畫感。
- **剪影辨識度（silhouette readability）**：純黑剪影就能認出是誰——靠**獨特輪廓**（帽子、武器、體型、招牌配件），而非靠貼圖細節。手機小螢幕上也要秒認。
- **表情誇張、個性鮮明**：大眼睛、誇張眉毛/嘴型，每隻情緒外放，一看就有「性格」。

### 1-B 上色 / 著色：高彩度平塗 + cel shading + rim light
- **高彩度平塗**為底，疊一層**明確的亮/暗分區（cel shading）**：不是柔和漸層過渡，而是**塊狀的亮面、中間色、暗面**，界線相對清楚。
- **rim light（邊緣光）**：角色輪廓內側一圈亮邊，把角色和暗背景分離、增加立體與「潮」感。
- **材質暗示**：金屬、皮毛、布料用少量高光點與筆觸暗示，不畫死細節。

### 1-C 色彩計畫：高彩角色 vs 低彩背景 + 隊伍配色 + 黃色 CTA
- **背景低彩、角色高彩**：地圖/場景刻意壓低飽和度與明度，讓高彩度角色與特效永遠是視覺主角。
- **隊伍配色**：對戰用**藍隊 / 紅隊**強對比，一眼分敵我。
- **醒目黃當 CTA**：「開打 / Play」等主行動鈕用**大、亮的黃色**，是最強的視覺召喚（obvious signifier）。

### 1-D VFX / 打擊感的視覺語言：粗邊爆點 + 圓潤衝擊環 + squash&stretch + 命中閃白
- 爆炸/命中用**帶粗描邊的卡通爆點**（星狀、圓弧），不是寫實煙塵。
- **圓潤的衝擊環（shockwave ring）**：擴張的環形，配合力道放大。
- **squash & stretch**：命中/跳躍時角色壓扁拉長，強化「Q 彈」動感（juice）。
- **命中閃白（hit flash）**：被打瞬間角色整體閃一下白/亮，回饋清楚。
- **超級技能華麗但可讀**：大招特效很炫，但**顏色/形狀不會蓋掉關鍵資訊**（血條、敵我位置）。

### 1-E UI 風格：圓角厚實 + 大按鈕 + 粗字重 + 塗鴉/木質感 + 獎勵閃亮
- **圓角厚實**面板與按鈕（大圓角、有厚度/立體邊）。
- **大按鈕 + 粗字重（900）**，手指好按、遠看好讀。
- **街頭塗鴉 / 木箱質感**點綴，帶點頑皮潮味。
- **獎勵揭曉**：開箱/升級用**閃光、放射光束、彈跳縮放**的華麗小動畫營造爽感。

---

## 2. Pokémon 角色美術風格拆解

以總監 Ken Sugimori 建立的原則為主軸（見來源）。核心一句：**「好記」比「帥」更重要（memorability over coolness）**。

### 2-A 簡潔圓潤造型
- **簡單形狀、圓潤輪廓**：由少數大圓/橢圓組成，親和、可愛、不張牙舞爪。造型「乾淨」，資訊量克制。

### 2-B 單一鮮明特徵（記憶點）— 最重要
- 每隻用**一個核心概念**設計：**「一種動物/物件 ＋ 一個元素或特徵」**（如：某動物＋火、某動物＋一撮呆毛）。
- **刻意保留一個「不完美但好記」的細節**：Sugimori 舉例——傑尼龜同期的「水獺」臉上三顆雀斑，很多人叫他拿掉會「更可愛」，但他堅持保留，因為**拿掉就不好記了**。這就是「單一記憶特徵」原則：**辨識度 > 純粹的美**。
- **平衡技法**：太帥就加一點「不帥」的、太嚴肅就加一點「開心」的，維持整體平衡與親和。

### 2-C 乾淨的粗描邊 + 平塗 + 少量陰影
- **乾淨俐落的描邊**（比 Brawl Stars 細、更均勻），**平塗填色**為主，**只加少量陰影/高光**（不是重 cel shading，是點到為止）。
- **配色克制**：每隻主色 1~2 色 + 少量強調色，**高對比但不吵**，小尺寸（早期 Game Boy 黑白）也認得出。

### 2-D 剪影即可認出
- 和 Brawl Stars 一樣重視**剪影辨識**，但走「簡潔可愛」路線：靠**整體大輪廓 + 那個單一記憶特徵**，而非配件堆疊。

---

## 3. Brawl Stars vs Pokémon 風格比較

| 面向 | Brawl Stars | Pokémon | 我們要學誰 |
|---|---|---|---|
| **核心哲學** | 潮、爽、街頭個性外放 | 好記 > 帥、親和可愛 | **Pokémon 的「好記」為骨，Brawl 的「爽」為肉** |
| **比例** | 大頭短身、四肢短粗（chibi） | 簡潔圓潤、比例克制 | chibi 化但**適度**（動物特徵要留） |
| **描邊** | **粗**黑描邊、隨體型變粗 | 乾淨**中粗**、均勻 | 粗描邊（Brawl），但線條乾淨（Pokémon） |
| **著色** | 高彩平塗 + **明顯 cel shading** + rim light | 平塗 + **少量**陰影高光 | 平塗 + 適度 cel + rim light（介於兩者） |
| **配色** | 高彩、隊伍藍/紅、黃 CTA | 克制、每隻 1~2 主色高對比 | 台灣棲地色系 + 敵我暖/冷對比 + 黃 CTA |
| **辨識度來源** | 獨特輪廓 + 配件（帽/武器） | 大輪廓 + **單一記憶特徵** | **單一「真實記憶特徵」**（見 4.4） |
| **表情** | 誇張、情緒外放 | 可愛、溫和 | 誇張但不失動物尊嚴（守護者威嚴、入侵者陰險） |
| **打擊感 juice** | **極強**（squash&stretch、閃白、衝擊環、大招華麗） | 弱（回合制，靜態插畫為主） | **全學 Brawl Stars** |
| **背景** | 低彩襯托角色 | 場景插畫多元 | 低彩棲地襯托高彩角色（學 Brawl） |
| **UI** | 圓角厚實、大鈕、塗鴉木質、獎勵閃亮 | 乾淨、資訊導向 | 圓角厚實 + 生態自然質感（學 Brawl 的爽、去掉街頭潮，改台灣自然） |

**一句話結論**：兩者**都用「粗描邊 + 高辨識剪影」**；差別是 **Brawl Stars 更誇張街頭潮、打擊感更強**，**Pokémon 更簡潔親和、更會用「單一記憶特徵」讓人記住**。

---

## 4. ★守土原創美術方向（最重要）

### 4.1 我們的甜蜜點（原創定位）

> **「Pokémon 的簡潔記憶點」＋「Brawl Stars 的打擊感 / juice」＋「台灣特有種的真實記憶特徵」＝ 守土風格。**

三支柱，缺一不可，這也是我們**原創、不抄襲任一方**的關鍵：

1. **記憶點來自「真實」，不是設計師發明的配件**：Pokémon 靠「雀斑」這種發明細節；我們**不發明**——我們用每隻台灣特有種**現實中真正的招牌特徵**當唯一記憶點（石虎額頭與身上的**斑紋/眼上兩道白**、黑熊**胸前 V 白斑**、帝雉**超長的藍黑金屬光尾羽**、藍鵲**長藍尾＋紅嘴紅腳**、梅花鹿**白色梅花斑**、櫻花鉤吻鮭**體側橢圓黑斑**…）。這讓我們**不可能抄襲**——記憶點是台灣物種的生物事實。
2. **爽度來自 Brawl 式 juice**：squash&stretch、命中閃白、圓潤衝擊環、大招華麗但可讀——這些我們**已有基礎**（`fx` 粒子 + hit-stop），要**系統化成統一參數**。
3. **底層寫實感**：不走純 Q 版貼紙，用「棲地色系 + 頂光漸層 + rim light」給動物**適度立體與生態氛圍**，讓玩家「感覺在守護真實的台灣」。守護者暖色系顯**威嚴/親近**，入侵種冷/毒色系顯**陰險/警戒**。

**敵我美術語言（原創對比）**：
- **守護者（台灣特有種）**：暖色主調、圓潤但有力的輪廓、rim light 用**暖金/暖白**、動作**沉穩有重量**。
- **入侵種（外來入侵種）**：冷色 / 毒色（毒綠、詭紫、病青）、輪廓帶**尖刺/黏滑**暗示、rim light 用**冷青/毒綠**、動作**急促、蓄力衝撞張牙舞爪**。

### 4.2 色彩計畫（HEX 色票）

> 原則：**背景低彩、角色高彩、CTA 用黃**。棲地色系壓飽和當背景與 UI 底；守護者暖、入侵種冷/毒，形成敵我一眼可辨。

**台灣棲地環境色（低彩，背景 / 場景 / UI 底用）**
| 用途 | 名稱 | HEX | 備註 |
|---|---|---|---|
| 森林綠（暗） | forest-deep | `#1b4332` | 面板底、暗部 |
| 森林綠（中） | forest | `#2e7d32` | 既有面板主色，沿用 |
| 森林綠（亮） | forest-lite | `#66bb6a` | 既有友軍色，沿用 |
| 溪流藍 | stream | `#2b7a91` | 水棲/溪流關 |
| 溪流藍（亮） | stream-lite | `#5fc4d8` | 水面高光 |
| 淺山褐 | foothill | `#8d6a43` | 淺山泥土、樹幹 |
| 淺山褐（亮） | foothill-lite | `#c9a36b` | 土坡受光 |
| 天空 | sky | `#a9d6e5` | 高處/天光 |
| 高山灰藍 | alpine | `#5b6b7a` | 高山寒帶關 |
| 晨霧白 | mist | `#e8efe6` | 霧氣、遠景 |

**守護者暖色（角色高彩，暖系＝威嚴/親近）**
| 守護者 | 主色 HEX | 記憶特徵色 HEX | 現況 |
|---|---|---|---|
| 石虎 leopard | `#e8a13a` | 斑紋褐 `#6b4327` / 眼上白 `#fdf4ea` | KCOL 已有 |
| 台灣黑熊 bear | `#2b2622` | 胸前 V 白斑 `#f6f3ec` | KCOL `#3b332e`，可再壓深 |
| 爺蟬 cicada | `#5f9a3c` | 翅脈青 `#c8e6b0` | 已有 |
| 無霸勾蜓 dragonfly | `#1fa3a3` | 暖金細邊 `#ffd58c`（冷色補暖描邊） | 已有 |
| 梅花鹿 deer | `#cf9a5e` | 白色梅花斑 `#fbf3e6` | 已有 |
| 台灣藍鵲 magpie | `#2f6fd0` | 紅嘴紅腳 `#e2492e` / 長藍尾 `#1e5bb8` | KCOL 已有 |
| 山羌 muntjac | `#b8703f` | 臉部黑紋 `#3a2519` | 已有 |
| 台灣獼猴 macaque | `#b08f56` | 紅臉 `#d98a7a` | 已有 |
| 櫻花鉤吻鮭 salmon | `#3a8a9e` | 體側橢圓黑斑 `#20353c` | 已有 |
| 藍腹鷴 pheasant | `#2a3a7a` | 白背/紅臉 `#e9edf0`/`#e2492e` | 已有 |
| 帝雉 mikado | `#243a58`（深藍金屬光） | 超長尾白橫帶 `#e9edf0` | 需確認 |
| 穿山甲 pangolin | `#b08a4a`（土黃鱗甲） | 覆瓦狀鱗片邊 `#7a5a2a` | 需確認 |
| 黃喉貂 yellowmarten | `#5a4326`（深褐） | 鮮黃喉 `#f2c53d` | 需確認 |

**入侵種冷/毒色（敵方，一眼陰險）**
| 入侵種 | 主色 HEX | 警戒/毒色點綴 HEX |
|---|---|---|
| 福壽螺 snail | `#7a5a34`（壓暗的褐） | 卵塊警戒粉紅 `#ff4d8d` |
| 綠鬣蜥 iguana | `#3f7a3a`（壓綠） | 棘刺毒綠 `#7fff5a` |
| 斑腿樹蛙 frog | `#5f7a3a` | 斑腿病黃 `#c8d24a` |
| 埃及聖䴉 ibis | `#c7ccce`（灰白） | 黑頭頸 `#1a1a1a` |
| 沙氏變色蜥 anole | `#6a5230` | 喉扇警戒橙紅 `#ff6a3a` |
| 海蟾蜍 canetoad | `#6b5a3a` | 毒腺病紫 `#8a5aa0` |
| 緬甸蟒 python | `#5a4a2a` | 網紋暗金 `#9a7a3a` |
| 多線南蜥 skink | `#4a5a3a` | 側線冷青 `#3ac6c6` |

> 統一敵方**環境光染**：入侵種腳下地環 / rim light 用**毒綠 `#7fff5a` 或冷青 `#3ac6c6`**（現況地環用 `rgba(239,83,80,..)` 紅，可保留或改毒色，見 R-ART-04）。友軍地環維持 `rgba(102,187,106,..)` 綠。

**UI / 系統色（沿用既有 + 收斂）**
| 用途 | HEX | 現況 |
|---|---|---|
| CTA 主行動黃 | `#ffd54f`（亮態 `#fff59d`） | 已全站使用，沿用 |
| 必殺 / 大招橙 | `#ff8f00 → #ffca28` | 已有 ult 鈕 |
| 友軍血條 | `#66bb6a → #a5d6a7` | 已有 |
| 敵方血條 | `#ef5350 → #ff8a80`（首領） | 已有 |
| 面板底 | `#2e7d32 → #1b5e20` | 已有 |
| 深底/暗幕 | `#0d1f14` | letterbox/暗幕 |

### 4.3 描邊與著色規則（canvas 可實作）

我們**已有**的手法（`drawCreatureTop`）：離屏畫布畫角色（面向右）→ 統一套頂光/底暗立體上色 → 貼回主畫布；`INK="#20140c"` 描邊、`OUT=max(2.2, r*0.11)` 動態線寬、`shade(col,±)` 亮暗色。以下把它**規格化**成三條規則：

**規則 1：粗描邊（Bold Outline）— 已有 `OUT`，統一化**
- 線色統一用**暖黑墨** `INK = #20140c`（不用純黑 `#000`，避免死板；比 Brawl 的純黑更貼近自然/插畫）。
- 線寬 = `Math.max(2.2, r*0.11)`（隨體型變粗，這是 Brawl 原則）。入侵種可用**略冷的墨** `#14201c` 做微妙敵我區隔。
- 畫法：角色主體先用 `INK` 描一圈（`lineJoin/lineCap="round"`），再填色蓋內部——即「先粗黑底、再貼彩色」。

**規則 2：亮暗分區（平塗 + 適度 cel shading）— 融合 Pokémon 的克制**
- 底：`fillStyle = 主色`（平塗，Pokémon 感）。
- 頂光：離屏畫完後用 `globalCompositeOperation="source-atop"` 疊一層**左上→右下的線性/放射亮暗漸層**（`shade(col,+52)` 亮 →`shade(col,-44)` 暗），只作用在角色像素上（現有手法）。
- **cel 分界**（新增、克制）：在大面積身體上，用**一條柔邊的暗面色塊**（`shade(col,-28)`，`globalAlpha≈0.5`）畫出「受光/背光」二分，界線用 `filter` 不可（零外部/避免 filter 相容性）——改用**半透明疊塗**模擬柔和 cel。避免畫成 3 段以上（保持 Pokémon 的乾淨）。

**規則 3：rim light（邊緣光）— canvas 做法**
- 手法 A（推薦，最省）：離屏角色貼回前，**再描一圈細亮邊**：`strokeStyle` 用暖金 `rgba(255,224,150,0.5)`（守護者）或冷青 `rgba(90,220,220,0.5)`（入侵種），`lineWidth=r*0.03`，且用 `globalCompositeOperation="lighter"` 讓它發光疊加，只描角色**右下背光側**的輪廓（模擬環境反光）。
- 手法 B（更亮的英雄時刻）：`shadowColor=rim色; shadowBlur=r*0.4; shadowOffsetX/Y=0`，用一次 `stroke()` 讓輪廓外滲一圈柔光。**注意**：`shadowBlur` 較吃效能，只在**選角大廳 / 必殺瞬間**用，不在每幀每隻用（守效能鐵則）。

> 這三條規則**不改 `drawCreature/drawCreatureTop` 簽名**，只在既有離屏合成流程「加疊塗與描邊」，完全 canvas、零外部資源。

### 4.4 比例與剪影（chibi 化 + 真實記憶特徵）

**chibi 化建議（適度，不失動物特徵）**
- 大廳側視 `drawCreature`：頭：身 ≈ **1 : 1.6~2**（已接近）。可微調把**頭再放大 5~8%**、四肢再短一點，往 chibi 靠但**保留該物種的體態剪影**（鹿的長腿長頸、蟒的無腿長條、鮭的紡錘身不可 chibi 到認不出）。
- 對戰俯視 `drawCreatureTop`：靠 `kcfg(kind)` 的 `sz/long/wide` 控制體型比例——**體型差異就是剪影差異**（熊寬、勾蜓細長、鹿高瘦），維持並強化。

**剪影規則（融合 Brawl 輪廓 + Pokémon 單一記憶點）**
1. **輪廓層級**：每隻先確保**大輪廓**（體型 + 招牌部位）純黑就能認出——熊的圓壯、帝雉的**長尾**、勾蜓的**細長腹＋四翅**、蟒的**長條**。
2. **單一真實記憶特徵（唯一、放大、必畫）**：每隻挑**一個現實招牌特徵**，在造型上**刻意放大、對比拉高、絕不省略**（這是 Pokémon「Oshawott 的雀斑」原則的原創版）：

| 守護者 | 唯一記憶特徵（放大畫） |
|---|---|
| 石虎 | 額頭縱紋 + **眼睛上方兩道白**、身上玫瑰斑（現況已畫，加大對比） |
| 台灣黑熊 | **胸前 V 字白斑**（現況已畫，務必最亮、最清楚） |
| 梅花鹿 | 背上**白色梅花斑點**列 |
| 台灣藍鵲 | **超長藍尾 + 紅嘴紅腳**（尾長 ≥ 身長，強對比紅） |
| 帝雉 | **超長尾羽的白色橫帶**（藍黑金屬光底） |
| 藍腹鷴 | **白色背/上翼 + 紅臉肉垂** |
| 櫻花鉤吻鮭 | **體側一列橢圓黑斑** |
| 台灣獼猴 | **紅臉 + 長尾** |
| 山羌 | **臉部黑色 Y/V 紋** |
| 穿山甲 | **覆瓦狀鱗甲的鱗片邊線** |
| 黃喉貂 | **鮮黃的喉胸塊**（暗褐身上唯一亮點） |
| 無霸勾蜓 | **四片透明翅 + 亮綠複眼** |
| 爺蟬 | **透明翅脈 + 綠色身** |

3. **入侵種剪影**：反向——輪廓帶**尖刺/黏滑/不規則**暗示陰險（鬣蜥背棘、蟒盤繞、螺殼螺旋、變色蜥喉扇），毒色點綴當它們的「記憶特徵」。

### 4.5 VFX 視覺語言（統一參數）

> 現況：`fx` 陣列硬上限 **150**、每幀 `filter` 回收（守鐵則 ✓）；`sparks()` 已有火花。以下**統一風格參數**，讓所有特效「同一個美術語言」。

**統一常數（建議定義在 moba.js 頂部，供全特效取用）**
```
VFX = {
  INK:   "#20140c",              // 特效描邊同角色墨色
  ALLY:  "#ffd54f",             // 守護者暖金（火花/衝擊環主色）
  ALLY2: "#ffe9a8",
  FOE:   "#7fff5a",             // 入侵種毒綠
  FOE2:  "#3ac6c6",             // 入侵種冷青
  HIT_FLASH: "rgba(255,255,255,0.75)", // 命中閃白
  RING_LW_BASE: 3,              // 衝擊環基礎線寬（隨力道放大）
  MAX_FX: 150                   // 沿用既有硬上限
}
```

**A. 命中閃白（hit flash）**
- 被擊中的角色，離屏貼回後疊一層 `globalCompositeOperation="lighter"` 的白，`globalAlpha = hitT/0.12`（現況有 `u.hitT`，直接用），**8~10 幀內衰減**。輕擊白 0.4、重擊/必殺白 0.75。

**B. 圓潤衝擊環（shockwave ring）**
- 統一畫法：**一個擴張的描邊圓 + 內側柔光**。半徑 `r0 + (1-life/max)*R`，線寬 `RING_LW_BASE*(1+力道)`，`strokeStyle` 用陣營色，外圈再描一圈 `INK` 讓它「有粗邊卡通感」（Brawl 原則）。輕擊小環、必殺/首領三層環（現況首領擊破已有三層環，統一其參數）。

**C. squash & stretch**
- 命中瞬間對角色做 `ctx.scale(1+p*0.18, 1-p*0.12)`（p=衝擊強度 0~1，數幀內回 1）。跳躍/衝撞前搖也用。**只作用在該角色 transform，不動資料**。

**D. 粒子火花（sparks）**
- 沿用 `sparks(x,y,n,col)`。統一：守護者命中用 `ALLY/ALLY2`、入侵種命中用 `FOE/FOE2`；每次 `n≤12`，且**每次 push 後 `if(fx.length>MAX_FX) fx.splice(0, fx.length-MAX_FX)`**（現況已有，守鐵則）。

**E. 大招華麗但可讀**
- 大招特效**顏色鎖定該守護者記憶特徵色**（藍鵲大招帶紅、帝雉大招帶金屬藍），**形狀不遮血條/搖桿區**（大招光束避開 HUD 安全區）。半透明疊加用 `lighter`，收尾一個大衝擊環 + 命中閃白。

### 4.6 UI 風格指南

> 現況已很接近 Brawl（圓角面板、`#ffd54f` 黃 CTA、`font-weight:900`、綠底面板）。以下收斂成**守土自然潮**——學 Brawl 的爽與清晰，把「街頭塗鴉」換成「台灣自然質感」。

- **按鈕**：大圓角（`border-radius:14~18px`）、有厚度（下緣加 1~2px 深色 `box-shadow` 當立體邊）、字重 900、字大。**主 CTA（開打）用黃 `#ffd54f`**、必殺用橙、次要用綠底白字。
- **面板**：森林綠漸層底 `#2e7d32→#1b5e20`，圓角厚實，邊緣可加**極細的葉脈/藤蔓 canvas 紋**（程序畫，非圖）取代塗鴉，維持自然主題。
- **字重**：標題 900 + 深色描邊（`text-shadow:0 2px 6px #000`）確保在任何背景可讀（已有）。
- **獎勵揭曉動畫**（沿用並統一）：升級/解鎖/領通行證時——**放射光束 + 縮放彈跳 + 金色粒子飛入**（現況通行證已有「票券飛入徽章」`.pp-fly`，統一成一套 `revealBurst()`：中心閃光 → 放射線 → 目標彈跳）。**注意**：這塊與 game agent 的「結算揭曉」流程有重疊，銜接見 §6。
- **背景低彩**：大廳/選角背景維持低飽和棲地色，讓守護者（高彩）永遠是主角。

---

## 5. ★落地 ticket（R-ART-01…）

依 `docs/PROCESS.md §3` 模板。每張標明改哪個函式、canvas 具體做法、驗收條件、守鐵則。挑 **R-ART-01 / 02 / 05** 三張最有信心的附示意程式碼。

---

### R-ART-01 統一 rim light 邊緣光（敵我暖/冷）
- **使用者原話**：（研究導出）角色要像 Brawl 一樣有邊緣光、從暗背景跳出來，且敵我可辨。
- **意圖釐清**：在 `drawCreatureTop` 既有離屏合成流程末端，加一圈 rim light；守護者暖金、入侵種冷青/毒綠。不改簽名。
- **對應系統**：美術/打擊感
- **改哪個函式**：`src/moba.js drawCreatureTop`（貼回主畫布前）；`src/legacy.js drawCreature`（大廳英雄時刻可選）。
- **canvas 做法**：離屏角色 `oc` 貼回前，對其輪廓再 `stroke()` 一次，`strokeStyle=陣營 rim 色`、`globalCompositeOperation="lighter"`、`lineWidth=r*0.03`；大廳/必殺瞬間可改用 `shadowBlur=r*0.4` 版本。
- **驗收條件**：
  - [ ] 守護者暖金邊、入侵種冷青/毒綠邊，暗背景下可辨
  - [ ] `node --check` 過、無頭 0 runtime error
  - [ ] 不新增外部資源；rim 非每幀對每隻用 shadowBlur（效能）
- **守鐵則**：零外部資源 ✓、簽名不改 ✓
- **狀態**：待辦

### R-ART-02 命中閃白 + squash&stretch 統一 juice
- **意圖釐清**：把命中回饋統一成 Brawl 式：被打閃白 + 壓扁拉長。用既有 `u.hitT`。
- **對應系統**：美術/打擊感 | 對戰
- **改哪個函式**：`src/moba.js drawCreatureTop`（閃白疊層 + scale）、命中判定處觸發。
- **canvas 做法**：見 §4.5 A、C 示意碼。閃白用 `lighter` 疊白、alpha 依 `hitT` 衰減；squash 用 `ctx.scale`。
- **驗收條件**：
  - [ ] 輕擊/重擊/必殺閃白強度分級；命中有 squash 彈感
  - [ ] 無頭 0 error；不新增粒子（純 transform/疊層，不吃 fx 上限）
- **守鐵則**：零外部 ✓、粒子上限不受影響 ✓
- **狀態**：待辦

### R-ART-03 入侵種毒色語言（地環 + 描邊 + 毒色記憶點）
- **意圖釐清**：入侵種改用冷/毒色系（毒綠/冷青/病紫），輪廓帶尖刺黏滑暗示，地環改毒色，強化「陰險外來者」敵我對比。
- **對應系統**：美術/打擊感
- **改哪個函式**：`src/moba.js` KCOL（入侵種色）、地環 `rgba(239,83,80..)`、`drawCreatureTop` 描邊墨色 `#14201c`。
- **canvas 做法**：入侵種 `INK` 改冷墨；毒色點綴填色；地環 `faction==="inv"` 改 `rgba(127,255,90,0.28)`。
- **驗收條件**：[ ] 入侵種一眼比守護者「冷/毒/陰險」 [ ] 無頭 0 error [ ] 不動屬性鍵/相剋環（鐵則）
- **守鐵則**：`forest/water/sky/bug` 鍵與相剋環不可動 ✓（只改顏色）
- **狀態**：待辦

### R-ART-04 統一衝擊環參數（VFX 常數表）
- **意圖釐清**：把散落的衝擊環（普擊/必殺/首領三層環）統一成一組 `VFX` 常數與畫法，圓潤 + 粗墨邊 + 陣營色。
- **對應系統**：美術/打擊感
- **改哪個函式**：`src/moba.js`（新增 `VFX` 常數 + `ring()` 輔助函式，重構既有環）。
- **canvas 做法**：見 §4.5 B。`ring(x,y,r,lw,col)`：先 `lighter` 陣營色柔環，外描一圈 `INK`。
- **驗收條件**：[ ] 各環同一美術語言 [ ] `fx` 仍 ≤150 且回收 [ ] 無頭 0 error
- **守鐵則**：粒子硬上限+回收 ✓
- **狀態**：待辦

### R-ART-05 守護者「唯一記憶特徵」強化（Pokémon 原則）
- **意圖釐清**：每隻守護者的**現實招牌特徵**（表 §4.4）在造型上放大、對比拉高、絕不省略；剪影純黑可認。
- **對應系統**：美術/打擊感
- **改哪個函式**：`src/legacy.js drawCreature`、`src/moba.js drawCreatureTop`（各 kind 分支內加強特徵，不改簽名）。
- **canvas 做法**：見 §5 示意碼（黑熊 V 斑加亮加大範例）；逐隻確保「一個特徵最亮最大」。
- **驗收條件**：
  - [ ] 每隻至少一個放大的真實記憶特徵，剪影可辨
  - [ ] 8 個既有 kind（leopard/bear/cicada/dragonfly/snail/iguana/frog/ibis）全支援不破（鐵則）
  - [ ] 無頭 0 error
- **守鐵則**：`drawCreature` 簽名與 8 kind 不可破 ✓
- **狀態**：待辦

### R-ART-06 統一獎勵揭曉動畫 `revealBurst()`（與 game agent 銜接）
- **意圖釐清**：升級/解鎖/領通行證共用一套華麗揭曉：中心閃光→放射線→目標彈跳→金粒子飛入。
- **對應系統**：大廳/UI | 美術/打擊感
- **改哪個函式**：`src/legacy.js`（通行證 `.pp-fly` 統一）＋結算面板。**與 game agent 的結算流程重疊，需協調**（§6）。
- **canvas 做法**：DOM+canvas 混合；放射線用 canvas `lighter` 畫、彈跳用 CSS `@keyframes scale`。
- **驗收條件**：[ ] 三處揭曉同一套動畫 [ ] 零外部資源 [ ] 無頭 0 error
- **守鐵則**：零外部 ✓
- **狀態**：待辦（等與 game agent 對齊結算銜接）

---

### 示意程式碼片段（僅示意，勿改真檔）

**片段 1 — R-ART-01 rim light（`drawCreatureTop` 貼回前）**
```js
// oc = 已畫好角色的離屏畫布；u=單位, faction, r 同函式內既有變數
// 陣營 rim 色：守護者暖金、入侵種冷青
const rim = (faction === "inv") ? "rgba(90,220,220,0.55)" : "rgba(255,224,150,0.55)";
// 用 lighter 疊加，只描右下背光側輪廓（模擬環境反光），線細
g.save();
g.globalCompositeOperation = "lighter";
g.strokeStyle = rim;
g.lineWidth = Math.max(1, r * 0.03);
g.stroke();          // 沿用當前 path（角色主體輪廓），或對主體再 beginPath 描一圈
g.restore();
// 英雄時刻（選角大廳/必殺）才用更亮的外滲光：
// g.shadowColor = rim; g.shadowBlur = r*0.4; g.stroke(); g.shadowBlur = 0;
```

**片段 2 — R-ART-02 命中閃白 + squash&stretch**
```js
// 命中回饋：u.hitT 為既有命中計時（0~0.12），p 為衝擊強度 0~1
const p = u.hitT > 0 ? (u.hitT / 0.12) : 0;
// squash & stretch：命中壓扁拉長（只動 transform，不動資料）
ctx.save();
ctx.translate(u.x, gy);
ctx.scale(1 + p * 0.18, 1 - p * 0.12);
ctx.translate(-u.x, -gy);
// ...（此處貼回離屏角色 oc）...
ctx.restore();
// 命中閃白：離屏角色貼回後，於角色範圍疊一層白（lighter）
if (p > 0) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.75 * p;        // 輕擊可乘 0.5
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.ellipse(u.x, gy, r * 0.9, r * 0.95, 0, 0, 7); ctx.fill();
  ctx.restore();
}
```

**片段 3 — R-ART-04 統一衝擊環 `ring()`（圓潤 + 粗墨邊 + 陣營色）**
```js
const VFX = { INK:"#20140c", ALLY:"#ffd54f", FOE:"#7fff5a" };
// 一個圓潤衝擊環：外粗墨邊(卡通感) + 內陣營色柔光(lighter)
function ring(x, y, rad, lw, col) {
  ctx.save();
  ctx.lineJoin = "round";
  // 外圈粗墨邊：Brawl 式卡通描邊
  ctx.strokeStyle = VFX.INK; ctx.lineWidth = lw + 2.5;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
  // 內圈陣營色柔光
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = col; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
  ctx.restore();
}
// 普擊小環：ring(x,y, 10+(1-life/max)*40, 3, VFX.ALLY)
// 必殺/首領三層：for(k=0..2) ring(x,y, base+k*18, 4-k, k? VFX.ALLY: VFX.FOE)
```

---

## 6. 資料信心度、來源、與 game agent 的銜接點

### 資料信心度
- **Brawl Stars 美術原則（§1）**：**高**。多來源一致確認大頭短身 chibi、粗黑描邊、高辨識剪影、高彩平塗、黃色 CTA、圓角厚實 UI。原文站點（RetroStyle/Medium 深度文）被 **403 擋下無法抓全文**，細節以搜尋摘要 + 業界既有知識補齊，方向可靠；**未逐字引用具體 HEX**（Supercell 未公開官方色票），故我方色票為**原創**、非抄襲。
- **Pokémon 原則（§2）**：**高**。Ken Sugimori「memorability > coolness」「Oshawott 雀斑」「簡單形狀/清晰剪影/平塗高對比」有直接來源引述。
- **UI 細節（§1-E, §4.6）**：**中高**。「黃色 Play 大鈕」「obvious signifier」有來源；「木質/塗鴉質感」為業界共識 + 我方改寫成台灣自然質感（原創轉化）。
- **udn 來源**：未逐一抓（403 風險 + 前述來源已足），如需可補抓；不影響結論。
- **落地 canvas 做法（§4.3/4.5/§5）**：**高**——直接對照本專案現有程式（`fx` 上限 150、`INK/OUT/shade`、離屏 source-atop 合成、`sparks`、`u.hitT`、KCOL），確認可實作、守鐵則。

### 與 game agent 的銜接點
- **R-ART-06 獎勵揭曉動畫**與 game agent 負責的**結算/過場流程**重疊：美術提供 `revealBurst()` 視覺語言（放射光束/彈跳/金粒子飛入），**觸發時機與結算資料流由 game agent 主導**，兩邊在結算面板整合時對齊一次。
- **首領登場電影運鏡**（letterbox/名號大字/掃光）已存在，屬「打擊感/過場」，美術這邊只在 R-ART-04 統一其衝擊環參數；運鏡節奏歸 game agent。
- **VFX 常數表（§4.5）**建議放 `moba.js` 頂部，供對戰流程（game agent 觸發）與美術（本檔）共用同一組顏色/上限，避免各寫各的。

### 來源
- Ken Sugimori 設計哲學（memorability > coolness、Oshawott 雀斑）：[Nintendo Life](https://www.nintendolife.com/news/2018/07/ken_sugimori_wants_pokemon_designs_to_be_as_memorable_as_possible)、[NintendoSoup](https://nintendosoup.com/ken-sugimori-explains-how-he-designs-pokemon/)、[Siliconera](https://www.siliconera.com/pokmon-designer-on-balancing-cool-or-cute-pokmon-by-adding-uncool-or-uncute-features/)、[Creative Bloq](https://www.creativebloq.com/art/digital-art/what-artists-can-learn-from-30-years-of-pokemon-character-design)
- Brawl Stars 美術風格（chibi、粗描邊、高辨識剪影、高彩、演進）：[RetroStyle Games](https://retrostylegames.com/blog/game-art-design-like-brawl-stars/)（403，摘要）、[Medium/RetroStyle](https://medium.com/@RetroStyle_Games/exploring-the-art-style-of-brawl-stars-a2667bbbea3d)（403，摘要）
- Brawl Stars UI（黃色 Play 大鈕、obvious signifier、圓角）：[IXD@Pratt Design Critique](https://ixd.prattsi.org/2025/02/design-critique-brawl-stars/)、[Game UI Database](https://www.gameuidatabase.com/gameData.php?id=465)

---
_維護：本檔屬 `docs/research/`，為美術方向研究輸出。落地時把 R-ART ticket 併入 `docs/PROCESS.md §4 backlog` 排序，實作後回填 commit / sw 版本。_
