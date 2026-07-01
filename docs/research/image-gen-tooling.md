# AI 產圖工具研究與備置（image-gen-tooling）

> 對象：主 Claude 之後一拿到 API key 就能立刻驗證產圖。
> 研究日期：2026-07-01。工具：`tools/gen-image.mjs`、`tools/README.md`。

## 0. 最重要的定位（先讀，避免誤用）

本專案鐵則：**遊戲美術是 Canvas2D 純程式繪製、單檔零外部資源**（無 CDN／外部 img／字型／音檔）。
所以 AI 產圖對本專案的角色**分兩種**：

| 產出型態 | 例子 | 對「零外部資源」的適配 | 定位 |
|---|---|---|---|
| **點陣圖**（PNG/JPEG） | GPT-image、Gemini nano banana | ❌ **不可直接進遊戲**（塞進去就破離線 PWA、違反鐵則） | **概念圖／參考／mood board** —— 給人看，指導我們用 canvas 重畫 |
| **向量**（SVG / Canvas 程式碼） | Claude 產 SVG / `<canvas>` 繪製程式 | ✅ **可直接上場**（就是程式碼，零外部資源） | **可落地美術**，最符合本專案限制 |

一句話：**點陣圖是「參考」，向量／Canvas 程式碼才是「素材」。**
任何 PNG 產出都**不得**加入 `sw.js` 的 `ASSETS`、不得被 `index.html` 引用。

---

## 1. 三路線比較表

| 路線 | 產出 | 模型 / 端點 | 認證 | 回應格式 | 價格（1024²，官方） | 對本專案適配 | 建議用途 |
|---|---|---|---|---|---|---|---|
| **A. OpenAI Images** | 點陣 PNG | `gpt-image-1`；`POST https://api.openai.com/v1/images/generations` | `Authorization: Bearer $OPENAI_API_KEY` | JSON `data[0].b64_json`（gpt-image-1 一律回 base64，不支援 url） | low $0.011 / medium $0.042 / **high $0.167** | 🟡 僅參考。**本沙盒被代理擋(403)**，需組織放行 | 高品質寫實概念圖、細節多的 mood board |
| **B. Gemini 2.5 Flash Image**（nano banana） | 點陣 PNG | `gemini-2.5-flash-image`；`POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent` | header `x-goog-api-key: $GEMINI_API_KEY`（或 `?key=`） | JSON `candidates[0].content.parts[].inlineData.data`（base64）+ `mimeType` | 約 **$0.039 / 張**（1290 tokens × $30/1M；批次可到 ~$0.0195） | 🟢 參考。**本沙盒可達(200)**，可實測 | 便宜、快、可多輪編修的概念圖；角色一致性佳 |
| **C. Claude 向量美術** | **SVG / HTML / Canvas 程式碼** | Anthropic Messages API（`claude-*`）**或直接在對話中請 Claude 產 SVG/Canvas** | `x-api-key`（API 時）；對話內則免額外 key | 純文字（SVG/JS 程式碼） | 依 token 計（無「每張圖」費）；對話內產出等同一般回覆 | ✅ **可直接上場**（零外部資源） | 圖示、UI 裝飾、幾何造型、可縮放向量；**唯一能直接進遊戲的路線** |

備註（研究時發現，供決策）：
- **gpt-image-1 將於 2026-10-23 停用**；OpenAI 已有更新的 `gpt-image-1.5`（1024²：low $0.009 / medium $0.034 / high $0.133，較便宜）與 `gpt-image-1-mini`、`gpt-image-2`。若之後真的要用 OpenAI，建議改指向 `gpt-image-1.5`（本工具目前預設 `gpt-image-1`，改一個字串即可）。
- Gemini 的 `gemini-2.5-flash-image` 曾有 `-preview` 後綴的預覽版；正式版用不帶 preview 的 id。
- 兩家點陣圖都回 base64，本工具統一解成 PNG。

---

## 2. 建議工作流（把三路線接起來）

```
需求（例：石虎大廳側視造型）
   │
   ├─(1) 產「概念參考」──► A OpenAI 或 B Gemini（點陣 PNG）
   │        └─ 存 scratchpad/refs/ 或 docs/research/refs/，只給人看
   │
   ├─(2) 定調（構圖/配色/比例/生態正確性）──► 在地化 agent 顧台灣物種正確
   │
   └─(3) 落地美術：擇一
            ├─ 用 Canvas2D 手刻 drawCreature/drawCreatureTop（照參考重畫）★主線
            └─ 需要向量圖示/裝飾時 ──► C Claude 直接產 SVG/Canvas 程式碼，直接進遊戲
```

- **點陣圖只走到 (1)(2)**，永遠不進 build。它的價值是「省掉人腦想像、加速美術決策」。
- **(3) 才是真正進遊戲的一步**，且必須是程式（canvas 或 SVG），維持單檔零外部資源。
- 成本策略：先用 **Gemini（便宜、本沙盒可測）** 快速產多張探索方向，選定後若要高細節再用 OpenAI high（貴 4x）。

---

## 3. 使用者如何安全把 key 給主 Claude、主 Claude 如何驗證

### 3.1 交付金鑰（優先序）

1. **【首選】環境變數**（不落地、最安全）——使用者在跑主 Claude 的 shell 執行：
   ```bash
   export OPENAI_API_KEY="sk-..."      # 要用 OpenAI
   export GEMINI_API_KEY="AIza..."     # 要用 Gemini
   ```
   工具**只從 `process.env` 讀**，不接受從指令列 `--key` 或檔案傳入，降低外洩與誤 commit 風險。

2. **【次選】gitignore 的 `.env` 檔**——若必須用檔案：
   ```bash
   # 專案根目錄建立 .env（已被 .gitignore 忽略）
   printf 'OPENAI_API_KEY=sk-...\nGEMINI_API_KEY=AIza...\n' > .env
   # 用前先載入到環境變數（工具本身不讀 .env，靠 shell 載入）
   set -a; . ./.env; set +a
   ```
   `.gitignore` 已忽略 `.env`、`*.key`，**切勿** `git add .env`。

> 兩種方式最終都變成環境變數；工具永遠不把金鑰寫進任何檔案或輸出。

### 3.2 主 Claude 驗證（拿到 key 後第一行指令）

```bash
# 用便宜且本沙盒可達的 Gemini 先冒煙測一張
NODE_USE_ENV_PROXY=1 node tools/gen-image.mjs --provider gemini \
  --prompt "a simple green leaf on white, flat illustration" \
  --out ./scratchpad/refs/_smoke.png --aspect 1:1
```
- 成功：印出「成功 ✅ / 檔案路徑 / KB 大小」。
- 失敗：印出 HTTP 狀態碼與 API 訊息（例如 401 金鑰錯、429 額度）。
- OpenAI 路線同理，但**本沙盒 `api.openai.com` 被擋（403）**，需在放行環境或本機測：
  ```bash
  NODE_USE_ENV_PROXY=1 node tools/gen-image.mjs --provider openai \
    --prompt "a simple green leaf on white, flat illustration" \
    --out ./scratchpad/refs/_smoke.png --size 1024x1024 --quality low
  ```

### 3.3 代理注意事項
- 本沙盒對外 HTTPS 走代理（`HTTPS_PROXY`）。Node 全域 fetch 預設不讀它，故**指令前加 `NODE_USE_ENV_PROXY=1`**（Node 20.13+/22 內建，實測可通）。
- 遇 403/407：可能是組織 egress 政策擋該主機（如 OpenAI），非金鑰問題。查 `curl -sS "$HTTPS_PROXY/__agentproxy/status"`、`/root/.ccr/README.md`；**不要**關 TLS 驗證或 unset proxy。

---

## 4. 連線可達性實測（2026-07-01，經沙盒代理）

| 主機 | curl -I 結果 | 信心度 | 結論 |
|---|---|---|---|
| `api.openai.com` | `CONNECT tunnel failed, 403 Forbidden`（proxy `connect_rejected`：policy denial） | 高 | ❌ 本沙盒**連不到**。有 key 也沒用，需組織放行或改在本機跑 |
| `generativelanguage.googleapis.com` | `CONNECT 200 Connection Established`，HTTP/2 回應（裸路徑 404 屬正常） | 高 | ✅ 本沙盒**可達**。有 key 即可實測產圖 |

> 因此：**Gemini 是本環境唯一能端到端驗證的路線**；OpenAI 需外部/放行環境。工具兩者都已寫好，隨時可切。

---

## 5. 檔案清單
- `tools/gen-image.mjs` —— CLI（`node --check` 通過；無 key 時優雅報錯 exit 1）。
- `tools/README.md` —— 設定/執行/驗證/輸出位置說明。
- `.gitignore` —— 已加忽略金鑰檔（`.env`、`*.key`）與產圖資料夾。
- 本檔 —— 路線比較、工作流、金鑰交付與驗證。
