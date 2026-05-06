import apiClient from './client';
import type { Cafe, PaginatedResponse } from '../types';

export interface SearchParams {
  lat?: number;
  lng?: number;
  radius?: number;
  purposeId?: number;
  q?: string;
  facilities?: string[];
  priceRange?: string;
  page?: number;
  limit?: number;
  sort?: 'distance' | 'trending' | 'rating' | 'newest';
}

export interface FilterOption {
  key: string;
  label: string;
  count: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface FiltersResponse {
  groups: FilterGroup[];
}

// Lightweight cafe shape returned by /cafes/map — only the fields needed to
// render a marker. Keep this in sync with the server's CafePin type.
export interface CafePin {
  id: number;
  name: string;
  slug: string | null;
  address: string;
  latitude: number;
  longitude: number;
  hasActivePromotion: boolean;
  activePromotionType: string | null;
  distanceMeters?: number;
}

// Meilisearch returns documents with `_geo: { lat, lng }` (the geo field) instead
// of flat `latitude` / `longitude`. Map components and detail pages read the flat
// shape, so normalize once at the API boundary.
type MeiliCafeHit = Cafe & {
  _geo?: { lat: number; lng: number };
  distance?: number;
};

function normalizeHit(hit: MeiliCafeHit): Cafe {
  const lat = hit._geo?.lat ?? hit.latitude;
  const lng = hit._geo?.lng ?? hit.longitude;
  return {
    ...hit,
    latitude: typeof lat === 'number' ? lat : Number(lat),
    longitude: typeof lng === 'number' ? lng : Number(lng),
  };
}

export const cafesApi = {
  search: async (params: SearchParams) => {
    // Backend accepts ?facilities=key1,key2 (CSV). Drop the empty array so we
    // don't send `?facilities=` and accidentally widen the result set.
    const { facilities, ...rest } = params;
    const queryParams: Record<string, unknown> = { ...rest };
    if (facilities && facilities.length > 0) {
      queryParams.facilities = facilities.join(',');
    }
    const res = await apiClient.get<PaginatedResponse<MeiliCafeHit>>('/cafes', {
      params: queryParams,
    });
    return {
      ...res,
      data: {
        ...res.data,
        data: (res.data?.data ?? []).map(normalizeHit),
      } as PaginatedResponse<Cafe>,
    };
  },

  // All matching cafes as lightweight map pins (no pagination, only the
  // fields needed to render a marker).
  searchMap: async (params: Omit<SearchParams, 'page' | 'limit'>) => {
    const { facilities, ...rest } = params;
    const queryParams: Record<string, unknown> = { ...rest };
    if (facilities && facilities.length > 0) {
      queryParams.facilities = facilities.join(',');
    }
    return apiClient.get<CafePin[]>('/cafes/map', { params: queryParams });
  },

  getById: (id: number) => apiClient.get<Cafe>(`/cafes/${id}`),

  getFilters: () => apiClient.get<FiltersResponse>('/cafes/filters'),
};
