import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

interface MyReview {
  id: number;
  cafeId: number;
  userId: number;
  text: string | null;
  createdAt: string;
}

export function useMyReviews() {
  return useQuery<MyReview[]>({
    queryKey: ['reviews', 'me'],
    queryFn: async () => {
      const { data } = await http.get<MyReview[]>('/reviews/me');
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
