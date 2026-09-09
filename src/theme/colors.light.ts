// Day theme — identical to the values the app already shipped with (theme/colors.ts).
// Kept as its own file (rather than colors.ts importing this) so colors.ts, imported
// statically by ~40+ screens, is completely untouched and those screens keep rendering
// exactly as before until migrated to useTheme() one at a time.
export interface ColorPalette {
  primary: string;
  primaryDark: string;
  white: string;
  text: string;
  textSecondary: string;
  subtext: string;
  textInverse: string;
  muted: string;
  background: string;
  border: string;
  borderLight: string;
  success: string;
  warning: string;
  error: string;
  shadow: string;
  secondary: string;
  brandPink: string;
  brandNavy: string;
  neutralLine: string;
  stone600: string;
  backgroundSecondary: string;
  overlay: string;
  brandPinkDark: string;
  neutralBg: string;
  inputBg: string;
  placeholder: string;
  textMuted: string;
}

export const colorsLight: ColorPalette = {
  primary: '#FF3366',
  primaryDark: '#FF3368',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  subtext: '#6B6B80',
  textInverse: '#FFFFFF',
  muted: '#F5F5F7',
  background: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  shadow: '#FF3366',
  secondary: '#3B82F6',
  brandPink: '#FF3366',
  brandNavy: '#142767',
  neutralLine: '#D8D8D8',
  stone600: '#57534E',
  backgroundSecondary: '#F9FAFB',
  overlay: 'rgba(0,0,0,0.5)',
  brandPinkDark: '#FF3368',
  neutralBg: '#FAFAFC',
  inputBg: '#F6F6F8',
  placeholder: '#A0A0AB',
  textMuted: 'rgba(0,0,0,0.5)',
};
