import React, { useMemo } from 'react';
import { View, Platform, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shadow?: boolean;
}

const Card: React.FC<CardProps> = ({ children, style, shadow = true }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.card, shadow && styles.cardShadow, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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