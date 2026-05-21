import apiClient from "./client";
import type { User } from "../types";

export const usersApi = {
  getMe: () =>
    apiClient.get<User & { avatarUrl?: string | null; friendCode?: string }>(
      "/users/me",
    ),

  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    apiClient.patch<User & { avatarUrl?: string | null }>("/users/me", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<{ ok: true }>("/users/me/password", data),

  deleteAccount: (data: {
    password?: string;
    emailConfirmation?: string;
    acknowledge: boolean;
  }) => apiClient.delete<{ ok: true }>("/users/me", { data }),

  requestAccountDeletion: (data: {
    email: string;
    friendCode?: string;
    reason?: string;
    acknowledge: boolean;
  }) =>
    apiClient.post<{ ok: true; message: string }>("/deletion-requests", data),
};
