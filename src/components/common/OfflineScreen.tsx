import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

// Was a ~32KB base64 string inlined in this file, duplicating an asset that already
// existed. Two variants are needed for dark mode and require() takes a static literal, so
// both are resolved at module load and picked at render.
const LIGHT_ILLUSTRATION = require('../../../assets/shared/placeholders/offline.png');
const DARK_ILLUSTRATION = require('../../../assets/shared/placeholders/offline-black.png');

interface Props {
  onRetry: () => void;
}


interface Props {
  onRetry: () => void;
}

const OfflineScreen: React.FC<Props> = ({ onRetry }) => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <Image
        source={theme === 'dark' ? DARK_ILLUSTRATION : LIGHT_ILLUSTRATION}
        style={styles.illustration}
        resizeMode="contain"
      />

      <Text style={styles.title}>You're offline</Text>
      <Text style={styles.subtitle}>Please check your connection and try again.</Text>

      <TouchableOpacity style={styles.refreshBtn} onPress={onRetry} activeOpacity={0.85}>
        <Text style={styles.refreshIcon}>↻</Text>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
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
  illustration: {
    width: 260,
    height: 260,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs ?? 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brandPink,
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  refreshIcon: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  refreshText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default OfflineScreen;