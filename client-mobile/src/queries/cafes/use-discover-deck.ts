import { useQuery } from '@tanstack/react-query';
import { cafeKeys } from './keys';
import {
  fetchDiscoverDeck,
  type DiscoverDeckParams,
  type DiscoverDeckResult,
} from './api';

export function useDiscoverDeck(params: DiscoverDeckParams) {
  return useQuery<DiscoverDeckResult>({
    queryKey: cafeKeys.discover(params as Record<string, unknown>),
    queryFn: () => fetchDiscoverDeck(params),
    enabled: params.lat != null && params.lng != null,
    staleTime: 30_000,
  });
}
