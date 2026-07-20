import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetEnrollmentByIdQuery } from '../../store/services/eventsApi';
import { useRequestRefundMutation } from '../../store/services/paymentsApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketDetails'>;

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  confirmed: { label: 'Confirmed', bg: '#D1FAE5', text: '#065F46' },
  pending: { label: 'Pending', bg: '#FEF3C7', text: '#92400E' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', text: '#991B1B' },
  refunded: { label: 'Refunded', bg: '#E0E7FF', text: '#3730A3' },
};

const TicketDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  // route.params.bookingId maps to enrollmentId on the backend (Section 5 naming fix)
  const enrollmentId = route.params.bookingId;
  const { data: enrollment, isLoading, isError } = useGetEnrollmentByIdQuery(enrollmentId);
  const [requestRefund, { isLoading: isRequestingRefund }] = useRequestRefundMutation();
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundRequested, setRefundRequested] = useState(false);

  const handleSubmitRefund = async () => {
    try {
      await requestRefund({ enrollmentId, reason: refundReason.trim() || undefined }).unwrap();
      setShowRefundForm(false);
      setRefundRequested(true);
      showAlert('Refund Requested', "We've sent your request to the organizer for review.");
    } catch (e: any) {
      // Surface the backend's own message directly (e.g. the 48h-cutoff rejection, or "a
      // refund request is already open for this booking") rather than re-deriving it here.
      showAlert('Refund Request Failed', e?.data?.message ?? 'Something went wrong. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  if (isError || !enrollment) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Ticket Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load ticket details.</Text>
        </View>
      </View>
    );
  }

  const statusStyle = STATUS_LABELS[enrollment.status] ?? STATUS_LABELS.confirmed;
  const isCancelled = enrollment.status === 'cancelled';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Ticket Details" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}>
        <View style={[styles.ticketGlass, isCancelled && styles.ticketCancelled]}>
        <View style={styles.ticket}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketLabel}>EVENTRIX TICKET</Text>
            <View style={[styles.status, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          <Text style={styles.bookingRef}>{enrollment.bookingReference}</Text>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🎫</Text>
              <View>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{enrollment.quantity} ticket(s)</Text>
              </View>
            </View>
          </View>

          {!isCancelled && enrollment.ticketCode ? (
            <View style={styles.qrSection}>
              {/* TODO: replace with react-native-qrcode-svg once added as dependency */}
              <View style={styles.qrBox}>
                <Text style={styles.qrPattern}>◦◦◦◦◦{'\n'}◦◦◦◦◦{'\n'}◦◦◦◦◦</Text>
              </View>
              <Text style={styles.qrCode} numberOfLines={1} ellipsizeMode="middle">
                {enrollment.ticketCode}
              </Text>
              <Text style={styles.qrHint}>Show this code at the venue entrance</Text>
            </View>
          ) : isCancelled ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This booking has been cancelled</Text>
            </View>
          ) : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount paid</Text>
            <Text style={styles.totalValue}>
              {Number(enrollment.totalAmount) === 0 ? 'Free' : `₹${enrollment.totalAmount}`}
            </Text>
          </View>
        </View>
        </View>
      </ScrollView>

      {!isCancelled ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.footerContent}>
            {showRefundForm ? (
              <View style={styles.refundForm}>
                <TextInput
                  style={styles.refundInput}
                  placeholder="Reason for refund (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={refundReason}
                  onChangeText={setRefundReason}
                  multiline
                />
                <View style={styles.refundFormActions}>
                  <TouchableOpacity
                    style={styles.refundCancelBtn}
                    onPress={() => setShowRefundForm(false)}
                    disabled={isRequestingRefund}
                  >
                    <Text style={styles.refundCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.refundSubmitBtn, isRequestingRefund && styles.btnDisabled]}
                    onPress={handleSubmitRefund}
                    disabled={isRequestingRefund}
                  >
                    {isRequestingRefund ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.refundSubmitText}>Submit Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={[styles.shareBtn, styles.footerBtnFlex]}
                  onPress={() => navigation.navigate('EventDetails', { eventId: enrollment.eventId })}
                >
                  <Text style={styles.shareText}>View Event</Text>
                </TouchableOpacity>
                {enrollment.status === 'confirmed' ? (
                  refundRequested ? (
                    <View style={[styles.footerBtnFlex, styles.refundPendingBadge]}>
                      <Text style={styles.refundPendingText}>Refund Requested</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.refundBtn, styles.footerBtnFlex]}
                      onPress={() => setShowRefundForm(true)}
                    >
                      <Text style={styles.refundText}>Request Refund</Text>
                    </TouchableOpacity>
                  )
                ) : null}
              </View>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 15 },
  scroll: { padding: spacing.md },
  ticketGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: spacing.md,
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
  ticket: { padding: spacing.lg },
  ticketCancelled: { opacity: 0.85 },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ticketLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: colors.brandPink },
  status: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  statusText: { fontSize: 12, fontWeight: '600' },
  bookingRef: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md, fontFamily: 'monospace' },
  details: { gap: spacing.md, marginBottom: spacing.lg },
  detailRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  detailIcon: { fontSize: 20, marginTop: 2 },
  detailLabel: { fontSize: 12, color: colors.textSecondary },
  detailValue: { fontSize: 15, fontWeight: '500', color: colors.text, marginTop: 2 },
  qrSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  qrBox: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  qrPattern: { fontSize: 24, lineHeight: 28, color: colors.text, textAlign: 'center' },
  qrCode: { fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: 1, maxWidth: 260 },
  qrHint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  cancelledBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  cancelledText: { color: '#991B1B', fontWeight: '600', fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.brandPink },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
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
  footerContent: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerBtnFlex: { flex: 1 },
  shareBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brandPink,
  },
  shareText: { color: colors.brandPink, fontWeight: '600', fontSize: 15 },
  refundBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  refundText: { color: '#991B1B', fontWeight: '600', fontSize: 15 },
  refundPendingBadge: {
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.muted,
  },
  refundPendingText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  refundForm: { gap: spacing.sm },
  refundInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  refundFormActions: { flexDirection: 'row', gap: spacing.sm },
  refundCancelBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  refundCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  refundSubmitBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.brandPink,
  },
  refundSubmitText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
});

export default TicketDetailsScreen;
