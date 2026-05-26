import apiClient from "./client";
import type { Cafe, PaginatedResponse } from "../types";

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
  sort?: "distance" | "trending" | "rating" | "newest";
}

export interface FilterOption {
  /** Feature name as stored in cafe_features.name */
  key: string;
  label: string;
  count: number;
}

export interface FilterGroup {
  /** Feature category (amenity / ambience / payment / etc.) */
  key: string;
  label: string;
  options: FilterOption[];
}

export interface FiltersResponse {
  groups: FilterGroup[];
}

const CATEGORY_LABELS: Record<string, string> = {
  amenity: "Fasilitas",
  ambience: "Suasana",
  space: "Ruang",
  audience: "Cocok Untuk",
  service: "Layanan",
  payment: "Pembayaran",
  accessibility: "Aksesibilitas",
  uncategorized: "Lainnya",
};

function formatFeatureLabel(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

// Server returns { groups: [{ category, items: [{ name, count }] }] } —
// transform to { groups: [{ key, label, options: [{ key, label, count }] }] }
// so existing FilterPanel UI keeps working without refactor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFilters(raw: any): FiltersResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: any[] = raw?.groups ?? [];
  return {
    groups: groups.map((g) => ({
      key: g.category ?? g.key ?? "uncategorized",
      label:
        CATEGORY_LABELS[g.category as string] ??
        g.label ??
        g.category ??
        "Lainnya",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options: (g.items ?? g.options ?? []).map((it: any) => ({
        key: it.name ?? it.key,
        label: it.label ?? formatFeatureLabel(it.name ?? it.key ?? ""),
        count: typeof it.count === "number" ? it.count : 0,
      })),
    })),
  };
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
    latitude: typeof lat === "number" ? lat : Number(lat),
    longitude: typeof lng === "number" ? lng : Number(lng),
  };
}

export interface DiscoverParams {
  lat?: number;
  lng?: number;
  radius?: number;
  purposeId?: number;
  priceRange?: string;
  facilities?: string[];
  limit?: number;
  excludeIds?: number[];
}

export interface DiscoverResult {
  data: Cafe[];
  meta: { total: number };
}

export interface GoogleReview {
  id: number;
  cafeId: number;
  guestName: string;
  guestAvatar: string | null;
  rating: number;
  comment: string | null;
  photoUrl: string | null;
  scrapedAt: string;
}

export interface PaginatedGoogleReviews {
  data: GoogleReview[];
  meta: { page: number; limit: number; total: number };
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


export const cafesApi = {
  search: async (params: SearchParams) => {
    const { facilities, ...rest } = params;
    const queryParams: Record<string, unknown> = { ...rest };
    if (facilities && facilities.length > 0) {
      queryParams.facilities = facilities.join(",");
    }
    const res = await apiClient.get<PaginatedResponse<MeiliCafeHit>>("/cafes", {
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

  semanticSearch: async (
    params: SearchParams,
  ): Promise<SemanticSearchResult> => {
    const { facilities, ...rest } = params;
    const queryParams: Record<string, unknown> = { ...rest };
    if (facilities && facilities.length > 0) {
      queryParams.facilities = facilities.join(",");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<any>("/cafes/semantic-search", {
      params: queryParams,
    });
    const hits = (res.data?.data ?? []).map((c: MeiliCafeHit) =>
      normalizeHit(c),
    );
    return {
      data: hits,
      meta: res.data?.meta,
    };
  },


  discover: async (params: DiscoverParams): Promise<DiscoverResult> => {
    const { facilities, excludeIds, ...rest } = params;
    const queryParams: Record<string, unknown> = { ...rest };
    if (facilities && facilities.length > 0) {
      queryParams.facilities = facilities.join(",");
    }
    if (excludeIds && excludeIds.length > 0) {
      queryParams.excludeIds = excludeIds.join(",");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<any>("/cafes/discover", {
      params: queryParams,
    });
    const cafes = (res.data?.data ?? []).map((c: MeiliCafeHit) =>
      normalizeHit(c),
    );
    return {
      data: cafes,
      meta: res.data?.meta ?? { total: cafes.length },
    };
  },

  getById: (id: number) => apiClient.get<Cafe>(`/cafes/${id}`),

  getGoogleReviews: (
    id: number,
    params: { page?: number; limit?: number } = {},
  ) =>
    apiClient.get<PaginatedGoogleReviews>(`/cafes/${id}/google-reviews`, {
      params,
    }),

  getFilters: async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<any>("/cafes/filters");
    return { ...res, data: normalizeFilters(res.data) };
  },
};
