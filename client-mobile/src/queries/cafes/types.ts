// Mirror dari server SearchCafesDto + Meilisearch CafeDocument response.
// Sumber:
//   - server/src/cafes/dto/search-cafes.dto.ts
//   - server/src/meili/helpers/cafe-to-document.ts
//   - server/src/meili/meili-cafes.service.ts (CafeHit, CafeSearchResult)

export interface SearchCafesParams {
  q?: string;
  lat?: number;
  lng?: number;
  /** Meters. Server default 2000, max 50_000_000. */
  radius?: number;
  wifiAvailable?: boolean;
  hasMushola?: boolean;
  hasParking?: boolean;
  priceRange?: '$' | '$$' | '$$$';
  purposeId?: number;
  page?: number;
  limit?: number;
}

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

export type CafeHit = CafeDocument & {
  distanceMeters?: number;
  distance?: number;
};

export interface CafeSearchMeta {
  page: number;
  limit: number;
  total: number;
}

export interface CafeSearchResult {
  data: CafeHit[];
  meta: CafeSearchMeta;
}
