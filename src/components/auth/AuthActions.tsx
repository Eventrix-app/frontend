import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { LeftArrow, RightArrow } from '../common/Icons';
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
}) => (
  <View style={styles.row}>
    <TouchableOpacity style={styles.backWrap} onPress={onBack} activeOpacity={0.8}>
      <View style={styles.backBtn}>
        <View style={styles.backContent}>
          <LeftArrow color={colors.brandPink} />
        </View>
      </View>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.primaryWrap, primaryDisabled && styles.primaryDisabled]}
      onPress={onPrimary}
      disabled={primaryDisabled}
      activeOpacity={0.9}
    >
      <View style={styles.primaryBtn}>
        <View style={styles.primaryContent}>
          <Text style={styles.primaryText}>{primaryLabel}</Text>
          <RightArrow color={colors.white} />
        </View>
      </View>
    </TouchableOpacity>
  </View>
);

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
}) => (
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

const styles = StyleSheet.create({
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
    borderRadius: 16,
  },
  primaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  backArrow: {
    fontSize: 22,
    color: colors.brandPink,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.brandPink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  primaryDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
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
