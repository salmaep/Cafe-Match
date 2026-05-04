import { useQuery } from '@tanstack/react-query';
import { cafeKeys } from './keys';
import { fetchCafeDetail } from './api';

export function useCafeDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: cafeKeys.detail(id ?? ''),
    queryFn: () => fetchCafeDetail(String(id)),
    enabled: !!id,
    staleTime: 60_000,
  });
}
