# tools/ — AI 產圖 CLI（`gen-image.mjs`）

> 產出的是**概念圖 / 參考圖 / mood board**，用來指導我們用 **Canvas2D 純程式**重畫。
> **不可**把點陣圖直接塞進遊戲、**不可**加入 `sw.js` 的 `ASSETS`（會破壞「單檔零外部資源」鐵則、離線 PWA）。
> 完整路線比較與工作流見 `docs/research/image-gen-tooling.md`。

## 這是什麼
`gen-image.mjs` 是一支 Node（v22，全域 fetch）CLI，可用 OpenAI 或 Gemini 產一張圖存成 PNG。
金鑰**只從環境變數讀**（`OPENAI_API_KEY` / `GEMINI_API_KEY`），**絕不硬寫、絕不從指令列或檔案傳入**。

## 1. 設定金鑰（環境變數）

```bash
# 擇一（或兩個都設）
export OPENAI_API_KEY="sk-..."      # 用 --provider openai 時
export GEMINI_API_KEY="AIza..."     # 用 --provider gemini 時
```

> 建議用 `export`（只存在當前 shell、不落地）。若要用檔案，見 `docs/research/image-gen-tooling.md`
> 的「安全交付金鑰」章節，並確認該檔已被 `.gitignore` 忽略（`.env`、`*.key`）。

## 2. 怎麼跑

本沙盒對外 HTTPS 走代理，Node 全域 fetch 需開代理支援 —— **在指令前加 `NODE_USE_ENV_PROXY=1`**：

```bash
# OpenAI（gpt-image-1）
NODE_USE_ENV_PROXY=1 node tools/gen-image.mjs \
  --provider openai \
  --prompt "台灣石虎在低海拔次生林，晨霧，寫實水彩概念圖，側面全身" \
  --out ./scratchpad/refs/leopard.png \
  --size 1024x1024 --quality high

# Gemini 2.5 Flash Image（nano banana）
NODE_USE_ENV_PROXY=1 node tools/gen-image.mjs \
  --provider gemini \
  --prompt "福壽螺入侵稻田的生態插畫，粉紅卵塊，教育圖鑑風" \
  --out ./scratchpad/refs/snail.png \
  --aspect 1:1
```

在**本機**（無代理）時可省略 `NODE_USE_ENV_PROXY=1`。

### 參數
| 參數 | 說明 |
|---|---|
| `--provider` | `openai` 或 `gemini`（必填） |
| `--prompt` | 文字提示（必填） |
| `--out` | 輸出 PNG 路徑（必填） |
| `--size` | openai：`1024x1024`｜`1536x1024`｜`1024x1536`｜`auto`（預設 `1024x1024`） |
| `--quality` | openai：`low`｜`medium`｜`high`（預設 `high`） |
| `--aspect` | gemini 長寬比：`1:1`｜`16:9`｜`4:3`…（可選） |
| `--help` | 顯示用法 |

## 3. 輸出去哪（重要）
- 建議存 **`scratchpad/refs/`** 或 **`docs/research/refs/`**。
- **不要** commit 大圖（`.gitignore` 已忽略 `scratchpad/`、`docs/research/refs/`、`tools/out/`、`*.png` 產出區）。
- **不要**把任何產出圖加入 `sw.js` 的 `ASSETS` 或 `index.html`。這些圖只是「畫給人看的參考」。

## 4. 怎麼驗證金鑰能用（拿到 key 後第一行）
```bash
# 選成本較低的 gemini 或 openai low 品質先驗一張
NODE_USE_ENV_PROXY=1 node tools/gen-image.mjs --provider gemini \
  --prompt "a simple green leaf on white, flat illustration" \
  --out ./scratchpad/refs/_smoke.png --aspect 1:1
# 成功會印出「成功 ✅ / 檔案路徑 / 大小」；失敗會印 HTTP 狀態碼與訊息。
```

## 5. 連線可達性（本沙盒實測 2026-07-01）
| 主機 | 結果 | 說明 |
|---|---|---|
| `generativelanguage.googleapis.com`（Gemini） | ✅ **通** | CONNECT 200、Node fetch 可達（回 HTTP 狀態） |
| `api.openai.com`（OpenAI） | ❌ **被代理擋（403）** | 組織 egress 政策未放行此主機；即使有 key 也連不到 |

> 結論：**在本沙盒只有 Gemini 可實測**；OpenAI 路線需先請組織放行 `api.openai.com`（或在本機/放行環境跑）。

## 6. 無金鑰 dry-run（實測輸出）
無 key 時工具會**優雅報錯 exit 1**，不會崩潰：
```
$ node tools/gen-image.mjs --provider openai --prompt "test" --out /tmp/x.png

[gen-image] 錯誤：缺少 OPENAI_API_KEY。請先設定環境變數再執行，例如：
  export OPENAI_API_KEY="sk-..."
（本工具不接受從指令列或檔案傳入金鑰，避免外洩。）
```
`node --check tools/gen-image.mjs` 亦通過（無語法錯誤）。
