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
}

export function toCafeDocument(raw: {
  cafe: Record<string, any>;
  facilities: { facilityKey: string; facilityValue: string | null }[];
  photos: { url: string; isPrimary: boolean; displayOrder: number }[];
  menus: { itemName: string }[];
  purposeSlugs: string[];
}): CafeDocument {
  const { cafe, facilities, photos, menus, purposeSlugs } = raw;
  const { city, district } = parseAddressParts(cafe.address || '');

  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0] ?? null;
  const photoUrls = [...photos]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 5)
    .map((p) => p.url);

  const googleMapsUrl =
    cafe.googleMapsUrl ||
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
    wifiAvailable: Boolean(cafe.wifiAvailable),
    wifiSpeedMbps: cafe.wifiSpeedMbps ?? null,
    hasMushola: Boolean(cafe.hasMushola),
    hasParking: Boolean(cafe.hasParking),
    hasActivePromotion: Boolean(cafe.hasActivePromotion),
    isActive: Boolean(cafe.isActive),
    priceRange: cafe.priceRange ?? '$$',
    activePromotionType: cafe.activePromotionType ?? null,
    googleRating: cafe.googleRating != null ? Number(cafe.googleRating) : null,
    totalGoogleReviews: cafe.totalGoogleReviews ?? 0,
    bookmarksCount: cafe.bookmarksCount ?? 0,
    favoritesCount: cafe.favoritesCount ?? 0,
    createdAt: cafe.createdAt ? new Date(cafe.createdAt).getTime() : Date.now(),
    facilities: facilities.map((f) => f.facilityKey),
    facilityValues: facilities.map((f) => f.facilityValue).filter(Boolean) as string[],
    menuItems: menus.slice(0, 20).map((m) => m.itemName),
    purposes: purposeSlugs,
    primaryPhotoUrl: primaryPhoto?.url ?? null,
    photos: photoUrls,
    googleMapsUrl,
    openingHours: cafe.openingHours ?? null,
  };
}
