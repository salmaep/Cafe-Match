import apiClient from './client';
import type { SnapPaymentResult, Transaction } from '../types/owner';

export const paymentsApi = {
  createPayment: (promotionId: number) =>
    apiClient.post<SnapPaymentResult>('/payments/create', { promotionId }),

  getStatus: (orderId: string) =>
    apiClient.get<Transaction>(`/payments/status/${orderId}`),
};
