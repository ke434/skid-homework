#!/usr/bin/env bash
# 在服务器上执行：把本目录(compose+Caddyfile)放到服务器后，运行 ./deploy.sh
# 要求: 服务器已安装 docker + docker compose 插件
set -euo pipefail
cd "$(dirname "$0")"

# 1. 检查 docker
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker 未安装，请先安装: curl -fsSL https://get.docker.com | sh"
  exit 1
fi
docker compose version >/dev/null 2>&1 || { echo "ERROR: 缺少 docker compose 插件"; exit 1; }

# 2. 拉取最新镜像
echo ">> 拉取镜像..."
docker compose pull

# 3. 启动
echo ">> 启动服务..."
docker compose up -d

# 4. 检查
echo ">> 服务状态:"
docker compose ps
