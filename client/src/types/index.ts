export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Cafe {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  wifiAvailable: boolean;
  wifiSpeedMbps: number | null;
  hasMushola: boolean;
  openingHours: Record<string, string> | null;
  priceRange: string;
  bookmarksCount: number;
  favoritesCount: number;
  ownerId?: number;
  hasActivePromotion?: boolean;
  activePromotionType?: 'new_cafe' | 'featured_promo' | null;
  distanceMeters?: number;
  matchScore?: number;
  facilities?: CafeFacility[];
  menus?: CafeMenu[];
  photos?: CafePhoto[];
}

export interface CafeFacility {
  id: number;
  facilityKey: string;
  facilityValue: string | null;
}

export interface CafeMenu {
  id: number;
  category: string;
  itemName: string;
  price: number;
  description: string | null;
  isAvailable: boolean;
}

export interface CafePhoto {
  id: number;
  url: string;
  source: string;
  caption: string | null;
  isPrimary: boolean;
}

export interface Purpose {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  requirements: PurposeRequirement[];
}

export interface PurposeRequirement {
  id: number;
  facilityKey: string;
  isMandatory: boolean;
  weight: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Bookmark {
  id: number;
  cafeId: number;
  createdAt: string;
  cafe: Cafe;
}

export interface Favorite {
  id: number;
  cafeId: number;
  createdAt: string;
  cafe: Cafe;
}

export interface VoteTally {
  purposeId: number;
  count: number;
}
