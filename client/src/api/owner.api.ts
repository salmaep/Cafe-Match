import apiClient from './client';
import type { Cafe } from '../types';
import type { OwnerDashboard } from '../types/owner';

export const ownerApi = {
  getDashboard: () =>
    apiClient.get<OwnerDashboard>('/owner/dashboard'),

  getCafe: () =>
    apiClient.get<Cafe | null>('/owner/cafe'),

  createCafe: (data: { name: string; address: string; phone?: string; description?: string; latitude?: number; longitude?: number }) =>
    apiClient.post<Cafe>('/owner/cafe', data),

  updateCafe: (data: Partial<Cafe>) =>
    apiClient.put<Cafe>('/owner/cafe', data),

  updateMenus: (items: { category: string; itemName: string; price: number; description?: string; isAvailable?: boolean }[]) =>
    apiClient.put('/owner/cafe/menus', { items }),

  registerOwner: (data: {
    email: string;
    password: string;
    name: string;
    cafeName: string;
    cafeAddress: string;
    phone?: string;
  }) => apiClient.post('/auth/register/owner', data),
};
