export const RADIUS_OPTIONS = [0.5, 1, 2] as const;

export type RadiusOption = (typeof RADIUS_OPTIONS)[number];
