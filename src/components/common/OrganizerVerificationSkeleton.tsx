import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useTheme } from '../../theme/ThemeContext';

// Loading placeholder for OrganizerVerificationScreen — roughly matches the real form's
// shape (intro copy, three labeled inputs, three document rows, a submit button) so the
// screen doesn't visibly "jump" once useGetMyVerificationStatusQuery resolves.
const OrganizerVerificationSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <Skeleton width="100%" height={14} style={styles.line} />
      <Skeleton width="80%" height={14} style={styles.line} />

      {[1, 2, 3].map((i) => (
        <View key={`field-${i}`} style={styles.fieldGroup}>
          <Skeleton width={120} height={12} style={styles.label} />
          <Skeleton width="100%" height={48} variant="rect" />
        </View>
      ))}

      {[1, 2, 3].map((i) => (
        <View key={`doc-${i}`} style={styles.docRow}>
          <View style={styles.docText}>
            <Skeleton width="60%" height={14} style={styles.line} />
            <Skeleton width="85%" height={12} />
          </View>
          <Skeleton width={90} height={36} variant="rect" style={styles.docBtn} />
        </View>
      ))}

      <Skeleton width="100%" height={48} variant="rect" style={styles.submitBtn} />
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, padding: spacing.md },
  line: { marginBottom: spacing.xs },
  fieldGroup: { marginTop: spacing.sm, marginBottom: spacing.xs },
  label: { marginBottom: spacing.xs },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  docText: { flex: 1, gap: spacing.xs },
  docBtn: { borderRadius: borderRadius.sm },
  submitBtn: { marginTop: spacing.lg, borderRadius: borderRadius.md },
});

export default OrganizerVerificationSkeleton;
