# Cafe-Match — Server Deployment

Lihat [SETUP.md](./SETUP.md) untuk panduan **step-by-step lengkap**.

## Architecture

```
Internet
  │
  ▼ (443)
┌────────────────────────────┐
│ Traefik (K8s)              │  TLS via cert-manager + Let's Encrypt
│  Ingress → Service         │
│  Service → Endpoints       │
│  Endpoints → host IP       │
└──────────────┬─────────────┘
               │ HTTP
               ▼
┌────────────────────────────────────┐
│ Docker host (e.g. 192.168.88.184)  │
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
cd /opt/Cafe-Match
docker compose --env-file server/.env up -d --build
docker compose --env-file server/.env exec app npm run migration:run

# Apply / update K8s routing
kubectl apply -f /home/dios/kube-config/cafe-match.yaml
kubectl apply -f /home/dios/kube-config/cafe-match-cert.yaml
kubectl get certificate -w
```

## Files in `deploy/kube/`

| File | Berisi |
|---|---|
| `cafe-match.yaml` | Service + Endpoints (web:3083, api:3084) → host IP |
| `cafe-match-cert.yaml` | Ingress + cert-manager annotation untuk auto Let's Encrypt |

## Domains

- `https://salma.imola.ai` → web client
- `https://api.salma.imola.ai` → NestJS API

DNS A record kedua domain harus point ke Traefik public IP **sebelum** apply `cafe-match-cert.yaml` (cert-manager butuh resolve domain untuk ACME HTTP-01 challenge).

## Detail lengkap

[`SETUP.md`](./SETUP.md) — 9 step dari clone sampai live di internet.
