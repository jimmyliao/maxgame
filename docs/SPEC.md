# 守土 · 福爾摩沙衛士 — 專案規格書（SPEC）

> 入口檔是根目錄 `CLAUDE.md`；本檔是完整規格。任何 agent / session 開工前以這兩份為共識基準。
> 最後更新：見 git log。維護者：整合 Lead。

---

## 1. 願景與宗旨

一款**親子共製**、用「玩」來認識**台灣生態保育與台灣特有種**的遊戲。

- **核心宗旨**：生態保育是靈魂。對戰框架 = **守護者（台灣特有種）vs 入侵者（外來入侵種）**，永遠不打同類。
- **情緒弧線**：戰鬥（衝突，冷色高對比）→ 勝利（守護，暖綠柔光）。贏 = 棲地復原、保育值上升、圖鑑解鎖真實知識。
- **與 Pokémon 的差異（避免抄襲）**：你「就是」那隻動物（非訓練師、無寶貝球、不收服）；主題是真實保育；屬性系統用**台灣棲地**原創；敵人是真實外來入侵種。
- **玩法定位**：像 Pokémon Legends Z-A 的**即時動作自由對戰**（非回合制），3–5 分鐘節奏。

---

## 2. 目標平台與技術現況

- **現在**：Web 優先。單一 `index.html`（HTML + CSS + 一段 IIFE 純 JS）。HTML5 Canvas 2D，所有角色用程式向量繪製（`drawCreature`），無外部素材。PWA（manifest + service worker，可加到主畫面、離線可玩）。
- **部署**：GitHub Pages，從 `main` 分支根目錄服務靜態檔。玩家網址 **https://jimmyliao.github.io/maxgame/** 。
- **未來**：先以 web app 驗證，但保留上架 **iOS / Android 雙平台**。需模組化重構並選定框架 → **見 §8 架構（待技術總監定案）**。

---

## 3. 遊戲設計

### 3.1 守護者（台灣特有種，玩家角色）
| key | 名稱 | 屬性 | 生態定位 | 必殺 | 真實資料（圖鑑） |
|---|---|---|---|---|---|
| leopard | 石虎 | 🌲山林 | 中型獵食者 | 突刺（衝刺殘影） | 瀕危・保育類；台灣唯一原生貓科，夜行，全台僅存數百隻 |
| bear | 台灣黑熊 | 🌲山林 | 頂級大型 | 震地（裂地碎石） | 瀕危・保育類；台灣唯一原生熊，胸前 V 白斑（月熊），森林傘護種 |
| cicada | 台灣爺蟬 | 🪲蟲 | 植食昆蟲 | 音波（擴散環＋暈眩） | 台灣特有；體型最大的蟬之一，鳴聲可傳數百公尺 |
| dragonfly | 無霸勾蜓 | 🌪天空 | 小型空中獵手 | 疾風（風刃殘影） | 保育類；台灣最大蜻蜓，乾淨溪流/濕地指標生物 |

### 3.2 入侵者（外來入侵種，魔王）
| key | 名稱 | 屬性 | 真實危害（圖鑑） |
|---|---|---|---|
| snail | 福壽螺王 | 💧水 | 原產南美，繁殖力驚人，啃食秧苗造成稻作重大損失 |
| iguana | 綠鬣蜥王 | 🌲山林 | 原產中南美，南台灣大量野化，啃食農作、挖洞破壞堤防 |
| frog | 斑腿樹蛙王 | 💧水 | 原產東南亞，排擠原生莫氏樹蛙等蛙類 |
| ibis | 埃及聖䴉王 | 🌪天空 | 原產非洲，搶佔黑面琵鷺等水鳥棲地、掠食原生鳥卵 |

### 3.3 屬性相剋（台灣棲地，原創）
- 型別：`forest 🌲 / water 💧 / sky 🌪 / bug 🪲`
- 相剋環：**🌲山林 > 💧水域 > 🌪天空 > 🪲蟲 > 🌲山林**
- 倍率：剋制 ×1.6（「效果絕佳!」）／被剋 ×0.6（「效果不佳…」）／其他 ×1。`eff(at,df)` 回傳此三檔。

### 3.4 數值依生態現實（Sprint A 導入）
血量/攻擊/速度依**體型 × 食物鏈位階**：黑熊（頂級大型）血厚速度慢；石虎（中型獵食）均衡；勾蜓（小型獵手）血少但最快；爺蟬（植食昆蟲）血最低但有控場（暈）。魔王依真實威脅/體型定數值。圖鑑會把數值攤開展示。

### 3.5 戰鬥系統（即時動作 1v1）
- 玩家：左右移動、跳躍、普通攻擊、必殺（專屬，有冷卻）、**換手**（切換隊上已解鎖的特有種，各自獨立血量，倒下自動換下一隻，全隊倒下才落敗）。
- 魔王 AI 狀態機 `idle → tele(預警) → attack → recover(破綻)`；招式：衝撞 / 跳躍震波 / 吐彈。節奏 = **閃躲 → 抓破綻 → 反擊**。
- i-frame 無敵時間、屬性相剋倍率、hitstop（待 Sprint A）。

### 3.6 進度與模式
- 4 章戰役（稻田→淺山→溪流→濕地），各 1 場魔王戰，過關解鎖下一章與新夥伴；進度存 `localStorage["shoutu_unlocked"]`。
- 對話劇情（開場/結尾，角色頭像 + 台詞，含生態小知識）。
- 保育圖鑑：守護者（特有種，保育等級）+ 入侵者（外來種，危害）。
- **（Sprint B）大廳 Lobby + 配對**：先用 NPC 模擬配對，隨機星級（★1–5）= 對手難度，對手永遠是入侵種。之後接真連線。

---

## 4. 美術方向（資深總監綱領摘要）

統一光源 **左上 45°**。每隻角色五件套：① 受光漸層（radial gradient 塊面）② 底部暗面/環境遮蔽 ③ 邊緣高光 rim light ④ 地面柔和投影（跳躍縮小、落地放大）⑤ 眼睛白色高光點。加 **squash & stretch**（呼吸/起跳拉伸/落地壓扁/受擊壓扁）與移動微前傾。

**四隻必殺一眼可辨**（顏色＋運動方向四象限分離）：
- 石虎突刺＝暖橘**直線**殘影＋爪痕；黑熊震地＝棕黃**向下**碎石＋地裂；爺蟬音波＝黃綠**同心圓**環＋暈；勾蜓疾風＝青色**彎月**風刃。

**打擊感**：命中閃白、hitstop 凍結幀（普攻 60ms／必殺＆相剋 90–110ms）、螢幕震動（普攻6/必殺10/震地14）、傷害數字放大彈出、命中火花、落地塵土。相剋「效果絕佳」加碼（更亮/更震/更久/鍍金數字）。

**保育演出**：背景隨魔王血量**由枯轉綠**；命中飄綠色淨化光點；魔王敗＝剪影漸淡＋全屏綠色淨化波＋棲地轉飽和；勝利定格落葉光斑。守護者用自然暖光、入侵者疊冷紫邪氣 → 陣營視覺對立。

> 完整綱領（含配色 hex、分鏡、自評清單）：保存在團隊紀錄，整合 Lead 持有。

---

## 5. 工程合約（引擎把關 — 不可破壞）

見 `CLAUDE.md` §鐵則。重點：`drawCreature` 簽名與 8 個 kind、`HEROES/CH/TYPE/ADV/eff`、狀態機、Pointer 輸入與 `touch-action:none`、dock 按鈕 id、單檔零外部資源、PWA（`sw.js` CACHE 版本 + ASSETS）、`shoutu_unlocked` 鍵、`projs.from` 語意（`hero/boss/bossWave` 帶傷害判定，特效投射物勿誤用）、預留全域 `fx[]` 作粒子層。粒子**必須有上限與回收**。

---

## 6. 驗收標準（QA Rubric）

| # | 項目 | 通過條件 |
|---|---|---|
| a | JS 語法 | 抽出 `<script>` JS，`node --check` 0 錯 |
| b | 執行期 0 error | 無頭 Chromium 全流程（地圖/圖鑑/戰鬥）`exceptionThrown` 與 console error = 0 |
| c | 核心玩法 | 標題→地圖→戰鬥→移動/跳/攻擊/必殺/換手皆不報錯，且 hp 有實際變化 |
| d | 特效效能 | 粒子有硬上限（≤~300）+ 回收；戰鬥 30s 後陣列長度有界、不掉幀 |
| e | 觸控 + PWA | `touch-action:none`、6 個 dock id、SW 註冊、manifest 可解析皆正常 |
| f | 美術品質 | 角色可見立體感；四隻必殺一眼可辨；對齊地面不浮空；血條/浮字/HUD 未被污染 |

一票否決：b（0 error）、d（粒子上限+回收）、單檔自包含/PWA 不破。
實機測試法：`python3 -m http.server 8099` + Chromium(`/opt/pw-browsers/chromium-1194/...`) 走 CDP（參考 `scratchpad/cdp3.mjs`），跑全流程、抓 error、截圖比對。

---

## 7. 團隊分工（agent team）

| 角色 | 職責 | 產出 |
|---|---|---|
| 整合 Lead（主 Claude） | 統籌/整合/測試/部署/維護 spec | 合併、實機測試、push |
| 資深總監（藝術指導） | 美術方向與品質標準 | 美術綱領（§4） |
| 美術工程師 | 立體上色、招式動作、粒子特效 | `index.html` 視覺實作 |
| 引擎/品質把關 | 守合約、效能、實機驗收 | 合約清單 + rubric（§5/§6） |
| 資深技術總監 | 架構/框架/模組/雙平台/遷移 | §8（待交件） |

**協作原則**：大家改的是同一份程式 → 採「總監綱領 → 美術實作 → 引擎驗收」接力，避免平行覆蓋；模組化後（§8）才依檔案平行分工（每物種一檔、每系統一檔，必要時用 git worktree 隔離）。

---

## 8. 架構與雙平台（資深技術總監定案）

### 8.1 技術選型
- **語言/建置：TypeScript + Vite**。型別＝多 agent 平行開發的介面合約；Vite 零設定、輸出純靜態檔可上 Pages。
- **2D 框架：原生 Canvas2D + 自寫薄引擎（TS 模組化）為首選**。理由：核心資產是 `drawCreature` 手繪向量，Canvas2D 是母語、零轉換；現有 `update/draw/狀態機` 已是引擎雛形；親子可理解性 > 框架威力。
  - **保險**：把繪圖層抽象成 `Renderer` 介面 → 若未來粒子/特效撞 Canvas2D 效能牆，只換後端到 **PixiJS**，上層不動。
  - 次選 PixiJS（效能牆時）；**不選 Phaser**（太重太框、不利手繪向量與教學）。

### 8.2 雙平台策略（web 優先，架構不擋路）
- 未來 iOS/Android 用 **Capacitor** 包裝同一份 web build（WebView），零重寫渲染層。不選 React Native/Flutter（要重寫 `drawCreature`）。
- **現在就先做 5 個平台抽象**（成本低、避免返工）：`storage`（localStorage↔Capacitor Preferences）、`input`（鍵盤+觸控→抽象 action）、`audio`（先空殼）、`viewport`（resize/dpr/安全區）、`renderer`（Canvas2D，留換 Pixi）。讓遊戲邏輯不知道自己在瀏覽器或 App。
- 上架注意（現在不做、架構別擋）：圖示/啟動畫面用 `@capacitor/assets` 從高解析母圖生成（故保留一張 source icon）；打擊感可接 `@capacitor/haptics` 震動；sw 註冊要可被 platform flag 跳過；真連線配對才需隱私/兒少合規。

### 8.3 目標目錄結構（每物種一檔、每系統一檔、每場景一檔）
```
src/
  main.ts
  engine/   loop, scene(SceneManager), input, renderer, viewport, audio, math
  platform/ storage, haptics
  art/      index(registry: kind→DrawFn), types, heroes/{leopard,bear,cicada,dragonfly}, bosses/{snail,iguana,frog,ibis}
  fx/       particles, floaters, camera(shake/hitstop), skills/{dash,slam,sonic}
  data/     types, types-chart(TYPE/ADV/eff), heroes, chapters, dex
  systems/  combat, team, boss-ai, progress, matchmaking
  scenes/   title, map, story, battle, result, dex, lobby
public/    manifest.json, sw.js, icon-source.svg
.github/workflows/deploy.yml   # build → 發佈 Pages
```
對外介面（合約）沿用現有形狀：`drawCreature(c,kind,x,y,s,o)` 不變；`HeroDef/BossDef/Chapter` 型別＝現有欄位；`eff(at,df)`；`Scene{enter/update/draw/exit}`；`Renderer`；`Input.Action="left|right|jump|atk|sp|swap"`；`Storage`；`Matchmaker.find()`（NPC→連線同介面）。→ 遷移是「剪貼＋補型別」，非重寫。

### 8.4 多 agent 分工（7 包）
A 引擎核心+platform+介面（**最先，定合約，先 merge**）→ 之後 **B 資料 / C 美術（每物種一檔，可 8 路 worktree 平行）/ D 特效** 大平行 → **E 戰鬥系統 / F 場景**（有跨檔呼叫，序列或同 agent）→ **G 大廳/配對**（最後接）。
worktree：A 不用（要先合併）；B/C/D 最適合 worktree 平行；registry/型別中樞（`art/index.ts`、`data/types.ts`）只允許指定 agent 動，他人 append-only 註冊一行。

### 8.5 漸進遷移（每步可玩、可回退）
0. `git tag playable-v1 b26af2c`（永久錨點）；開 `refactor/modular`，main 維持單檔可玩。
1. Vite 化：現有 `<script>` 整段搬 `src/legacy.ts`，行為 100% 不變，先確認 `npm run dev` 可玩。
2. 抽資料（HEROES/CH/TYPE/eff → `data/*`）。
3. 抽美術（8 個 if-else → `art/heroes|bosses/*` + registry，介面相同）。
4. 抽引擎與平台層（loop/input/viewport/storage + 5 抽象）。
5. 拆系統與場景（state 字串 → SceneManager，逐場景搬、逐步測），刪 `legacy.ts`。
6. 切換部署：GitHub Actions `npm ci && npm run build` → 發佈 `dist/` 到 Pages；Pages 來源改「GitHub Actions」；`vite.config` 設 `base:'/maxgame/'`。確認線上可玩才把 `refactor/modular` 併回 main。
- 回退：Pages 來源切換是最後的單向門，之前全可逆；最壞 `git checkout playable-v1`。sw 為 network-first（安全），更新只需升 `CACHE` 版本。

### 8.6 務實邊界（親子專案，別過度工程）
- 該做：TS+Vite+模組拆分、資料/美術/系統分檔、5 個平台抽象。
- **先別做**：現在上 Pixi/Phaser、現在接真連線、引入 Redux/單元測試框架、一次大爆改。先用介面留路，保住「永遠有個能玩的網址」。

**現況決議**：架構已定。下一步＝依 §8.5 漸進重構（Step 0–1 先行），美術大改（Sprint A）將做進**重構後的模組結構**，不再做進舊單檔。

---

## 9. 路線圖（Sprints）

- **Sprint A（進行中）**：美術立體化 + 4 隻專屬招式特效 + 打擊感（hitstop/閃白/火花）+ 棲地由枯轉綠 + 依生態血量。
- **Sprint B**：大廳 Lobby + 配對（NPC 模擬、隨機星級難度）+ 保育值系統 + 戰前選隊。
- **Sprint C**：模組化重構（依 §8）+ 雙平台準備。
- **未來**：真實變態進化（蟬：若蟲→成蟲；蝶：幼蟲→蛹→成蟲）、更多台灣特有種與章節（梅花鹿、藍鵲、寬尾鳳蝶…）、音效配音、真連線對戰、排行榜。

---

## 10. 決策紀錄（Decision Log）

| 日期 | 決策 | 備註 |
|---|---|---|
| 2026-06-30 | 初版恐龍跑酷無限過關（learning prototype） | 保留於 `dino.html`；可玩 commit `ad29150` |
| 2026-06-30 | 轉向「台灣生態保育」主題：守護棲地、擊退外來種 | 沿用親子腦力激盪結論 |
| 2026-06-30 | 玩法定為即時動作（非回合制），參考貓咪大戰爭/Z-A | — |
| 2026-06-30 | 多章節劇情戰役 + 手繪卡通動物（程式畫）+ 角色解鎖 | commit `1e7ee2b` |
| 2026-06-30 | 戰鬥改 1v1 魔王戰（雙方血條、魔王主動 AI） | commit `bcfa508` |
| 2026-06-30 | 加寶可夢式系統：屬性相剋 + 收集換手 + 保育圖鑑（即時、非回合制） | **可玩基準 commit `b26af2c`** |
| 2026-06-30 | 確認保育框架 = 守護者 vs 入侵者；先做美術升級 sprint | 使用者拍板 |
| 2026-06-30 | 啟動 agent 團隊（總監/美術/引擎/技術總監）；決定先定架構再做美術 | 本 spec 建立 |
| 2026-06-30 | **架構定案**：TS+Vite+模組化、原生 Canvas2D 薄引擎（留 Renderer 介面換 Pixi）、Capacitor 留未來；漸進遷移、每步可玩 | 見 §8；美術做進重構後結構 |

> 可回退的穩定可玩版本：**`b26af2c`**（寶可夢系統版），建議 `git tag playable-v1`。
