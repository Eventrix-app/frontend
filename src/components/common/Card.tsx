import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import GlassSurface from './GlassSurface';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shadow?: boolean;
}

const Card: React.FC<CardProps> = ({ children, style, shadow = true }) => {
  return (
    <GlassSurface
      style={[styles.card, shadow && styles.cardShadow, style]}
      contentStyle={styles.content}
    >
      {children}
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
  },
  content: {
    padding: spacing.lg,
  },
  cardShadow: {},
});

export default Card;