#!/bin/bash
# 手動部署到 Netlify（不透過 GitHub Actions，備援用）
# 適用時機：GitHub Actions 私有 repo 分鐘數用完，導致 GitHub Pages 自動部署也失敗時的緊急管道。
# 說明見 docs/DEPLOY.md §②
#
# 第一次用要先登入一次（開瀏覽器用 Netlify 帳號授權，免費註冊即可）：
#   npx netlify login
# 之後每次要部署，直接跑本腳本：
#   bash scripts/deploy-netlify.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_NAME="${NETLIFY_SITE_NAME:-shoutu-maxgame}"

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

echo "==> 部署到 Netlify（站台名稱：$SITE_NAME，第一次跑會問要不要建立新站台，選 yes 即可）..."
npx netlify deploy --prod --dir="$STAGE_DIR" --site="$SITE_NAME" || \
  npx netlify deploy --prod --dir="$STAGE_DIR"

echo "==> 完成！網址會顯示在上方輸出中（*.netlify.app），或到 Netlify 後台查看。"
