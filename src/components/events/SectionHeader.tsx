import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

type SectionHeaderProps = {
  title: string;
  light?: boolean;
  hideLine?: boolean;
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, light, hideLine }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={[styles.title, light && styles.titleLight]}>{title}</Text>
      {!hideLine && <View style={[styles.line, light && styles.lineLight]} />}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  titleLight: {
    color: 'rgba(255,255,255,0.95)',
  },
  lineLight: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});