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

export function getCafeImage(cafe: Cafe): string {
  if (!cafe.photos || cafe.photos.length === 0) return placeholderImage(cafe.id);
  // Prefer stable Google Places photo URLs (p/AF1Qip...) over unstable signed URLs (gps-cs-s/...)
  const stable = cafe.photos.find((p) => p.url.includes('/p/AF1Qip'));
  if (stable) return stable.url;
  const primary = cafe.photos.find((p) => p.isPrimary);
  return (primary || cafe.photos[0]).url;
}
