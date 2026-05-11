import type { Cafe, CafeFacilityRich } from '../types';
import {
  FACILITY_ICONS as SHARED_FACILITY_ICONS,
  FACILITY_LABELS as SHARED_FACILITY_LABELS,
  chipFromFacilityKey,
} from '@shared/constants/facilities';

export const FACILITY_ICONS = SHARED_FACILITY_ICONS;
export const FACILITY_LABELS = SHARED_FACILITY_LABELS;

function normalizeFacilityKey(key: string | null | undefined): string {
  return (key ?? '').toLowerCase().replace(/[-_\s]/g, '');
}

export function facilityIconFor(key: string | null | undefined): string | undefined {
  return FACILITY_ICONS[normalizeFacilityKey(key)];
}

export interface FacilityChip {
  key: string;
  icon: string;
  label: string;
}

export function buildFacilityChips(cafe: Cafe): FacilityChip[] {
  const seen = new Set<string>();
  const out: FacilityChip[] = [];

  const push = (key: string, override?: Partial<FacilityChip>) => {
    const n = normalizeFacilityKey(key);
    if (!n || seen.has(n)) return;
    seen.add(n);
    const chip = chipFromFacilityKey(key);
    out.push({ ...chip, ...override });
  };

  if (cafe.wifiAvailable) {
    push('strong_wifi', {
      label: cafe.wifiSpeedMbps ? `WiFi ${cafe.wifiSpeedMbps}M` : 'WiFi',
    });
  }
  if (cafe.hasParking) push('parking');
  if (cafe.hasMushola) push('mushola');

  const fac = cafe.facilitiesRich;
  if (Array.isArray(fac) && fac.length > 0) {
    if (typeof fac[0] === 'string') {
      const keys = fac as unknown as string[];
      const values = (cafe as unknown as { facilityValues?: string[] }).facilityValues;
      keys.forEach((k, i) => {
        if (values && values[i] === 'false') return;
        push(k);
      });
    } else {
      (fac as CafeFacilityRich[]).forEach((f) => {
        if (f.facilityValue === 'false') return;
        push(f.facilityKey);
      });
    }
  }

  return out;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
