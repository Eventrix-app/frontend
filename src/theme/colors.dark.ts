import { ColorPalette } from './colors.light';

// Night theme — matches eventrix-welcome-flow/src/app/globals.css's `.dark` block: a
// near-black (#0A0A0A) canvas with the same Eventrix brand pink used in every theme, so the
// accent never shifts between light/dark or between web/app.
export const colorsDark: ColorPalette = {
  primary: '#FF3366',
  primaryDark: '#FF3368',
  // `white` is used throughout the app as a *surface* color (card/sheet backgrounds), not
  // literally "white" — mapping it to the dark surface tone is what makes cards/sheets flip
  // to dark automatically once a screen migrates to useTheme().
  white: '#171717',
  text: '#EDEDF2',
  textSecondary: '#9C9CA6',
  subtext: '#9C9CA6',
  textInverse: '#FFFFFF',
  muted: '#1C1C1C',
  background: '#0A0A0A',
  border: 'rgba(255,255,255,0.14)',
  borderLight: 'rgba(255,255,255,0.08)',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  // Soft status tints — a translucent wash of the bright dark-mode status color rather than
  // the light theme's pale solid, so a banner reads clearly against the near-black background
  // instead of looking like a blown-out light-mode chip pasted onto dark UI. The bright status
  // color itself doubles as the *SoftText variant, same pattern as accent/accent-foreground in
  // eventrix-welcome-flow's `.dark` CSS block.
  errorSoft: 'rgba(248, 113, 113, 0.16)',
  errorSoftText: '#F87171',
  warningSoft: 'rgba(251, 191, 36, 0.16)',
  warningSoftText: '#FBBF24',
  successSoft: 'rgba(52, 211, 153, 0.16)',
  successSoftText: '#34D399',
  shadow: '#FF3366',
  secondary: '#60A5FA',
  brandPink: '#FF3366',
  brandNavy: '#6C7FD8',
  neutralLine: '#3A3A42',
  stone600: '#A8A29E',
  backgroundSecondary: '#141414',
  overlay: 'rgba(0,0,0,0.65)',
  brandPinkDark: '#FF3368',
  neutralBg: '#0F0F0F',
  inputBg: '#1A1A1A',
  placeholder: '#6B6B75',
  textMuted: 'rgba(255,255,255,0.5)',
} as const;
