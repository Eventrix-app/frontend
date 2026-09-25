import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  count?: number;
  // A leading circle (avatar/icon) before the text lines — matches rows like
  // Notifications' type icon or CheckIn's attendee list, off for plain title/meta rows
  // like MyEvents or RefundApproval.
  showLeadingCircle?: boolean;
}

const SimpleRowSkeleton: React.FC<{ styles: ReturnType<typeof createStyles>; showLeadingCircle?: boolean }> = ({
  styles,
  showLeadingCircle,
}) => (
  <View style={styles.row}>
    {showLeadingCircle ? <Skeleton width={44} height={44} variant="circle" style={styles.leading} /> : null}
    <View style={styles.lines}>
      <Skeleton width="70%" height={16} style={styles.line} />
      <Skeleton width="45%" height={13} style={styles.line} />
      <Skeleton width="55%" height={13} />
    </View>
  </View>
);

// Generic full-screen initial-load placeholder for simple title/meta card lists —
// NotificationsScreen, MyEventsScreen, RefundApprovalScreen, ManageTicketTypesScreen, and
// CheckInScreen's attendee search all render this same row shape (leading element + a
// title line + one or two meta lines), so one parameterized skeleton covers all of them
// instead of a near-duplicate file per screen.
const SimpleListSkeleton: React.FC<Props> = ({ count = 4, showLeadingCircle = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      {Array.from({ length: count }).map((_, i) => (
        <SimpleRowSkeleton key={i} styles={styles} showLeadingCircle={showLeadingCircle} />
      ))}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  leading: {},
  lines: { flex: 1, justifyContent: 'center' },
  line: { marginBottom: spacing.xs },
});

export default SimpleListSkeleton;
