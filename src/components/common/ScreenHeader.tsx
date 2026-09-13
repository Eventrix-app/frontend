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
      {/* Absolutely centered on the row itself (not flex-centered between the side
          elements) so the title stays dead-center regardless of how wide onBack/rightAction
          are — a flex:1 middle pill centers only within whatever space those two leave,
          which visibly drifts off-center whenever they're unequal widths (e.g. a fixed-size
          back button next to a wider multi-icon rightAction). pointerEvents="box-none" lets
          taps pass through to the real back/right controls, which render above this in the
          same row and are still fully interactive. */}
      <View style={styles.titleGlass} pointerEvents="box-none">
        <View style={styles.titleContent}>
          <Text style={[styles.title, light && styles.titleLight]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
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
      {rightAction ?? <View style={styles.placeholder} />}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  row: {
    position: 'relative',
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
    textAlign: 'center',
    fontSize: 18,
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  titleLight: {
    color: colors.white,
  },
  // Spans the full row (independent of the back/right elements' actual widths) and just
  // centers its child — this, not a flex:1 sibling, is what guarantees the pill lands on
  // true screen-center regardless of how wide onBack/rightAction happen to be. left/right
  // are reserved wide enough to clear the 40px back circle (or a typical rightAction) so the
  // pill itself never overlaps them.
  titleGlass: {
    position: 'absolute',
    // row's own paddingHorizontal (16) + the 40px back circle + an 8px gap, matching the
    // gap the old flex layout had via marginHorizontal: spacing.sm — reserved on both sides
    // since rightAction is usually a similarly-sized single icon/button.
    left: spacing.md + 40 + spacing.sm,
    right: spacing.md + 40 + spacing.sm,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The actual visible capsule — hugs the text/padding instead of stretching, since its
  // parent (titleGlass) only centers rather than stretches children.
  titleContent: {
    maxWidth: '100%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
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
  placeholder: {
    width: 32,
  },
});
