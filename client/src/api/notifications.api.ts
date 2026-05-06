import apiClient from './client';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (page = 1) => apiClient.get<Notification[]>('/notifications', { params: { page } }),
  unreadCount: () => apiClient.get<{ count: number } | number>('/notifications/unread-count'),
  markRead: (id: number) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/read-all'),
};
