import apiClient from './client';

export const analyticsApi = {
  track: (cafeId: number, eventType: string, promotionId?: number) =>
    apiClient.post('/analytics/track', { cafeId, eventType, promotionId }),
};
