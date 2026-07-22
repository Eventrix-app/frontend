import React, { useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { LeftArrow } from '../common/Icons';
import { Text } from '../common/Text';

type AuthActionsProps = {
  primaryLabel: string;
  onPrimary: () => void;
  onBack: () => void;
  primaryDisabled?: boolean;
};

export const AuthActions: React.FC<AuthActionsProps> = ({
  primaryLabel,
  onPrimary,
  onBack,
  primaryDisabled,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.backWrap} onPress={onBack} activeOpacity={0.8}>
        <View style={styles.backBtn}>
          <View style={styles.backContent}>
            <LeftArrow color={colors.brandPink} />
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.primaryWrap}
        onPress={onPrimary}
        disabled={primaryDisabled}
        activeOpacity={0.9}
      >
        <View style={[styles.primaryBtn, primaryDisabled && styles.primaryBtnDisabled]}>
          <View style={styles.primaryContent}>
            <Text style={[styles.primaryText, primaryDisabled && styles.primaryTextDisabled]}>
              {primaryLabel}
            </Text>
            <Text style={[styles.primaryText, primaryDisabled && styles.primaryTextDisabled]}>
              →
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

type OutlineButtonRowProps = {
  leftLabel: string;
  rightLabel: string;
  onLeft: () => void;
  onRight: () => void;
};

export const OutlineButtonRow: React.FC<OutlineButtonRowProps> = ({
  leftLabel,
  rightLabel,
  onLeft,
  onRight,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.outlineRow}>
      <TouchableOpacity onPress={onLeft} activeOpacity={0.8} style={styles.outlineWrap}>
        <View style={styles.outlineBtn}>
          <View style={styles.outlineContent}>
            <Text style={styles.outlineText}>{leftLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRight} activeOpacity={0.8} style={styles.outlineWrap}>
        <View style={styles.outlineBtn}>
          <View style={styles.outlineContent}>
            <Text style={styles.outlineText}>{rightLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  backWrap: {
    borderRadius: 16,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(244,51,98,0.35)',
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
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  primaryWrap: {
    flex: 1,
    borderRadius: 20,
  },
  primaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
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
  primaryBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
  primaryText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryTextDisabled: {
    color: '#B5B5BD',
  },
  outlineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  outlineWrap: {
    flex: 1,
  },
  outlineBtn: {
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(244,51,98,0.35)',
  },
  outlineContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  outlineText: {
    color: colors.brandPink,
    fontSize: 14,
    fontWeight: '600',
  },
});
