import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import GlassSurface from '../common/GlassSurface';
import { LeftArrow, RightArrow } from '../common/Icons';

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
      <GlassSurface style={styles.backBtn} contentStyle={styles.backContent}>
        <LeftArrow color={colors.brandPink} />
      </GlassSurface>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.primaryWrap, primaryDisabled && styles.primaryDisabled]}
      onPress={onPrimary}
      disabled={primaryDisabled}
      activeOpacity={0.9}
    >
      <GlassSurface style={styles.primaryBtn} contentStyle={styles.primaryContent}>
        <Text style={styles.primaryText}>{primaryLabel}</Text>
        <RightArrow color={colors.white} />
      </GlassSurface>
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
    <TouchableOpacity style={styles.outlineBtn} onPress={onLeft} activeOpacity={0.8}>
      <Text style={styles.outlineText}>{leftLabel}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.outlineBtn} onPress={onRight} activeOpacity={0.8}>
      <Text style={styles.outlineText}>{rightLabel}</Text>
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
    overflow: 'hidden',
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    backgroundColor: colors.white,
  },
  backContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  primaryWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
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
    backgroundColor: colors.brandPink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  outlineBtn: {
    flex: 1,
    height: 37,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    color: colors.brandPink,
    fontSize: 14,
    fontWeight: '600',
  },
});
