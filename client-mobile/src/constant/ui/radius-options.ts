export const RADIUS_OPTIONS = [0.5, 1, 2, 5, 10] as const;

export type RadiusOption = (typeof RADIUS_OPTIONS)[number];
