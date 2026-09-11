import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { CreateTicketTypePayload } from '../../store/services/eventsApi';
import { useGetFeeEstimateQuery } from '../../store/services/paymentsApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { parseDateValue, dateOnlyToStartOfDayIso, dateOnlyToEndOfDayIso } from '../../utils/dateFormat';
import { TICKET_CATEGORIES, TicketCategory } from '../../utils/ticketCategories';
import TicketCategoryPicker from './TicketCategoryPicker';
import InlineDatePicker from '../common/InlineDatePicker';
import { Text } from '../common/Text';

// Local draft shape while the organizer is still editing — numeric/date fields stay as
// strings so they bind directly to TextInput, and are parsed only when building the
// API payload (tierDraftToPayload) or validating (validateTiers).
export interface TierDraft {
  key: string;
  // null until the organizer picks one — there is no free-text fallback anymore, so an
  // unset category is a real "not chosen yet" state rather than an empty string that would
  // have quietly defaulted to something.
  category: TicketCategory | null;
  price: string;
  quantityTotal: string;
  // Newline-separated in the UI (same pattern as CreateEventScreen's highlights/
  // whoShouldAttend fields); split into the array the API expects in tierDraftToPayload.
  benefitsText: string;
  minPerOrder: string;
  maxPerOrder: string;
  salesStartAt: string;
  salesEndAt: string;
}

let tierKeySeq = 0;
export function createBlankTier(category: TicketCategory | null = null): TierDraft {
  tierKeySeq += 1;
  return {
    key: `tier-${Date.now()}-${tierKeySeq}`,
    category,
    price: '',
    quantityTotal: '',
    benefitsText: '',
    minPerOrder: '1',
    maxPerOrder: '',
    salesStartAt: '',
    salesEndAt: '',
  };
}

export function tierDraftToPayload(tier: TierDraft, isFree: boolean): CreateTicketTypePayload {
  return {
    // Guarded by validateTiers before this is ever called — category is required there, so
    // by the time a submit reaches this function every draft has one.
    category: tier.category!,
    price: isFree ? 0 : parseFloat(tier.price) || 0,
    benefits: tier.benefitsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    quantityTotal: tier.quantityTotal ? parseInt(tier.quantityTotal, 10) : undefined,
    minPerOrder: tier.minPerOrder ? parseInt(tier.minPerOrder, 10) : 1,
    maxPerOrder: tier.maxPerOrder ? parseInt(tier.maxPerOrder, 10) : undefined,
    salesStartAt: tier.salesStartAt ? dateOnlyToStartOfDayIso(tier.salesStartAt) : undefined,
    salesEndAt: tier.salesEndAt ? dateOnlyToEndOfDayIso(tier.salesEndAt) : undefined,
  };
}

export function validateTiers(tiers: TierDraft[], isFree: boolean): string | null {
  if (tiers.length === 0) return 'Add at least one ticket type';
  for (const tier of tiers) {
    const label = tier.category ? tier.category.replace('_', ' ') : 'Untitled tier';
    if (!tier.category) return 'Pick a ticket type for every tier';
    if (!isFree && (!tier.price.trim() || Number.isNaN(Number(tier.price)) || Number(tier.price) < 0)) {
      return `Enter a valid price for "${label}"`;
    }
    if (tier.quantityTotal && (!Number.isInteger(Number(tier.quantityTotal)) || Number(tier.quantityTotal) < 1)) {
      return `Quantity for "${label}" must be a positive whole number`;
    }
    // Mirrors CreateTicketTypeDto's @ArrayMaxSize(6) — caught here so the organizer sees it
    // immediately instead of after a round trip to the server.
    const benefitCount = tier.benefitsText.split('\n').map((l) => l.trim()).filter(Boolean).length;
    if (benefitCount > 6) return `"${label}" can list at most 6 benefits`;
    const min = tier.minPerOrder ? Number(tier.minPerOrder) : 1;
    if (tier.minPerOrder && (!Number.isInteger(min) || min < 1)) {
      return `Min per order for "${label}" must be a positive whole number`;
    }
    if (tier.maxPerOrder) {
      const max = Number(tier.maxPerOrder);
      if (!Number.isInteger(max) || max < 1) return `Max per order for "${label}" must be a positive whole number`;
      if (max < min) return `Max per order can't be less than min per order for "${label}"`;
    }
    if (tier.salesStartAt && tier.salesEndAt && tier.salesEndAt < tier.salesStartAt) {
      return `Sale end date must be after the start date for "${label}"`;
    }
  }
  return null;
}

interface TicketTypeEditorProps {
  tiers: TierDraft[];
  onChange: (tiers: TierDraft[]) => void;
  isFree: boolean;
}

const TicketTypeEditor: React.FC<TicketTypeEditorProps> = ({ tiers, onChange, isFree }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const updateTier = (key: string, patch: Partial<TierDraft>) => {
    onChange(tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  };
  const removeTier = (key: string) => onChange(tiers.filter((t) => t.key !== key));
  // Pre-selects whichever category isn't already on the event yet, so a common 3-tier setup
  // (one Early Bird, one General, one VIP) never makes the organizer manually deselect a
  // pill that was only there because it was the component's arbitrary default.
  const addTier = () => {
    const used = new Set(tiers.map((t) => t.category).filter(Boolean));
    const next = TICKET_CATEGORIES.find((c) => !used.has(c)) ?? null;
    onChange([...tiers, createBlankTier(next)]);
  };
  const canAddMore = tiers.length < TICKET_CATEGORIES.length;

  return (
    <View style={styles.wrap}>
      {tiers.map((tier, index) => (
        <TierRow
          key={tier.key}
          tier={tier}
          index={index}
          isFree={isFree}
          canRemove={tiers.length > 1}
          takenByOthers={tiers
            .filter((t) => t.key !== tier.key)
            .map((t) => t.category)
            .filter((c): c is TicketCategory => !!c)}
          onChange={(patch) => updateTier(tier.key, patch)}
          onRemove={() => removeTier(tier.key)}
        />
      ))}
      {/* Hidden rather than disabled once all 3 categories are in use: there is nothing left
          to add it *for* — a 4th tier would have to duplicate one of the existing three. */}
      {canAddMore && (
        <TouchableOpacity style={styles.addBtn} onPress={addTier}>
          <Text style={styles.addBtnText}>+ Add Ticket Type</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface TierRowProps {
  tier: TierDraft;
  index: number;
  isFree: boolean;
  canRemove: boolean;
  takenByOthers: TicketCategory[];
  onChange: (patch: Partial<TierDraft>) => void;
  onRemove: () => void;
}

const TierRow: React.FC<TierRowProps> = ({ tier, index, isFree, canRemove, takenByOthers, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const priceNumber = Number(tier.price) || 0;
  const debouncedPrice = useDebouncedValue(priceNumber, 400);
  // fee-estimate is an authenticated, per-request lookup — only fire it once there's an
  // actual price to price out, not on every keystroke.
  const { data: feeEstimate } = useGetFeeEstimateQuery(debouncedPrice, {
    skip: isFree || debouncedPrice <= 0,
  });

  return (
    <View style={styles.tierCard}>
      <View style={styles.tierHeader}>
        <Text style={styles.tierIndex}>Tier {index + 1}</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.fieldLabel}>Ticket Type *</Text>
      <TicketCategoryPicker
        value={tier.category}
        onChange={(category) => onChange({ category })}
        takenByOthers={takenByOthers}
      />

      {!isFree && (
        <>
          <Text style={styles.fieldLabel}>Price (INR) *</Text>
          <TextInput
            style={styles.input}
            value={tier.price}
            onChangeText={(price) => onChange({ price })}
            placeholder="499"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textSecondary}
          />
          {feeEstimate ? (
            <Text style={styles.payoutHint}>
              You'll receive ₹{feeEstimate.organizerPayout.toFixed(2)}/ticket after fees
            </Text>
          ) : null}
        </>
      )}

      <Text style={styles.fieldLabel}>Quantity Available</Text>
      <TextInput
        style={styles.input}
        value={tier.quantityTotal}
        onChangeText={(quantityTotal) => onChange({ quantityTotal })}
        placeholder="Unlimited"
        keyboardType="numeric"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.fieldLabel}>Benefits</Text>
      <Text style={styles.fieldHint}>One per line — shown as bullet points on the ticket, e.g. "Finisher medal".</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={tier.benefitsText}
        onChangeText={(benefitsText) => onChange({ benefitsText })}
        placeholder={'Marathon entry\nFinisher medal\nDigital certificate'}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity style={styles.advancedToggle} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.advancedToggleText}>
          {expanded ? '− Hide advanced options' : '+ Advanced options (limits, sale window)'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={styles.advancedRow}>
            <View style={styles.advancedField}>
              <Text style={styles.fieldLabel}>Min per order</Text>
              <TextInput
                style={styles.input}
                value={tier.minPerOrder}
                onChangeText={(minPerOrder) => onChange({ minPerOrder })}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.advancedField}>
              <Text style={styles.fieldLabel}>Max per order</Text>
              <TextInput
                style={styles.input}
                value={tier.maxPerOrder}
                onChangeText={(maxPerOrder) => onChange({ maxPerOrder })}
                placeholder="No limit"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.advancedRow}>
            <View style={styles.advancedField}>
              <Text style={styles.fieldLabel}>Sale starts</Text>
              <InlineDatePicker
                value={tier.salesStartAt}
                onChange={(salesStartAt) => onChange({ salesStartAt })}
                placeholder="Immediately"
                maximumDate={tier.salesEndAt ? parseDateValue(tier.salesEndAt) : undefined}
              />
            </View>
            <View style={styles.advancedField}>
              <Text style={styles.fieldLabel}>Sale ends</Text>
              <InlineDatePicker
                value={tier.salesEndAt}
                onChange={(salesEndAt) => onChange({ salesEndAt })}
                placeholder="Event start"
                minimumDate={tier.salesStartAt ? parseDateValue(tier.salesStartAt) : undefined}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { gap: spacing.md },
  tierCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: 0,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tierIndex: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  removeText: { fontSize: 13, fontWeight: '600', color: colors.error },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, marginTop: spacing.sm },
  fieldHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: -2 },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  payoutHint: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 4 },
  advancedToggle: { marginTop: spacing.sm, paddingVertical: 4 },
  advancedToggleText: { fontSize: 13, fontWeight: '600', color: colors.brandPink },
  advancedRow: { flexDirection: 'row', gap: spacing.sm },
  advancedField: { flex: 1 },
  addBtn: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: colors.brandPink, fontWeight: '600' },
});

export default TicketTypeEditor;
