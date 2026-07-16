#!/bin/bash
# 手動部署到 Cloudflare Pages（不透過 GitHub Actions，備援用）
# 適用時機：GitHub Actions 私有 repo 分鐘數用完，導致 GitHub Pages 自動部署也失敗時的緊急管道。
# 說明見 docs/DEPLOY.md §②
#
# 第一次用要先登入一次（開瀏覽器用 Cloudflare 帳號授權，免費註冊即可）：
#   npx wrangler login
# 之後每次要部署，直接跑本腳本：
#   bash scripts/deploy-cloudflare.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_NAME="${CF_PAGES_PROJECT:-shoutu-maxgame}"

echo "==> 打包部署用的靜態檔案（repo 根目錄，排除開發用目錄）..."
STAGE_DIR=$(mktemp -d)
trap 'rm -rf "$STAGE_DIR"' EXIT

if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude='.git' --exclude='node_modules' --exclude='dist' \
    --exclude='test-results' --exclude='playwright-report' \
    --exclude='.github' --exclude='scripts' --exclude='docs' \
    --exclude='tools/out' --exclude='*.log' \
    ./ "$STAGE_DIR/"
else
  # 沒有 rsync 就退回 cp + 清掉開發用目錄（可攜性較差但不依賴額外套件）
  cp -a . "$STAGE_DIR/"
  rm -rf "$STAGE_DIR"/.git "$STAGE_DIR"/node_modules "$STAGE_DIR"/dist \
    "$STAGE_DIR"/test-results "$STAGE_DIR"/playwright-report \
    "$STAGE_DIR"/.github "$STAGE_DIR"/scripts "$STAGE_DIR"/docs \
    "$STAGE_DIR"/tools/out
fi

echo "==> 部署到 Cloudflare Pages（專案名稱：$PROJECT_NAME）..."
npx wrangler pages deploy "$STAGE_DIR" --project-name="$PROJECT_NAME"

echo "==> 完成！網址會顯示在上方輸出中（*.pages.dev），或到 Cloudflare 後台 Pages 專案頁面查看。"
