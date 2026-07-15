// Two-family type system used across every screen:
//  - Zalando Sans Expanded -> titles / subtitles / headings (wide, display-oriented)
//  - Poppins                -> body copy, labels, buttons, captions
// Both are loaded as static per-weight font files (see App.tsx's useFonts call), so we
// select the exact weight-named font instead of relying on RN's `fontWeight`, which does
// not reliably synthesize weights for custom fonts on Android.

export type FontWeightKey = 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export const ZalandoSansExpanded: Record<FontWeightKey, string> = {
  200: 'ZalandoSansExpanded_200ExtraLight',
  300: 'ZalandoSansExpanded_300Light',
  400: 'ZalandoSansExpanded_400Regular',
  500: 'ZalandoSansExpanded_500Medium',
  600: 'ZalandoSansExpanded_600SemiBold',
  700: 'ZalandoSansExpanded_700Bold',
  800: 'ZalandoSansExpanded_800ExtraBold',
  900: 'ZalandoSansExpanded_900Black',
};

export const Poppins: Record<FontWeightKey, string> = {
  200: 'Poppins_200ExtraLight',
  300: 'Poppins_300Light',
  400: 'Poppins_400Regular',
  500: 'Poppins_500Medium',
  600: 'Poppins_600SemiBold',
  700: 'Poppins_700Bold',
  800: 'Poppins_800ExtraBold',
  900: 'Poppins_900Black',
};

// Maps an arbitrary RN `fontWeight` value (numeric string, 'bold', 'normal', or already a
// bucket like 600) onto the nearest weight we actually loaded a font file for.
function normalizeWeight(weight?: string | number): FontWeightKey {
  if (weight === 'bold') return 700;
  if (weight === 'normal' || weight === undefined) return 400;
  const n = typeof weight === 'number' ? weight : parseInt(weight, 10);
  if (Number.isNaN(n)) return 400;
  const buckets: FontWeightKey[] = [200, 300, 400, 500, 600, 700, 800, 900];
  return buckets.reduce((closest, bucket) =>
    Math.abs(bucket - n) < Math.abs(closest - n) ? bucket : closest
  , 400 as FontWeightKey);
}

export function zalandoWeight(weight?: string | number): string {
  return ZalandoSansExpanded[normalizeWeight(weight)];
}

export function poppinsWeight(weight?: string | number): string {
  return Poppins[normalizeWeight(weight)];
}

export const Fonts = {
  zalando: ZalandoSansExpanded,
  poppins: Poppins,
};
