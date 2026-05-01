#!/usr/bin/env bash
set -euo pipefail

APP_SERVICE=cat-cafe-manager.service
TUNNEL_SERVICE=cat-cafe-manager-tunnel.service

systemctl --user daemon-reload
systemctl --user restart "$APP_SERVICE"
systemctl --user restart "$TUNNEL_SERVICE"

sleep 2

echo "[cat-cafe-manager] services restarted"
echo "app:    $APP_SERVICE"
echo "tunnel: $TUNNEL_SERVICE"
echo
systemctl --user --no-pager --full status "$APP_SERVICE" | sed -n '1,12p'
echo
systemctl --user --no-pager --full status "$TUNNEL_SERVICE" | sed -n '1,12p'
echo
if [[ -f /home/suker/projects/cat-cafe-manager/runtime/cloudflared.log ]]; then
  echo "latest tunnel url:"
  grep -Eo 'https://[-a-z0-9]+\.trycloudflare\.com' /home/suker/projects/cat-cafe-manager/runtime/cloudflared.log | tail -n 1 || true
fi
