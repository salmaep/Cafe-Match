# Step-by-Step Server Setup

Panduan deploy dari fresh server sampai aplikasi live di:
- https://geser.id (web)
- https://api.geser.id (API)

Asumsi:
- OS: Ubuntu / Debian
- Sudah terinstall: `git`, `docker`, `docker compose`, `caddy`
- DNS `geser.id` & `api.geser.id` sudah point ke IP server (port 80/443 reachable dari internet)

---

## Env files — pisah per app

Tidak ada root `.env`. Tiga env file terpisah:

| File | Untuk | Kapan dibaca |
|---|---|---|
| `server/.env` | NestJS + interpolasi docker-compose (MySQL/Meili creds) | Runtime (NestJS) + compose-time |
| `client/.env` | Vite (URL API) | Build-time (di-bake ke JS bundle) |
| `client-mobile/.env` | Expo (URL API) | Build-time (Metro bundler) |

---

## Step 1 — Clone / pull repo

Pertama kali:
```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/salmaep/Cafe-Match.git geser
cd geser
git checkout prod
```

Update kemudian:
```bash
cd /var/www/geser
git pull
```

---

## Step 2 — Setup `server/.env`

```bash
cd /var/www/geser
cp server/.env.example server/.env
```

**Generate secrets:**
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "MEILI_MASTER_KEY=$(openssl rand -hex 32)"
echo "ADMIN_API_KEY=$(openssl rand -hex 32)"
```

Buka editor:
```bash
nano server/.env
```

**Wajib diisi/diganti:**
- `DB_PASSWORD` — password MySQL (akan dipakai di compose interpolation juga)
- `JWT_SECRET` — paste dari output di atas
- `MEILI_MASTER_KEY` — paste dari output di atas
- `ADMIN_API_KEY` — paste dari output di atas
- `PUBLIC_WEB_URL=https://geser.id`

**Optional:**
- `JINA_API_KEY` — kosongkan kalau belum mau pakai semantic search
- `GOOGLE_PLACES_API_KEY`, `MIDTRANS_*` — sesuai kebutuhan

---

## Step 3 — Setup `client/.env`

```bash
cp client/.env.example client/.env
nano client/.env
```

Isi:
```env
VITE_API_URL=https://api.geser.id/api/v1
```

Value ini di-bake ke JS bundle saat build container. Kalau nanti diubah, **rebuild client container**:
```bash
docker compose --env-file server/.env build --no-cache client
docker compose --env-file server/.env up -d client
```

---

## Step 4 — Setup `client-mobile/.env` (kalau juga di-build di server)

```bash
cp client-mobile/.env.example client-mobile/.env
nano client-mobile/.env
```

Isi:
```env
EXPO_PUBLIC_API_URL=https://api.geser.id/api/v1
```

(Kalau mobile build dilakukan di mesin developer/EAS, skip step ini di server.)

---

## Step 5 — Build & start containers

```bash
cd /var/www/geser
ln -sf server/.env .env
docker compose --env-file server/.env up -d --build
```

Cek status:
```bash
docker compose ps
```

Semua harus `healthy` / `running`:
```
NAME                   STATUS
geser-mysql        Up X min (healthy)
geser-meili        Up X min (healthy)
geser-app          Up X min
geser-client       Up X min
```

Kalau ada error:
```bash
docker compose logs -f app      # NestJS
docker compose logs -f client   # Vite preview
docker compose logs -f mysql    # MySQL
```

---

## Step 6 — Run database migrations

```bash
docker compose --env-file server/.env exec app npm run migration:run:prod
```

---

## Step 7 — Test dari host (sebelum Caddy)

```bash
# API
curl 'http://localhost:5084/api/v1/cafes?lat=-6.9175&lng=107.6191&radius=5000&limit=1'

# Web
curl -I http://localhost:5083
# expect: HTTP/1.1 200 OK
```

---

## Step 8 — Setup Caddy (reverse proxy + auto HTTPS)

Install Caddy (sekali):
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Caddyfile (`/etc/caddy/Caddyfile`):
```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
geser.id {
    # Sitemap dynamic dari NestJS — proxy ke API biar cafe URLs fresh tanpa rebuild SPA
    handle /sitemap.xml {
        reverse_proxy localhost:5084
    }
    # Sisanya ke client Vite preview
    handle {
        reverse_proxy localhost:5083
    }
}

api.geser.id {
    reverse_proxy localhost:5084
}
EOF
```

Reload & verify:
```bash
sudo systemctl reload caddy
sudo systemctl status caddy
```

Caddy auto-issue Let's Encrypt cert pertama kali request masuk (~30 detik). Cek log kalau gagal:
```bash
sudo journalctl -u caddy -f
```

---

## Step 9 — Test public

```bash
curl -I https://geser.id
curl 'https://api.geser.id/api/v1/cafes?lat=-6.9175&lng=107.6191&radius=5000&limit=1'
```

Browser:
- https://geser.id
- https://api.geser.id/api/v1/cafes?lat=-6.9175&lng=107.6191&radius=25000&limit=5

---

## Update / redeploy

### Otomatis (rekomendasi) — GitHub Actions
Push ke `prod` → workflow `.github/workflows/deploy.yml` otomatis SSH ke VPS, sync source, rebuild, run migration, smoke test. Lihat section "GitHub Actions Setup" di bawah.

### Manual
```bash
cd /var/www/geser
git pull

# Kalau ada perubahan di client/, rebuild client container
docker compose build client
docker compose up -d

# Kalau ada migration baru
docker compose exec app npm run migration:run:prod
```

Caddyfile TIDAK perlu di-reload kecuali isinya berubah.

---

## GitHub Actions Setup (one-time)

### 1. VPS prerequisites
- `/var/www/geser` adalah git clone repo, di branch `prod`.
- Symlink `.env -> server/.env` di root project: `ln -sf server/.env /var/www/geser/.env`
- `server/.env` sudah lengkap (lihat Step 2).
- User SSH (mis. `patokin`) bisa jalankan `docker compose` tanpa sudo (member group `docker`).
- Public key dari `VPS_SSH_KEY` ada di `~/.ssh/authorized_keys` user di VPS.

### 2. Daftarkan GitHub Secrets
Repo → Settings → Secrets and variables → Actions → New repository secret.

**SSH ke VPS:**
| Secret | Nilai |
|---|---|
| `VPS_HOST` | IP/hostname VPS (mis. `182.23.12.142`) |
| `VPS_USER` | user SSH (mis. `patokin`) |
| `VPS_SSH_KEY` | isi private key (`~/.ssh/id_ed25519`) |
| `VPS_SSH_PORT` | port SSH (mis. `29`) — wajib di-set kalau bukan 22 |

**Client env (Vite build-time):**
| Secret | Nilai |
|---|---|
| `VITE_API_URL` | `https://api.geser.id/api/v1` |
| `VITE_GOOGLE_MAPS_API_KEY` | API key Maps |
| `VITE_GOOGLE_MAPS_MAP_ID` | cloud map style ID (boleh kosong) |
| `VITE_GA_MEASUREMENT_ID` | GA4 ID (boleh kosong) |
| `VITE_ADSENSE_CLIENT` | (boleh kosong) |
| `VITE_ADSENSE_INFEED_SLOT` | (boleh kosong) |

### 3. Trigger pertama
- GitHub repo → tab **Actions** → pilih workflow **Deploy to VPS** → **Run workflow** → branch `prod`.
- Monitor output. Step terakhir harus muncul `Deploy successful`.

### 4. Trigger berikutnya
Otomatis setiap push ke `prod`. Atau manual lewat **Run workflow** button.

---

## Troubleshooting

| Gejala | Solusi |
|---|---|
| `502 Bad Gateway` di Caddy | Container tidak running. `docker compose ps` |
| `connection refused` ke `mysql` | `DB_PASSWORD` di `server/.env` belum diisi → compose tidak bisa interpolasi |
| Cert Caddy stuck / gagal | DNS belum propagate, atau port 80 belum reachable dari internet (ACME HTTP-01). Cek `sudo journalctl -u caddy -f` |
| Browser CORS error | `geser.id` belum di CORS allowlist (`server/src/main.ts`) |
| Web bundle hit `localhost:5084` | `client/.env` `VITE_API_URL` salah saat build. Rebuild dengan `--no-cache` |
| Port 80/443 conflict | Cek `sudo ss -tlnp \| grep -E ':80\|:443'` — kalau ada k3s/traefik, stop dulu (`sudo systemctl stop k3s`) |

---

## Catatan keamanan

- `server/.env` — JANGAN commit ke git (`.gitignore` sudah meng-exclude)
- `client/.env` — boleh commit kalau values-nya tidak sensitif (semua `VITE_*` public di bundle)
- Generate password/secret yang **berbeda** untuk staging vs production
- Setelah generate, **simpan secret di password manager** (jangan hanya di server)
