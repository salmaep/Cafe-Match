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
  featureCategories: string[];
  menuItems: string[];
  purposes: string[];
  primaryPhotoUrl: string | null;
  photos: string[];
  googleMapsUrl: string;
  openingHours: Record<string, any> | null;
  topReviewText: string | null;
  topReviewAuthor: string | null;
  topReviewRating: number | null;
  topReviewAt: number | null;
}

export function toCafeDocument(raw: {
  cafe: Record<string, any>;
  features: { name: string; category: string | null }[];
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
  const { cafe, features, photos, menus, purposeSlugs, topReview } = raw;
  const { city, district } = parseAddressParts(cafe.address || '');

  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0] ?? null;
  const photoUrls = [...photos]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 5)
    .map((p) => p.url);

  const featureNames = features.map((f) => f.name);
  const categoriesSet = new Set<string>();
  for (const f of features) {
    if (f.category) categoriesSet.add(f.category);
  }

  const googleMapsUrl =
    cafe.googleMapsUrl ??
    cafe.google_maps_url ??
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
    hasActivePromotion: Boolean(
      cafe.hasActivePromotion ?? cafe.has_active_promotion,
    ),
    isActive: Boolean(cafe.isActive ?? cafe.is_active),
    priceRange: cafe.priceRange ?? cafe.price_range ?? '$$',
    activePromotionType:
      cafe.activePromotionType ?? cafe.active_promotion_type ?? null,
    googleRating:
      (cafe.googleRating ?? cafe.google_rating) != null
        ? Number(cafe.googleRating ?? cafe.google_rating)
        : null,
    totalGoogleReviews:
      cafe.totalGoogleReviews ?? cafe.total_google_reviews ?? 0,
    bookmarksCount: cafe.bookmarksCount ?? cafe.bookmarks_count ?? 0,
    favoritesCount: cafe.favoritesCount ?? cafe.favorites_count ?? 0,
    createdAt:
      (cafe.createdAt ?? cafe.created_at)
        ? new Date(cafe.createdAt ?? cafe.created_at).getTime()
        : Date.now(),
    facilities: featureNames,
    featureCategories: Array.from(categoriesSet),
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
