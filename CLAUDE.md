# 守土 · 福爾摩沙衛士 — 專案入口（CLAUDE.md）

> 這是給 Claude Code（以及任何協作者 / agent）每次開啟時讀取的**單一入口**。
> 目的：確保跨 session、跨 agent 都對齊同一份共識，不掉資訊。
> 完整規格見 **`docs/SPEC.md`**。動手前請先讀本檔的「鐵則」。

## 一句話
一款用「玩」來認識**台灣生態保育**的遊戲：你操控**台灣特有種（守護者）**，以即時動作對戰，驅逐**外來入侵種**、讓棲地復原。親子共製專案。

## 核心宗旨（不可偏離）
1. **生態保育 + 台灣特有種**是靈魂，不是包裝。對戰框架是 **守護者 vs 入侵者**（對手永遠是外來入侵種，不打同類）。
2. 贏 = **棲地復原、保育值上升、圖鑑解鎖真實知識**。讓玩家「感覺到在守護」。
3. 真實species、真實生態：技能/數值/危害都對應現實（食物鏈、體型、保育等級）。
4. 像 Pokémon 但**不抄襲**：你「就是」那隻動物（非訓練師、無寶貝球）；屬性用台灣棲地原創。

## 目前狀態
- **線上可玩**：https://jimmyliao.github.io/maxgame/ （GitHub Pages，從 `main` 根目錄部署）
- **目前型態**：單一 `index.html`（HTML+CSS+IIFE JS）的即時動作 1v1 對戰；已有屬性相剋、隊伍換手、保育圖鑑、4 章戰役、PWA（可加主畫面、離線）。
- **主要型態**：俯視角 MOBA（`src/moba.js`），大廳「對戰」進入；虛擬搖桿、跟隨鏡頭、神木+苗圃+AI 隊友/敵人。三模式：一般復育戰／限時挑戰／外來種防衛戰(PVE，關卡遞增、打完更難)。開場皆有 3-2-1 倒數。
- **守護者（13 隻）**：石虎/黑熊/爺蟬/勾蜓/梅花鹿/藍鵲/山羌/獼猴/櫻花鉤吻鮭/藍腹鷴＋穿山甲/黃喉貂/帝雉。皆有大廳側視(drawCreature)＋對戰俯視(drawCreatureTop)寫實造型、天賦樹、專屬技能。
- **入侵種**：福壽螺/綠鬣蜥/斑腿樹蛙/埃及聖䴉/沙氏變色蜥＋海蟾蜍/緬甸蟒/多線南蜥。
- **對戰系統**：屬性相剋、天賦樹、撿拾式必殺(守護之力)、戰場商店(金幣買強化 `src/battleshop.js`)、連擊、入侵種蓄力衝撞。
- **多人連線**（`src/net.js`，Firebase）：好友房間可容 N 人，各自操控自己的守護者；房主選模式/人數；全員選不同角色+準備才開始；房間顯示所有隊友名字/角色；3-2-1 倒數。**沙盒測不到 Firebase，需真機測**。
- **音效**（`src/sfx.js`）：純程序化 Web Audio(零外部檔案)，按鈕/戰鬥/棲地/購買皆有聲；設定可開關。
- **大廳**：選角改成「更換守護者」按鈕+彈窗網格；**服裝店**(用保育值買裝飾穿在守護者身上，大廳+選角+戰場都看得到)。
- **棲地基地**（`src/habitat.js`）：種真實台灣植物、離線成長收成、每區種子不同、野生動物訪客、生態走廊、**保育站等級/過關系統(10 關)**。
- **待做**：攻守對決新模式(設計見 `docs/SIEGE-MODE.md`，第一版打 AI；**情報道具品項待玩家定案**才能完成核心循環)。
- **保留**：舊側視 1v1 對戰(`legacy.js` 內程式仍在)；舊恐龍遊戲在 `dino.html`。
- **PWA 版本**：`sw.js` CACHE 目前 `shoutu-v87`。

## 分支與部署（重要）
- 開發分支：**`claude/dinosaur-game-infinite-levels-kpfmbm`**
- 部署分支：**`main`**（GitHub Pages 來源）。每次完成把同一個 commit push 到開發分支**與** `main`，Pages 1–2 分鐘自動更新。
- Repo：`jimmyliao/maxgame`（private repo，但 Pages 網站 public）。
- 可回退的可玩版本 commit：見 `docs/SPEC.md` 決策紀錄。

## 怎麼跑 / 測 / 上線
```bash
# 本機跑
cd /home/user/maxgame && python3 -m http.server 8099   # 開 http://localhost:8099/

# 語法檢查（抽出 <script> 內 JS）
#   sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/.../game.js && node --check game.js

# 實機煙霧測試（無頭 Chromium，抓 0 runtime error + 截圖）
#   Chromium: /opt/pw-browsers/chromium-1194/chrome-linux/chrome
#   Node v22 有全域 WebSocket，可走 CDP；參考 scratchpad/cdp3.mjs
```
**驗收一票否決項**：① `node --check` 過　② 無頭瀏覽器 0 runtime error　③ 粒子有上限與回收　④ 單檔零外部資源（離線 PWA 不破）。完整 rubric 見 SPEC §驗收。

## 🔒 鐵則（不可改壞的合約 — 動程式前必讀）
> 可「擴充」，不可「改壞既有呼叫與資料合約」。
- `drawCreature(c, kind, x, y, s, o)` **簽名不可改**；8 個 `kind` 全部要支援：`leopard / bear / cicada / dragonfly / snail / iguana / frog / ibis`。`o` 既有欄位語意（`t/mood/flip/ph`）不可改，新增欄位需 `o=o||{}` 容錯。
- 資料結構 `HEROES[] / CH[] / TYPE / ADV / eff()` 欄位不可刪改名；屬性鍵 `forest/water/sky/bug` 與相剋 🌲>💧>🌪>🪲>🌲 不可動。
- 狀態機 `title/map/dex/story/play/post/lose/result` 與切換函式流程不可破壞。
- 輸入全用 **Pointer Events** + `e.preventDefault()` + `{passive:false}`；CSS `touch-action:none`、安全區 `env(safe-area-inset-*)` 不可移除；dock 按鈕 id `bLeft/bRight/bSwap/bJump/bSp/bAtk` 不可改名。
- **單檔零外部資源**：無 CDN／外部 script／img／字型／音檔，所有美術用 canvas 程式繪製。PWA：改檔需同步更新 `sw.js` 的 `ASSETS` 並提升 `CACHE` 版本號。
- 進度鍵 `localStorage["shoutu_unlocked"]` 不可改名。
- 粒子/特效必須有**硬上限 + 回收**（禁止每幀無上限 push）。

## 團隊分工（agent team）
| 角色 | 職責 |
|---|---|
| **整合 Lead**（主 Claude） | 統籌、整合、實機測試、部署、維護本 spec |
| **資深總監（藝術指導）** | 美術方向與品質標準（綱領見 SPEC §美術） |
| **美術工程師** | 實作立體上色、專屬招式動作與粒子特效 |
| **引擎/品質把關** | 守資料合約、效能、實機驗收（rubric 見 SPEC §驗收） |
| **資深技術總監** | 架構、框架選型、模組拆分、雙平台、漸進遷移（SPEC §架構） |

## 路線圖（摘要，詳見 SPEC §路線圖）
- **架構（已定案）**：TypeScript + Vite + 模組化；原生 Canvas2D 自寫薄引擎（留 `Renderer` 介面，未來可換 PixiJS）；雙平台用 Capacitor 包裝（未來），現在先做 5 個平台抽象。詳見 `docs/SPEC.md` §8。
- **Sprint 0/1（下一步）**：漸進重構 — `git tag playable-v1`、Vite 化（不改行為）、抽資料→抽美術→抽引擎→拆場景，每步可玩可回退。
- **Sprint A**：美術立體化 + 4 隻專屬招式特效 + 打擊感 + 棲地由枯轉綠 + 依生態血量（**做進重構後的模組結構**）。
- **Sprint B**：大廳(Lobby) + 配對（先 NPC 模擬、隨機星級難度）+ 保育值系統。
- **未來**：真實變態進化、更多台灣特有種與章節、音效配音、真連線對戰、上架雙平台。

---
_維護：每次有重大決策或完成 sprint，更新本檔與 `docs/SPEC.md` 的決策紀錄，並 push 到開發分支與 `main`。_
