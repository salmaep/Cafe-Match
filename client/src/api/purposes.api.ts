import apiClient from './client';
import type { Purpose } from '../types';

export const purposesApi = {
  getAll: () => apiClient.get<Purpose[]>('/purposes'),
};
