import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import HalfScreenModal from './halfscreenmodal';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

export type PhotoSource = 'camera' | 'library';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: PhotoSource) => void;
}

const OPTIONS: { source: PhotoSource; icon: React.ComponentProps<typeof Feather>['name']; label: string; hint: string }[] = [
  { source: 'camera', icon: 'camera', label: 'Take a photo', hint: 'Use your camera' },
  { source: 'library', icon: 'image', label: 'Photo library', hint: 'Choose from your photos' },
];

/**
 * Asks where the photo should come from before anything is opened.
 *
 * Previously the avatar tapped straight into the OS photo library, which gave the user no
 * say and no way back to a different source without cancelling out of a picker they never
 * asked for.
 */
const PhotoSourceSheet: React.FC<Props> = ({ visible, onClose, onSelect }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <HalfScreenModal visible={visible} onClose={onClose} heightPercent={0.36}>
      <View style={styles.body}>
        <Text variant="h4" color="text" style={styles.title}>Profile photo</Text>
        <Text variant="caption" color="textSecondary" style={styles.subtitle}>Where would you like to pick it from?</Text>

        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.source}
              style={styles.option}
              onPress={() => onSelect(option.source)}
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
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 2, marginBottom: spacing.md },
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

export default PhotoSourceSheet;
