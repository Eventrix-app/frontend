import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../common/Text';
import { useGetCategoriesQuery } from '../../store/services/userApi';

export interface EventFilters {
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  radiusKm?: number;
}

const PRICE_PRESETS: { label: string; priceMin?: number; priceMax?: number }[] = [
  { label: 'Any', priceMin: undefined, priceMax: undefined },
  { label: 'Free', priceMin: 0, priceMax: 0 },
  { label: 'Under ₹500', priceMin: 0, priceMax: 500 },
  { label: '₹500 – ₹2,000', priceMin: 500, priceMax: 2000 },
  { label: '₹2,000+', priceMin: 2000, priceMax: undefined },
];

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function datePreset(days: number): { dateFrom: string; dateTo: string } {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + days);
  return { dateFrom: toISODate(from), dateTo: toISODate(to) };
}

const DATE_PRESETS: { label: string; range?: { dateFrom: string; dateTo: string } }[] = [
  { label: 'Any', range: undefined },
  { label: 'Today', range: datePreset(0) },
  { label: 'This week', range: datePreset(7) },
  { label: 'This month', range: datePreset(30) },
];

const DISTANCE_PRESETS: { label: string; radiusKm?: number }[] = [
  { label: 'Any', radiusKm: undefined },
  { label: '5 km', radiusKm: 5 },
  { label: '10 km', radiusKm: 10 },
  { label: '25 km', radiusKm: 25 },
  { label: '50 km', radiusKm: 50 },
];

interface Props {
  value: EventFilters;
  onApply: (filters: EventFilters) => void;
  onClose: () => void;
}

// Category/Price/Date/Distance sections in one sheet — triggered by any of ExploreScreen's
// filter chips. Category/Price/Date are sent to the backend (GET /events); Distance is
// applied client-side over already-fetched, already-geocoded events since the backend has no
// geo filter yet (event lat/lng is barely populated until the map picker from #3 ships).
export const FilterSheet: React.FC<Props> = ({ value, onApply, onClose }) => {
  const [draft, setDraft] = useState<EventFilters>(value);
  const { data: categories = [] } = useGetCategoriesQuery();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isPriceSelected = (preset: (typeof PRICE_PRESETS)[number]) =>
    draft.priceMin === preset.priceMin && draft.priceMax === preset.priceMax;

  const isDateSelected = (preset: (typeof DATE_PRESETS)[number]) =>
    preset.range === undefined
      ? draft.dateFrom === undefined && draft.dateTo === undefined
      : draft.dateFrom === preset.range.dateFrom && draft.dateTo === preset.range.dateTo;

  const reset = () => setDraft({});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="h3">Filters</Text>
        <TouchableOpacity onPress={reset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="Any"
            active={!draft.categoryId}
            onPress={() => setDraft((d) => ({ ...d, categoryId: undefined }))}
            styles={styles}
          />
          {categories.map((cat) => (
            <FilterChip
              key={cat.id}
              label={cat.name}
              active={draft.categoryId === cat.id}
              onPress={() => setDraft((d) => ({ ...d, categoryId: cat.id }))}
              styles={styles}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Price</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {PRICE_PRESETS.map((preset) => (
            <FilterChip
              key={preset.label}
              label={preset.label}
              active={isPriceSelected(preset)}
              onPress={() => setDraft((d) => ({ ...d, priceMin: preset.priceMin, priceMax: preset.priceMax }))}
              styles={styles}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DATE_PRESETS.map((preset) => (
            <FilterChip
              key={preset.label}
              label={preset.label}
              active={isDateSelected(preset)}
              onPress={() =>
                setDraft((d) => ({ ...d, dateFrom: preset.range?.dateFrom, dateTo: preset.range?.dateTo }))
              }
              styles={styles}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Distance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DISTANCE_PRESETS.map((preset) => (
            <FilterChip
              key={preset.label}
              label={preset.label}
              active={draft.radiusKm === preset.radiusKm}
              onPress={() => setDraft((d) => ({ ...d, radiusKm: preset.radiusKm }))}
              styles={styles}
            />
          ))}
        </ScrollView>
      </ScrollView>

      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => {
          onApply(draft);
          onClose();
        }}
      >
        <Text style={styles.applyText}>Apply filters</Text>
      </TouchableOpacity>
    </View>
  );
};

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, active, onPress, styles }) => (
  <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
    <Text style={[styles.filterChipLabel, active && styles.filterChipLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  resetText: { color: colors.brandPink, fontWeight: '600' },
  scroll: { paddingBottom: spacing.lg },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#EDEDED',
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.brandPink,
    borderColor: colors.brandPink,
  },
  filterChipLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  filterChipLabelActive: { color: colors.white },
  applyBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  applyText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
