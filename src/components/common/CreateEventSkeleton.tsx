import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useTheme } from '../../theme/ThemeContext';

// Loading placeholder for CreateEventScreen's brief organizer-verification gate (blocks
// the form for one render while useGetMyVerificationStatusQuery resolves, before either
// showing the form or redirecting to OrganizerVerification) — roughly matches the real
// form's shape (cover image, several labeled fields, a category pill row, submit buttons)
// so nothing visibly jumps once the gate clears.
const CreateEventSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <Skeleton width="100%" height={160} variant="rect" style={styles.cover} />

      {[1, 2, 3, 4].map((i) => (
        <View key={`field-${i}`} style={styles.fieldGroup}>
          <Skeleton width={110} height={12} style={styles.label} />
          <Skeleton width="100%" height={48} variant="rect" />
        </View>
      ))}

      <Skeleton width={90} height={12} style={styles.label} />
      <View style={styles.pillRow}>
        {[70, 90, 60, 80].map((w, i) => (
          <Skeleton key={i} width={w} height={32} variant="rect" style={styles.pill} />
        ))}
      </View>

      {[1, 2].map((i) => (
        <View key={`field2-${i}`} style={styles.fieldGroup}>
          <Skeleton width={130} height={12} style={styles.label} />
          <Skeleton width="100%" height={48} variant="rect" />
        </View>
      ))}

      <View style={styles.footerRow}>
        <Skeleton width="48%" height={52} variant="rect" style={styles.footerBtn} />
        <Skeleton width="48%" height={52} variant="rect" style={styles.footerBtn} />
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, padding: spacing.md },
  cover: { borderRadius: borderRadius.md, marginBottom: spacing.md },
  fieldGroup: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  pill: { borderRadius: borderRadius.pill },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  footerBtn: { borderRadius: borderRadius.md },
});

export default CreateEventSkeleton;
