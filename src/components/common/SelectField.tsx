import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import HalfScreenModal from './halfscreenmodal';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  /** Sheet heading. Falls back to the placeholder. */
  title?: string;
}

/**
 * A field that looks exactly like an AuthInput but opens a list instead of a keyboard.
 *
 * Mirrors AuthInput's chrome with literal values rather than shared constants, matching what
 * InlineDatePicker already does for the same reason — the two live beside real AuthInputs in
 * the same forms and have to line up with them. If AuthInput's chrome changes, this and
 * InlineDatePicker both need updating to match.
 *
 * A value that is not in `options` is still shown and still selectable, never silently
 * replaced by the placeholder. Anything already stored was typed in freely before this field
 * constrained the choices, and rendering it as empty would invite the user to save over it.
 */
export const SelectField: React.FC<Props> = ({ value, onChange, options, placeholder = 'Select', title }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () => (value && !options.includes(value) ? [value, ...options] : options),
    [value, options],
  );

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.fieldGlass}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={title ?? placeholder}
        accessibilityValue={{ text: value || 'Not set' }}
      >
        <View style={styles.field}>
          <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <Feather name="chevron-down" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <HalfScreenModal visible={open} onClose={() => setOpen(false)} heightPercent={0.5}>
        <View style={styles.sheet}>
          <Text variant="h4" color="text" style={styles.sheetTitle}>{title ?? placeholder}</Text>
          {rows.map((option) => {
            const selected = option === value;
            return (
              <TouchableOpacity
                key={option}
                style={styles.option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text variant="label" color={selected ? 'brandPink' : 'text'}>{option}</Text>
                {selected && <Feather name="check" size={18} color={colors.brandPink} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </HalfScreenModal>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  fieldGlass: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: spacing.sm,
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    flex: 1,
    fontSize: 16,
    color: colors.placeholder,
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetTitle: {
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
});

export default SelectField;
