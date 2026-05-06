# Client-Mobile Cleanup TODO

Tracking file untuk perubahan dari refactor "server-first, no client filtering, no mock data" (2026-05-06).
Centang `[x]` setelah diverifikasi di production atau di-resolve.

## Removed mock / hardcoded fallback (potential regressions)

- [ ] **AuthContext offline mock removed** — `login()` & `register()` di [src/context/AuthContext.tsx](src/context/AuthContext.tsx) dulu bikin user palsu kalau backend unreachable. Sekarang return `{ success: false, error: 'Cannot reach server...' }`. **Watch:** kalau ada komplain "tidak bisa login saat offline" di staging/dev, ini sebabnya. Re-introduce hanya kalau perlu offline-demo mode.
- [ ] **OwnerDashboard MOCK_DASHBOARD removed** — [src/screens/owner/OwnerDashboardScreen.tsx](src/screens/owner/OwnerDashboardScreen.tsx) dulu kalau `/owner/dashboard` gagal, render data palsu (cafe "My Coffee House" + stats palsu). Sekarang render error state dengan tombol "Coba lagi". **Watch:** verifikasi endpoint `/owner/dashboard` selalu balikin shape lengkap untuk owner valid.
- [ ] **fetchPurposes() hardcoded fallback removed** — dulu kalau `/purposes` gagal balikin array hardcoded 5 purposes. Sekarang error propagate ke `usePurposes()`. **Watch:** kalau `/purposes` empty atau down, WizardScreen step 1 stuck di error state.
- [ ] **fetchBookmarks() / fetchOwnerPromotions() empty fallback removed** — dulu return `[]` on error (silent). Sekarang error propagate. **Watch:** screens harus handle error dengan benar (BookmarksScreen masih try/catch lokal — OK).

## New backend dependencies (verify before deploy)

- [ ] **Endpoint `/destinations`** baru — [server/src/destinations/](../server/src/destinations) + migration `1714100000000-AddDestinations.ts` + 4 baris seed (Dago, Tebet, Bandung, Jakarta Selatan). **Action:** `npm run migration:run` di server sebelum deploy. Tanpa ini, WizardScreen step 2 chip suggestion kosong.
- [ ] **Endpoint `/favorites?since=7d`** — server sekarang accept query param `since` (`Nd`, `Nh`, `Nm` format). FavoritesScreen kirim `?since=7d`. **Verify:** request tanpa param tetap balikin semua (backward compatible untuk kalau ada client lain).
- [ ] **Cafes search params dipakai client** — sebelumnya MapScreen abaikan `purposeId` & `facilities[]` walau server support. Sekarang MapScreen kirim filter ke server. **Verify:** server Meili index sudah punya `facilities` & `purposes` searchable + filterable (sudah, lihat `meili-cafes.service.ts:268-282`). Reindex kalau hasil tidak sesuai: `npm run meili:reindex`.

## Search behavior changes

- [ ] **`parseSearchQuery` (regex parser) dihapus** — file `src/utils/searchParser.ts` & `src/constant/search.ts` dihapus. Search bar sekarang kirim raw `q` ke Meilisearch. **Watch:** kalau user search "wifi mushola" dan tidak match, mungkin Meili index belum tokenize facility key dengan benar. Cek `meili.service.ts` searchableAttributes config — pastikan `facilities` ada di list. Reindex kalau perlu.
- [ ] **`LOCATION_KEYWORDS` dihapus** — search "kafe di Tebet" dulu auto-recenter map. Sekarang tidak. **Future:** implementasi geocoding server-side (`/destinations?q=tebet` atau `/geocode`) kalau diperlukan.
- [ ] **AI Search Popup chips parsed labels** dihilangkan — popup hanya tampilkan hasil cafes dari server (top 8), tanpa label parser di header.

## Architecture debt (intentional, address later)

- [ ] **Polling pakai `refetchInterval`** — [src/queries/checkins/use-active-checkin.ts](src/queries/checkins/use-active-checkin.ts) (60s) dan [src/queries/friends/use-friends-map.ts](src/queries/friends/use-friends-map.ts) (30s). **Bukan best practice** — boros bandwidth & battery, tidak realtime. **Future migration:** Socket.IO push events. Server sudah punya `gateway/events.module.ts` (NestJS WebSocket). Active check-in & friends map jadi push event (`checkin:created`, `friend:checked-in`), bukan poll.
- [ ] **MapScreen dual query** — sekarang ada 2 query Meilisearch parallel: `mapPinsQuery` (broad — pins) dan `listQuery` (filtered — drawer). 2x request ke server per render. **Evaluasi:** apakah UX OK kalau pins ngikut filter (cuma 1 query)? Kalau ya, gabungkan jadi satu query.
- [ ] **`DEV_DISABLE_RADIUS` removed** — flag dev yang skip radius filter sudah hilang. **Watch:** kalau perilaku radius server berbeda dari ekspektasi, debug di `_geoRadius` filter Meilisearch (`meili-cafes.service.ts:261`). **Jangan re-introduce client-side bypass.**
- [ ] **`fetchRecentFavorites` removed** — fungsi client-side filter 7-day di `services/api.ts` dihapus. Logic pindah ke server (`?since=7d`). Kalau ada caller lain yang masih panggil, sudah broken — tapi grep confirmed cuma FavoritesScreen.
- [ ] **PURPOSE_ID_MAP hardcoded** — [src/constant/purpose.ts](src/constant/purpose.ts) hardcode `Me Time → 1, Date → 2, ...`. Kalau backend reseed dengan ID berbeda, mapping pecah. **Future:** derive map dari `usePurposes()` data on the fly.

## Polling notes (read me before re-architecting)

Polling dipertahankan **sementara** karena Socket.IO belum di-wire ke client mobile. Server sudah punya gateway tapi belum ada client subscriber.

**Kapan migrasi:**
1. Tambah `socket.io-client` ke client-mobile.
2. Buat `useSocket()` hook di context yang konek dengan JWT dari AsyncStorage.
3. Server emit event `checkin:user:<userId>` saat user check-in/out → ganti `useActiveCheckin` jadi event subscriber.
4. Server emit event `friends:nearby:<userId>` saat teman check-in/out → ganti `useFriendsMap` jadi event subscriber.
5. Hapus `refetchInterval` di kedua hook.

**Pertimbangan:**
- Socket.IO di mobile (React Native) butuh handle background/foreground (auto-disconnect saat app background, reconnect saat foreground). Pakai `AppState` listener.
- JWT refresh — kalau token expire saat socket open, server harus disconnect & client harus reconnect dengan token baru.
- Friend pin update bisa burst (mis. teman gerak antar cafe) — debounce di client.

## Verification checklist before next release

- [ ] `npx tsc --noEmit` di `client-mobile/` dan `server/` bersih
- [ ] `npm run migration:run` di server (untuk `destinations` table)
- [ ] Manual smoke: Wizard load purposes + destinations dari API
- [ ] Manual smoke: MapScreen dengan filter purpose+amenity → request `/cafes?purposeId=...&facilities=...`
- [ ] Manual smoke: FavoritesScreen → request `/favorites?since=7d`
- [ ] Manual smoke: Login dengan backend down → harus error (bukan silent-success)
- [ ] EAS preview build: `eas build --profile preview --platform android` → install APK di device
