import { ColorPalette } from './colors.light';

// Night theme — ported from eventrix-welcome-flow/src/app/globals.css's `.dark` block
// (oklch values there approximated to hex/rgba, since RN doesn't parse oklch()). Brand pink
// stays the constant identity color in both themes (per the web version's own "one locked
// accent color" principle); what flips is backgrounds, surfaces, text, and borders.
export const colorsDark: ColorPalette = {
  primary: '#FF3366',
  primaryDark: '#FF3368',
  // `white` is used throughout the app as a *surface* color (card/sheet backgrounds), not
  // literally "white" — mapping it to the dark surface tone is what makes cards/sheets flip
  // to dark automatically once a screen migrates to useTheme().
  white: '#1E1E24',
  text: '#EDEDF2',
  textSecondary: '#9C9CA6',
  subtext: '#9C9CA6',
  textInverse: '#FFFFFF',
  muted: '#26262D',
  background: '#17171B',
  border: 'rgba(255,255,255,0.14)',
  borderLight: 'rgba(255,255,255,0.08)',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  shadow: '#FF3366',
  secondary: '#60A5FA',
  brandPink: '#FF3366',
  brandNavy: '#6C7FD8',
  neutralLine: '#3A3A42',
  stone600: '#A8A29E',
  backgroundSecondary: '#1C1C21',
  overlay: 'rgba(0,0,0,0.65)',
  brandPinkDark: '#FF3368',
  neutralBg: '#151518',
  inputBg: '#202026',
  placeholder: '#6B6B75',
  textMuted: 'rgba(255,255,255,0.5)',
} as const;
