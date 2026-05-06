import apiClient from './client';

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  points?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement {
  id: number;
  achievementId: number;
  achievement: Achievement;
  unlockedAt: string;
  progress?: number;
  target?: number;
}

export const achievementsApi = {
  all: () => apiClient.get<Achievement[]>('/achievements'),
  mine: () => apiClient.get<UserAchievement[]>('/achievements/me'),
};
