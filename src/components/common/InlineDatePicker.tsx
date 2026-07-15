import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { parseDateValue, formatDateValue, DATE_DISPLAY_FORMATTER } from '../../utils/dateFormat';

interface Props {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: ViewStyle;
}

// Shared by CreateEventScreen's event-date field and TicketTypeEditor's sale-window
// fields — one calendar-picker implementation instead of duplicating the
// show/hide-state + DateTimePicker + platform-specific "Done" button boilerplate.
const InlineDatePicker: React.FC<Props> = ({ value, onChange, placeholder = 'Select date', minimumDate, maximumDate, style }) => {
  const [show, setShow] = useState(false);

  return (
    <View>
      <TouchableOpacity style={[styles.input, style]} onPress={() => setShow(true)}>
        <Text style={value ? styles.value : styles.placeholder}>
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

const styles = StyleSheet.create({
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
