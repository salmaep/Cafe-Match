export const API_PATHS = {
  cafes: '/cafes',
  cafeDetail: (id: string | number) => `/cafes/${id}`,
  cafesPromoted: '/cafes/promoted',
  cafesSemanticSearch: '/cafes/semantic-search',
  cafesAutocomplete: '/cafes/autocomplete',
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
  googleReviewsOfCafe: (cafeId: string | number) =>
    `/cafes/${cafeId}/google-reviews`,
  cafeLeaderboard: (cafeId: string | number) =>
    `/checkins/cafe/${cafeId}/leaderboard`,
} as const;
