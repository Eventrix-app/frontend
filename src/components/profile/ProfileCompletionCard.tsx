import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../common/Text';

export interface CompletionTask {
  key: 'phone' | 'email';
  label: string;
  description: string;
  icon: 'phone' | 'mail';
  onPress: () => void;
}

interface Props {
  tasks: CompletionTask[];
  onDismiss: () => void;
}

// Surfaces what an account is still missing before it blocks something. A Google sign-in
// carries no phone number, and the first time that mattered used to be mid-payment.
const ProfileCompletionCard: React.FC<Props> = ({ tasks, onDismiss }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (tasks.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text variant="label" style={styles.title}>Finish setting up</Text>
          <Text variant="caption" style={styles.subtitle}>
            {tasks.length === 1
              ? 'One step left so nothing interrupts your next booking.'
              : `${tasks.length} steps left so nothing interrupts your next booking.`}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <Feather name="x" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {tasks.map((task, i) => (
        <TouchableOpacity
          key={task.key}
          onPress={task.onPress}
          activeOpacity={0.6}
          style={[styles.taskRow, i > 0 && styles.taskRowDivider]}
        >
          <View style={styles.taskIcon}>
            <Feather name={task.icon} size={16} color={colors.brandPink} />
          </View>
          <View style={styles.taskText}>
            <Text variant="body" style={styles.taskLabel}>{task.label}</Text>
            <Text variant="caption" color="textSecondary">{task.description}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.brandPink,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    headerTextWrap: { flex: 1 },
    title: { color: colors.text, marginBottom: 2 },
    subtitle: { color: colors.textSecondary },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    taskRowDivider: { borderTopWidth: 1, borderTopColor: colors.borderLight },
    taskIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
    taskText: { flex: 1 },
    taskLabel: { color: colors.text, fontWeight: '600' },
  });

export default ProfileCompletionCard;
