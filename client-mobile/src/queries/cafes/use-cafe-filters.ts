import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import { cafeKeys } from './keys';

export interface FacilityOption {
  key: string;
  label: string;
  icon: string;
  count: number;
}

async function fetchCafeFilters(): Promise<FacilityOption[]> {
  const { data } = await http.get<FacilityOption[]>('/cafes/filters', {
    params: { isOptions: 'true' },
  });
  return data;
}

export function useCafeFilters() {
  return useQuery({
    queryKey: cafeKeys.filters(),
    queryFn: fetchCafeFilters,
    staleTime: 60 * 60 * 1000,
  });
}
