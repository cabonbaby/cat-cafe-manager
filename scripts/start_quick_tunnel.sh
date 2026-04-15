#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=/home/suker/projects/cat-cafe-manager
PORT=4080
LOG_FILE=/home/suker/projects/cat-cafe-manager/runtime/cloudflared.log
CLOUDFLARED_BIN=${CLOUDFLARED_BIN:-/usr/local/bin/cloudflared}

mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] starting quick tunnel for http://127.0.0.1:$PORT" >> "$LOG_FILE"
exec "$CLOUDFLARED_BIN" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" >> "$LOG_FILE" 2>&1
