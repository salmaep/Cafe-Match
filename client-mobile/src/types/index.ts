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
