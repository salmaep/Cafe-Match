import apiClient from "./client";

export interface RecapTopCafe {
  cafeId: number;
  name: string;
  visits: number;
  photo: string | null;
}

export interface RecapData {
  yearTitle: string;
  totalCheckins: number;
  totalCafesVisited: number;
  totalDurationHours: number;
  topCafes: RecapTopCafe[];
  topPurpose: string;
  totalReviews: number;
  achievementsUnlocked: number;
  friendsMade: number;
  longestStreak: number;
  favoriteDay: string;
  averageSessionMinutes: number;
}

export interface UserRecap {
  id: number;
  userId: number;
  year: number;
  recapData: RecapData;
  generatedAt: string;
}

export const recapsApi = {
  get: (year: number) => apiClient.get<UserRecap | null>(`/recaps/${year}`),
  generate: (year: number) =>
    apiClient.post<RecapData>("/recaps/generate", { year }),
};
