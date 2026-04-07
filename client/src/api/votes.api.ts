import apiClient from './client';
import type { VoteTally } from '../types';

export const votesApi = {
  castVote: (cafeId: number, purposeIds: number[]) =>
    apiClient.post<{ voted: number[] }>(`/votes/${cafeId}`, { purposeIds }),

  getTallies: (cafeId: number) =>
    apiClient.get<VoteTally[]>(`/votes/${cafeId}`),

  getMyVotes: (cafeId: number) =>
    apiClient.get<number[]>(`/votes/${cafeId}/me`),
};
