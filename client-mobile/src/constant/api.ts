export const API_PATHS = {
  cafes: '/cafes',
  cafeDetail: (id: string | number) => `/cafes/${id}`,
  cafesPromoted: '/cafes/promoted',
  purposes: '/purposes',
  authLogin: '/auth/login',
  authRegister: '/auth/register',
  authMe: '/auth/me',
  bookmarks: '/bookmarks',
  bookmarkToggle: (cafeId: string | number) => `/bookmarks/${cafeId}`,
  favorites: '/favorites',
  favoriteToggle: (cafeId: string | number) => `/favorites/${cafeId}`,
  reviewsOfCafe: (cafeId: string | number) => `/reviews/cafe/${cafeId}`,
  reviewSummary: (cafeId: string | number) => `/reviews/cafe/${cafeId}/summary`,
  cafeLeaderboard: (cafeId: string | number) =>
    `/checkins/cafe/${cafeId}/leaderboard`,
} as const;
