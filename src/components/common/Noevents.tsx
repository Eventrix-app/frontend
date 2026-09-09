import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

// require() takes a static literal, so both variants are resolved at module load and
// picked at render — the bundler cannot follow a computed path.
const LIGHT_ILLUSTRATION = require('../../../assets/shared/placeholders/no-events.png');
const DARK_ILLUSTRATION = require('../../../assets/shared/placeholders/no-events-black.png');
import { LeftArrow } from './Icons';

interface Props {
  onBack?: () => void;
  onGoHome?: () => void;
  title?: string;
  subtitle?: string;
  inline?: boolean; // true = fits inside existing scroll content, no flex:1, no Back/Home buttons
}

const Noevents: React.FC<Props> = ({
  onBack,
  onGoHome,
  title = 'No events found',
  subtitle = 'Try adjusting your filters or interests.',
  inline = false,
}) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={inline ? styles.rootInline : styles.root}>
      <Image
        source={theme === 'dark' ? DARK_ILLUSTRATION : LIGHT_ILLUSTRATION}
        style={inline ? styles.illustrationInline : styles.illustration}
        resizeMode="contain"
      />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {!inline && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
            <LeftArrow color={colors.brandPink} size={15} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeBtn} onPress={onGoHome} activeOpacity={0.85}>
            <Text style={styles.homeText}>Go to Home</Text>
            <Text style={styles.homeIcon}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  rootInline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  illustration: {
    width: 260,
    height: 260,
    marginBottom: spacing.xl,
  },
  illustrationInline: {
    width: 180,
    height: 180,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs ?? 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backText: {
    color: colors.brandPink,
    fontSize: 15,
    fontWeight: '700',
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandPink,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  homeText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  homeIcon: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default Noevents;