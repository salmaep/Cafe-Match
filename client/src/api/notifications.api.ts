import apiClient from "./client";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: { page: number; limit: number; total: number };
}

export const notificationsApi = {
  list: (page = 1) =>
    apiClient.get<NotificationListResponse>("/notifications", {
      params: { page },
    }),
  unreadCount: () =>
    apiClient.get<{ count: number } | number>("/notifications/unread-count"),
  markRead: (id: number) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put("/notifications/read-all"),
};
