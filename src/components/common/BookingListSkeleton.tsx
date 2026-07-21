import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { colors } from '../../theme/colors';

const BookingRowSkeleton: React.FC = () => (
  <View style={styles.row}>
    <Skeleton width={64} height={64} variant="rect" style={styles.thumb} />
    <View style={styles.info}>
      <Skeleton width="80%" height={16} style={styles.line} />
      <Skeleton width="50%" height={13} style={styles.line} />
      <Skeleton width="40%" height={13} />
    </View>
  </View>
);

// Full-screen initial-load placeholder for BookingsScreen's enrollment/waitlist lists —
// in place of a center-screen spinner.
const BookingListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View style={styles.root}>
    {Array.from({ length: count }).map((_, i) => (
      <BookingRowSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  root: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  thumb: { borderRadius: borderRadius.sm },
  info: { flex: 1, justifyContent: 'center' },
  line: { marginBottom: spacing.xs },
});

export default BookingListSkeleton;
