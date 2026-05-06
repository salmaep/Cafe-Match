import apiClient from './client';
import type { ShortlistItem } from '../types';

export const shortlistsApi = {
  getAll: () => apiClient.get<ShortlistItem[]>('/shortlists'),

  add: (cafeId: number) =>
    apiClient.post<{ shortlisted: boolean }>(`/shortlists/${cafeId}`),

  remove: (cafeId: number) =>
    apiClient.delete<{ shortlisted: boolean }>(`/shortlists/${cafeId}`),

  clear: () => apiClient.delete<{ cleared: boolean }>('/shortlists'),
};
