import type { Cafe, CafeFacility } from '../types';
import {
  FACILITY_ICONS,
  FACILITY_LABELS,
  chipFromFacilityKey,
  type FacilityChip,
} from '@shared/constants/facilities';

export { FACILITY_ICONS, FACILITY_LABELS, type FacilityChip };

const chipFromKey = chipFromFacilityKey;

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
