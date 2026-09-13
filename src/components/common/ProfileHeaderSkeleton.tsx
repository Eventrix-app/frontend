import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';

// Full-screen initial-load placeholder for a profile header (avatar, name, stat row) —
// used by ProfileScreen's organizer branch in place of a center-screen spinner.
const ProfileHeaderSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <Skeleton width={88} height={88} variant="circle" style={styles.avatar} />
      <Skeleton width={160} height={20} style={styles.line} />
      <Skeleton width={100} height={14} style={styles.line} />
      <View style={styles.statsRow}>
        <Skeleton width={60} height={40} />
        <Skeleton width={60} height={40} />
        <Skeleton width={60} height={40} />
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingTop: spacing.xxl, backgroundColor: colors.white },
  avatar: { marginBottom: spacing.md },
  line: { marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
});

export default ProfileHeaderSkeleton;
