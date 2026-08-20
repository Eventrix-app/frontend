import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Initial-load placeholder for the Edit Profile form.
 *
 * Laid out to match the real form field-for-field, so nothing shifts when the profile
 * arrives.
 *
 * This is not only cosmetic. The form's inputs are prefilled from getMe by an effect, so
 * without it the user sees a fully interactive but *empty* form and can start typing into
 * fields that are about to be overwritten. Showing the skeleton means the form only ever
 * appears once it holds real values.
 */
type Styles = ReturnType<typeof createStyles>;

const PairedRow: React.FC<{ styles: Styles }> = ({ styles }) => (
  <View style={styles.row}>
    {[0, 1].map((i) => (
      <View key={i} style={styles.half}>
        <Skeleton width={80} height={13} style={styles.label} />
        <Skeleton width="100%" height={56} />
      </View>
    ))}
  </View>
);

const FullRow: React.FC<{ styles: Styles }> = ({ styles }) => (
  <View style={styles.field}>
    <Skeleton width={90} height={13} style={styles.label} />
    <Skeleton width="100%" height={56} />
  </View>
);

export const EditProfileSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <View style={styles.avatarSection}>
        <Skeleton width={96} height={96} variant="circle" />
        <Skeleton width={110} height={14} style={styles.changePhoto} />
      </View>

      {/* Mirrors EditProfileScreen's layout so the form doesn't visibly jump when the
          skeleton is swapped out: paired rows for name, phone/gender, city/state and
          country/pincode, full-width for email, date of birth and address. */}
      <PairedRow styles={styles} />

      <FullRow styles={styles} />

      <PairedRow styles={styles} />

      <FullRow styles={styles} />
      <FullRow styles={styles} />

      <PairedRow styles={styles} />
      <PairedRow styles={styles} />
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
