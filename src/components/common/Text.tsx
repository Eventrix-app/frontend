import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { ZalandoSansExpanded, Poppins } from '../../theme/fonts';

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'label'
  | 'button';

// Titles/headings/subtitles render in Zalando Sans Expanded at varying weights; every other
// piece of copy (body, caption, label, button) renders in Poppins. This is the single place
// that encodes that rule for callers that opt into a `variant` instead of a raw style object.
const VARIANT_STYLES: Record<TextVariant, TextStyle> = {
  h1: { fontFamily: ZalandoSansExpanded[800], fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: ZalandoSansExpanded[700], fontSize: 26, lineHeight: 34 },
  h3: { fontFamily: ZalandoSansExpanded[600], fontSize: 22, lineHeight: 28 },
  h4: { fontFamily: ZalandoSansExpanded[600], fontSize: 18, lineHeight: 24 },
  title: { fontFamily: ZalandoSansExpanded[700], fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: ZalandoSansExpanded[500], fontSize: 16, lineHeight: 22 },
  body: { fontFamily: Poppins[400], fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: Poppins[400], fontSize: 13, lineHeight: 18 },
  label: { fontFamily: Poppins[500], fontSize: 14, lineHeight: 20 },
  button: { fontFamily: Poppins[600], fontSize: 16, letterSpacing: 0.3 },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof typeof colors;
}

// Drop-in replacement for RN's <Text>: every screen imports this instead, so body copy
// defaults to Poppins app-wide even where the caller only passes ad-hoc fontSize/fontWeight
// styles. A `style` prop that sets its own fontFamily (e.g. a title style overridden to
// Zalando Sans Expanded) always wins, since it's applied after the variant default below.
const Text = React.forwardRef<RNText, TextProps>(
  ({ variant = 'body', color, style, ...rest }, ref) => (
    <RNText
      ref={ref}
      style={[VARIANT_STYLES[variant], color ? { color: colors[color] } : null, style]}
      {...rest}
    />
  )
);
Text.displayName = 'Text';

export { Text };
export default Text;
