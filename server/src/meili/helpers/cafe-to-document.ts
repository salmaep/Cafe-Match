import { parseAddressParts } from './address-parser';

export interface CafeDocument {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  _geo: { lat: number; lng: number };
  wifiAvailable: boolean;
  hasMushola: boolean;
  hasParking: boolean;
  hasActivePromotion: boolean;
  isActive: boolean;
  priceRange: string;
  activePromotionType: string | null;
  googleRating: number | null;
  totalGoogleReviews: number;
  bookmarksCount: number;
  favoritesCount: number;
  createdAt: number;
  facilities: string[];
  facilityValues: string[];
  menuItems: string[];
  purposes: string[];
  primaryPhotoUrl: string | null;
  photos: string[];
  googleMapsUrl: string;
  openingHours: Record<string, any> | null;
  wifiSpeedMbps: number | null;
  topReviewText: string | null;
  topReviewAuthor: string | null;
  topReviewRating: number | null;
  topReviewAt: number | null;
}

export function toCafeDocument(raw: {
  cafe: Record<string, any>;
  facilities: { facilityKey: string; facilityValue: string | null }[];
  photos: { url: string; isPrimary: boolean; displayOrder: number }[];
  menus: { itemName: string }[];
  purposeSlugs: string[];
  topReview?: {
    text: string | null;
    authorName: string | null;
    overallScore: number | null;
    createdAt: Date | string | number | null;
  } | null;
}): CafeDocument {
  const { cafe, facilities, photos, menus, purposeSlugs, topReview } = raw;
  const { city, district } = parseAddressParts(cafe.address || '');

  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0] ?? null;
  const photoUrls = [...photos]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 5)
    .map((p) => p.url);

  // Synthesize facility keys from boolean columns so the filter facet counts
  // match what users actually see in the list. A cafe with wifi_available=true
  // but no cafe_facilities row would otherwise be invisible to facet counts.
  const facilityKeySet = new Set<string>(facilities.map((f) => f.facilityKey));
  if (Boolean(cafe.wifiAvailable ?? cafe.wifi_available)) facilityKeySet.add('strong_wifi');
  if (Boolean(cafe.hasMushola ?? cafe.has_mushola)) facilityKeySet.add('mushola');
  if (Boolean(cafe.hasParking ?? cafe.has_parking)) facilityKeySet.add('parking');

  const googleMapsUrl =
    cafe.googleMapsUrl ?? cafe.google_maps_url ??
    `https://maps.google.com/?q=${cafe.latitude},${cafe.longitude}`;

  return {
    id: cafe.id,
    name: cafe.name,
    slug: cafe.slug,
    description: cafe.description ?? null,
    address: cafe.address,
    city,
    district,
    phone: cafe.phone ?? null,
    _geo: {
      lat: Number(cafe.latitude),
      lng: Number(cafe.longitude),
    },
    wifiAvailable: Boolean(cafe.wifiAvailable ?? cafe.wifi_available),
    wifiSpeedMbps: (cafe.wifiSpeedMbps ?? cafe.wifi_speed_mbps) ?? null,
    hasMushola: Boolean(cafe.hasMushola ?? cafe.has_mushola),
    hasParking: Boolean(cafe.hasParking ?? cafe.has_parking),
    hasActivePromotion: Boolean(cafe.hasActivePromotion ?? cafe.has_active_promotion),
    isActive: Boolean(cafe.isActive ?? cafe.is_active),
    priceRange: (cafe.priceRange ?? cafe.price_range) ?? '$$',
    activePromotionType: (cafe.activePromotionType ?? cafe.active_promotion_type) ?? null,
    googleRating: (cafe.googleRating ?? cafe.google_rating) != null ? Number(cafe.googleRating ?? cafe.google_rating) : null,
    totalGoogleReviews: (cafe.totalGoogleReviews ?? cafe.total_google_reviews) ?? 0,
    bookmarksCount: (cafe.bookmarksCount ?? cafe.bookmarks_count) ?? 0,
    favoritesCount: (cafe.favoritesCount ?? cafe.favorites_count) ?? 0,
    createdAt: cafe.createdAt ?? cafe.created_at ? new Date(cafe.createdAt ?? cafe.created_at).getTime() : Date.now(),
    facilities: Array.from(facilityKeySet),
    facilityValues: facilities.map((f) => f.facilityValue).filter(Boolean) as string[],
    menuItems: menus.slice(0, 20).map((m) => m.itemName),
    purposes: purposeSlugs,
    primaryPhotoUrl: primaryPhoto?.url ?? null,
    photos: photoUrls,
    googleMapsUrl,
    openingHours: cafe.openingHours ?? cafe.opening_hours ?? null,
    topReviewText: truncateSnippet(topReview?.text),
    topReviewAuthor: topReview?.authorName ?? null,
    topReviewRating: topReview?.overallScore ?? null,
    topReviewAt: topReview?.createdAt
      ? new Date(topReview.createdAt as any).getTime()
      : null,
  };
}

const SNIPPET_MAX = 180;
function truncateSnippet(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.length <= SNIPPET_MAX) return cleaned;
  return cleaned.slice(0, SNIPPET_MAX - 1).trimEnd() + '…';
}
