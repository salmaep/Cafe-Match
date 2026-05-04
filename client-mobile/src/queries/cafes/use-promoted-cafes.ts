import { useQuery } from '@tanstack/react-query';
import { cafeKeys } from './keys';
import { fetchPromotedCafes } from './api';

export function usePromotedCafes(type?: string) {
  return useQuery({
    queryKey: cafeKeys.promoted(type),
    queryFn: () => fetchPromotedCafes(type),
    staleTime: 5 * 60_000,
  });
}
