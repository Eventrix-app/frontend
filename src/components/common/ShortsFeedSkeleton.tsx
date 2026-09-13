import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';

/**
 * Placeholder for a single reel while the feed loads.
 *
 * Deliberately laid out to match the real slide — author row bottom-left, caption lines
 * above it, action rail on the right — so the content does not jump when it arrives. A
 * centred spinner would tell the user less and still shift everything on load.
 *
 * Rendered on a black background rather than the theme surface, because the Shorts tab is
 * always dark: a light skeleton here would flash white before the first frame decodes.
 */
export const ShortsFeedSkeleton: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Skeleton width={90} height={20} />
      </View>

      <View style={styles.bottom}>
        <View style={styles.creator}>
          <View style={styles.creatorRow}>
            <Skeleton width={32} height={32} variant="circle" />
            <Skeleton width={130} height={14} />
          </View>
          <Skeleton width="85%" height={13} />
          <Skeleton width="55%" height={13} />
          <Skeleton width={150} height={26} />
        </View>

        <View style={styles.actions}>
          <Skeleton width={28} height={28} variant="circle" />
          <Skeleton width={28} height={28} variant="circle" />
          <Skeleton width={28} height={28} variant="circle" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 2,
  },
  bottom: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  creator: { flex: 1, gap: spacing.sm },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { alignItems: 'center', gap: spacing.md },
});

export default ShortsFeedSkeleton;
