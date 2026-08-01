import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetEnrollmentByIdQuery, useCancelEnrollmentMutation } from '../../store/services/eventsApi';
import { useRequestRefundMutation } from '../../store/services/paymentsApi';
import { showAlert, showConfirm } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { Text } from '../../components/common/Text';
import TicketDetailsSkeleton from '../../components/common/TicketDetailsSkeleton';
import SlowNetworkNotice from '../../components/common/SlowNetworkNotice';
import { useSlowNetwork } from '../../hooks/useSlowNetwork';
import { TicketIcon } from '../../components/common/Icons';

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
  const { data: enrollment, isLoading, isError, refetch } = useGetEnrollmentByIdQuery(enrollmentId);
  const { stage: slowStage } = useSlowNetwork(isLoading);
  const [requestRefund, { isLoading: isRequestingRefund }] = useRequestRefundMutation();
  const [cancelEnrollment, { isLoading: isCancellingEnrollment }] = useCancelEnrollmentMutation();
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundRequested, setRefundRequested] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Reachable directly via deep link (eventrix://booking/:bookingId) or a push-notification
  // tap (see navigateForPushData in RootNavigator.tsx), either of which can land here as the
  // first screen in the stack — goBack() throws "GO_BACK was not handled" with nothing to
  // pop to. Fall back to the Bookings tab instead of leaving the back button a no-op.
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Bookings' });
    }
  };

  const handleShare = async () => {
    if (!enrollment) return;
    const title = enrollment.event?.title ?? 'my event';
    try {
      await Share.share({
        message: `I'm going to "${title}" on Eventrix — booking ref ${enrollment.bookingReference}.`,
      });
    } catch {
      // user dismissed the share sheet — nothing to surface
    }
  };

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

  const handleCancelEnrollment = () => {
    showConfirm(
      'Cancel this booking?',
      "This ticket will no longer be valid and your spot will be released. This can't be undone.",
      async () => {
        try {
          await cancelEnrollment(enrollmentId).unwrap();
        } catch (e: any) {
          showAlert('Could not cancel booking', extractErrorMessage(e, 'Please try again.'));
        }
      },
      'Cancel Booking',
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Ticket Details" onBack={handleGoBack} />
        {/* The venue-entrance case: pulling up a QR on congested event wifi is one of the
            few places in this app where the user genuinely cannot just try again later. */}
        <SlowNetworkNotice stage={slowStage} onRetry={refetch} style={styles.slowNotice} />
        <TicketDetailsSkeleton />
      </View>
    );
  }

  if (isError || !enrollment) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Ticket Details" onBack={handleGoBack} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load ticket details.</Text>
        </View>
      </View>
    );
  }

  const statusStyle = STATUS_LABELS[enrollment.status] ?? STATUS_LABELS.confirmed;
  const isCancelled = enrollment.status === 'cancelled';
  // Both conditions matter: totalAmount > 0 alone isn't enough, since a paid ticket type
  // sits at paymentStatus 'pending' from enroll() until checkout actually completes (no
  // in-app payment flow exists yet) — requestRefund() 400s on anything that isn't
  // 'paid'. Only route through the refund flow once money has actually been collected;
  // otherwise a direct, no-refund-needed cancel is both correct and necessary.
  const isPaidBooking = Number(enrollment.totalAmount) > 0 && enrollment.paymentStatus === 'paid';

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Ticket Details"
        onBack={handleGoBack}
        rightAction={
          <TouchableOpacity style={styles.shareIconBtn} onPress={handleShare} hitSlop={8}>
            <Text style={styles.shareIconText}>⤴</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
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
              <View style={styles.detailIcon}>
                <TicketIcon color={colors.text} size={20} />
              </View>
              <View>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{enrollment.quantity} ticket(s)</Text>
              </View>
            </View>
          </View>

          {!isCancelled && enrollment.ticketCode ? (
            <View style={styles.qrSection}>
              <View style={styles.qrBox}>
                {/* Value is the same signed ticketCode EventsService.checkIn() already
                    verifies server-side — nothing new needed on the backend, this screen
                    was the only place still showing a fake placeholder pattern instead of
                    an actual scannable code. White background regardless of theme, since a
                    QR code needs light-on-dark contrast to scan reliably either way. */}
                <QRCode value={enrollment.ticketCode} size={124} backgroundColor="white" color="black" />
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
                  isPaidBooking ? (
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
                  ) : (
                    <TouchableOpacity
                      style={[styles.refundBtn, styles.footerBtnFlex]}
                      onPress={handleCancelEnrollment}
                      disabled={isCancellingEnrollment}
                    >
                      {isCancellingEnrollment ? (
                        <ActivityIndicator color="#991B1B" size="small" />
                      ) : (
                        <Text style={styles.refundText}>Cancel Enrollment</Text>
                      )}
                    </TouchableOpacity>
                  )
                ) : null}
              </View>
            )}
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  slowNotice: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  root: { flex: 1, backgroundColor: colors.neutralBg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 15 },
  shareIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
  shareIconText: { fontSize: 18, color: colors.brandPink },
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
    // Fixed white, not colors.muted — a QR code needs light-on-dark contrast to scan
    // reliably regardless of app theme, so the box behind it must stay white too.
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
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
