import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useTheme } from '../../theme/ThemeContext';

// Full-screen initial-load placeholder for EventDetailsScreen — hero image, title/meta
// lines, a tab row, and a couple of content lines, roughly matching the real layout so the
// screen doesn't visibly "jump" once data lands.
const EventDetailsSkeleton: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <Skeleton width="100%" height={260 + insets.top} variant="rect" style={styles.hero} />
      <View style={styles.body}>
        <Skeleton width="70%" height={24} style={styles.line} />
        <Skeleton width="45%" height={16} style={styles.line} />
        <Skeleton width="55%" height={16} style={styles.line} />

        <View style={styles.tabRow}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={70} height={28} variant="rect" style={styles.tabPill} />
          ))}
        </View>

        <Skeleton width="100%" height={14} style={styles.line} />
        <Skeleton width="90%" height={14} style={styles.line} />
        <Skeleton width="95%" height={14} style={styles.line} />
        <Skeleton width="60%" height={14} style={styles.line} />
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  hero: { borderRadius: 0 },
  body: { padding: spacing.md },
  line: { marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  tabPill: { borderRadius: borderRadius.pill },
});

export default EventDetailsSkeleton;
