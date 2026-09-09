import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import InlineDatePicker from '../../components/common/InlineDatePicker';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useGetTicketTypesQuery,
  useCreateTicketTypeMutation,
  useUpdateTicketTypeMutation,
  useDeleteTicketTypeMutation,
  TicketTypeRecord,
} from '../../store/services/eventsApi';
import { useGetFeeEstimateQuery } from '../../store/services/paymentsApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { showAlert, showConfirm } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { dateOnlyToStartOfDayIso, dateOnlyToEndOfDayIso } from '../../utils/dateFormat';
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS, TicketCategory } from '../../utils/ticketCategories';
import TicketCategoryPicker from '../../components/events/TicketCategoryPicker';
import { Text } from '../../components/common/Text';
import SimpleListSkeleton from '../../components/common/SimpleListSkeleton';
import { WarningIcon, LockIcon } from '../../components/common/Icons';

function benefitsToText(benefits?: string[]): string {
  return (benefits ?? []).join('\n');
}

function textToBenefits(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

type Props = NativeStackScreenProps<RootStackParamList, 'ManageTicketTypes'>;

function isoDateOnly(value?: string): string {
  return value ? value.slice(0, 10) : '';
}

const ManageTicketTypesScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { eventId } = route.params;

  const { data: ticketTypes = [], isLoading, isError, refetch } = useGetTicketTypesQuery(eventId);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Manage Ticket Types" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <SimpleListSkeleton />
      ) : isError ? (
        <View style={styles.empty}>
          <WarningIcon color={colors.textSecondary} size={48} />
          <Text style={styles.emptyTitle}>Couldn't load ticket types</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {ticketTypes.map((tier) =>
            tier.quantitySold > 0 ? (
              <LockedTierCard key={tier.id} tier={tier} />
            ) : (
              <EditableTierCard
                key={tier.id}
                eventId={eventId}
                tier={tier}
                // Every *other* tier's category — this one keeps its own pill selectable.
                takenByOthers={ticketTypes.filter((t) => t.id !== tier.id).map((t) => t.category)}
              />
            ),
          )}

          {ticketTypes.length < TICKET_CATEGORIES.length && (
            <>
              <Text style={styles.sectionTitle}>Add a New Tier</Text>
              <AddTierForm eventId={eventId} takenCategories={ticketTypes.map((t) => t.category)} />
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const LockedTierCard: React.FC<{ tier: TicketTypeRecord }> = ({ tier }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.card, styles.lockedCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.tierName}>{tier.name}</Text>
        <View style={styles.lockedBadgeRow}>
          <LockIcon color="#92400E" size={13} />
          <Text style={styles.lockedBadge}>Has sales</Text>
        </View>
      </View>
      <Text style={styles.meta}>{tier.price > 0 ? `₹${tier.price}` : 'Free'} · {tier.quantitySold} sold{tier.quantityTotal != null ? ` of ${tier.quantityTotal}` : ''}</Text>
      <Text style={styles.lockedNote}>Tiers with sales can't be edited or removed — this protects buyers who already hold a ticket.</Text>
    </View>
  );
};

const EditableTierCard: React.FC<{ eventId: string; tier: TicketTypeRecord; takenByOthers: TicketCategory[] }> = ({
  eventId,
  tier,
  takenByOthers,
}) => {
  const [category, setCategory] = useState<TicketCategory>(tier.category);
  const [price, setPrice] = useState(String(tier.price ?? 0));
  const [quantityTotal, setQuantityTotal] = useState(tier.quantityTotal != null ? String(tier.quantityTotal) : '');
  const [benefitsText, setBenefitsText] = useState(benefitsToText(tier.benefits));
  const [minPerOrder, setMinPerOrder] = useState(String(tier.minPerOrder ?? 1));
  const [maxPerOrder, setMaxPerOrder] = useState(tier.maxPerOrder != null ? String(tier.maxPerOrder) : '');
  const [salesStartAt, setSalesStartAt] = useState(isoDateOnly(tier.salesStartAt));
  const [salesEndAt, setSalesEndAt] = useState(isoDateOnly(tier.salesEndAt));

  const [updateTicketType, { isLoading: isSaving }] = useUpdateTicketTypeMutation();
  const [deleteTicketType, { isLoading: isDeleting }] = useDeleteTicketTypeMutation();
  // isLoading only flips true after the dispatched thunk's next render — a fast
  // double-tap on "Save Changes" can fire twice before that happens, so a synchronous
  // ref closes the gap (same pattern as CreateEventScreen's isSubmittingRef).
  const isSubmittingRef = useRef(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const debouncedPrice = useDebouncedValue(Number(price) || 0, 400);
  const { data: feeEstimate } = useGetFeeEstimateQuery(debouncedPrice, { skip: debouncedPrice <= 0 });

  const handleSave = async () => {
    if (isSubmittingRef.current) return;
    if (!price.trim() || Number.isNaN(Number(price)) || Number(price) < 0) {
      showAlert('Validation', 'Enter a valid price');
      return;
    }
    const benefits = textToBenefits(benefitsText);
    if (benefits.length > 6) {
      showAlert('Validation', 'A ticket type can list at most 6 benefits');
      return;
    }
    const min = minPerOrder ? Number(minPerOrder) : 1;
    if (maxPerOrder && Number(maxPerOrder) < min) {
      showAlert('Validation', "Max per order can't be less than min per order");
      return;
    }
    if (salesStartAt && salesEndAt && salesEndAt < salesStartAt) {
      showAlert('Validation', 'Sale end date must be after the start date');
      return;
    }

    isSubmittingRef.current = true;
    try {
      await updateTicketType({
        eventId,
        ticketTypeId: tier.id,
        body: {
          category,
          benefits,
          price: Number(price) || 0,
          quantityTotal: quantityTotal ? parseInt(quantityTotal, 10) : undefined,
          minPerOrder: min,
          maxPerOrder: maxPerOrder ? parseInt(maxPerOrder, 10) : undefined,
          salesStartAt: salesStartAt ? dateOnlyToStartOfDayIso(salesStartAt) : undefined,
          salesEndAt: salesEndAt ? dateOnlyToEndOfDayIso(salesEndAt) : undefined,
        },
      }).unwrap();
      showAlert('Saved', `"${TICKET_CATEGORY_LABELS[category]}" was updated.`);
    } catch (e: any) {
      showAlert("Couldn't save changes", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = () => {
    showConfirm(
      'Remove this tier?',
      `"${tier.name}" has no sales yet, so it can be safely removed.`,
      async () => {
        try {
          await deleteTicketType({ eventId, ticketTypeId: tier.id }).unwrap();
        } catch (e: any) {
          showAlert("Couldn't remove tier", extractErrorMessage(e, 'Something went wrong. Please try again.'));
        }
      },
    );
  };

  const busy = isSaving || isDeleting;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.tierName}>{tier.name}</Text>
        <TouchableOpacity onPress={handleDelete} disabled={busy}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>Ticket Type *</Text>
      <TicketCategoryPicker value={category} onChange={setCategory} takenByOthers={takenByOthers} />

      <Text style={styles.fieldLabel}>Price (INR) *</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
      {feeEstimate ? (
        <Text style={styles.payoutHint}>You'll receive ₹{feeEstimate.organizerPayout.toFixed(2)}/ticket after fees</Text>
      ) : null}

      <Text style={styles.fieldLabel}>Quantity Available</Text>
      <TextInput style={styles.input} value={quantityTotal} onChangeText={setQuantityTotal} placeholder="Unlimited" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.fieldLabel}>Benefits</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={benefitsText}
        onChangeText={setBenefitsText}
        placeholder={'One per line, e.g.\nFinisher medal'}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <View style={styles.advancedRow}>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Min per order</Text>
          <TextInput style={styles.input} value={minPerOrder} onChangeText={setMinPerOrder} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        </View>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Max per order</Text>
          <TextInput style={styles.input} value={maxPerOrder} onChangeText={setMaxPerOrder} placeholder="No limit" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        </View>
      </View>

      <View style={styles.advancedRow}>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Sale starts</Text>
          <InlineDatePicker value={salesStartAt} onChange={setSalesStartAt} placeholder="Immediately" maximumDate={salesEndAt ? new Date(salesEndAt) : undefined} />
        </View>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Sale ends</Text>
          <InlineDatePicker value={salesEndAt} onChange={setSalesEndAt} placeholder="Event start" minimumDate={salesStartAt ? new Date(salesStartAt) : undefined} />
        </View>
      </View>

      <TouchableOpacity style={[styles.saveBtn, busy && styles.saveBtnDisabled]} onPress={handleSave} disabled={busy}>
        {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </TouchableOpacity>
    </View>
  );
};

const AddTierForm: React.FC<{ eventId: string; takenCategories: TicketCategory[] }> = ({
  eventId,
  takenCategories,
}) => {
  // Pre-picks whichever category isn't on the event yet, same reasoning as
  // TicketTypeEditor.addTier — the organizer usually wants the next one, not a blank choice.
  const [category, setCategory] = useState<TicketCategory | null>(
    () => TICKET_CATEGORIES.find((c) => !takenCategories.includes(c)) ?? null,
  );
  const [price, setPrice] = useState('');
  const [quantityTotal, setQuantityTotal] = useState('');
  const [benefitsText, setBenefitsText] = useState('');
  const [minPerOrder, setMinPerOrder] = useState('1');
  const [maxPerOrder, setMaxPerOrder] = useState('');
  const [salesStartAt, setSalesStartAt] = useState('');
  const [salesEndAt, setSalesEndAt] = useState('');

  const [createTicketType, { isLoading }] = useCreateTicketTypeMutation();
  // Same double-submit gap as CreateEventScreen — without this, a fast double-tap on
  // "Add Ticket Type" can fire two createTicketType calls before isLoading flips true,
  // creating two identical tiers.
  const isSubmittingRef = useRef(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const debouncedPrice = useDebouncedValue(Number(price) || 0, 400);
  const { data: feeEstimate } = useGetFeeEstimateQuery(debouncedPrice, { skip: debouncedPrice <= 0 });

  const handleAdd = async () => {
    if (isSubmittingRef.current) return;
    if (!category) { showAlert('Validation', 'Pick a ticket type'); return; }
    if (!price.trim() || Number.isNaN(Number(price)) || Number(price) < 0) {
      showAlert('Validation', 'Enter a valid price (0 for free)');
      return;
    }
    const benefits = textToBenefits(benefitsText);
    if (benefits.length > 6) {
      showAlert('Validation', 'A ticket type can list at most 6 benefits');
      return;
    }
    const min = minPerOrder ? Number(minPerOrder) : 1;
    if (maxPerOrder && Number(maxPerOrder) < min) {
      showAlert('Validation', "Max per order can't be less than min per order");
      return;
    }
    if (salesStartAt && salesEndAt && salesEndAt < salesStartAt) {
      showAlert('Validation', 'Sale end date must be after the start date');
      return;
    }

    isSubmittingRef.current = true;
    try {
      await createTicketType({
        eventId,
        body: {
          category,
          benefits,
          price: Number(price) || 0,
          quantityTotal: quantityTotal ? parseInt(quantityTotal, 10) : undefined,
          minPerOrder: min,
          maxPerOrder: maxPerOrder ? parseInt(maxPerOrder, 10) : undefined,
          salesStartAt: salesStartAt ? dateOnlyToStartOfDayIso(salesStartAt) : undefined,
          salesEndAt: salesEndAt ? dateOnlyToEndOfDayIso(salesEndAt) : undefined,
        },
      }).unwrap();
      const addedLabel = TICKET_CATEGORY_LABELS[category];
      setCategory(TICKET_CATEGORIES.find((c) => ![...takenCategories, category].includes(c)) ?? null);
      setPrice('');
      setQuantityTotal('');
      setBenefitsText('');
      setMinPerOrder('1');
      setMaxPerOrder('');
      setSalesStartAt('');
      setSalesEndAt('');
      showAlert('Tier added', `"${addedLabel}" is now available for booking.`);
    } catch (e: any) {
      showAlert("Couldn't add tier", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.fieldLabel}>Ticket Type *</Text>
      <TicketCategoryPicker value={category} onChange={setCategory} takenByOthers={takenCategories} />

      <Text style={styles.fieldLabel}>Price (INR) *</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0 for free" keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
      {feeEstimate ? (
        <Text style={styles.payoutHint}>You'll receive ₹{feeEstimate.organizerPayout.toFixed(2)}/ticket after fees</Text>
      ) : null}

      <Text style={styles.fieldLabel}>Quantity Available</Text>
      <TextInput style={styles.input} value={quantityTotal} onChangeText={setQuantityTotal} placeholder="Unlimited" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.fieldLabel}>Benefits</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={benefitsText}
        onChangeText={setBenefitsText}
        placeholder={'One per line, e.g.\nFinisher medal'}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <View style={styles.advancedRow}>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Min per order</Text>
          <TextInput style={styles.input} value={minPerOrder} onChangeText={setMinPerOrder} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        </View>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Max per order</Text>
          <TextInput style={styles.input} value={maxPerOrder} onChangeText={setMaxPerOrder} placeholder="No limit" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        </View>
      </View>

      <View style={styles.advancedRow}>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Sale starts</Text>
          <InlineDatePicker value={salesStartAt} onChange={setSalesStartAt} placeholder="Immediately" maximumDate={salesEndAt ? new Date(salesEndAt) : undefined} />
        </View>
        <View style={styles.advancedField}>
          <Text style={styles.fieldLabel}>Sale ends</Text>
          <InlineDatePicker value={salesEndAt} onChange={setSalesEndAt} placeholder="Event start" minimumDate={salesStartAt ? new Date(salesStartAt) : undefined} />
        </View>
      </View>

      <TouchableOpacity style={[styles.addBtn, isLoading && styles.saveBtnDisabled]} onPress={handleAdd} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color={colors.brandPink} /> : <Text style={styles.addBtnText}>+ Add Ticket Type</Text>}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  loader: { marginTop: spacing.xxl },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl * 2, gap: spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  retryBtn: { marginTop: spacing.sm, backgroundColor: colors.brandPink, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white, fontWeight: '600' },
  sectionTitle: { fontSize: 16, color: colors.text, marginTop: spacing.sm,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lockedCard: { backgroundColor: '#F9FAFB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  tierName: { fontSize: 15, fontWeight: '700', color: colors.text },
  lockedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockedBadge: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  lockedNote: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 17 },
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
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  payoutHint: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 4 },
  advancedRow: { flexDirection: 'row', gap: spacing.sm },
  advancedField: { flex: 1 },
  saveBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '600' },
  addBtn: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: colors.brandPink, fontWeight: '600' },
});

export default ManageTicketTypesScreen;
