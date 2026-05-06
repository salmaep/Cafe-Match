import { Purpose } from '../types';

// Purpose name → backend slug (used for client-side scoring lookups in cafe.purposeScores).
export const PURPOSE_SLUG_MAP: Record<string, string> = {
  'Me Time': 'me-time',
  Date: 'date',
  'Family Time': 'family',
  'Group Study': 'group-work',
  WFC: 'wfc',
};

// Purpose name → backend numeric ID (used as `purposeId` query param to /cafes search).
// IDs are seed data and stable; if backend reseed changes them, update here.
export const PURPOSE_ID_MAP: Record<Purpose, number> = {
  'Me Time': 1,
  Date: 2,
  'Family Time': 3,
  'Group Study': 4,
  WFC: 5,
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
