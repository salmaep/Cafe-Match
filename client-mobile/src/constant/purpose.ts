// Purpose name → backend slug (used for client-side scoring lookups in cafe.purposeScores
// and to resolve numeric IDs via `usePurposeId(label)`).
export const PURPOSE_SLUG_MAP: Record<string, string> = {
  'Me Time': 'me-time',
  Date: 'date',
  'Family Time': 'family',
  'Group Study': 'group-work',
  WFC: 'wfc',
  Meeting: 'meeting',
  Brainstorm: 'brainstorm',
  'Catch Up': 'catch-up',
  Reading: 'reading',
  'Quick Coffee': 'quick-coffee',
  Celebration: 'celebration',
  'Photo Spot': 'photo-spot',
};

// Facility label → backend key slug (for `facilities[]` query param to /cafes search).
// Labels are the canonical UI strings shown to users; backend stores keys like "wifi", "mushola".
export const FACILITY_KEY_BY_LABEL: Record<string, string> = {
  WiFi: 'wifi',
  'Power Outlet': 'power_outlet',
  Mushola: 'mushola',
  Parking: 'parking',
  'Kid-Friendly': 'kid_friendly',
  'Quiet Atmosphere': 'quiet_atmosphere',
  'Large Tables': 'large_tables',
  'Outdoor Area': 'outdoor_area',
};
