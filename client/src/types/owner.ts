import type { Cafe } from './index';

export interface AdvertisementPackage {
  id: number;
  name: string;
  slug: string;
  priceMonthly: number;
  priceAnnual: number;
  monthlySlots: number;
  annualReservedSlots: number;
  sessionFrequency: string;
  displayOrder: number;
  benefits: string[];
  isActive: boolean;
}

export type PromotionType = 'new_cafe' | 'featured_promo';
export type PromotionStatus = 'pending_payment' | 'pending_review' | 'active' | 'rejected' | 'expired';
export type BillingCycle = 'monthly' | 'annual';

export interface Promotion {
  id: number;
  cafeId: number;
  packageId: number;
  type: PromotionType;
  billingCycle: BillingCycle;
  status: PromotionStatus;
  rejectionReason: string | null;
  contentTitle: string | null;
  contentDescription: string | null;
  contentPhotoUrl: string | null;
  highlightedFacilities: string[] | null;
  startedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  package?: AdvertisementPackage;
  cafe?: Cafe;
}

export interface Transaction {
  id: number;
  promotionId: number;
  userId: number;
  midtransOrderId: string;
  midtransSnapToken: string | null;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paidAt: string | null;
  createdAt: string;
  promotion?: Promotion;
}

export interface OwnerDashboard {
  hasCafe: boolean;
  cafe?: {
    id: number;
    name: string;
    bookmarksCount: number;
    favoritesCount: number;
  };
  analytics?: {
    totalViews: number;
    totalClicks: number;
  };
  activePromotion?: {
    id: number;
    type: PromotionType;
    packageName: string;
    expiresAt: string;
    daysRemaining: number | null;
    status: PromotionStatus;
  } | null;
  pendingCount?: number;
}

export interface SlotAvailability {
  packageId: number;
  type: string;
  month: string;
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
}

export interface SnapPaymentResult {
  token: string;
  redirectUrl: string;
  orderId: string;
}
