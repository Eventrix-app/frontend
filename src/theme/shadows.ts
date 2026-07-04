export const shadows = {
  sm: {
    elevation: 2,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  md: {
    elevation: 4,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  lg: {
    elevation: 8,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
  },
  xl: {
    elevation: 16,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
  },
} as const;

export type Shadows = typeof shadows;