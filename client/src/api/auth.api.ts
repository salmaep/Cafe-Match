import apiClient from './client';
import type { AuthResponse, User } from '../types';

export interface TwoFaPending {
  twoFaRequired: true;
  otpId: string;
  expiresAt: string;
  phoneHint?: string;
}

export type LoginResult = AuthResponse | TwoFaPending;

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post<User>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<LoginResult>('/auth/login', data),

  verify2fa: (data: { otpId: string; code: string }) =>
    apiClient.post<AuthResponse>('/auth/2fa/verify', data),

  resend2fa: (data: { otpId: string }) =>
    apiClient.post<{ otpId: string; expiresAt: string }>('/auth/2fa/resend', data),

  enrollPhone: (data: { phone: string }) =>
    apiClient.post<{ otpId: string; expiresAt: string }>('/auth/phone/enroll', data),

  verifyPhone: (data: { otpId: string; code: string; phone: string }) =>
    apiClient.post<{ ok: true }>('/auth/phone/verify', data),

  getMe: () => apiClient.get<User>('/auth/me'),
};
