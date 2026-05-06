import { useQuery } from '@tanstack/react-query';
import { fetchActiveCheckin } from '../../services/api';

export const checkinKeys = {
  active: ['checkins', 'active'] as const,
};

/**
 * Poll active check-in every 60s while screen is foregrounded.
 *
 * NOTE: polling is a stop-gap. Future migration: Socket.IO push events
 * via the existing `gateway/events.module.ts` so check-ins are pushed
 * to the client instead of the client asking every minute.
 */
export function useActiveCheckin() {
  return useQuery({
    queryKey: checkinKeys.active,
    queryFn: fetchActiveCheckin,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
