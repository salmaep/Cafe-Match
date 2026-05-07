import type { Cafe } from '../types';

// Generic cafe-themed Unsplash placeholders for cafes that have no photos in DB.
// (Image-only fallback — not mock data; cafe info itself always comes from server.)
const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
  'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
  'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
  'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
  'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=800',
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
];

export function placeholderImage(cafeId: number): string {
  return FALLBACK_PHOTOS[cafeId % FALLBACK_PHOTOS.length];
}

/**
 * Pick the best photo URL for a cafe, falling back to a placeholder only when
 * no real photo is available.
 *
 * Photo data can arrive in three shapes depending on the endpoint:
 *   1. Meili search → `cafe.primaryPhotoUrl` (string) + `cafe.photos: string[]`
 *   2. DB join (shortlists / bookmarks / favorites / detail) → `cafe.photos: {url, isPrimary, displayOrder}[]`
 *   3. No photos at all → fall back to themed Unsplash placeholder.
 *
 * Among real URLs we prefer stable Google Places URLs (`/p/AF1Qip…`) over the
 * short-lived signed URLs (`gps-cs-s/…`) which expire frequently.
 */
function isUsablePhoto(url: string | undefined | null): url is string {
  if (typeof url !== 'string' || url.length === 0) return false;
  // Drop Unsplash stock photos — those came from scraper placeholders, not
  // real cafe photos. Real Google URLs (gps-cs-s/, grass-cs/, proxy/, p/...)
  // are kept; broken ones get swapped to a placeholder via <img onError>.
  if (url.includes('images.unsplash.com')) return false;
  return true;
}

export function getCafeImage(cafe: Cafe): string {
  // 1. Trust primaryPhotoUrl when it points to a real cafe photo.
  const primary = (cafe as any).primaryPhotoUrl as string | undefined;
  if (isUsablePhoto(primary)) return primary;

  // 2. Walk the photos array, normalising both string[] and {url}[] shapes.
  const rawPhotos = (cafe.photos ?? []) as Array<unknown>;
  const urls: { url: string; isPrimary: boolean }[] = [];
  for (const p of rawPhotos) {
    if (typeof p === 'string' && isUsablePhoto(p)) {
      urls.push({ url: p, isPrimary: false });
    } else if (
      p &&
      typeof p === 'object' &&
      isUsablePhoto((p as any).url)
    ) {
      urls.push({
        url: (p as any).url,
        isPrimary: Boolean((p as any).isPrimary),
      });
    }
  }
  if (urls.length === 0) return placeholderImage(cafe.id);

  // 3. Prefer stable Google Places photo URLs (p/AF1Qip...) over the rest.
  const stable = urls.find((p) => p.url.includes('/p/AF1Qip'));
  if (stable) return stable.url;

  const flagged = urls.find((p) => p.isPrimary);
  return (flagged || urls[0]).url;
}
