// Mirrors client/src/utils/facilities.ts but typed for the mobile Cafe shape.
import type { Cafe, CafeFeatureRich } from '../types';

export const FACILITY_ICONS: Record<string, string> = {
  wifi: '📶',
  strong_wifi: '📶',
  power_outlet: '🔌',
  power_outlets: '🔌',
  mushola: '🕌',
  parking: '🅿️',
  kid_friendly: '👶',
  family_friendly: '👨‍👩‍👧',
  quiet_atmosphere: '🤫',
  large_tables: '🪑',
  outdoor_area: '🌿',
  outdoor_seating: '🌿',
  cozy_seating: '🛋️',
  ambient_lighting: '💡',
  intimate_seating: '💕',
  spacious: '🏛️',
  whiteboard: '📋',
  bookable_space: '📅',
  smoking_area: '🚬',
  noise_tolerant: '🔊',
  payment_cash: '💵',
  payment_debit: '💳',
  payment_credit: '💳',
  payment_qris: '🇮🇩',
  payment_nfc: '📱',
  payment_ewallet: '📲',
};

export const FACILITY_LABELS: Record<string, string> = {
  strong_wifi: 'Strong WiFi',
  wifi: 'WiFi',
  power_outlets: 'Power Outlets',
  power_outlet: 'Power Outlet',
  mushola: 'Mushola',
  parking: 'Parkir',
  kid_friendly: 'Kid Friendly',
  family_friendly: 'Family Friendly',
  quiet_atmosphere: 'Tenang',
  cozy_seating: 'Cozy',
  ambient_lighting: 'Ambient Lighting',
  intimate_seating: 'Intimate',
  spacious: 'Spacious',
  noise_tolerant: 'Noise Tolerant',
  large_tables: 'Large Tables',
  whiteboard: 'Whiteboard',
  bookable_space: 'Bookable',
  outdoor_area: 'Outdoor',
  outdoor_seating: 'Outdoor',
  smoking_area: 'Smoking Area',
  payment_cash: 'Cash',
  payment_debit: 'Debit',
  payment_credit: 'Credit Card',
  payment_qris: 'QRIS',
  payment_nfc: 'NFC',
  payment_ewallet: 'E-Wallet',
};

export interface FacilityChip {
  key: string;
  icon: string;
  label: string;
}

function chipFromKey(key: string): FacilityChip {
  return {
    key,
    icon: FACILITY_ICONS[key] || '✓',
    label: FACILITY_LABELS[key] || key.replace(/_/g, ' '),
  };
}

export function buildFacilityChips(cafe: Cafe): FacilityChip[] {
  const seen = new Set<string>();
  const out: FacilityChip[] = [];

  const push = (key: string, override?: Partial<FacilityChip>) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ ...chipFromKey(key), ...override });
  };

  // Iterate features rich list (name + category). Falls back to featureNames
  // when the rich shape isn't populated.
  const fac = cafe.facilitiesRich;
  if (Array.isArray(fac) && fac.length > 0) {
    (fac as CafeFeatureRich[]).forEach((f) => {
      if (f?.name) push(f.name);
    });
  } else if (Array.isArray(cafe.featureNames)) {
    cafe.featureNames.forEach((n) => push(n));
  }

  return out;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
