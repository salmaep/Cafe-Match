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

export const reviewsApi = {
  getSummary: (cafeId: number) =>
    apiClient.get<ReviewSummary[]>(`/reviews/cafe/${cafeId}/summary`),
  create: (cafeId: number, dto: CreateReviewDto) =>
    apiClient.post(`/reviews/${cafeId}`, dto),
};
