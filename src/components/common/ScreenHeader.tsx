import React, { useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from './Text';
import { LeftArrow } from './Icons';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  light?: boolean;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  rightAction,
  light = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {onBack ? (
        <View style={styles.backGlass}>
          <View style={styles.backContent}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={8}>
              <LeftArrow color={light ? colors.white : colors.brandPink} size={22} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.titleGlass}>
        <View style={styles.titleContent}>
          <Text style={[styles.title, light && styles.titleLight]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      {rightAction ?? <View style={styles.placeholder} />}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backGlass: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  backContent: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  titleLight: {
    color: colors.white,
  },
  titleGlass: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginHorizontal: spacing.sm,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  titleContent: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  placeholder: {
    width: 32,
  },
});
