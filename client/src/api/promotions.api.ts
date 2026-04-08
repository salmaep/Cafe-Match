import apiClient from './client';
import type { AdvertisementPackage, Promotion, SlotAvailability } from '../types/owner';

export const promotionsApi = {
  getPackages: () =>
    apiClient.get<AdvertisementPackage[]>('/promotions/packages'),

  getAvailability: (packageId: number, type: string) =>
    apiClient.get<SlotAvailability>(`/promotions/packages/${packageId}/availability`, {
      params: { type },
    }),

  create: (data: {
    packageId: number;
    type: string;
    billingCycle?: string;
    contentTitle?: string;
    contentDescription?: string;
    contentPhotoUrl?: string;
    highlightedFacilities?: string[];
  }) => apiClient.post<Promotion>('/promotions', data),

  getMine: () =>
    apiClient.get<Promotion[]>('/promotions/mine'),

  getById: (id: number) =>
    apiClient.get<Promotion>(`/promotions/${id}`),

  updateContent: (id: number, data: {
    contentTitle?: string;
    contentDescription?: string;
    contentPhotoUrl?: string;
    highlightedFacilities?: string[];
  }) => apiClient.put<Promotion>(`/promotions/${id}/content`, data),

  getActive: (type?: string) =>
    apiClient.get<Promotion[]>('/promotions/active', { params: type ? { type } : {} }),
};
