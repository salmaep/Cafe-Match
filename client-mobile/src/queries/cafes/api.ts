import { http } from '../../lib/http';
import { API_PATHS } from '../../constant/api';
import { Cafe } from '../../types';
import { mapBackendCafe } from './mappers';
import {
  AutocompleteHit,
  AutocompleteParams,
  CafeSearchResult,
  SearchCafesParams,
} from './types';

const MAX_RADIUS_M = 50_000_000;

function paramsForServer(p: SearchCafesParams) {
  return {
    q: p.q || undefined,
    lat: p.lat,
    lng: p.lng,
    radius: p.radius != null ? Math.min(p.radius, MAX_RADIUS_M) : undefined,
    priceRange: p.priceRange,
    purposeId: p.purposeId,
    facilities: p.facilities && p.facilities.length > 0 ? p.facilities : undefined,
    page: p.page ?? 1,
    limit: p.limit ?? 50,
    sort: p.sort,
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

const pageCafeCache = new WeakMap<
  CafeSearchResult,
  { lat?: number; lng?: number; cafes: Cafe[] }
>();

export function hitsToCafesCached(
  result: CafeSearchResult,
  userLat?: number,
  userLng?: number,
): Cafe[] {
  const cached = pageCafeCache.get(result);
  if (cached && cached.lat === userLat && cached.lng === userLng) {
    return cached.cafes;
  }
  const cafes = hitsToCafes(result, userLat, userLng);
  pageCafeCache.set(result, { lat: userLat, lng: userLng, cafes });
  return cafes;
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

export interface SemanticSearchParams {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
  purposeId?: number;
  priceRange?: '$' | '$$' | '$$$';
  facilities?: string[];
  page?: number;
  limit?: number;
  sort?: 'distance' | 'trending' | 'rating' | 'newest';
}

export interface SemanticSearchMeta {
  total: number;
  page: number;
  limit: number;
  aiUsed: boolean;
  cached: boolean;
  searchedRadius: number;
  suggestedRadius: number | null;
  totalIfExpanded: number | null;
  parsed: unknown;
}

export interface SemanticSearchResult {
  data: Cafe[];
  meta: SemanticSearchMeta;
}

export async function searchSemanticApi(
  params: SemanticSearchParams,
): Promise<SemanticSearchResult> {
  const { facilities, ...rest } = params;
  const queryParams: Record<string, unknown> = { ...rest };
  if (facilities && facilities.length > 0) {
    queryParams.facilities = facilities.join(',');
  }
  const { data } = await http.get<any>(API_PATHS.cafesSemanticSearch, {
    params: queryParams,
  });
  const hits = (data?.data ?? []).map((hit: any) => {
    const merged = {
      ...hit,
      latitude: hit._geo?.lat ?? hit.latitude,
      longitude: hit._geo?.lng ?? hit.longitude,
    };
    return mapBackendCafe(merged, params.lat, params.lng);
  });
  return {
    data: hits,
    meta: data?.meta,
  };
}

/**
 * Lightweight cafe-name typeahead (`GET /cafes/autocomplete`). Returns a thin
 * projection (no full cafe mapping) — used by the search dropdown.
 */
export async function fetchAutocomplete(
  params: AutocompleteParams,
): Promise<{ data: AutocompleteHit[] }> {
  const { data } = await http.get<{ data: AutocompleteHit[] }>(
    API_PATHS.cafesAutocomplete,
    { params },
  );
  return { data: data?.data ?? [] };
}

export async function fetchPromotedCafes(type?: string): Promise<Cafe[]> {
  const params = type ? { type } : {};
  const { data } = await http.get(API_PATHS.cafesPromoted, { params });
  return data.map((c: any) => mapBackendCafe(c));
}

export interface DiscoverDeckParams {
  lat?: number;
  lng?: number;
  radius?: number;
  purposeId?: number;
  priceRange?: '$' | '$$' | '$$$';
  facilities?: string[];
  limit?: number;
  // Cafe ids already seen this session — excluded server-side so the infinite
  // swipe deck never repeats a card.
  excludeIds?: number[];
}

export interface DiscoverDeckResult {
  data: Cafe[];
  meta: { total: number };
}

export async function fetchDiscoverDeck(
  params: DiscoverDeckParams,
): Promise<DiscoverDeckResult> {
  const query: Record<string, unknown> = {
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    purposeId: params.purposeId,
    priceRange: params.priceRange,
    limit: params.limit,
  };
  if (params.facilities && params.facilities.length > 0) {
    query.facilities = params.facilities.join(',');
  }
  if (params.excludeIds && params.excludeIds.length > 0) {
    query.excludeIds = params.excludeIds.join(',');
  }
  const { data } = await http.get('/cafes/discover', { params: query });
  const cafes = (data?.data ?? []).map((c: any) => {
    const lat = c._geo?.lat ?? c.latitude;
    const lng = c._geo?.lng ?? c.longitude;
    return mapBackendCafe({
      ...c,
      latitude: typeof lat === 'number' ? lat : Number(lat),
      longitude: typeof lng === 'number' ? lng : Number(lng),
    });
  });
  return {
    data: cafes,
    meta: data?.meta ?? { total: cafes.length },
  };
}

export async function toggleBookmarkApi(cafeId: string): Promise<boolean> {
  const { data } = await http.post(API_PATHS.bookmarkToggle(cafeId));
  return data.bookmarked;
}

export async function toggleFavoriteApi(cafeId: string): Promise<boolean> {
  const { data } = await http.post(API_PATHS.favoriteToggle(cafeId));
  return data.favorited;
}
