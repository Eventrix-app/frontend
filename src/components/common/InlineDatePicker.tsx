import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { parseDateValue, formatDateValue, DATE_DISPLAY_FORMATTER } from '../../utils/dateFormat';
import { Text } from './Text';

interface Props {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: ViewStyle;
  /**
   * 'auth' matches the raised white card AuthInput renders, so the date-of-birth field on
   * Register sits in the same visual row as the fields above it instead of reading as a
   * plain bordered box.
   *
   * Opt-in rather than a restyle of the default, because this component is also used by
   * CreateEventScreen's event-date field and TicketTypeEditor's sale-window fields, which
   * live on ordinary form surfaces where the elevation would look wrong.
   */
  variant?: 'default' | 'auth';
}

// Shared by CreateEventScreen's event-date field and TicketTypeEditor's sale-window
// fields — one calendar-picker implementation instead of duplicating the
// show/hide-state + DateTimePicker + platform-specific "Done" button boilerplate.
const InlineDatePicker: React.FC<Props> = ({ value, onChange, placeholder = 'Select date', minimumDate, maximumDate, style, variant = 'default' }) => {
  const [show, setShow] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isAuth = variant === 'auth';

  return (
    <View style={isAuth ? styles.authWrap : undefined}>
      <TouchableOpacity
        style={[isAuth ? styles.authField : styles.input, style]}
        onPress={() => setShow(true)}
      >
        <Text
          style={[
            isAuth ? styles.authText : undefined,
            value
              ? (isAuth ? styles.authValue : styles.value)
              : (isAuth ? styles.authPlaceholder : styles.placeholder),
          ]}
        >
          {value ? DATE_DISPLAY_FORMATTER.format(parseDateValue(value)) : placeholder}
        </Text>
      </TouchableOpacity>
      {show && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={parseDateValue(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              if (Platform.OS === 'android') setShow(false);
              if (event.type === 'set' && selectedDate) onChange(formatDateValue(selectedDate));
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShow(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  value: { fontSize: 15, color: colors.text },
  placeholder: { fontSize: 15, color: colors.textSecondary },
  // Mirrors AuthInput's wrap/fieldGlass/field/input rules so the Register form reads as one
  // consistent stack. Kept as literal values matching that component rather than shared
  // constants — if AuthInput's chrome changes, this needs updating to match.
  authWrap: {
    marginBottom: spacing.md,
  },
  authField: {
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 16,
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
  authText: { fontSize: 16 },
  authValue: { color: colors.text },
  authPlaceholder: { color: colors.placeholder },
  pickerWrap: {
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  doneBtn: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneText: { color: colors.white, fontWeight: '600' },
});

export default InlineDatePicker;
