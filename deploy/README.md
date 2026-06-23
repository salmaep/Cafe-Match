# Cafe-Match — Server Deployment

Lihat [SETUP.md](./SETUP.md) untuk panduan **step-by-step lengkap**.

## Architecture

```
Internet
  │
  ▼ (443)
┌────────────────────────────┐
│ Caddy                      │  TLS auto via Let's Encrypt
│  geser.id      → :3083     │
│  api.geser.id  → :3084     │
└──────────────┬─────────────┘
               │ HTTP (localhost)
               ▼
┌────────────────────────────────────┐
│ Docker host (e.g. 182.23.12.142)   │
│  ┌─────────────────────────────┐   │
│  │ docker compose              │   │
│  │  ├─ client (3083)           │   │  ← web bundle (vite preview)
│  │  ├─ app    (3084)           │   │  ← NestJS
│  │  ├─ mysql  (3306, internal) │   │
│  │  └─ meili  (7700, internal) │   │
│  └─────────────────────────────┘   │
└────────────────────────────────────┘
```

## Env files (no root .env)

| File | Untuk | Catatan |
|---|---|---|
| `server/.env` | NestJS + interpolasi compose (DB & Meili creds) | Wajib, jangan commit |
| `client/.env` | Vite (URL API) | Di-bake ke JS bundle saat build |
| `client-mobile/.env` | Expo (URL API) | Mobile build |

## Quick commands

```bash
# Pertama kali / setelah pull
cd /var/www/Cafe-Match
docker compose --env-file server/.env up -d --build
docker compose --env-file server/.env exec app npm run migration:run:prod

# Reload Caddy kalau Caddyfile berubah
sudo systemctl reload caddy
sudo journalctl -u caddy -f
```

## Files in `deploy/kube/` (deprecated)

K8s manifests legacy dari setup lama (Traefik + cert-manager). Tidak dipakai lagi
karena routing & TLS sekarang ditangani Caddy native di host. Disimpan untuk
referensi kalau nanti mau migrasi ke cluster.

## Domains

- `https://geser.id` → web client
- `https://api.geser.id` → NestJS API

DNS A record kedua domain harus point ke IP server **sebelum** Caddy bisa
issue cert Let's Encrypt (ACME HTTP-01 challenge butuh port 80 reachable).

## Detail lengkap

[`SETUP.md`](./SETUP.md) — 9 step dari clone sampai live di internet.
