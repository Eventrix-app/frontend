import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Initial-load placeholder for the Edit Profile form.
 *
 * Laid out as avatar / paired name fields / stacked full-width fields, matching the real
 * form, so nothing shifts when the profile arrives.
 *
 * This is not only cosmetic. The form's inputs are prefilled from getMe by an effect, so
 * without it the user sees a fully interactive but *empty* form and can start typing into
 * fields that are about to be overwritten. Showing the skeleton means the form only ever
 * appears once it holds real values.
 */
export const EditProfileSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <View style={styles.avatarSection}>
        <Skeleton width={96} height={96} variant="circle" />
        <Skeleton width={110} height={14} style={styles.changePhoto} />
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Skeleton width={80} height={13} style={styles.label} />
          <Skeleton width="100%" height={56} />
        </View>
        <View style={styles.half}>
          <Skeleton width={80} height={13} style={styles.label} />
          <Skeleton width="100%" height={56} />
        </View>
      </View>

      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.field}>
          <Skeleton width={90} height={13} style={styles.label} />
          <Skeleton width="100%" height={56} />
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { padding: spacing.md, gap: spacing.md },
  avatarSection: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  changePhoto: { marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1, gap: spacing.xs },
  field: { gap: spacing.xs },
  label: { marginBottom: 2 },
});

export default EditProfileSkeleton;
