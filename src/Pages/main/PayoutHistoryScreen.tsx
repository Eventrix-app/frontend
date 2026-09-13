import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Text } from '../../components/common/Text';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetMyPayoutsQuery, type OrganizerPayout } from '../../store/services/paymentsApi';
import { CheckCircleIcon, CloseCircleIcon, HourglassIcon, WalletIcon } from '../../components/common/Icons';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'PayoutHistory'>;

// Copy per status. Written to be true about what has actually happened rather than
// reassuring: "pending" specifically must not imply money is on its way, because at that
// point nothing has been sent to a bank at all — the sweep has only computed what is owed.
// See Payout.status in Backend src/entities/payout.entity.ts.
const STATUS_META: Record<
  OrganizerPayout['status'],
  { label: string; explain: string; tone: 'pending' | 'paid' | 'failed' }
> = {
  pending: {
    label: 'Pending',
    explain:
      'We have worked out what you are owed for this event. The transfer has not been sent yet — it is queued for review.',
    tone: 'pending',
  },
  paid: {
    label: 'Paid',
    explain: 'This payout has been transferred to your registered bank account.',
    tone: 'paid',
  },
  failed: {
    label: 'Failed',
    explain:
      'The transfer did not go through. This is usually a problem with the bank details on file. Check your payout account, then contact support if it looks correct.',
    tone: 'failed',
  },
};

function formatMoney(amount: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const PayoutHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading, isFetching, error, refetch } = useGetMyPayoutsQuery({ limit: 50 });
  const [selected, setSelected] = useState<OrganizerPayout | null>(null);

  const payouts = data?.payouts ?? [];

  // Totals are derived from the page in hand rather than requested from the server, so they
  // are labelled by what they actually cover. Summing "everything ever paid" would need its
  // own aggregate endpoint; quietly summing one page and calling it a lifetime total would
  // be wrong the moment an organizer has more than `limit` payouts.
  const totals = useMemo(() => {
    let paid = 0;
    let awaiting = 0;
    for (const p of payouts) {
      if (p.status === 'paid') paid += p.amount;
      else if (p.status === 'pending') awaiting += p.amount;
    }
    return { paid, awaiting };
  }, [payouts]);

  const currency = payouts[0]?.currency ?? 'INR';

  // Share rather than clipboard: no clipboard library is installed, and the realistic use
  // for this string is sending it to a bank or an accountant anyway. The share sheet also
  // covers "copy" on both platforms.
  const shareReference = useCallback(async (reference: string, eventTitle: string) => {
    try {
      await Share.share({ message: `Eventrix payout for ${eventTitle} — bank reference: ${reference}` });
    } catch {
      showAlert('Could not share', 'Note the reference down manually instead.');
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: OrganizerPayout }) => {
      const meta = STATUS_META[item.status];
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => setSelected(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.eventTitle}, ${formatMoney(item.amount, item.currency)}, ${meta.label}`}
        >
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.eventTitle}
            </Text>
            <StatusPill tone={meta.tone} label={meta.label} colors={colors} />
          </View>

          <Text style={styles.cardAmount}>{formatMoney(item.amount, item.currency)}</Text>

          <Text style={styles.cardMeta}>
            {item.ticketCount} {item.ticketCount === 1 ? 'ticket' : 'tickets'}
            {item.status === 'paid' ? ` · Sent ${formatDate(item.paidAt)}` : ''}
            {item.status === 'pending' ? ` · Calculated ${formatDate(item.processedAt)}` : ''}
          </Text>

          {item.status === 'paid' && item.transferReference ? (
            <Text style={styles.cardRef} numberOfLines={1}>
              Ref: {item.transferReference}
            </Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [colors, styles],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Payouts" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.brandPink} />
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <CloseCircleIcon color={colors.error ?? '#EF4444'} size={32} />
          <Text style={styles.emptyTitle}>Couldn&apos;t load your payouts</Text>
          <Text style={styles.emptyBody}>
            {extractErrorMessage(error, 'Check your connection and try again.')}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            payouts.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.brandPink} />
          }
          ListHeaderComponent={
            payouts.length > 0 ? (
              <View style={styles.summary}>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Paid out</Text>
                  <Text style={styles.summaryValue}>{formatMoney(totals.paid, currency)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Awaiting transfer</Text>
                  <Text style={styles.summaryValue}>{formatMoney(totals.awaiting, currency)}</Text>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            // Says what the summary above actually covers, so a long-running organizer does
            // not read a one-page total as their lifetime earnings.
            data && data.total > payouts.length ? (
              <Text style={styles.footerNote}>
                Showing your {payouts.length} most recent payouts of {data.total}.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centerWrap}>
              <WalletIcon color={colors.textSecondary} size={32} />
              <Text style={styles.emptyTitle}>No payouts yet</Text>
              <Text style={styles.emptyBody}>
                Once one of your events has finished, we work out what you are owed 3 days later and it appears
                here.
              </Text>
            </View>
          }
        />
      )}

      <PayoutDetailSheet
        payout={selected}
        colors={colors}
        styles={styles}
        onClose={() => setSelected(null)}
        onShareReference={shareReference}
        onOpenBankAccount={() => {
          setSelected(null);
          navigation.navigate('PayoutBankAccount');
        }}
      />
    </View>
  );
};

const StatusPill: React.FC<{
  tone: 'pending' | 'paid' | 'failed';
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ tone, label, colors }) => {
  const color =
    tone === 'paid'
      ? (colors.success ?? '#10B981')
      : tone === 'failed'
        ? (colors.error ?? '#EF4444')
        : (colors.warning ?? '#F59E0B');
  const Icon = tone === 'paid' ? CheckCircleIcon : tone === 'failed' ? CloseCircleIcon : HourglassIcon;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color + '1A', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm }}>
      <Icon color={color} size={13} />
      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{label}</Text>
    </View>
  );
};

const PayoutDetailSheet: React.FC<{
  payout: OrganizerPayout | null;
  colors: ReturnType<typeof useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  onShareReference: (reference: string, eventTitle: string) => void;
  onOpenBankAccount: () => void;
}> = ({ payout, colors, styles, onClose, onShareReference, onOpenBankAccount }) => {
  if (!payout) return null;
  const meta = STATUS_META[payout.status];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>{payout.eventTitle}</Text>
          <Text style={styles.sheetSubtitle}>
            Event date {formatDate(payout.eventDate)} · {payout.ticketCount}{' '}
            {payout.ticketCount === 1 ? 'ticket' : 'tickets'}
          </Text>

          <View style={styles.sheetAmountBox}>
            <Text style={styles.sheetAmountLabel}>Your payout</Text>
            <Text style={styles.sheetAmount}>{formatMoney(payout.amount, payout.currency)}</Text>
            {/* Net, and said so plainly. The gross and the fee split are not stored on the
                payout row, so this screen does not invent a breakdown it cannot source. */}
            <Text style={styles.sheetAmountNote}>
              Amount after the platform fee and payment-gateway charges for this event.
            </Text>
          </View>

          <Text style={styles.sheetSectionTitle}>Status</Text>
          <View style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}>
            <StatusPill tone={meta.tone} label={meta.label} colors={colors} />
          </View>
          <Text style={styles.sheetBody}>{meta.explain}</Text>

          <Text style={styles.sheetSectionTitle}>Timeline</Text>
          <DetailRow label="Calculated" value={formatDate(payout.processedAt)} colors={colors} />
          <DetailRow label="Transferred" value={formatDate(payout.paidAt)} colors={colors} />
          {payout.status === 'paid' && payout.estimatedArrivalDate ? (
            <DetailRow
              label="Should arrive by"
              value={`${formatDate(payout.estimatedArrivalDate)} (estimate)`}
              colors={colors}
            />
          ) : null}

          {payout.status === 'paid' && payout.transferReference ? (
            <>
              <Text style={styles.sheetSectionTitle}>Bank reference</Text>
              <Text style={styles.sheetBody}>
                Your bank statement should show this reference against the credit. Quote it if you need to
                trace the payment.
              </Text>
              <View style={styles.refBox}>
                <Text style={styles.refValue} numberOfLines={1}>
                  {payout.transferReference}
                </Text>
                <TouchableOpacity onPress={() => onShareReference(payout.transferReference!, payout.eventTitle)}>
                  <Text style={styles.refCopy}>Share</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {payout.status === 'failed' ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={onOpenBankAccount}>
              <Text style={styles.primaryBtnText}>Check payout account</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryBtnText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const DetailRow: React.FC<{ label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }> = ({
  label,
  value,
  colors,
}) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{value}</Text>
  </View>
);

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.neutralBg },
    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
    listContent: { padding: spacing.md },
    listContentEmpty: { flexGrow: 1 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
    emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    retryBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },

    summary: {
      flexDirection: 'row',
      backgroundColor: colors.white,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    summaryCell: { flex: 1 },
    summaryDivider: { width: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.md },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
    summaryValue: { fontSize: 18, fontWeight: '700', color: colors.text },

    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20 },
    cardAmount: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
    cardMeta: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    cardRef: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
    footerNote: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 17,
    },

    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: colors.neutralBg,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      maxHeight: '85%',
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderLight,
      marginTop: spacing.sm,
    },
    sheetContent: { padding: spacing.md, paddingBottom: spacing.xl },
    sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
    sheetSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    sheetAmountBox: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    sheetAmountLabel: { fontSize: 12, color: colors.textSecondary },
    sheetAmount: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2 },
    sheetAmountNote: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 17 },
    sheetSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    sheetBody: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
    refBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: colors.white,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    refValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    refCopy: { fontSize: 14, fontWeight: '700', color: colors.brandPink },
    primaryBtn: {
      backgroundColor: colors.brandPink,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
    secondaryBtn: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
      backgroundColor: colors.white,
    },
    secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  });

export default PayoutHistoryScreen;
