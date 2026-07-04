export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  button: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.3 },
} as const;

export type Typography = typeof typography;