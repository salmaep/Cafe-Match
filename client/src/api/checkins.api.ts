import apiClient from './client';
import type { Cafe } from '../types';

export interface Checkin {
  id: number;
  userId: number;
  cafeId: number;
  checkInAt: string;
  checkOutAt: string | null;
  durationMinutes: number | null;
  verified: boolean;
  cafe?: Cafe;
  cafeName?: string;
  distance?: number;
  togetherWith?: { id: number; name: string }[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatarUrl?: string | null;
  score: number;
  badge?: string | null;
  checkinCount: number;
  totalDuration?: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  active: boolean;
  lastCheckinDate: string | null;
}

export const checkinsApi = {
  checkIn: (data: { cafeId: number; latitude: number; longitude: number }) =>
    apiClient.post<Checkin>('/checkins/in', data),

  checkOut: (data: { checkinId?: number; cafeId?: number } = {}) =>
    apiClient.post<Checkin>('/checkins/out', data),

  getActive: () => apiClient.get<Checkin | null>('/checkins/active'),

  history: (page = 1, limit = 20) =>
    apiClient.get<{ data: Checkin[]; meta: { page: number; limit: number; total: number } }>(
      `/checkins/history?page=${page}&limit=${limit}`,
    ),

  leaderboard: (cafeId: number) =>
    apiClient.get<LeaderboardEntry[]>(`/checkins/cafe/${cafeId}/leaderboard`),

  streak: () => apiClient.get<StreakInfo>('/checkins/streak'),

  globalLeaderboard: () => apiClient.get<LeaderboardEntry[]>('/checkins/global-leaderboard'),
};
