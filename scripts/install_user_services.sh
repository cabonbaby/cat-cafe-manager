#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=/home/suker/projects/cat-cafe-manager
SRC_DIR="$PROJECT_DIR/ops/systemd"
DST_DIR="$HOME/.config/systemd/user"

mkdir -p "$DST_DIR"
cp "$SRC_DIR"/*.service "$DST_DIR/"
systemctl --user daemon-reload

echo "Installed services into $DST_DIR" 
echo "可用指令：" 
echo "  systemctl --user start cat-cafe-manager-tunnel.service" 
echo "  systemctl --user status cat-cafe-manager-tunnel.service" 
