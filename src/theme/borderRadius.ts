export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const radius = borderRadius;

export type BorderRadius = typeof borderRadius;