import apiClient from './client';
import type { Bookmark } from '../types';

export const bookmarksApi = {
  toggle: (cafeId: number) =>
    apiClient.post<{ bookmarked: boolean }>(`/bookmarks/${cafeId}`),

  getAll: () =>
    apiClient.get<Bookmark[]>('/bookmarks'),
};
