import type { Cafe, CafeFacility } from '../types';

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

/**
 * Build the de-duplicated list of facility chips for a cafe.
 *
 * Sources (in priority order):
 *   1. Boolean columns (`wifiAvailable`, `hasMushola`, `hasParking`) — always trusted.
 *   2. `facilities[]` from the API. Two shapes are supported:
 *      - Array of strings (Meili list response). When `facilityValues[]` is a parallel
 *        array, only keys whose value is NOT "false" are included.
 *      - Array of `CafeFacility` objects (DB response on detail). Skip rows whose
 *        `facilityValue === "false"`.
 */
export function buildFacilityChips(cafe: Cafe): FacilityChip[] {
  const seen = new Set<string>();
  const out: FacilityChip[] = [];

  const push = (key: string, override?: Partial<FacilityChip>) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ ...chipFromKey(key), ...override });
  };

  if (cafe.wifiAvailable) {
    push('strong_wifi', {
      label: cafe.wifiSpeedMbps ? `WiFi ${cafe.wifiSpeedMbps}M` : 'WiFi',
    });
  }
  if (cafe.hasParking) push('parking');
  if (cafe.hasMushola) push('mushola');

  const fac = cafe.facilities;
  if (Array.isArray(fac)) {
    if (fac.length > 0 && typeof fac[0] === 'string') {
      const keys = fac as unknown as string[];
      const values = (cafe as unknown as { facilityValues?: string[] }).facilityValues;
      keys.forEach((k, i) => {
        if (values && values[i] === 'false') return;
        push(k);
      });
    } else {
      (fac as CafeFacility[]).forEach((f) => {
        if (f.facilityValue === 'false') return;
        push(f.facilityKey);
      });
    }
  }

  return out;
}
