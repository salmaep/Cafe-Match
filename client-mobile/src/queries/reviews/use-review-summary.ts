import { useQuery } from '@tanstack/react-query';
import { fetchReviewSummary } from '../../services/api';
import { reviewKeys } from './keys';

export function useReviewSummary(cafeId: string | number | undefined) {
  return useQuery({
    queryKey: reviewKeys.summary(cafeId ?? ''),
    queryFn: () => fetchReviewSummary(String(cafeId)),
    enabled: !!cafeId,
    staleTime: 60_000,
  });
}
