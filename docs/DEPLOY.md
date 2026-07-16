# 部署方式說明（GitHub Actions 額度用完時怎麼辦）

## 現況（2026-07-16）
- 這是**私有 repo**（`jimmyliao/maxgame`），但部署出去的網站是公開的：https://jimmyliao.github.io/maxgame/
- 私有 repo 的 **GitHub Actions 分鐘數是有上限的（free tier）**，目前已經踩到上限。
- 這個 repo 目前有兩條「會吃 Actions 分鐘數」的東西：
  1. 自訂的 `.github/workflows/ci.yml`（型別檢查／單元測試／build／冒煙測試）——**已改成手動觸發**（`workflow_dispatch`），不會再自動 push 就跑，見下方「① 手動 CI」。
  2. GitHub Pages 內建的「pages build and deployment」——**這是 GitHub 自己的機制，只要 push 到 `main` 就會自動觸發**，跟 `ci.yml` 完全無關、無法用 `workflow_dispatch` 停用。**這是私有 repo 上唯一還是「自動觸發＋吃額度」的東西。**

## 重要觀念：CI 跟 Pages 部署是兩件事
- `ci.yml` 紅燈／跑不動，**不會**擋住 Pages 部署，兩者互不影響。
- 但如果 Actions 分鐘數整個帳號額度用完，**Pages 部署本身也會失敗**（因為它也是跑在 Actions 上）——這就是目前最壞的情況：連正常 `git push origin main` 都可能部署不上去。

## ① 手動重新啟用 CI（額度恢復後）
`.github/workflows/ci.yml` 已改成：
```yaml
on:
  workflow_dispatch:
```
要跑的話：GitHub 網頁 → repo → **Actions** 分頁 → 左側選 **CI** → 右上角 **Run workflow** 按鈕手動點一次。
額度完全恢復、不想再手動點的話，把 `on:` 那段改回：
```yaml
on:
  push:
  pull_request:
```

## ② Pages 部署本身撐不住時的備援：不透過 GitHub Actions，直接部署到別的免費靜態網站服務
這個專案是**零建置**的純靜態網站（`index.html` + `src/*.js`，沒有一定要跑 Vite build 才能上線——`dist/` 只是 CI 用來驗證 build 沒壞掉，實際上線用的是 repo 根目錄的原始檔案）。所以可以直接把整個 repo 根目錄的內容原封不動丟到任何靜態代管服務，跟 GitHub Actions 完全脫鉤。

提供兩個現成腳本，各自對應一個免費方案，兩者都**不消耗 GitHub Actions 分鐘數**（額度、計費都是另一家服務，跟 GitHub 無關）：

### `scripts/deploy-cloudflare.sh` — Cloudflare Pages（推薦，免費方案無流量上限）
```bash
# 第一次用要先登入（會開瀏覽器要你用 Cloudflare 帳號授權，免費註冊即可）：
npx wrangler login

# 之後每次要手動部署，直接跑：
bash scripts/deploy-cloudflare.sh
```
部署完會得到一個 `*.pages.dev` 網址（也可以在 Cloudflare 後台綁自訂網域）。

### `scripts/deploy-netlify.sh` — Netlify（備選，免費方案每月 100GB 流量）
```bash
# 第一次用要先登入：
npx netlify login

# 之後每次要手動部署，直接跑：
bash scripts/deploy-netlify.sh
```
部署完會得到一個 `*.netlify.app` 網址。

兩個腳本都只是把 repo 根目錄（扣掉 `node_modules/`、`.git/`、`dist/`、`test-results/` 這些開發用的東西）整包丟給對應服務的 CLI 上傳，跟這個 repo 的 git 歷史、GitHub Actions 完全無關。

### 選哪個？
- 兩個都是免費、都不用 GitHub Actions，選一個順手的就好，不衝突（甚至可以兩個都設，多一個備援網址）。
- 都需要**你自己**先去該服務免費註冊帳號、跑一次 `login` 授權——這步我這邊做不到（需要你本人的帳號），之後每次部署才能全自動用腳本跑。
- 這兩個都只是「備援/緊急管道」，**平常還是用 `git push origin main` 讓 GitHub Pages 自動部署**，只有當 Pages 部署也失敗（額度問題）時才需要跑這兩個腳本救急。

## ③ 未來想徹底解決額度問題
- 最徹底：repo 改成 public（GitHub Actions 對 public repo 完全免費無限制）。**這個選項目前先不採用**（使用者決定）。
- 或：升級 GitHub 方案（Pro/Team 有更多 Actions 分鐘數）。
- 或：長期都用 ② 的備援服務當主要部署管道，不依賴 GitHub Pages。

---
_這份文件與 `scripts/deploy-*.sh` 是給未來任何 session／agent 接手時看的——遇到「CI 跑不動」或「Pages 部署不上去」，先看這份文件，不用重新排查一次。_
