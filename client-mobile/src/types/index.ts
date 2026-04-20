// Backend cafe entity mapped to frontend
export interface Cafe {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  photos: string[];
  distance: number; // in km
  address: string;
  latitude: number;
  longitude: number;
  purposes: Purpose[];
  facilities: Facility[];
  menu: MenuCategory[];
  matchScore?: number;
  favoritesCount: number;
  bookmarksCount: number;
  wifiAvailable?: boolean;
  wifiSpeedMbps?: number;
  hasMushola?: boolean;
  priceRange?: '$' | '$$' | '$$$';
  promotionType?: 'A' | 'B';
  promoTitle?: string;
  promoDescription?: string;
  promoPhoto?: string;
  hasActivePromotion?: boolean;
  activePromotionType?: string;
  // Type B: Featured promo rich content
  promotionContent?: {
    title: string;
    description: string;
    validHours?: string;
    validDays?: string;
    promoPhoto?: string;
  };
  // Type A: New cafe rich content
  newCafeContent?: {
    openingSince: string;
    highlightText: string;
    keunggulan: string[];
    promoOffer?: string;
    promoPhoto?: string;
  };
  // Enriched from scraped Google Places data
  googleRating?: number | null;
  totalGoogleReviews?: number | null;
  googleMapsUrl?: string | null;
  website?: string | null;
  // Purpose scores from review analysis (slug → 0-100)
  purposeScores?: Record<string, number>;
  detectedFacilities?: string[];
}

export type Purpose = 'Me Time' | 'Date' | 'Family Time' | 'Group Study' | 'WFC';

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
  amenities?: Facility[];
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

export interface BackendPurpose {
  id: number;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder: number;
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
