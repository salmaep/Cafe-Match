import apiClient from './client';

export interface ReviewSummary {
  category: string;
  avgScore: number;
  count: number;
}

export interface CreateReviewDto {
  text?: string;
  ratings: { category: string; score: number }[];
  media?: { mediaType: 'photo' | 'video'; url: string }[];
}

export interface ReviewMediaItem {
  id: number;
  mediaType: 'photo' | 'video';
  url: string;
  displayOrder: number;
}

export interface ReviewRatingItem {
  id: number;
  category: string;
  score: number;
}

export interface Review {
  id: number;
  userId: number;
  cafeId: number;
  text: string | null;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
  ratings?: ReviewRatingItem[];
  media?: ReviewMediaItem[];
}

export interface PaginatedReviews {
  data: Review[];
  meta: { page: number; limit: number; total: number };
}

export type ReviewSort = 'helpful' | 'recent';

export const reviewsApi = {
  getSummary: (cafeId: number) =>
    apiClient.get<ReviewSummary[]>(`/reviews/cafe/${cafeId}/summary`),
  create: (cafeId: number, dto: CreateReviewDto) =>
    apiClient.post(`/reviews/${cafeId}`, dto),
  listByCafe: (
    cafeId: number,
    params: { page?: number; limit?: number; sort?: ReviewSort } = {},
  ) =>
    apiClient.get<PaginatedReviews>(`/reviews/cafe/${cafeId}`, { params }),
  myVoteIds: (cafeId: number) =>
    apiClient.get<number[]>(`/reviews/cafe/${cafeId}/my-votes`),
  toggleVote: (reviewId: number) =>
    apiClient.post<{ helpful: boolean; helpfulCount: number }>(
      `/reviews/${reviewId}/vote`,
    ),
};
