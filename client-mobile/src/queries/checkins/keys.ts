export const checkinKeys = {
  all: ['checkins'] as const,
  leaderboard: (cafeId: string | number) =>
    [...checkinKeys.all, 'leaderboard', String(cafeId)] as const,
  active: () => [...checkinKeys.all, 'active'] as const,
  streak: () => [...checkinKeys.all, 'streak'] as const,
};
