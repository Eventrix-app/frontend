import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import HalfScreenModal from '../common/halfscreenmodal';
import { Text } from '../common/Text';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

export type CreateMenuAction = 'create-event' | 'upload-reel';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: CreateMenuAction) => void;
}

const OPTIONS: { action: CreateMenuAction; icon: React.ComponentProps<typeof Feather>['name']; label: string; hint: string }[] = [
  { action: 'create-event', icon: 'calendar', label: 'Create a new event', hint: 'Set up an event to publish' },
  { action: 'upload-reel', icon: 'video', label: 'Upload a reel', hint: 'Share a moment from an event' },
];

// The tab bar's "+" FAB, for verified organizers only (EventrixTabBar.tsx) — same
// options-list-on-a-half-sheet pattern as PhotoSourceSheet.
const CreateMenuSheet: React.FC<Props> = ({ visible, onClose, onSelect }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <HalfScreenModal visible={visible} onClose={onClose} heightPercent={0.36}>
      <View style={styles.body}>
        <Text variant="h4" color="text" style={styles.title}>Create</Text>

        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.action}
              style={styles.option}
              onPress={() => onSelect(option.action)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <View style={styles.optionIcon}>
                <Feather name={option.icon} size={18} color={colors.brandPink} />
              </View>
              <View style={styles.optionText}>
                <Text variant="label" color="text">{option.label}</Text>
                <Text variant="caption" color="textSecondary">{option.hint}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.placeholder} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text variant="button" color="textSecondary">Cancel</Text>
        </TouchableOpacity>
      </View>
    </HalfScreenModal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.md },
  title: { textAlign: 'center', marginBottom: spacing.md },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  optionText: { flex: 1, gap: 1 },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
});

export default CreateMenuSheet;
