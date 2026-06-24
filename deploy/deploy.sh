#!/usr/bin/env bash
# Geser deploy script (run di server geser setelah server/.env & client/.env siap)
#
# Usage:
#   cd /var/www/geser
#   bash deploy/deploy.sh
#
# Default flow (K8s mode): build container only. Public routing/TLS handled by
# K8s cluster di dios (kubectl apply manifests dari deploy/kube/).
#
# Flag opsional buat path lama (self-hosted nginx + certbot di server geser):
#   bash deploy/deploy.sh --with-nginx       # setup nginx config & start
#   bash deploy/deploy.sh --with-certbot --email=lo@email.com  # run certbot juga
#   bash deploy/deploy.sh --skip-build       # skip docker compose build

set -euo pipefail

# ─── Flags ────────────────────────────────────────────────────────────────────
SKIP_BUILD=0
WITH_NGINX=0
WITH_CERTBOT=0
CERTBOT_EMAIL=""

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --with-nginx) WITH_NGINX=1 ;;
    --with-certbot) WITH_CERTBOT=1; WITH_NGINX=1 ;;
    --email=*) CERTBOT_EMAIL="${arg#*=}" ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

PROJECT_DIR="/var/www/geser"
APP_PORT=5084
WEB_PORT=5083
WEB_DOMAIN="geser.id"
API_DOMAIN="api.geser.id"

# ─── Helper ──────────────────────────────────────────────────────────────────
log()  { echo -e "\033[1;34m==>\033[0m $*"; }
ok()   { echo -e "\033[1;32m✓\033[0m $*"; }
warn() { echo -e "\033[1;33m!\033[0m $*"; }
err()  { echo -e "\033[1;31m✗\033[0m $*" >&2; exit 1; }

# ─── Pre-flight checks ───────────────────────────────────────────────────────
log "Pre-flight checks"

[ -d "$PROJECT_DIR" ] || err "Folder $PROJECT_DIR ga ada. Clone repo dulu."
cd "$PROJECT_DIR"

[ -f server/.env ] || err "server/.env belum ada. Setup env dulu."
[ -f client/.env ] || err "client/.env belum ada. Setup env dulu."
[ -f docker-compose.yml ] || err "docker-compose.yml ga ada di $PROJECT_DIR."

command -v docker >/dev/null 2>&1 || err "Docker belum keinstall."
docker compose version >/dev/null 2>&1 || err "docker compose plugin ga ada."

ok "Pre-flight OK"

# ─── Step 1: Symlink .env ────────────────────────────────────────────────────
log "Step 1/7 — Symlink .env → server/.env"
ln -sf server/.env .env
ok "Symlink created"

# ─── Step 2: Build & start containers ────────────────────────────────────────
if [ "$SKIP_BUILD" -eq 0 ]; then
  log "Step 2/7 — Build & start containers (bisa 5-15 menit kalo first build)"
  docker compose --env-file server/.env up -d --build
  ok "Containers started"
else
  log "Step 2/7 — Skipped (--skip-build)"
  docker compose --env-file server/.env up -d
fi

# ─── Step 3: Wait for healthy ────────────────────────────────────────────────
log "Step 3/7 — Wait sampai app + DB healthy (max 90 detik)"
for i in $(seq 1 45); do
  if curl -fsS "http://localhost:$APP_PORT/api/v1/health" > /dev/null 2>&1; then
    ok "App ready ($i/45)"
    break
  fi
  if [ "$i" -eq 45 ]; then
    docker compose ps
    err "App belum ready setelah 90s. Cek: docker compose logs app"
  fi
  echo -n "."
  sleep 2
done
echo ""

docker compose ps

# ─── Step 4: Migration ───────────────────────────────────────────────────────
log "Step 4/7 — Run database migration"
docker compose exec -T app npm run migration:run:prod
ok "Migration done"

# ─── Step 5: Smoke test localhost ────────────────────────────────────────────
log "Step 5/7 — Smoke test localhost"

curl -fsS -I "http://localhost:$WEB_PORT" > /dev/null \
  && ok "Web ($WEB_PORT) OK" \
  || err "Web ($WEB_PORT) gagal respond"

curl -fsS "http://localhost:$APP_PORT/api/v1/health" > /dev/null \
  && ok "API ($APP_PORT/api/v1/health) OK" \
  || err "API ($APP_PORT) gagal respond"

# ─── Step 6: Nginx config (cuma kalo --with-nginx) ──────────────────────────
if [ "$WITH_NGINX" -eq 1 ]; then
  log "Step 6/7 — Setup nginx config (self-hosted reverse proxy)"

  command -v nginx >/dev/null 2>&1 || err "nginx ga keinstall."

  # Write geser-web
  sudo tee /etc/nginx/sites-available/geser-web > /dev/null <<EOF
server {
    listen 80;
    server_name $WEB_DOMAIN;
    client_max_body_size 20M;

    location /sitemap.xml {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  # Write geser-api
  sudo tee /etc/nginx/sites-available/geser-api > /dev/null <<EOF
server {
    listen 80;
    server_name $API_DOMAIN;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

  # Enable symlinks
  sudo ln -sf /etc/nginx/sites-available/geser-web /etc/nginx/sites-enabled/geser-web
  sudo ln -sf /etc/nginx/sites-available/geser-api /etc/nginx/sites-enabled/geser-api

  # Test config
  sudo nginx -t || err "nginx config invalid"

  # Start atau reload
  if systemctl is-active --quiet nginx; then
    sudo systemctl reload nginx
    ok "nginx reloaded"
  else
    sudo systemctl start nginx
    sudo systemctl enable nginx
    ok "nginx started + enabled"
  fi
else
  log "Step 6/7 — Skipped (K8s mode: kubectl apply manifests di dios)"
fi

# ─── Step 7: Certbot (kalo --with-certbot) ───────────────────────────────────
if [ "$WITH_CERTBOT" -eq 1 ]; then
  log "Step 7/7 — Issue TLS cert via certbot"

  [ -n "$CERTBOT_EMAIL" ] || err "Pakai --email=<your@email> juga buat certbot"

  command -v certbot >/dev/null 2>&1 || err "certbot ga keinstall."

  # Sanity: cek DNS
  for d in "$WEB_DOMAIN" "$API_DOMAIN"; do
    if ! dig +short "$d" | grep -q '[0-9]'; then
      warn "DNS $d belum resolve — certbot mungkin gagal"
    fi
  done

  sudo certbot --nginx \
    -d "$WEB_DOMAIN" -d "$API_DOMAIN" \
    --email "$CERTBOT_EMAIL" \
    --agree-tos --no-eff-email --redirect --non-interactive

  ok "TLS cert issued + auto-redirect 80→443 setup"
else
  log "Step 7/7 — Skipped (pakai --with-certbot --email=lo@email.com buat issue cert)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
ok "Deploy berhasil!"
echo ""
echo "  Web : http://$WEB_DOMAIN (HTTP)$([ "$WITH_CERTBOT" -eq 1 ] && echo ' / https://'"$WEB_DOMAIN"' (HTTPS)')"
echo "  API : http://$API_DOMAIN/api/v1$([ "$WITH_CERTBOT" -eq 1 ] && echo ' / https://'"$API_DOMAIN"'/api/v1')"
echo ""
echo "Container status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
[ "$WITH_CERTBOT" -eq 0 ] && warn "TLS belum di-issue. Run ulang dgn flag: --with-certbot --email=lo@email.com"
