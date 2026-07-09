# CLAUDE.md — Cafe-Match (Geser)

Aplikasi discovery + social check-in kafe (data area Bandung). Brand produk: **Geser** (rebrand dari CafeMatch, 2026-06). Web live di **https://geser.id** (API: https://api.geser.id). Domain lama `salma.imola.ai` masih aktif (dual-domain). Rebrand mobile + rename internal (db/container/repo) DITUNDA — nama internal masih `cafematch`/`cafe-match`.

> Deploy, server, SSH, dan credential: lihat **`deploy.md`** di root (lokal, di-gitignore — repo ini PUBLIC).

## Struktur repo

BUKAN monorepo workspace — 4 folder independen, masing-masing `npm install` + lockfile sendiri. Root `package.json` cuma placeholder (`app.json`/`eas.json` root juga leftover Expo; yang aktif punya `client-mobile/`).

| Folder | Peran | Stack |
|---|---|---|
| `server/` | REST + WebSocket API | NestJS 11, TypeORM 0.3, MySQL 8.4, Meilisearch v1.42, Socket.io, nestjs-pino |
| `client/` | Web app (user + owner) | React 19, Vite 8, Tailwind 4, react-router v7; prod = nginx container |
| `client-mobile/` | Mobile app | Expo SDK 54, RN 0.81 (dev-client, BUKAN Expo Go), TanStack Query |
| `shared/` | Constants + i18n lintas client | TS source-only, tanpa build step |
| `deploy/` | K8s manifests + docs lama (sebagian usang) | — |

`shared/` dikonsumsi via alias `@shared`: Vite (`client/vite.config.ts`) dan babel module-resolver (mobile). Di-bundle saat build — makanya build context Docker client = repo root (supaya bisa `COPY shared/`).

## Dev di mesin ini (Windows)

⚠️ **Pakai `podman`, bukan `docker`** (docker CLI tidak ada di laptop ini).

```powershell
# 1. Infra dev (MySQL + Meili) — container sudah ada, tinggal start
podman start cafematch-mysql-dev cafematch-meili-dev
podman inspect --format '{{.State.Health.Status}}' cafematch-mysql-dev   # tunggu "healthy"

# 2. Server (host, bukan container)
cd server && npm run start:dev          # port 3084, prefix /api/v1

# 3. Web client
cd client && npm run dev                # port 3083, proxy /api & /sitemap.xml → :3084

# 4. Mobile
cd client-mobile && npm run android     # expo run:android (dev-client)
```

⚠️ **Port gotcha:** container existing `cafematch-mysql-dev` publish **3306:3306**, walaupun `docker-compose.dev.yml` menulis `3307:3306`. `server/.env` (DB_PORT=3306, user `cafematch`/`cafematch_pass`, db `cafematch`) sudah cocok — **JANGAN ganti ke 3307**. Meili dev: port 7700, master key `dev-master-key`.

Query cepat DB dev:
```powershell
podman exec cafematch-mysql-dev mysql -ucafematch -pcafematch_pass cafematch -e "..."
```

## Command penting (semua dari folder `server/` kecuali disebut lain)

| Tujuan | Command |
|---|---|
| Migration dev (ts-node) | `npm run migration:run` / `migration:generate` / `migration:revert` |
| Migration prod (dari dist, dipakai CI) | `npm run migration:run:prod` |
| Seed | `npm run seed`, `npm run seed:promotions` |
| Meili reindex penuh | `npm run meili:reindex` (prod: `node dist/meili/cli/reindex.js` di dalam container app) |
| Test (hanya server yang punya) | `npm run test`, `npm run test:e2e` |
| Lint | `npm run lint` (server & client) |
| Typecheck | TIDAK ada script khusus — server via `npm run build` (nest build), client via `npm run build` (`tsc -b`) |

## Arsitektur & konsep domain

- **API**: prefix global `/api/v1` (kecuali `/sitemap.xml` + `/robots.txt`); static upload di `/api/v1/storage`; global `JwtAuthGuard` + `RolesGuard` + `ValidationPipe` (whitelist+transform) — endpoint public butuh decorator public. CORS allowlist di `server/src/main.ts` (localhost:3083/5173, geser.id, salma.imola.ai, `*.expo.dev`, `192.168.*`).
- **Auth**: JWT (localStorage di web, `Authorization: Bearer`) + bcrypt. Login password digate **email-OTP 2FA** (nodemailer + Gmail OAuth2, modul `otp/` + `mailer/`; toggle `LOGIN_OTP_ENABLED`). Google social login skip OTP. Web OAuth via `/auth/google|facebook/callback`; **mobile native** langsung expo-auth-session → `POST /auth/google/idtoken` & `/auth/facebook/token` (tanpa proxy server). Tombol login FB disembunyikan di UI (route server masih ada). 2 role: user & **cafe owner** (register/login/dashboard terpisah, `pages/owner/`).
- **Check-in**: digate GPS radius `CHECKIN_RADIUS_METERS` (default 500 m, server) — `VITE_CHECKIN_RADIUS_METERS` di client harus sama supaya copy UI cocok. Dev bypass: `CHECKIN_SKIP_GPS=true`.
- **Tables (Open/Join Table)**: meetup sosial di kafe; auto-expire `TABLE_MAX_DURATION_HOURS` (default 8), gender rules (`TABLE_GENDER_RULES_ENABLED`).
- **Gamification**: achievements + points ledger + leaderboard, friends, recaps.
- **Search**: Meilisearch index `cafes`, sync dari MySQL (toggle `MEILI_SYNC_ENABLED`; emergency MySQL-only mode = set false). Modul `meili/` + CLI reindex/resync-failed.
- **Scraper ingestion**: `POST /sync/cafes` + `/admin/meili/*` digate header `x-api-key` = **`ADMIN_API_KEY`** (dok lama SETUP.md menyebut `SCRAPER_API_KEY` — itu usang).
- **Payments**: Midtrans (server key only; owner promotions).
- **Real-time**: Socket.io gateway `server/src/gateway/events.gateway.ts` (notifications/tables).
- **DB**: entities per modul; ~30 migration di `server/src/database/migrations/` (sebagian sekaligus seed data); data-source `server/src/database/data-source.ts`.
- **Maps**: web `@vis.gl/react-google-maps` + `@googlemaps/markerclusterer` (JS API); mobile `react-native-maps` + `react-native-map-clustering` (native). Beda library memang disengaja (beda platform).
- **i18n**: `shared/i18n/` typed keys, locale `id` saja; i18next di web + mobile.
- **Logging**: nestjs-pino, secrets di-redact.

## Env files

Tidak ada root `.env` di repo (di server prod ada symlink `.env -> server/.env` untuk compose interpolation).

| File | Dibaca kapan | Catatan |
|---|---|---|
| `server/.env` | Runtime NestJS + compose interpolation | **Source of truth. JANGAN commit.** Template: `server/.env.example` |
| `client/.env` | Build-time Vite | Semua `VITE_*` PUBLIC (ke-bake ke bundle). Ubah nilai = wajib rebuild client |
| `client-mobile/.env` | Build-time Metro | `EXPO_PUBLIC_*` public |

## Branch & deploy (ringkas — detail + credential di `deploy.md`)

- `dev` = kerja harian → `main` = auto-deploy **dios** (server lama, `/opt/Cafe-Match`, port 3083/3084) → `prod` = auto-deploy **geser** (PROD AKTIF geser.id, `/var/www/geser`, port 5083/5084).
- `.github/workflows/deploy.yml` **beda isi per branch** (satu path file, dua varian): main pakai secrets `VPS_*`, prod pakai `VPS_PROD_*` + `VITE_PROD_API_URL`.
- CI TIDAK punya gate test/lint — quality gate cuma lokal.

## Gotcha teknis terverifikasi

- `nest build` lokal bisa gagal di `uploads.controller.ts` (`Express.Multer`) karena `@types/multer` belum terinstall lokal — di Docker/CI `npm ci` aman.
- Compose prod: `app` & `client` build dengan `network: host` (bridge NAT hang saat `npm ci`); Dockerfile server set `--dns-result-order=ipv4first`.
- Dev MySQL container-baru via compose = port **3307**; container existing di mesin ini = **3306** (lihat atas).
- `.claude/settings.json` `additionalDirectories` masih menunjuk path lama `Desktop\Cafe Match\...` — repo sudah pindah ke `Dev\Cafe-Match`.
- `deploy/README.md` + `deploy/SETUP.md` = dokumentasi server LAMA (dios/salma.imola.ai, k8s Traefik) dan sebagian klaimnya usang (mis. "CI backup DB" — step itu tidak ada di workflow).
- MapScreen mobile pernah lag berat (timer dead check-in + marker tak ter-memoize) — sudah difix di `client-mobile/src/screens/map/MapScreen.tsx`; jangan reintroduce object literal `coordinate={{...}}` inline di marker.
