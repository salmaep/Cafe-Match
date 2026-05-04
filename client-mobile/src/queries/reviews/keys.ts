export const reviewKeys = {
  all: ['reviews'] as const,
  ofCafe: (cafeId: string | number) =>
    [...reviewKeys.all, 'cafe', String(cafeId)] as const,
  summary: (cafeId: string | number) =>
    [...reviewKeys.all, 'summary', String(cafeId)] as const,
};
