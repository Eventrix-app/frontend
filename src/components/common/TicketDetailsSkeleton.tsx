import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useTheme } from '../../theme/ThemeContext';

// Full-screen initial-load placeholder for TicketDetailsScreen — mirrors the real ticket
// stub's shape (header/status row, booking ref, QR box, total row) so the screen doesn't
// visibly "jump" once the enrollment loads.
const TicketDetailsSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <View style={styles.ticket}>
        <View style={styles.header}>
          <Skeleton width={120} height={12} />
          <Skeleton width={70} height={20} variant="rect" style={styles.statusPill} />
        </View>
        <Skeleton width={160} height={14} style={styles.line} />
        <Skeleton width="60%" height={16} style={styles.line} />
        <Skeleton width={140} height={140} variant="rect" style={styles.qrBox} />
        <View style={styles.totalRow}>
          <Skeleton width={90} height={14} />
          <Skeleton width={70} height={20} />
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, padding: spacing.md },
  ticket: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statusPill: { borderRadius: borderRadius.sm },
  line: { marginBottom: spacing.sm },
  qrBox: { alignSelf: 'center', borderRadius: borderRadius.md, marginVertical: spacing.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
});

export default TicketDetailsSkeleton;
