import React from 'react';
import { Text as RNText, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface TextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  color?: keyof typeof colors;
  style?: TextStyle | TextStyle[] | (TextStyle | false)[];
  numberOfLines?: number;
}

const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  color = 'text',
  style,
  numberOfLines,
}) => {
  const getVariantStyle = (): TextStyle => {
    const variants: Record<string, TextStyle> = {
      h1: {
        fontSize: 48,
        fontWeight: '700',
        lineHeight: 56,
      },
      h2: {
        fontSize: 36,
        fontWeight: '700',
        lineHeight: 44,
      },
      h3: {
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 36,
      },
      h4: {
        fontSize: 24,
        fontWeight: '600',
        lineHeight: 32,
      },
      body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
      },
      caption: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
      },
      label: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
      },
    };

    return variants[variant] || variants.body;
  };

  return (
    <RNText
      style={[getVariantStyle(), { color: colors[color] }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </RNText>
  );
};

export default Text;