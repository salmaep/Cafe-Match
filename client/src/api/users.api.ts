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
};
