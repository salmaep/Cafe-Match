import axios from 'axios';
import { GOOGLE_API_KEY, API_DELAY_MS, MAX_RETRIES, DETAIL_FIELDS } from './config';

const BASE = 'https://maps.googleapis.com/maps/api/place';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, params: Record<string, any>, retries = MAX_RETRIES): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(API_DELAY_MS);
      const { data } = await axios.get(url, { params: { ...params, key: GOOGLE_API_KEY } });
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') return data;
      if (data.status === 'OVER_QUERY_LIMIT') {
        const backoff = attempt * 2000;
        console.warn(`  Rate limited, retrying in ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      console.error(`  API error: ${data.status} — ${data.error_message || ''}`);
      return data;
    } catch (err: any) {
      if (attempt < retries) {
        const backoff = attempt * 1500;
        console.warn(`  Network error, retrying in ${backoff}ms... (${err.message})`);
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Nearby Search — returns up to 60 places per area (3 pages of 20).
 * Each result has: place_id, name, geometry.location, vicinity
 */
export async function nearbySearch(
  lat: number,
  lng: number,
  radius: number,
): Promise<any[]> {
  const allResults: any[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3; page++) {
    const params: Record<string, any> = {
      location: `${lat},${lng}`,
      radius,
      type: 'cafe',
    };
    if (pageToken) {
      // Google requires a ~2s delay before using next_page_token
      await sleep(2000);
      params.pagetoken = pageToken;
    }

    const data = await fetchWithRetry(`${BASE}/nearbysearch/json`, params);

    if (data.results) {
      allResults.push(...data.results);
    }

    pageToken = data.next_page_token;
    if (!pageToken) break;
  }

  return allResults;
}

/**
 * Place Details — fetches rich info for a single place.
 */
export async function placeDetails(placeId: string): Promise<any | null> {
  const data = await fetchWithRetry(`${BASE}/details/json`, {
    place_id: placeId,
    fields: DETAIL_FIELDS,
  });
  return data?.result || null;
}
