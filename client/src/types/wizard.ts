import type { PurposeSlug } from '../constants/purposes';

// Wizard purpose is now keyed by server slug (matches `purposes` table).
// PurposeSlug is the canonical type — `PurposeLabel` is an alias kept for
// backward compatibility with older imports.
export type { PurposeSlug } from '../constants/purposes';
export type PurposeLabel = PurposeSlug;

export type Facility =
  | 'WiFi'
  | 'Power Outlet'
  | 'Mushola'
  | 'Parking'
  | 'Kid-Friendly'
  | 'Quiet Atmosphere'
  | 'Large Tables'
  | 'Outdoor Area';

export interface WizardPreferences {
  // Server purpose slug (e.g. "wfc", "me-time"). Resolved to numeric id at
  // search time via the cached purposes list in PreferencesContext.
  purpose?: PurposeSlug;
  location?: {
    type: 'current' | 'custom';
    latitude: number | null;
    longitude: number | null;
    label?: string;
  };
  radius?: number;
  // Facility keys from server filter catalog (e.g. "strong_wifi", "parking")
  amenities?: string[];
  priceRange?: string;
}
