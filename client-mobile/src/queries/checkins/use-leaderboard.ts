import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard } from '../../services/api';
import { checkinKeys } from './keys';

export function useLeaderboard(cafeId: string | number | undefined) {
  return useQuery({
    queryKey: checkinKeys.leaderboard(cafeId ?? ''),
    queryFn: () => fetchLeaderboard(String(cafeId)),
    enabled: !!cafeId,
    staleTime: 60_000,
  });
}
