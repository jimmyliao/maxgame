# Session 筆記（2026-07-16）：repo 公開化＋用語定版＋翻譯包交付

> 這份是本次工作 session 的完整交接文件，目的：讓你（或任何協作者/另一個 Claude session）
> 在別的地方打開這個 repo 就能無縫接手——包含 repo 存取方式、部署流程、本次做了什麼、
> 每個決策的來龍去脈、還剩什麼沒做。
> 專案總入口仍是根目錄 `CLAUDE.md`（每次開新 session 先讀它），本檔是單次 session 的詳細紀錄。

---

## 一、repo 存取／更新／部署（在任何地方接手都照這套）

### 基本資料
| 項目 | 值 |
|---|---|
| Repo | https://github.com/jimmyliao/maxgame （**public**，2026-07-16 起） |
| 線上遊戲 | https://jimmyliao.github.io/maxgame/ |
| 開發分支 | `claude/dinosaur-game-infinite-levels-kpfmbm` |
| 部署分支 | `main`（GitHub Pages 從 main 根目錄部署，push 後 1–2 分鐘生效） |
| 目前版本 | commit `e49d142` / `sw.js` CACHE `shoutu-v137` |
| CI | `.github/workflows/ci.yml`，push/PR 自動觸發（public repo 免費無限制） |

### 取得程式碼
```bash
git clone https://github.com/jimmyliao/maxgame.git
cd maxgame
git checkout claude/dinosaur-game-infinite-levels-kpfmbm   # 開發都在這條
npm install    # 只有測試需要（遊戲本體零依賴、零 build，開 index.html 就能玩）
```

### 本機跑
```bash
python3 -m http.server 8099    # 開 http://localhost:8099/
```

### 改完的驗收流程（一票否決項，順序照做）
```bash
# 1. 語法檢查（index.html 的 inline JS 要抽出來 check）
sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/game.js && node --check /tmp/game.js
for f in src/*.js; do node --check "$f"; done

# 2. 型別 + 單元 + 冒煙測試
npm run typecheck && npm run test:unit && npm run test:smoke

# 3. 有改任何會被快取的檔案 → sw.js 的 CACHE 版本號 +1（目前 shoutu-v137）
#    有新增圖檔 → 同步加進 sw.js 的 ASSETS 清單
```

### 部署（兩條分支都要推，同一個 commit）
```bash
git push -u origin claude/dinosaur-game-infinite-levels-kpfmbm
git checkout main && git pull origin main
git merge --ff-only claude/dinosaur-game-infinite-levels-kpfmbm
git push origin main
git checkout claude/dinosaur-game-infinite-levels-kpfmbm
# 推完看 GitHub Actions 綠燈，Pages 1–2 分鐘後自動更新
```

### 鐵則（動程式前必讀，完整版在 CLAUDE.md §鐵則）
- `drawCreature(c,kind,x,y,s,o)` 簽名不可改；`HEROES/CH/TYPE/ADV/eff()` 欄位不可刪改名
- 零外部依賴（不可用 CDN/外部字型）；美術「圖檔優先＋canvas fallback」，圖檔一律 repo 內本地檔
- 粒子特效必須有硬上限＋回收；`localStorage["shoutu_unlocked"]` 鍵名不可改
- Firebase 多人連線沙盒測不到，要真機測

---

## 二、本次 session 做了什麼（依時間序）

### 1. CI 紅燈根因確認 → repo 改 public（commit `86418c8`）
- **問題**：CI 連續多天紅燈，每次 2–3 秒就 fail、log 是空的——本機測試全過，判定不是程式問題，
  是**私有 repo 的 GitHub Actions 免費分鐘數用罄**。
- **決策過程**：你問「可以不透過 CI 直接部署嗎？想把 repo 改公開，但 commit 紀錄想一下怎麼辦」。
  我先完整稽核 git 全歷史：金鑰樣式掃描、commit 作者信箱、曾刪除的可疑檔案、大檔案清單——
  全部乾淨；唯一命中的是 Firebase 用戶端設定金鑰，它本來就設計成可公開（存取控制靠 Firebase 安全規則）。
- **結果**：你在 GitHub 上把 repo 改成 public。public repo 的 Actions 完全免費無限制，
  `ci.yml` 從 `workflow_dispatch`（手動）改回 `on: push / pull_request`（自動），CI 立刻綠燈。
  備援手動部署方案（Cloudflare Pages / Netlify，不經 Actions）保留在 `docs/DEPLOY.md`。

### 2. PicSee（pse.is）短網址研究
- 你想要 `https://maxgame.pse.is/xxx` 這種好記短網址。
- **查證結果**：PicSee 免費版有自訂子網域功能（`<名稱>.pse.is`）；但**自訂短碼是全平台共用命名空間**
  （不是每個子網域各自獨立），所以 `play` 這種熱門字已被別人用掉。PicSee 沒有公開 API，
  這件事只能你自己在 PicSee 後台手動設定，程式端幫不上忙。
- 提供過的候選短碼方向：`moba`（MOBA = Multiplayer Online Battle Arena，多人線上戰鬥競技場）、
  `shoutu`、`guardian`、`formosa`、`tw` 等。**最終選了哪個短碼未在本 session 定案**，
  如已設定好，建議把最終短網址補進 CLAUDE.md。

### 3. 大廳側邊導覽按鈕對比度修正（v136，commit `d4037c6`）
- 你貼截圖回報：左右兩側選單文字在明亮場景下幾乎看不見。
- **修法**：按鈕底色從淺色半透明改成跟 `.lb-pill` 一致的深色玻璃感
  （`rgba(8,24,16,.55~.62)` + `backdrop-filter:blur(6px)` + 白字 + text-shadow），
  深色底不受場景日夜/天氣亮度影響，維持可讀對比。無頭瀏覽器截圖驗證過。

### 4. 全遊戲文字抽取包（翻譯用）
- 你要把所有遊戲文字（含過場、出現位置）打包下載，另外找翻譯。
- **做法**：Python 腳本掃 `index.html` + `src/*.js`，抽出所有含中文的字串常值與 HTML 文字節點，
  去重、依畫面/模組分類、附檔案:行號與程式語境。腳本在 session scratchpad
  （`extract_text.py` / `build_output.py`），原始碼改版後可重跑。
- **交付內容**（zip）：主 CSV（分類/原文/位置/程式語境四欄，UTF-8 BOM）、README（給譯者的說明，
  含「+變數+ 不用翻」等規則與建議翻譯順序）、純文字清單、dino 舊遊戲文字（可忽略）。

### 5. 用語審稿（「台灣文學工作者＋遊戲文案總監」視角）
- 你的指示：翻譯前先「定版」中文——以 2022–2026 小孩最愛的遊戲（荒野亂鬥/動森/寶可夢GO 等）
  的語感為標準，第一線玩家感受優先，不要文謅謅，不用客氣。
- **產出**：`用語審稿報告.md`（在翻譯包 zip 內），把問題分四級：
  - 🚨 必須修正（硬傷）：「串通」誤用（正確是「串聯」）；net.js 把「Firebase」「開發者」
    「房間狀態異常」等工程除錯字眼直接顯示給玩家
  - ✍️ 建議潤飾：約 15 條公文/說明書語氣的系統文案
  - ✅ 不要改：戰鬥即時警示、技能名、戰役對話、圖鑑科普——這些已是本作語氣標竿
  - 🔁 一致性：「已修煉至最高等級 vs 已滿級」混用、兩句遊戲介紹重複、兩處帳號綁定說明不一致
- 你回覆「**直接改!**」→ 全部照報告實作。

### 6. 全遊戲用語定版（v137，commit `e49d142`，已部署、CI 綠燈）
實際改動（6 檔，+32/−30 行）：
- **錯字**：「串通」→「串聯」×4（index.html 玩家文案 1 處＋habitat.js 註解 3 處）
- **除錯訊息外流**（`src/net.js` ×6）：
  - 「⚠ 尚未設定連線服務，請聯絡開發者完成 Firebase 設定後再試。」→「⚠ 連線功能準備中，先自己逛逛大廳吧！」
  - 「⚠ 連線服務初始化失敗，請檢查網路或稍後再試。」→「⚠ 連線暫時連不上，晚點再試試看～」
  - 「房間狀態異常。」→「房間好像斷線了，回大廳重新開一個房間吧！」
  - 「連線尚未就緒，請稍後再試。」→「連線中…請稍等一下」
  - 「只有房主可以開始對戰。」→「要等房主按開始才能出發喔！」
  - 「找不到這個房間，請確認代碼是否正確。」→「找不到這個房間耶，代碼打對了嗎？」
- **口語化**（index.html）：橫向提示「以獲得最佳遊戲體驗」→「橫著玩體驗更好喔！」；
  通行證「點數靠『完成每日任務』累積」→「完成每日任務就能拿🎟通行證點數！」；
  復育說明「投入保育值，復育守護者的族群，讓牠們更強壯。」→「花保育值幫守護者復育，讓牠們變更強！」
- **一致性**（index.html + legacy.js）：兩句遊戲介紹統一成「這是一款用玩的方式認識台灣生態的遊戲！…」；
  兩處帳號綁定說明統一成「🔒 即將推出：以後換手機也不會弄丟你的等級和收藏！」；
  「已修煉至最高等級」→「已滿級」；「🔒 去復育解鎖」→「🔒 去「復育」解鎖」；
  「解鎖花 🌿X」→「解鎖需 🌿X」；「守護者族群復育」→「守護者培育」
- **任務標籤去資料欄位感**（habitat.js 保育關卡目標）：「累積保育值」→「保育值」、
  「累積收成次數」→「收成次數」、「記錄野生訪客」→「認識野生訪客」、
  「建成生態走廊」→「生態走廊」、「任一棲地復原度」→「棲地復原度」
- 定版後**重跑抽取腳本**，交付第二版翻譯包（837 條，比第一版少 5 條因為合併了重複句），
  README 註明「直接取代第一版，不用比對差異」。

### 7. speak-human-tw 方法論檢視（無程式改動）
- 你給了 https://github.com/Raymondhou0917/speak-human-tw （繁中「去 AI 味」改寫 skill，
  38 種 AI 寫作痕跡＋兩岸用語對照），要我形成方法論回頭調整遊戲。
- **我的做法**：玩家看得到的文字才適用這套標準（專案文件是給工程接手用的，資訊密度優先，不套）。
  對全部玩家文字掃：大陸用語滲入、公式化 AI 腔（標誌著/展現了/說到底…）、半形標點混用、
  emoji 堆疊、「不是A而是B」句型濫用。
- **結果：全部乾淨，0 需修**。唯二命中都是誤報（`🌱🌿🌳` 是生長階段功能圖例；
  「不是…而是…」全庫僅 1 次，在允許範圍）。合理——第 5 步的審稿已把重疊問題清完。
  你回「夠了」，此項結案。

---

## 三、目前狀態與待辦

### 目前狀態
- `main` = 開發分支 = `e49d142`，CI 綠燈，Pages 已部署，sw `shoutu-v137`
- 工作樹乾淨，沒有未提交的變更
- 中文文案已定版，翻譯包 v2 已交付（如翻譯回來，CSV 的 C 欄有檔案:行號可對照回填）

### 待辦（接手優先順序）
1. **攻守對決新模式**（唯一 pending 的大項）：設計文件在 `docs/SIEGE-MODE.md`，
   第一版打 AI；**卡在「情報道具品項」待玩家（使用者）定案**才能完成核心循環。
2. PicSee 短網址：若已在後台設好，把最終網址記進 CLAUDE.md。
3. 翻譯回件後：依 CSV C 欄行號回填、決定多語系架構（目前全部字串 hardcode 在中文）。

### 接手新 session 的開場白建議
> 讀 `CLAUDE.md`（專案入口＋鐵則）→ 讀本檔（上次做到哪）→
> `git checkout claude/dinosaur-game-infinite-levels-kpfmbm` → 開工。
