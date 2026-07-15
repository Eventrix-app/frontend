import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { CreateTicketTypePayload } from '../../store/services/eventsApi';
import { useGetFeeEstimateQuery } from '../../store/services/paymentsApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { parseDateValue, dateOnlyToStartOfDayIso, dateOnlyToEndOfDayIso } from '../../utils/dateFormat';
import InlineDatePicker from '../common/InlineDatePicker';

// Local draft shape while the organizer is still editing — numeric/date fields stay as
// strings so they bind directly to TextInput, and are parsed only when building the
// API payload (tierDraftToPayload) or validating (validateTiers).
export interface TierDraft {
  key: string;
  name: string;
  price: string;
  quantityTotal: string;
  minPerOrder: string;
  maxPerOrder: string;
  salesStartAt: string;
  salesEndAt: string;
}

let tierKeySeq = 0;
export function createBlankTier(): TierDraft {
  tierKeySeq += 1;
  return {
    key: `tier-${Date.now()}-${tierKeySeq}`,
    name: '',
    price: '',
    quantityTotal: '',
    minPerOrder: '1',
    maxPerOrder: '',
    salesStartAt: '',
    salesEndAt: '',
  };
}

export function tierDraftToPayload(tier: TierDraft, isFree: boolean): CreateTicketTypePayload {
  return {
    name: tier.name.trim() || 'General Admission',
    price: isFree ? 0 : parseFloat(tier.price) || 0,
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
    const label = tier.name.trim() || 'Untitled tier';
    if (!tier.name.trim()) return 'Every ticket type needs a name';
    if (!isFree && (!tier.price.trim() || Number.isNaN(Number(tier.price)) || Number(tier.price) < 0)) {
      return `Enter a valid price for "${label}"`;
    }
    if (tier.quantityTotal && (!Number.isInteger(Number(tier.quantityTotal)) || Number(tier.quantityTotal) < 1)) {
      return `Quantity for "${label}" must be a positive whole number`;
    }
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
  const updateTier = (key: string, patch: Partial<TierDraft>) => {
    onChange(tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  };
  const removeTier = (key: string) => onChange(tiers.filter((t) => t.key !== key));
  const addTier = () => onChange([...tiers, createBlankTier()]);

  return (
    <View style={styles.wrap}>
      {tiers.map((tier, index) => (
        <TierRow
          key={tier.key}
          tier={tier}
          index={index}
          isFree={isFree}
          canRemove={tiers.length > 1}
          onChange={(patch) => updateTier(tier.key, patch)}
          onRemove={() => removeTier(tier.key)}
        />
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={addTier}>
        <Text style={styles.addBtnText}>+ Add Ticket Type</Text>
      </TouchableOpacity>
    </View>
  );
};

interface TierRowProps {
  tier: TierDraft;
  index: number;
  isFree: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<TierDraft>) => void;
  onRemove: () => void;
}

const TierRow: React.FC<TierRowProps> = ({ tier, index, isFree, canRemove, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
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

      <Text style={styles.fieldLabel}>Name *</Text>
      <TextInput
        style={styles.input}
        value={tier.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="e.g. General Admission"
        placeholderTextColor={colors.textSecondary}
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

const styles = StyleSheet.create({
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
  removeText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, marginTop: spacing.sm },
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
