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

export function useCafeFilters() {
  return useQuery({
    queryKey: cafeKeys.filters(),
    queryFn: fetchCafeFilters,
    staleTime: 60 * 60 * 1000,
  });
}
