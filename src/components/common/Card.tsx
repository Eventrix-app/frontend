import React from 'react';
import { View, Platform, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shadow?: boolean;
}

const Card: React.FC<CardProps> = ({ children, style, shadow = true }) => {
  return (
    <View style={[styles.card, shadow && styles.cardShadow, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
  },
  cardShadow: Platform.select({
    android: { elevation: 6 },
    default: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
    },
  }),
});

export default Card;