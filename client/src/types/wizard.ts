export type PurposeLabel = 'Me Time' | 'Date' | 'Family Time' | 'Group Study' | 'WFC';

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
  purpose?: PurposeLabel;
  location?: {
    type: 'current' | 'custom';
    latitude: number | null;
    longitude: number | null;
    label?: string;
  };
  radius?: number;
  amenities?: Facility[];
}
