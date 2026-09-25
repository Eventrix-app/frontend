import React from 'react';
import { View, StyleSheet } from 'react-native';
import EventCardSkeleton from './EventCardSkeleton';
import { spacing } from '../../theme/spacing';

// Full-screen initial-load placeholder for any card-list screen (Explore, Search, ...) —
// swapped in for the old center-screen ActivityIndicator so the layout the user is about
// to see is legible at a glance instead of a blank screen with a spinner.
const EventListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View style={styles.root}>
    {Array.from({ length: count }).map((_, i) => (
      <EventCardSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  root: { padding: spacing.md },
});

export default EventListSkeleton;
