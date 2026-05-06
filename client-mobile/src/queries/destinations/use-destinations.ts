import { useQuery } from '@tanstack/react-query';
import { fetchDestinations } from '../../services/api';

export const destinationKeys = {
  all: ['destinations'] as const,
};

/**
 * Fetch suggested destinations (popular cities) from the server.
 * Cached aggressively — seed data that rarely changes.
 */
export function useDestinations() {
  return useQuery({
    queryKey: destinationKeys.all,
    queryFn: fetchDestinations,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
  });
}
