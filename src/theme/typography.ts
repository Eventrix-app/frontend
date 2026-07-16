import { ZalandoSansExpanded, Poppins } from './fonts';

export const typography = {
  title: { fontFamily: ZalandoSansExpanded[700], fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: ZalandoSansExpanded[500], fontSize: 16, lineHeight: 24 },
  button: { fontFamily: Poppins[600], fontSize: 16, letterSpacing: 0.3 },
} as const;

export type Typography = typeof typography;