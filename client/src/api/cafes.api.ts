import apiClient from './client';
import type { Cafe, PaginatedResponse } from '../types';

export interface SearchParams {
  lat?: number;
  lng?: number;
  radius?: number;
  purposeId?: number;
  q?: string;
  wifiAvailable?: string;
  hasMushola?: string;
  priceRange?: string;
  page?: number;
  limit?: number;
}

export const cafesApi = {
  search: (params: SearchParams) =>
    apiClient.get<PaginatedResponse<Cafe>>('/cafes', { params }),

  getById: (id: number) =>
    apiClient.get<Cafe>(`/cafes/${id}`),
};
