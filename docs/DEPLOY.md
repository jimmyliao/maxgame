# 部署方式說明（GitHub Actions 額度問題與備援方案）

## 現況（2026-07-16 更新：repo 已改為 public，額度問題已解除）
- `jimmyliao/maxgame` 現在是 **public repo**，網站原本就公開：https://jimmyliao.github.io/maxgame/
- **GitHub Actions 對 public repo 完全免費、沒有分鐘數上限**——`.github/workflows/ci.yml` 已改回 `on: push / pull_request` 自動觸發，Pages 部署（GitHub 內建的「pages build and deployment」）也不再有額度顧慮。
- 下面 ①②③ 是**私有 repo 時期踩到 free tier 上限**留下的排查記錄與備援方案，額度問題本身已解決、目前用不到，但保留供未來參考（例如帳號又改回 private，或另開私有 repo 專案時）。

## 背景知識：CI 跟 Pages 部署是兩件事
- `ci.yml` 紅燈／跑不動，**不會**擋住 Pages 部署，兩者互不影響（各自獨立的 workflow）。
- 私有 repo 時，Actions 分鐘數整個帳號額度用完的話，**Pages 部署本身也會失敗**（因為它也是跑在 Actions 上）——這是當時最壞的情況：連正常 `git push origin main` 都部署不上去。Public repo 沒有這個問題。

## ① 手動觸發 CI（僅私有 repo 額度緊張時才需要）
若之後又需要手動模式，把 `on:` 改成：
```yaml
on:
  workflow_dispatch:
```
要跑的話：GitHub 網頁 → repo → **Actions** 分頁 → 左側選 **CI** → 右上角 **Run workflow** 按鈕手動點一次。

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

## ③ 徹底解決額度問題（2026-07-16 已採用：改成 public repo）
- **已執行**：repo 改成 public，GitHub Actions 對 public repo 完全免費無限制。動手前已完整稽核過 git 全歷史（金鑰樣式、commit 作者信箱、曾被刪除的可疑檔案），確認乾淨可公開；唯一命中的 Firebase 用戶端設定金鑰本來就設計成可公開（存取控制靠 Firebase 安全規則）。
- 若未來又需要改回 private（例如想暫時隱藏原始碼），Actions 額度問題會重新出現，屆時可參考本文件 ①②。
- 其他備選：升級 GitHub 方案（Pro/Team 有更多 Actions 分鐘數）；或長期都用 ② 的備援服務當主要部署管道，不依賴 GitHub Pages。

---
_這份文件與 `scripts/deploy-*.sh` 是給未來任何 session／agent 接手時看的——遇到「CI 跑不動」或「Pages 部署不上去」，先看這份文件，不用重新排查一次。_
