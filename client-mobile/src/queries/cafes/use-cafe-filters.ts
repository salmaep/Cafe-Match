import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import { cafeKeys } from './keys';

export interface CafeFilterOption {
  key: string;
  label: string;
  count: number;
}

export interface CafeFilterGroup {
  key: string;
  label: string;
  options: CafeFilterOption[];
}

export interface CafeFiltersResponse {
  groups: CafeFilterGroup[];
}

async function fetchCafeFilters(): Promise<CafeFiltersResponse> {
  const { data } = await http.get<CafeFiltersResponse>('/cafes/filters');
  return data;
}

/**
 * Fetch the canonical facility catalog from the server (`GET /cafes/filters`).
 * Cached aggressively — facility taxonomy rarely changes.
 */
export function useCafeFilters() {
  return useQuery({
    queryKey: cafeKeys.filters(),
    queryFn: fetchCafeFilters,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Flatten all filter groups into a single list of `{ key, label }` for use in
 * a flat chip selector (e.g., the wizard amenities step).
 */
export function flattenFilterOptions(
  data: CafeFiltersResponse | undefined,
): CafeFilterOption[] {
  if (!data) return [];
  return data.groups.flatMap((g) => g.options);
}
