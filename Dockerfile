FROM nginx:alpine
COPY index.html app.js styles.css /usr/share/nginx/html/
COPY scripts/ /usr/share/nginx/html/scripts/
