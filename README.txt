貓咪咖啡店店長

這是一個純前端 web 小遊戲。

對外網址
- https://nekocoffee.skrworks.com/

固定啟動流程
1. 先確認 user services 已安裝：/home/suker/projects/cat-cafe-manager/scripts/install_user_services.sh
2. 一鍵重開：/home/suker/projects/cat-cafe-manager/scripts/restart_demo.sh
3. 等待服務起來後，直接打開固定網址：https://nekocoffee.skrworks.com/

手動啟動流程
1. cd /home/suker/projects/cat-cafe-manager
2. 啟動本機服務：python3 -m http.server 4080
3. 打開本機確認頁：http://127.0.0.1:4080
4. 確認 Cloudflare Tunnel 已指向 127.0.0.1:4080
5. 打開固定網址：https://nekocoffee.skrworks.com/

固定服務檢查
- app service: cat-cafe-manager.service
- tunnel service: cat-cafe-manager-tunnel.service
- tunnel log: /home/suker/projects/cat-cafe-manager/runtime/cloudflared.log

常用指令
- 安裝 user services: /home/suker/projects/cat-cafe-manager/scripts/install_user_services.sh
- 一鍵重開: /home/suker/projects/cat-cafe-manager/scripts/restart_demo.sh
- 啟動 tunnel: systemctl --user start cat-cafe-manager-tunnel.service
- 查詢網址: /home/suker/projects/cat-cafe-manager/scripts/show_quick_tunnel_url.sh

檔案
- index.html：畫面結構
- styles.css：視覺樣式
- app.js：遊戲邏輯
- docs/plans/2026-04-15-cat-cafe-manager.md：規劃文件