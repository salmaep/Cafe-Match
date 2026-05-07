import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { http } from '../../lib/http';

export interface VoteTally {
  purposeId: number;
  count: number;
}

export const voteKeys = {
  all: ['votes'] as const,
  tallies: (cafeId: number) => [...voteKeys.all, 'tallies', cafeId] as const,
  myVotes: (cafeId: number) => [...voteKeys.all, 'me', cafeId] as const,
};

export function useVoteTallies(cafeId: number) {
  return useQuery({
    queryKey: voteKeys.tallies(cafeId),
    queryFn: async () => {
      const { data } = await http.get<VoteTally[]>(`/votes/${cafeId}`);
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useMyVotes(cafeId: number, enabled: boolean) {
  return useQuery({
    queryKey: voteKeys.myVotes(cafeId),
    queryFn: async () => {
      const { data } = await http.get<number[]>(`/votes/${cafeId}/me`);
      return data;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCastVote(cafeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (purposeIds: number[]) => {
      const { data } = await http.post(`/votes/${cafeId}`, { purposeIds });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: voteKeys.tallies(cafeId) });
      qc.invalidateQueries({ queryKey: voteKeys.myVotes(cafeId) });
    },
  });
}
