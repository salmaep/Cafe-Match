import apiClient from './client';
import type { Cafe, PaginatedResponse } from '../types';

export interface SearchParams {
  lat?: number;
  lng?: number;
  radius?: number;
  purposeId?: number;
  q?: string;
  wifiAvailable?: string;
  hasMushola?: string;
  priceRange?: string;
  page?: number;
  limit?: number;
  sort?: 'distance' | 'trending' | 'rating' | 'newest';
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
    const res = await apiClient.get<PaginatedResponse<MeiliCafeHit>>('/cafes', {
      params,
    });
    return {
      ...res,
      data: {
        ...res.data,
        data: (res.data?.data ?? []).map(normalizeHit),
      } as PaginatedResponse<Cafe>,
    };
  },

  getById: (id: number) => apiClient.get<Cafe>(`/cafes/${id}`),
};
