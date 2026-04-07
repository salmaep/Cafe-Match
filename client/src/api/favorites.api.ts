import apiClient from './client';
import type { Favorite } from '../types';

export const favoritesApi = {
  toggle: (cafeId: number) =>
    apiClient.post<{ favorited: boolean }>(`/favorites/${cafeId}`),

  getAll: () =>
    apiClient.get<Favorite[]>('/favorites'),
};
