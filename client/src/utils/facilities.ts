import type { Cafe, CafeFeature } from '../types';
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
 * Source: `cafe.features[]` (rich shape) or `cafe.facilities[]`. The latter
 * may arrive as a string[] (from Meilisearch) or a CafeFeature[] (from DB
 * detail). Each entry is treated as a feature name.
 */
export function buildFacilityChips(cafe: Cafe): FacilityChip[] {
  const seen = new Set<string>();
  const out: FacilityChip[] = [];

  const push = (key: string) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(chipFromKey(key));
  };

  if (Array.isArray(cafe.features) && cafe.features.length > 0) {
    cafe.features.forEach((f) => {
      if (f?.name) push(f.name);
    });
    return out;
  }

  const fac = cafe.facilities;
  if (Array.isArray(fac)) {
    if (fac.length > 0 && typeof fac[0] === 'string') {
      (fac as string[]).forEach((name) => push(name));
    } else {
      (fac as CafeFeature[]).forEach((f) => {
        if (f?.name) push(f.name);
      });
    }
  }

  return out;
}
