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
  // Photos arrive in two shapes: rich `{url, displayOrder}[]` from DB or plain
  // `string[]` from Meili. Normalize to string[]; preserve order if rich.
  let photos: string[] = [];
  if (Array.isArray(raw.photos) && raw.photos.length > 0) {
    if (typeof raw.photos[0] === 'string') {
      photos = raw.photos as string[];
    } else {
      photos = [...raw.photos]
        .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .map((p: any) => p.url)
        .filter(Boolean);
    }
  }
  if (photos.length === 0 && raw.primaryPhotoUrl) {
    photos = [raw.primaryPhotoUrl];
  }
  if (photos.length === 0) {
    photos = ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'];
  }

  // raw.facilities arrives in two shapes:
  //   - From Meilisearch: string[] of feature names (cafe_features.name)
  //   - From DB relation: { name, category }[] of CafeFeature rows
  const rawFeatureNames: string[] = Array.isArray(raw.facilities)
    ? raw.facilities
        .map((f: any) => (typeof f === 'string' ? f : f?.name))
        .filter((n: any): n is string => typeof n === 'string' && n.length > 0)
    : [];

  const facilityLabels: string[] = rawFeatureNames.map(
    (n) =>
      FACILITY_KEY_MAP[n] ||
      n.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
  );

  const facilities: string[] = Array.from(new Set(facilityLabels));

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

  // Keep raw features (rich shape with name + category) for buildFacilityChips.
  const facilitiesRich = Array.isArray(raw.facilities)
    ? raw.facilities
        .map((f: any) => {
          if (typeof f === 'string') return { name: f, category: null };
          if (f?.name) return { name: f.name, category: f.category ?? null };
          return null;
        })
        .filter(Boolean)
    : [];

  const featureCategories: string[] = Array.isArray(raw.featureCategories)
    ? raw.featureCategories.filter((c: any): c is string => typeof c === 'string')
    : [];

  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    photos,
    primaryPhotoUrl: raw.primaryPhotoUrl ?? null,
    distance,
    distanceMeters: raw.distanceMeters ?? (distance != null ? Math.round(distance * 1000) : undefined),
    address: raw.address || '',
    city: raw.city ?? null,
    district: raw.district ?? null,
    phone: raw.phone ?? null,
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    purposes: raw.purposes || [],
    facilities: facilities as any[],
    featureNames: rawFeatureNames,
    featureCategories,
    facilitiesRich,
    menu,
    matchScore: raw.matchScore,
    favoritesCount: raw.favoritesCount || 0,
    bookmarksCount: raw.bookmarksCount || 0,
    openingHours: raw.openingHours ?? null,
    priceRange: raw.priceRange,
    promotionType,
    promoTitle,
    promoDescription,
    promoPhoto,
    hasActivePromotion: raw.hasActivePromotion,
    activePromotionType: raw.activePromotionType ?? null,
    googleRating: raw.googleRating ?? null,
    totalGoogleReviews: raw.totalGoogleReviews ?? null,
    googleMapsUrl: raw.googleMapsUrl ?? null,
    googlePlaceId: raw.googlePlaceId ?? null,
    website: raw.website ?? null,
    purposeScores: raw.purposeScores || {},
    detectedFacilities: raw.detectedFacilities || [],
    topReviewText: raw.topReviewText ?? null,
    topReviewAuthor: raw.topReviewAuthor ?? null,
    topReviewRating: raw.topReviewRating ?? null,
    topReviewAt: raw.topReviewAt ?? null,
  } as any;
}
