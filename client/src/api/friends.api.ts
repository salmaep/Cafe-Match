import apiClient from './client';

export interface Friend {
  id: number;
  name: string;
  email: string;
  friendCode: string;
  avatarUrl?: string | null;
}

export interface FriendRequest {
  id: number;
  fromUser: Friend;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export const friendsApi = {
  list: () => apiClient.get<Friend[]>('/friends'),
  pendingRequests: () => apiClient.get<FriendRequest[]>('/friends/requests/pending'),
  sendRequest: (friendCode: string) =>
    apiClient.post('/friends/request', { friendCode }),
  accept: (requestId: number) => apiClient.put(`/friends/request/${requestId}/accept`),
  reject: (requestId: number) => apiClient.put(`/friends/request/${requestId}/reject`),
  throwEmoji: (friendId: number, emoji: string) =>
    apiClient.post(`/friends/${friendId}/emoji`, { emoji }),
};
