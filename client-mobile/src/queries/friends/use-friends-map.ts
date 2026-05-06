import { useQuery } from '@tanstack/react-query';
import { fetchFriendsMap } from '../../services/api';

export const friendsKeys = {
  map: ['friends', 'map'] as const,
};

/**
 * Poll friends-on-map every 30s while screen is foregrounded.
 *
 * NOTE: polling is a stop-gap. Future migration: Socket.IO push events
 * (existing `gateway/events.module.ts`) so friend check-ins arrive
 * push-style. See client-mobile/TODO.md.
 */
export function useFriendsMap() {
  return useQuery({
    queryKey: friendsKeys.map,
    queryFn: async () => {
      const list = await fetchFriendsMap();
      return Array.isArray(list) ? list : [];
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}
