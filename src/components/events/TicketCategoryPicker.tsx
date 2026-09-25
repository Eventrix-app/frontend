import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../common/Text';
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS, TicketCategory } from '../../utils/ticketCategories';

interface Props {
  value: TicketCategory | null;
  onChange: (category: TicketCategory) => void;
  /**
   * Categories already claimed by *other* tiers on this event. Rendered disabled rather than
   * hidden — an organizer who already has an Early Bird and a VIP tier should still see that
   * General is the only one left, not wonder where two of the three pills went.
   *
   * This is a UI nicety, not a data constraint: the backend does not enforce one tier per
   * category (a duplicate is harmless — it costs an organizer a confusing pair of
   * identically-labelled cards, not a broken booking), so this is the only place the rule
   * lives.
   */
  takenByOthers?: TicketCategory[];
}

/**
 * The fixed EARLY_BIRD / GENERAL / VIP vocabulary, picked from rather than typed — see
 * CreateTicketTypeDto on the backend for why free text was removed entirely. Same pill-row
 * pattern as CreateEventScreen's refund-policy picker (REFUND_OPTIONS), reused here rather
 * than introducing a second "pick one of a few fixed options" UI in the same app.
 */
export const TicketCategoryPicker: React.FC<Props> = ({ value, onChange, takenByOthers = [] }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {TICKET_CATEGORIES.map((category) => {
        const disabled = takenByOthers.includes(category);
        const active = value === category;
        return (
          <TouchableOpacity
            key={category}
            style={[styles.pill, active && styles.pillActive, disabled && styles.pillDisabled]}
            onPress={() => !disabled && onChange(category)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
          >
            <Text
              style={[
                styles.pillText,
                active && styles.pillTextActive,
                disabled && styles.pillTextDisabled,
              ]}
            >
              {TICKET_CATEGORY_LABELS[category]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    pill: {
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.white,
    },
    pillActive: { backgroundColor: colors.brandPink, borderColor: colors.brandPink },
    pillDisabled: { opacity: 0.4 },
    pillText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    pillTextActive: { color: '#FFFFFF' },
    pillTextDisabled: { color: colors.textSecondary },
  });

export default TicketCategoryPicker;
