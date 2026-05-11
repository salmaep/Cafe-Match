import { useQuery } from '@tanstack/react-query';
import { cafeKeys } from './keys';
import {
  fetchDiscoverDeck,
  type DiscoverDeckParams,
  type DiscoverDeckResult,
} from './api';

export function useDiscoverDeck(
  params: DiscoverDeckParams,
  options: { enabled?: boolean } = {},
) {
  const baseEnabled = params.lat != null && params.lng != null;
  return useQuery<DiscoverDeckResult>({
    queryKey: cafeKeys.discover(params as Record<string, unknown>),
    queryFn: () => fetchDiscoverDeck(params),
    enabled: baseEnabled && (options.enabled ?? true),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
