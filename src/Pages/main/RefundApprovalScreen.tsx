import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  RefundRecord,
  useApproveRefundMutation,
  useGetPendingRefundsQuery,
  useRejectRefundMutation,
} from '../../store/services/paymentsApi';
import { formatEventDate, formatEventTime } from '../../utils/eventCardAdapter';
import { showAlert } from '../../utils/crossPlatformAlert';
import { Text } from '../../components/common/Text';
import SimpleListSkeleton from '../../components/common/SimpleListSkeleton';
import { WalletIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'RefundApproval'>;

// Organizer-wide queue (PaymentsService.findPendingRefundsForOrganizer is not scoped to a
// single event), so this screen is reachable from MyEventsScreen's header rather than
// per-event — see Stage 4 of eventriximplementationplan.md.
const RefundApprovalScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data: refunds = [], isLoading } = useGetPendingRefundsQuery();
  const [approveRefund] = useApproveRefundMutation();
  const [rejectRefund] = useRejectRefundMutation();
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // actingOnId only reflects in props next render — a fast double-tap on
  // Approve/Confirm Reject can fire twice before the button disables. Same
  // synchronous-ref pattern as EventDetailsScreen's isEnrollingRef.
  const isActingRef = useRef(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleApprove = async (refund: RefundRecord) => {
    if (isActingRef.current) return;
    isActingRef.current = true;
    setActingOnId(refund.id);
    try {
      await approveRefund(refund.id).unwrap();
      showAlert('Refund Approved', 'The refund has been approved and sent for processing.');
    } catch (e: any) {
      showAlert('Approval Failed', e?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      isActingRef.current = false;
      setActingOnId(null);
    }
  };

  const handleReject = async (refund: RefundRecord) => {
    if (!rejectReason.trim()) {
      showAlert('Reason required', 'Please provide a reason for rejecting this refund.');
      return;
    }
    if (isActingRef.current) return;
    isActingRef.current = true;
    setActingOnId(refund.id);
    try {
      await rejectRefund({ refundId: refund.id, reason: rejectReason.trim() }).unwrap();
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      showAlert('Rejection Failed', e?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      isActingRef.current = false;
      setActingOnId(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Refund Requests" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <SimpleListSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {refunds.length === 0 ? (
            <View style={styles.empty}>
              <WalletIcon color={colors.textSecondary} size={56} />
              <Text style={styles.emptyTitle}>No pending refunds</Text>
              <Text style={styles.emptySubtitle}>Refund requests from your attendees will show up here.</Text>
            </View>
          ) : (
            refunds.map((refund) => {
              const event = refund.enrollment?.event;
              const requester = refund.enrollment?.user;
              const isActing = actingOnId === refund.id;
              const isRejecting = rejectingId === refund.id;

              return (
                <View key={refund.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event?.title ?? 'Unknown event'}
                    </Text>
                    <Text style={styles.amount}>₹{refund.amount}</Text>
                  </View>

                  {event ? (
                    <Text style={styles.meta}>
                      {formatEventDate(event.eventDate)} · {formatEventTime(event.startTime)}
                    </Text>
                  ) : null}

                  <Text style={styles.meta}>
                    {requester?.fullName ?? requester?.email ?? 'Unknown requester'}
                    {refund.enrollment?.bookingReference ? ` · ${refund.enrollment.bookingReference}` : ''}
                  </Text>

                  {refund.reason ? (
                    <View style={styles.reasonBox}>
                      <Text style={styles.reasonLabel}>Reason</Text>
                      <Text style={styles.reasonText}>{refund.reason}</Text>
                    </View>
                  ) : null}

                  {isRejecting ? (
                    <View style={styles.rejectForm}>
                      <TextInput
                        style={styles.rejectInput}
                        placeholder="Reason for rejecting (required)"
                        placeholderTextColor={colors.textSecondary}
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        multiline
                        autoFocus
                      />
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          disabled={isActing}
                        >
                          <Text style={styles.secondaryBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.rejectConfirmBtn, isActing && styles.btnDisabled]}
                          onPress={() => handleReject(refund)}
                          disabled={isActing}
                        >
                          {isActing ? (
                            <ActivityIndicator color={colors.white} size="small" />
                          ) : (
                            <Text style={styles.rejectConfirmText}>Confirm Reject</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => setRejectingId(refund.id)}
                        disabled={isActing}
                      >
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.approveBtn, isActing && styles.btnDisabled]}
                        onPress={() => handleApprove(refund)}
                        disabled={isActing}
                      >
                        {isActing ? (
                          <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                          <Text style={styles.approveBtnText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  loader: { marginTop: spacing.xxl },
  scroll: { padding: spacing.md, gap: spacing.md },
  empty: { alignItems: 'center', marginTop: spacing.xxl, gap: spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, color: colors.text, fontFamily: 'ZalandoSansExpanded_600SemiBold' },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 260 },
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { flex: 1, fontSize: 16, color: colors.text, fontFamily: 'ZalandoSansExpanded_600SemiBold', marginRight: spacing.sm },
  amount: { fontSize: 16, fontWeight: '700', color: colors.brandPink },
  meta: { fontSize: 13, color: colors.textSecondary },
  reasonBox: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  reasonLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  reasonText: { fontSize: 13, color: colors.text },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rejectBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  rejectBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  approveBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.brandPink,
  },
  approveBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  rejectForm: { gap: spacing.sm, marginTop: spacing.xs },
  rejectInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  secondaryBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  rejectConfirmBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#991B1B',
  },
  rejectConfirmText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
});

export default RefundApprovalScreen;
