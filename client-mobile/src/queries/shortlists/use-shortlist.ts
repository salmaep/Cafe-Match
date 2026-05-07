import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { http } from '../../lib/http';
import { mapBackendCafe } from '../cafes/mappers';
import { Cafe } from '../../types';

export const shortlistKeys = {
  all: ['shortlists'] as const,
  list: () => [...shortlistKeys.all, 'list'] as const,
};

interface BackendShortlistEntry {
  id: number;
  cafeId: number;
  createdAt: string;
  cafe: any;
}

async function fetchShortlist(): Promise<Cafe[]> {
  const { data } = await http.get<BackendShortlistEntry[]>('/shortlists');
  return data.map((entry) => mapBackendCafe(entry.cafe));
}

export function useShortlistQuery(enabled: boolean) {
  return useQuery({
    queryKey: shortlistKeys.list(),
    queryFn: fetchShortlist,
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useAddToShortlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cafe: Cafe) => {
      const cafeId = Number(cafe.id);
      await http.post(`/shortlists/${cafeId}`);
      return cafe;
    },
    onMutate: async (cafe) => {
      await qc.cancelQueries({ queryKey: shortlistKeys.list() });
      const prev = qc.getQueryData<Cafe[]>(shortlistKeys.list()) ?? [];
      if (!prev.some((c) => c.id === cafe.id)) {
        qc.setQueryData<Cafe[]>(shortlistKeys.list(), [...prev, cafe]);
      }
      return { prev };
    },
    onError: (_err, _cafe, ctx) => {
      if (ctx?.prev) qc.setQueryData(shortlistKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: shortlistKeys.list() });
    },
  });
}

export function useRemoveFromShortlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cafeId: string) => {
      await http.delete(`/shortlists/${Number(cafeId)}`);
      return cafeId;
    },
    onMutate: async (cafeId) => {
      await qc.cancelQueries({ queryKey: shortlistKeys.list() });
      const prev = qc.getQueryData<Cafe[]>(shortlistKeys.list()) ?? [];
      qc.setQueryData<Cafe[]>(
        shortlistKeys.list(),
        prev.filter((c) => c.id !== cafeId),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(shortlistKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: shortlistKeys.list() });
    },
  });
}

export function useClearShortlistMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await http.delete('/shortlists');
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: shortlistKeys.list() });
      const prev = qc.getQueryData<Cafe[]>(shortlistKeys.list()) ?? [];
      qc.setQueryData<Cafe[]>(shortlistKeys.list(), []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(shortlistKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: shortlistKeys.list() });
    },
  });
}
