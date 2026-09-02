#!/usr/bin/env bash
# 上线打包：构建 H5 前端并把产物拷入 server/web/（后端同域托管，单服务部署）
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[deploy] 1/3 构建前端（API_BASE 留空 = 同源 /api）..."
# 临时清空 API_BASE 保证产物走相对路径；构建结束不污染 .env
if grep -q '^TARO_APP_API_BASE=' .env && [ -n "$(grep '^TARO_APP_API_BASE=' .env | cut -d= -f2-)" ]; then
  cp .env .env.bak
  sed -i '' 's/^TARO_APP_API_BASE=.*/TARO_APP_API_BASE=/' .env
  RESTORE_ENV=1
fi
TARO_APP_API_BASE= npm run build:h5 >/dev/null 2>&1 || { echo "[deploy] 前端构建失败"; [ "${RESTORE_ENV:-0}" = "1" ] && mv .env.bak .env; exit 1; }
[ "${RESTORE_ENV:-0}" = "1" ] && mv .env.bak .env && echo "[deploy] 已恢复 .env"

echo "[deploy] 2/3 拷贝产物到 server/web/ ..."
rm -rf server/web
mkdir -p server/web
cp -R web/. server/web/

echo "[deploy] 3/3 校验..."
test -f server/web/index.html && echo "  ✓ server/web/index.html 存在"
grep -q 'http://localhost:3000' server/web/js/app.js && echo "  ⚠️ 警告: 产物仍含 localhost:3000，检查 .env" || echo "  ✓ 产物无本地地址残留（同源 /api）"
echo
echo "完成。将 server/ 整个目录部署到平台即可（含 API 与前端静态文件）。"
