import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import { API_PATHS } from '../../constant/api';

export interface GoogleReview {
  id: number;
  cafeId: number;
  guestName: string;
  guestAvatar: string | null;
  rating: number;
  comment: string | null;
  photoUrl: string | null;
  scrapedAt: string;
}

export interface PaginatedGoogleReviews {
  data: GoogleReview[];
  meta: { page: number; limit: number; total: number };
}

export async function fetchGoogleReviews(
  cafeId: string | number,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedGoogleReviews> {
  const { data } = await http.get<PaginatedGoogleReviews>(
    API_PATHS.googleReviewsOfCafe(cafeId),
    {
      params: { page: params.page ?? 1, limit: params.limit ?? 5 },
    },
  );
  return data;
}

export function useGoogleReviews(
  cafeId: string | number | null | undefined,
  limit = 5,
) {
  const enabled = cafeId != null;
  return useQuery<PaginatedGoogleReviews>({
    queryKey: enabled
      ? ['google-reviews', String(cafeId), { page: 1, limit }]
      : ['google-reviews', 'disabled'],
    queryFn: () => fetchGoogleReviews(cafeId!, { page: 1, limit }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
