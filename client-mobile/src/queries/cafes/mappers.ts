import { Cafe } from '../../types';
import { FACILITY_KEY_MAP } from '../../constant/ui/facility-key-map';

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return (
    Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
  );
}

export function mapBackendCafe(
  raw: any,
  userLat?: number,
  userLng?: number,
): Cafe {
  const photos: string[] = raw.photos?.length
    ? raw.photos
        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
        .map((p: any) => p.url)
    : ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'];

  const rawFacilityLabels: string[] =
    raw.facilities
      ?.map((f: any) => {
        const key = typeof f === 'string' ? f : f.facilityKey;
        if (!key) return null;
        return (
          FACILITY_KEY_MAP[key] ||
          key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
        );
      })
      .filter(Boolean) || [];

  const facilities: string[] = Array.from(new Set(rawFacilityLabels));

  const menuMap = new Map<
    string,
    { name: string; price: number; description?: string }[]
  >();
  if (raw.menus) {
    for (const item of raw.menus) {
      if (!item.isAvailable && item.isAvailable !== undefined) continue;
      const list = menuMap.get(item.category) || [];
      list.push({
        name: item.itemName,
        price: Number(item.price),
        description: item.description,
      });
      menuMap.set(item.category, list);
    }
  }
  const menu = Array.from(menuMap.entries()).map(([category, items]) => ({
    category,
    items,
  }));

  let distance = 0;
  if (raw.distanceMeters != null) {
    distance = Math.round(raw.distanceMeters / 100) / 10;
  } else if (userLat != null && userLng != null) {
    distance = haversineKm(
      userLat,
      userLng,
      Number(raw.latitude),
      Number(raw.longitude),
    );
  }

  let promotionType: 'A' | 'B' | undefined;
  let promoTitle: string | undefined;
  let promoDescription: string | undefined;
  let promoPhoto: string | undefined;
  if (raw.hasActivePromotion) {
    if (raw.activePromotionType === 'new_cafe') {
      promotionType = 'A';
    } else if (raw.activePromotionType === 'featured_promo') {
      promotionType = 'B';
      promoTitle =
        raw.promotion?.contentTitle ||
        raw.promotionContent?.title ||
        raw.promoTitle;
      promoDescription =
        raw.promotion?.contentDescription ||
        raw.promotionContent?.description ||
        raw.promoDescription;
      promoPhoto =
        raw.promotion?.contentPhotoUrl ||
        raw.promotionContent?.photoUrl ||
        raw.promoPhoto;
    }
  }

  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    photos,
    distance,
    address: raw.address || '',
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    purposes: raw.purposes || [],
    facilities: facilities as any[],
    menu,
    matchScore: raw.matchScore,
    favoritesCount: raw.favoritesCount || 0,
    bookmarksCount: raw.bookmarksCount || 0,
    wifiAvailable: raw.wifiAvailable,
    wifiSpeedMbps: raw.wifiSpeedMbps,
    hasMushola: raw.hasMushola,
    priceRange: raw.priceRange,
    promotionType,
    promoTitle,
    promoDescription,
    promoPhoto,
    hasActivePromotion: raw.hasActivePromotion,
    activePromotionType: raw.activePromotionType,
    googleRating: raw.googleRating ?? null,
    totalGoogleReviews: raw.totalGoogleReviews ?? null,
    googleMapsUrl: raw.googleMapsUrl ?? null,
    website: raw.website ?? null,
    purposeScores: raw.purposeScores || {},
    detectedFacilities: raw.detectedFacilities || [],
  } as any;
}
