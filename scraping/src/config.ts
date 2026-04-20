import 'dotenv/config';

export const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

if (!GOOGLE_API_KEY) {
  console.error('ERROR: GOOGLE_PLACES_API_KEY not set in .env');
  process.exit(1);
}

/**
 * Bandung sub-areas to scrape.
 * Each area defines a center point and search radius (meters).
 * Google Places Nearby Search returns up to 60 results per area (3 pages of 20).
 */
export interface AreaConfig {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  radius: number; // meters
}

export const BANDUNG_AREAS: AreaConfig[] = [
  {
    name: 'Dago',
    slug: 'bandung-dago',
    lat: -6.8651,
    lng: 107.6169,
    radius: 2000,
  },
  {
    name: 'Buah Batu',
    slug: 'bandung-buahbatu',
    lat: -6.951,
    lng: 107.64,
    radius: 2000,
  },
  {
    name: 'Lengkong (Burangrang/Progo)',
    slug: 'bandung-lengkong',
    lat: -6.9254,
    lng: 107.6244,
    radius: 1500,
  },
  {
    name: 'Sukajadi',
    slug: 'bandung-sukajadi',
    lat: -6.8749,
    lng: 107.5933,
    radius: 2000,
  },
  {
    name: 'Cicendo (Pasir Kaliki)',
    slug: 'bandung-cicendo',
    lat: -6.9032,
    lng: 107.596,
    radius: 1500,
  },
  {
    name: 'Riau / RE Martadinata',
    slug: 'bandung-riau',
    lat: -6.9025,
    lng: 107.6186,
    radius: 1500,
  },
];

/** Delay between Google API calls (ms) to avoid rate limits */
export const API_DELAY_MS = 150;

/** Max retries on 429 / network error */
export const MAX_RETRIES = 3;

/** Google Places fields to request for Place Details */
export const DETAIL_FIELDS = [
  'name',
  'formatted_address',
  'geometry',
  'formatted_phone_number',
  'opening_hours',
  'photos',
  'rating',
  'user_ratings_total',
  'price_level',
  'website',
  'types',
  'reviews',
].join(',');
