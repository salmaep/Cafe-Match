// Rich facility row from backend (DB shape).
export interface CafeFacilityRich {
  id?: number;
  facilityKey: string;
  facilityValue: string | null;
}

// Backend cafe entity mapped to frontend
export interface Cafe {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  photos: string[];
  primaryPhotoUrl?: string | null;
  distance: number; // in km — derived for compatibility
  distanceMeters?: number; // raw — preferred for display
  address: string;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  latitude: number;
  longitude: number;
  purposes: Purpose[];
  // Legacy label list, preserved for swipe screen / wizard.
  facilities: Facility[];
  // Rich facility list (key + value) from backend — used by buildFacilityChips.
  facilitiesRich?: CafeFacilityRich[];
  facilityValues?: string[];
  menu: MenuCategory[];
  matchScore?: number;
  favoritesCount: number;
  bookmarksCount: number;
  wifiAvailable?: boolean;
  wifiSpeedMbps?: number | null;
  hasMushola?: boolean;
  hasParking?: boolean;
  openingHours?: Record<string, string> | null;
  priceRange?: string;
  promotionType?: 'A' | 'B';
  promoTitle?: string;
  promoDescription?: string;
  promoPhoto?: string;
  hasActivePromotion?: boolean;
  activePromotionType?: 'new_cafe' | 'featured_promo' | string | null;
  promotionContent?: {
    title: string;
    description: string;
    validHours?: string;
    validDays?: string;
    promoPhoto?: string;
  };
  newCafeContent?: {
    openingSince: string;
    highlightText: string;
    keunggulan: string[];
    promoOffer?: string;
    promoPhoto?: string;
  };
  googleRating?: number | null;
  totalGoogleReviews?: number | null;
  googleMapsUrl?: string | null;
  googlePlaceId?: string | null;
  website?: string | null;
  purposeScores?: Record<string, number>;
  detectedFacilities?: string[];
  // Top review summary (server-prepared via meili-cafes service).
  topReviewText?: string | null;
  topReviewAuthor?: string | null;
  topReviewRating?: number | null;
  topReviewAt?: number | null;
}

export type Purpose =
  | 'Me Time' | 'Date' | 'Family Time' | 'Group Study' | 'WFC'
  | 'Meeting' | 'Brainstorm' | 'Catch Up' | 'Reading' | 'Quick Coffee'
  | 'Celebration' | 'Photo Spot';

export type Facility =
  | 'WiFi'
  | 'Power Outlet'
  | 'Mushola'
  | 'Parking'
  | 'Kid-Friendly'
  | 'Quiet Atmosphere'
  | 'Large Tables'
  | 'Outdoor Area';

export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  isAvailable?: boolean;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface WizardPreferences {
  purpose?: Purpose;
  location?: {
    type: 'current' | 'custom';
    latitude: number;
    longitude: number;
    label?: string;
  };
  radius?: number; // in km
  // Server facility keys (e.g., "wifi", "power_outlet") sourced from
  // `/cafes/filters`. Stored as keys (not labels) so they can be sent
  // straight to the search endpoint.
  amenities?: string[];
  priceRange?: string; // '$' | '$$' | '$$$'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'owner' | 'admin';
  friendCode?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface OwnerDashboard {
  hasCafe: boolean;
  cafe: {
    id: number;
    name: string;
    bookmarksCount: number;
    favoritesCount: number;
  } | null;
  analytics: {
    totalViews: number;
    totalClicks: number;
  };
  activePromotion: {
    id: number;
    type: string;
    packageName: string;
    expiresAt: string;
    daysRemaining: number;
    status: string;
  } | null;
  pendingCount: number;
}

export interface CafeFeature {
  id: number;
  name: string;
  category?: string;
  icon?: string;
}

export interface PurposeRequirement {
  featureId: number;
  feature: CafeFeature;
  isMandatory: boolean;
  weight: number;
}

export interface BackendPurpose {
  id: number;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  requirements?: PurposeRequirement[];
}

// ── Social Feature Types ──────────────────────────────────────────────

export interface Review {
  id: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  cafeId: string;
  text?: string;
  ratings: { category: string; score: number }[];
  media?: { id: number; mediaType: 'photo' | 'video'; url: string; displayOrder: number }[];
  createdAt: string;
}

export interface ReviewSummary {
  category: string;
  avgScore: number;
  count: number;
}

export interface CheckinData {
  id: string;
  cafeId: string;
  cafeName?: string;
  checkInAt: string;
  checkOutAt?: string;
  durationMinutes?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatarUrl?: string;
  checkinCount: number;
  totalDuration: string;
  totalMinutes: number;
  score: number;
  badge: string | null;
}

export interface StreakInfo {
  current: number;
  longest: number;
  active: boolean;
  lastCheckinDate?: string;
}

export interface Friend {
  id: number;
  name: string;
  avatarUrl?: string;
  friendCode: string;
  currentCafe?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  };
  checkInAt?: string;
}

export interface FriendRequest {
  id: number;
  senderId: number;
  sender: { id: number; name: string; avatarUrl?: string };
  status: string;
  createdAt: string;
}

export interface AchievementDef {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  threshold: number;
  purposeSlug?: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface RecapData {
  yearTitle: string;
  totalCheckins: number;
  totalCafesVisited: number;
  totalDurationHours: number;
  topCafes: { cafeId: string; name: string; photo?: string; visits: number }[];
  topPurpose: string;
  totalReviews: number;
  achievementsUnlocked: number;
  friendsMade: number;
  longestStreak: number;
  favoriteDay: string;
  averageSessionMinutes: number;
}
