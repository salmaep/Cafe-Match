import { http } from '../../lib/http';
import { API_PATHS } from '../../constant/api';
import { Cafe } from '../../types';
import { mapBackendCafe } from './mappers';
import { CafeSearchResult, SearchCafesParams } from './types';

const MAX_RADIUS_M = 50_000_000;

function paramsForServer(p: SearchCafesParams) {
  return {
    q: p.q || undefined,
    lat: p.lat,
    lng: p.lng,
    radius: p.radius != null ? Math.min(p.radius, MAX_RADIUS_M) : undefined,
    wifiAvailable: p.wifiAvailable === true ? 'true' : undefined,
    hasMushola: p.hasMushola === true ? 'true' : undefined,
    hasParking: p.hasParking === true ? 'true' : undefined,
    priceRange: p.priceRange,
    purposeId: p.purposeId,
    page: p.page ?? 1,
    limit: p.limit ?? 50,
  };
}

/**
 * Raw Meilisearch search call. Returns server payload as-is.
 * Used by useSearchCafes (TanStack Query).
 */
export async function searchCafesApi(
  params: SearchCafesParams,
): Promise<CafeSearchResult> {
  const { data } = await http.get<CafeSearchResult>(API_PATHS.cafes, {
    params: paramsForServer(params),
  });
  return data;
}

/**
 * Map a Meilisearch CafeHit array → legacy Cafe[] used by existing screens.
 * Useful as transitional bridge while migrating UIs that still consume `Cafe` shape.
 */
export function hitsToCafes(
  result: CafeSearchResult,
  userLat?: number,
  userLng?: number,
): Cafe[] {
  return result.data.map((hit) => {
    const merged = {
      ...hit,
      latitude: hit._geo?.lat,
      longitude: hit._geo?.lng,
    };
    return mapBackendCafe(merged, userLat, userLng);
  });
}

/**
 * Backward-compatible wrapper: legacy fetchCafes signature → Meilisearch endpoint.
 * Re-exported via services/api.ts for screens that haven't migrated yet.
 * On error: returns empty array (caller should render an empty/error state).
 */
export async function fetchCafes(
  lat: number,
  lng: number,
  radiusKm: number = 2,
  purposeId?: number,
): Promise<Cafe[]> {
  const radiusMeters = Math.min(radiusKm * 1000, MAX_RADIUS_M);
  const result = await searchCafesApi({
    lat,
    lng,
    radius: radiusMeters,
    purposeId,
    limit: 1000,
  });
  return hitsToCafes(result, lat, lng);
}

export async function fetchCafeDetail(id: string): Promise<Cafe | null> {
  const { data } = await http.get(API_PATHS.cafeDetail(id));
  return mapBackendCafe(data);
}

export async function fetchPromotedCafes(type?: string): Promise<Cafe[]> {
  const params = type ? { type } : {};
  const { data } = await http.get(API_PATHS.cafesPromoted, { params });
  return data.map((c: any) => mapBackendCafe(c));
}

export async function toggleBookmarkApi(cafeId: string): Promise<boolean> {
  const { data } = await http.post(API_PATHS.bookmarkToggle(cafeId));
  return data.bookmarked;
}

export async function toggleFavoriteApi(cafeId: string): Promise<boolean> {
  const { data } = await http.post(API_PATHS.favoriteToggle(cafeId));
  return data.favorited;
}
