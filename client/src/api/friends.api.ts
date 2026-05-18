import apiClient from "./client";

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
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface FriendPreview {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export const friendsApi = {
  list: () => apiClient.get<Friend[]>("/friends"),
  pendingRequests: () =>
    apiClient.get<FriendRequest[]>("/friends/requests/pending"),
  sendRequest: (friendCode: string) =>
    apiClient.post("/friends/request", { friendCode }),
  accept: (requestId: number) =>
    apiClient.put(`/friends/request/${requestId}/accept`),
  reject: (requestId: number) =>
    apiClient.put(`/friends/request/${requestId}/reject`),
  throwEmoji: (friendId: number, emoji: string) =>
    apiClient.post(`/friends/${friendId}/emoji`, { emoji }),
  /** Resolve a friend code to minimal profile preview before sending a request.
   *  Returns null when no user matches (or the code is the requester's own). */
  lookup: (code: string) =>
    apiClient.get<FriendPreview | null>("/friends/lookup", {
      params: { code },
    }),
};
