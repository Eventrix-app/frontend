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
  errorSoft: string;
  errorSoftText: string;
  warningSoft: string;
  warningSoftText: string;
  successSoft: string;
  successSoftText: string;
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
  muted: '#F1ECE4',
  background: '#FAF7F4',
  border: '#E5DED3',
  borderLight: '#EFE8DF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  errorSoft: '#FFEBEB',
  errorSoftText: '#B91C1C',
  warningSoft: '#FEF3C7',
  warningSoftText: '#92400E',
  successSoft: '#D1FAE5',
  successSoftText: '#065F46',
  shadow: '#FF3366',
  secondary: '#3B82F6',
  brandPink: '#FF3366',
  brandNavy: '#142767',
  neutralLine: '#D8D8D8',
  stone600: '#57534E',
  backgroundSecondary: '#F5F1EA',
  overlay: 'rgba(0,0,0,0.5)',
  brandPinkDark: '#FF3368',
  neutralBg: '#F6F2EC',
  inputBg: '#F2ECE4',
  placeholder: '#A0A0AB',
  textMuted: 'rgba(0,0,0,0.5)',
};
