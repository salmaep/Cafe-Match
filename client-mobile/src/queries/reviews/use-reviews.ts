import { useQuery } from '@tanstack/react-query';
import { fetchReviews } from '../../services/api';
import { Review } from '../../types';
import { reviewKeys } from './keys';

interface ReviewsPage {
  reviews: Review[];
  meta?: { page: number; limit: number; total: number };
}

/**
 * Paginated reviews for a cafe.
 *
 * Server already returns reviews ordered by `created_at DESC` (newest first),
 * which matches the mobile "sort by tanggal terbaru ke terlama" fallback.
 * When a helpful-vote feature lands we can switch sorting to helpful_count
 * here without touching consumers.
 */
export function useReviews(cafeId: string | number | null | undefined, page = 1) {
  const id = cafeId == null ? null : String(cafeId);
  return useQuery<ReviewsPage>({
    queryKey: id ? [...reviewKeys.ofCafe(id), 'page', page] : ['reviews', 'disabled'],
    queryFn: async () => (await fetchReviews(id!, page)) as ReviewsPage,
    enabled: !!id,
    staleTime: 30 * 1000, // ride cache when moving Detail ↔ Reviews
  });
}
