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

export function placeholderImage(cafeId: string | number): string {
  const idNum = typeof cafeId === 'number' ? cafeId : parseInt(cafeId, 10) || 0;
  return FALLBACK_PHOTOS[Math.abs(idNum) % FALLBACK_PHOTOS.length];
}

function isUsablePhoto(url: string | undefined | null): url is string {
  if (typeof url !== 'string' || url.length === 0) return false;
  if (url.includes('images.unsplash.com')) return false;
  return true;
}

export function getCafeImage(cafe: {
  id: string | number;
  primaryPhotoUrl?: string | null;
  photos?: Array<string | { url: string; isPrimary?: boolean }>;
}): string {
  if (isUsablePhoto(cafe.primaryPhotoUrl ?? undefined)) {
    return cafe.primaryPhotoUrl as string;
  }
  const rawPhotos = cafe.photos ?? [];
  const urls: { url: string; isPrimary: boolean }[] = [];
  for (const p of rawPhotos) {
    if (typeof p === 'string' && isUsablePhoto(p)) {
      urls.push({ url: p, isPrimary: false });
    } else if (p && typeof p === 'object' && isUsablePhoto((p as any).url)) {
      urls.push({
        url: (p as any).url,
        isPrimary: Boolean((p as any).isPrimary),
      });
    }
  }
  if (urls.length === 0) return placeholderImage(cafe.id);
  const stable = urls.find((p) => p.url.includes('/p/AF1Qip'));
  if (stable) return stable.url;
  const flagged = urls.find((p) => p.isPrimary);
  return (flagged || urls[0]).url;
}
