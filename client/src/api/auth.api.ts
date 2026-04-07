import apiClient from './client';
import type { AuthResponse, User } from '../types';

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post<User>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  getMe: () => apiClient.get<User>('/auth/me'),
};
