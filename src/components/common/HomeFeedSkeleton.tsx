import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Home's placeholders are exported per-section rather than as one full-feed block, because
// only some of the feed actually waits on the network. The category row is bundled PNGs and
// the highlights strip is a hardcoded array — both render instantly. Standing a single
// skeleton in front of everything would hide content that is already available, and would
// order the placeholders differently from the real layout, so the page visibly reshuffles
// when data lands. Dropping these into their own slots keeps the section order identical
// loading and loaded, so nothing moves.

/** Stands in for FeaturedCarousel — one full-bleed card with the next one peeking. */
export const FeaturedCarouselSkeleton: React.FC = () => (
  <View style={styles.featuredWrap}>
    <View style={styles.sectionHeader}>
      <Skeleton width={150} height={18} />
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      contentContainerStyle={styles.carouselRow}
    >
      <Skeleton width={SCREEN_WIDTH - spacing.sm * 2} height={180} style={styles.card} />
      <Skeleton width={SCREEN_WIDTH - spacing.sm * 2} height={180} style={styles.card} />
    </ScrollView>
  </View>
);

/**
 * Stands in for EventInterestCard. Not EventCardSkeleton — that mirrors the compact card
 * used by Explore/Search lists, whereas the interest cards on Home are taller and carry a
 * wide image above the text block.
 */
export const InterestCardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <View style={styles.interestWrap}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.interestCard}>
        <Skeleton width="100%" height={160} style={styles.card} />
        <View style={styles.interestBody}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={13} />
          <Skeleton width="55%" height={13} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  featuredWrap: {
    paddingBottom: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  carouselRow: {
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.md,
  },
  interestWrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  interestCard: {
    gap: spacing.sm,
  },
  interestBody: {
    gap: spacing.sm,
  },
});
