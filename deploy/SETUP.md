# Step-by-Step Server Setup

Panduan deploy dari fresh server sampai aplikasi live di:
- https://salma.imola.ai (web)
- https://api.salma.imola.ai (API)

Asumsi:
- OS: Ubuntu / Debian
- Sudah terinstall: `git`, `docker`, `docker compose`, `kubectl`
- Cluster K8s sudah punya Traefik + cert-manager + ClusterIssuer `letsencrypt-prod`
- DNS `salma.imola.ai` & `api.salma.imola.ai` sudah point ke Traefik public IP

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
sudo mkdir -p /opt && sudo chown $USER:$USER /opt
cd /opt
git clone https://github.com/salmaep/Cafe-Match.git
cd Cafe-Match
git checkout dev
```

Update kemudian:
```bash
cd /opt/Cafe-Match
git pull
```

---

## Step 2 — Setup `server/.env`

```bash
cd /opt/Cafe-Match
cp server/.env.example server/.env
```

**Generate secrets:**
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "MEILI_MASTER_KEY=$(openssl rand -hex 32)"
echo "SCRAPER_API_KEY=$(openssl rand -hex 32)"
```

Buka editor:
```bash
nano server/.env
```

**Wajib diisi/diganti:**
- `DB_PASSWORD` — password MySQL (akan dipakai di compose interpolation juga)
- `JWT_SECRET` — paste dari output di atas
- `MEILI_MASTER_KEY` — paste dari output di atas
- `SCRAPER_API_KEY` — paste dari output di atas

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
VITE_API_URL=https://api.salma.imola.ai/api/v1
```

⚠️ Value ini di-bake ke JS bundle saat build container. Kalau nanti diubah, **rebuild client container**:
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
EXPO_PUBLIC_API_URL=https://api.salma.imola.ai/api/v1
```

(Kalau mobile build dilakukan di mesin developer, skip step ini di server.)

---

## Step 5 — Build & start containers

```bash
cd /opt/Cafe-Match
docker compose --env-file server/.env up -d --build
```

Penjelasan flag `--env-file server/.env`:
- Compose file pakai `${DB_PASSWORD}`, `${MEILI_MASTER_KEY}`, dll
- Variabel ini di-resolve dari `server/.env`
- MySQL & Meili containers dapat credentials yang sinkron dengan NestJS

Cek status:
```bash
docker compose ps
```

Semua harus `healthy` / `running`:
```
NAME                   STATUS
cafematch-mysql        Up X min (healthy)
cafematch-meili        Up X min (healthy)
cafematch-app          Up X min
cafematch-client       Up X min
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
docker compose --env-file server/.env exec app npm run migration:run
```

---

## Step 7 — Test dari host (sebelum K8s)

```bash
# API
curl 'http://localhost:3084/api/v1/cafes?lat=-6.9175&lng=107.6191&radius=5000&limit=1'

# Web
curl -I http://localhost:3083
# expect: HTTP/1.1 200 OK
```

---

## Step 8 — Apply K8s manifests (Service + Ingress)

```bash
mkdir -p /home/dios/kube-config
cp /opt/Cafe-Match/deploy/kube/cafe-match.yaml      /home/dios/kube-config/
cp /opt/Cafe-Match/deploy/kube/cafe-match-cert.yaml /home/dios/kube-config/

# Ganti <HOST_IP> dengan IP server (private/internal yang K8s nodes bisa reach)
sed -i 's/<HOST_IP>/192.168.88.184/g' /home/dios/kube-config/cafe-match.yaml

# Apply Service + Endpoints
kubectl apply -f /home/dios/kube-config/cafe-match.yaml

# Apply Ingress + cert-manager (auto-issue Let's Encrypt cert)
kubectl apply -f /home/dios/kube-config/cafe-match-cert.yaml

# Verify
kubectl get svc,endpoints,ingress | grep cafe-match
kubectl get certificate -w   # tunggu READY=True (~1-2 menit)
```

Kalau cert stuck:
```bash
kubectl describe certificate cafe-match-web-tls
kubectl describe certificate cafe-match-api-tls
```

---

## Step 9 — Test public

```bash
curl -I https://salma.imola.ai
curl 'https://api.salma.imola.ai/api/v1/cafes?lat=-6.9175&lng=107.6191&radius=5000&limit=1'
```

Browser:
- https://salma.imola.ai
- https://api.salma.imola.ai/api/v1/cafes?lat=-6.9175&lng=107.6191&radius=25000&limit=5

---

## Update / redeploy

```bash
cd /opt/Cafe-Match
git pull

# Kalau ada perubahan di client/, rebuild client container
docker compose --env-file server/.env build client
docker compose --env-file server/.env up -d

# Kalau ada migration baru
docker compose --env-file server/.env exec app npm run migration:run
```

K8s manifests TIDAK perlu re-apply kecuali isinya berubah.

---

## Troubleshooting

| Gejala | Solusi |
|---|---|
| `502 Bad Gateway` di Traefik | Container tidak running. `docker compose ps` |
| `connection refused` ke `mysql` | `DB_PASSWORD` di `server/.env` belum diisi → compose tidak bisa interpolasi |
| Cert stuck >5 menit | DNS belum propagate, atau Traefik tidak listen di port 80 untuk ACME challenge |
| Browser CORS error | `salma.imola.ai` belum di CORS allowlist (`server/src/main.ts`) |
| Web bundle hit `localhost:3084` | `client/.env` `VITE_API_URL` salah saat build. Rebuild dengan `--no-cache` |
| K8s endpoints empty | `<HOST_IP>` belum diganti, atau host firewall blokir K8s nodes |

---

## Catatan keamanan

- `server/.env` — JANGAN commit ke git (`.gitignore` sudah meng-exclude)
- `client/.env` — boleh commit kalau values-nya tidak sensitif (semua `VITE_*` public di bundle)
- Generate password/secret yang **berbeda** untuk staging vs production
- Setelah generate, **simpan secret di password manager** (jangan hanya di server)
