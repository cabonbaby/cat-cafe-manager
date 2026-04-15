#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=/home/suker/projects/cat-cafe-manager/runtime/cloudflared.log
if [[ ! -f "$LOG_FILE" ]]; then
  echo "log file not found: $LOG_FILE" >&2
  exit 1
fi

URL=$(grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' "$LOG_FILE" | tail -n 1 || true)
if [[ -z "${URL}" ]]; then
  echo "尚未在 log 中找到 trycloudflare 網址。" >&2
  echo "請先啟動 tunnel service，或查看 log: $LOG_FILE" >&2
  exit 1
fi

echo "$URL" 
