import apiClient from "./client";

export type AchievementCategory =
  | "visit_purpose"
  | "visit_general"
  | "social"
  | "streak"
  | "special"
  | "points"
  | "table"
  | "explorer"
  | "time";

export type AchievementTier =
  | "bronze_1"
  | "bronze_2"
  | "silver_1"
  | "silver_2"
  | "gold_1"
  | "gold_2"
  | "platinum";

export interface Achievement {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  threshold: number;
  purposeSlug: string | null;
  iconUrl: string | null;
}

/** /achievements/me returns Achievement[] augmented with per-user progress. */
export interface UserAchievement extends Achievement {
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface PointsSummary {
  total: number;
  recent: {
    eventType: string;
    points: number;
    meta: any;
    createdAt: string;
  }[];
}

export const achievementsApi = {
  all: () => apiClient.get<Achievement[]>("/achievements"),
  mine: () => apiClient.get<UserAchievement[]>("/achievements/me"),
  points: () => apiClient.get<PointsSummary>("/achievements/points"),
};
