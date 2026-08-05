import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import type { AppDispatch } from '../../store';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useGetEventByIdQuery,
  useGetTicketTypesQuery,
  useEnrollEventMutation,
  isWaitlistResult,
  EnrollmentRecord,
} from '../../store/services/eventsApi';
import {
  useGetCheckoutEstimateQuery,
  useInitiatePayUNativeOrderMutation,
  useVerifyPayUNativeMutation,
} from '../../store/services/paymentsApi';
import { useGetOrganizerProfileQuery } from '../../store/services/organizerApi';
import { openPayUCheckout } from '../../services/payuNativeService';
import { useMyEventEnrollment } from '../../hooks/useMyEventEnrollment';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { formatEventDate, formatEventTime } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';
import { LeftArrow, PhoneIcon, WhatsAppIcon, ClipboardIcon } from '../../components/common/Icons';
import HalfScreenModal from '../../components/common/halfscreenmodal';

interface CheckoutRouteParams {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
}

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: { params: CheckoutRouteParams };
}

const CheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { eventId, ticketTypeId: initialTicketTypeId, quantity: initialQuantity } = route.params;

  const { data: event, isLoading: isLoadingEvent } = useGetEventByIdQuery(eventId);
  const { data: ticketTypes = [], isLoading: isLoadingTiers } = useGetTicketTypesQuery(eventId);
  const dispatch = useDispatch<AppDispatch>();
  const [enrollEvent, { isLoading: isEnrolling }] = useEnrollEventMutation();
  const [initiatePayUNativeOrder, { isLoading: isCreatingOrder }] = useInitiatePayUNativeOrderMutation();
  const [verifyPayUNative] = useVerifyPayUNativeMutation();

  // If a non-cancelled enrollment for this event already exists (a fresh booking just made,
  // or one left over from a previous abandoned/failed payment attempt), this screen switches
  // into "resume payment" mode against that exact enrollment instead of creating a new one.
  const { activeEnrollment } = useMyEventEnrollment(eventId);

  // Organizer phone, used only by the "Need Help?" action in the overflow menu.
  const { data: organizerProfile } = useGetOrganizerProfileQuery(
    event?.organizer?.id ?? '',
    { skip: !event?.organizer?.id },
  );
  const organizerPhone = organizerProfile?.phone;

  const [selectedTierId, setSelectedTierId] = useState(initialTicketTypeId);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [showTierPicker, setShowTierPicker] = useState(false);

  // Overflow (⋮) menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);

  // True from the moment the native PayU checkout sheet is asked to open until a terminal
  // event (success/failure/cancelled/error) resolves.
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const isResuming = !!activeEnrollment;
  const effectiveTierId = activeEnrollment?.ticketType?.id ?? selectedTierId;
  const effectiveQuantity = activeEnrollment?.quantity ?? quantity;

  const selectedTier = ticketTypes.find((t) => t.id === effectiveTierId) ?? null;

  const remaining =
    selectedTier?.quantityTotal == null
      ? null
      : Math.max(selectedTier.quantityTotal - selectedTier.quantitySold, 0);

  const min = selectedTier?.minPerOrder ?? 1;
  const max = Math.min(selectedTier?.maxPerOrder ?? Infinity, remaining ?? Infinity);

  const adjustQuantity = (delta: number) => {
    if (isResuming) return;
    setQuantity((q) => Math.min(Math.max(q + delta, min), Math.max(max, min)));
  };

  const tierPrice = activeEnrollment?.ticketType?.price ?? selectedTier?.price ?? 0;
  const subtotal = tierPrice * effectiveQuantity;

  // Fees are NEVER computed client-side. Which fees apply, and to whom, depends on the
  // event's feePayer and the organizer's own commission rate — neither of which the app can
  // know. This endpoint runs the same FeeCalculationService call enroll() will, so the total
  // shown here is exactly what gets charged. Skipped when resuming, where the enrollment
  // already carries the authoritative amount.
  const { data: estimate, isLoading: isLoadingEstimate } = useGetCheckoutEstimateQuery(
    { ticketTypeId: effectiveTierId, quantity: effectiveQuantity },
    { skip: isResuming || !effectiveTierId || subtotal <= 0 },
  );

  const totalPayable = activeEnrollment ? Number(activeEnrollment.totalAmount) : estimate?.total ?? subtotal;
  // Only the fees the buyer is actually being charged — empty under feePayer=organizer.
  const feeLines = activeEnrollment ? [] : estimate?.lines ?? [];
  // Until the estimate lands, the total is provisional (it falls back to the bare subtotal),
  // so paying on a stale number is prevented rather than displayed as if it were final.
  const isEstimatePending = !isResuming && subtotal > 0 && !estimate;

  const isPaying = isEnrolling || isCreatingOrder || isProcessingPayment || isLoadingEstimate;

  const handlePay = async () => {
    if (!event) return;
    try {
      let enrollment: EnrollmentRecord;

      if (activeEnrollment) {
        enrollment = activeEnrollment;
      } else {
        if (!selectedTier) return;
        const result = await enrollEvent({
          eventId: event.id,
          ticketTypeId: selectedTier.id,
          quantity,
        }).unwrap();

        if (isWaitlistResult(result)) {
          showAlert(
            "You're on the Waitlist",
            `You're #${result.position} in line for "${selectedTier.name}". We'll confirm your spot automatically if one opens up.`,
            () => navigation.navigate('Bookings' as any),
          );
          return;
        }
        enrollment = result;
      }

      // Free event, or an enrollment that's already settled — nothing to pay.
      if (enrollment.paymentStatus === 'paid' || !(Number(enrollment.totalAmount) > 0)) {
        showAlert('Booked!', 'Your payment was successful and your ticket is confirmed.', () =>
          navigation.navigate('Bookings' as any),
        );
        return;
      }

      const order = await initiatePayUNativeOrder({ enrollmentId: enrollment.id }).unwrap();

      setIsProcessingPayment(true);
      const result = await openPayUCheckout(dispatch, order);

      if (result.status === 'success') {
        try {
          const parsed = result.payuResponse ? JSON.parse(result.payuResponse) : {};
          await verifyPayUNative({
            txnid: parsed.txnid ?? order.transactionId,
            mihpayid: parsed.mihpayid,
            status: parsed.status === 'success' ? 'success' : 'failure',
            amount: String(parsed.amount ?? (typeof order.amount === 'number' ? order.amount.toFixed(2) : order.amount)),
            productinfo: parsed.productinfo ?? order.productInfo,
            firstname: parsed.firstname ?? order.firstName,
            email: parsed.email ?? order.email,
            hash: parsed.hash,
          }).unwrap();
          showAlert('Booked!', 'Your payment was successful and your ticket is confirmed.', () =>
            navigation.navigate('Bookings' as any),
          );
        } catch {
          showAlert(
            'Payment received',
            "We received your payment but couldn't confirm it immediately — check My Bookings shortly.",
            () => navigation.navigate('Bookings' as any),
          );
        }
      } else if (result.status === 'cancelled') {
        showAlert('Payment not completed', 'You can try again anytime from My Bookings.');
      } else {
        showAlert(
          "Couldn't complete payment",
          ('errorMsg' in result && result.errorMsg) || 'Something went wrong. Please try again.',
        );
      }
    } catch (e: any) {
      showAlert("Couldn't complete payment", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCall = async () => {
    if (!organizerPhone) {
      showAlert('No phone number', "This organizer hasn't added a contact number yet.");
      return;
    }
    const url = `tel:${organizerPhone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showAlert("Couldn't open dialer", 'Calling is not supported on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      showAlert("Couldn't open dialer", 'Something went wrong. Please try again.');
    }
  };

  const handleWhatsApp = async () => {
    if (!organizerPhone) {
      showAlert('No phone number', "This organizer hasn't added a WhatsApp number yet.");
      return;
    }
    const digits = organizerPhone.replace(/[^\d]/g, '');
    const withCountry = digits.startsWith('91') && digits.length === 12
      ? digits
      : digits.length === 10
        ? `91${digits}`
        : digits;
    const url = `https://wa.me/${withCountry}`;
    try {
      await Linking.openURL(url);
    } catch {
      showAlert("Couldn't open WhatsApp", 'Make sure WhatsApp is installed on your device.');
    }
  };

  if (isLoadingEvent || isLoadingTiers || !event) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <LeftArrow color={colors.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowMoreMenu(true)}>
            <Text style={styles.headerMenuDots}>⋮</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {isResuming
            ? 'Complete your payment to confirm this booking.'
            : 'Please review your tickets and confirm your details before payment.'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event Summary */}
        <Text style={styles.sectionLabel}>Event Summary</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Title</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{event.title}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formatEventDate(event.eventDate)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{formatEventTime(event.startTime)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Organizer</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {event.organizer?.companyName ?? event.organizer?.user?.fullName ?? 'Organizer'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{event.venueName}</Text>
          </View>
        </View>

        {/* Ticket Selection */}
        <Text style={styles.sectionLabel}>Ticket Selection</Text>
        <View style={styles.card}>
          <View style={styles.tierPickerRow}>
            <View style={styles.tierPickerCol}>
              <Text style={styles.fieldLabel}>Ticket Type</Text>
              <TouchableOpacity
                style={[styles.tierPickerBtn, isResuming && styles.tierPickerBtnLocked]}
                onPress={() => !isResuming && setShowTierPicker((v) => !v)}
                disabled={isResuming}
              >
                <Text style={styles.tierPickerText} numberOfLines={1}>
                  {selectedTier
                    ? `${selectedTier.name} - ${selectedTier.price > 0 ? `\u20b9${selectedTier.price}` : 'Free'}`
                    : activeEnrollment?.ticketType
                      ? `${activeEnrollment.ticketType.name} - \u20b9${activeEnrollment.ticketType.price}`
                      : 'Select a ticket'}
                </Text>
                {!isResuming && <Text style={styles.tierPickerChevron}>{showTierPicker ? '\u25b2' : '\u25bc'}</Text>}
              </TouchableOpacity>
              {showTierPicker && !isResuming && (
                <View style={styles.tierDropdown}>
                  {ticketTypes.map((tier) => (
                    <TouchableOpacity
                      key={tier.id}
                      style={styles.tierDropdownItem}
                      onPress={() => {
                        setSelectedTierId(tier.id);
                        setQuantity(tier.minPerOrder ?? 1);
                        setShowTierPicker(false);
                      }}
                    >
                      <Text style={styles.tierDropdownText}>
                        {tier.name} - {tier.price > 0 ? `\u20b9${tier.price}` : 'Free'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.quantityCol}>
              <Text style={styles.fieldLabel}>Quantity</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustQuantity(-1)}
                  disabled={isResuming || effectiveQuantity <= min}
                >
                  <Text style={styles.stepperBtnText}>{'\u2212'}</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{String(effectiveQuantity).padStart(2, '0')}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustQuantity(1)}
                  disabled={isResuming || effectiveQuantity >= max}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {!isResuming && (
            <>
              <View style={styles.tierInfoRow}>
                <Text style={styles.tierInfoLabel}>{selectedTier?.name ?? 'Ticket'} Availability</Text>
                <Text style={styles.tierInfoValue}>
                  {remaining !== null ? `${remaining} tickets left` : 'Available'}
                </Text>
              </View>
              <View style={styles.tierInfoRow}>
                <Text style={styles.tierInfoLabel}>Price</Text>
                <Text style={styles.tierInfoValue}>
                  {selectedTier && selectedTier.price > 0 ? `\u20b9${selectedTier.price} per ticket` : 'Free'}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.tierInfoRow}>
            <Text style={styles.tierTotalLabel}>Total</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.tierTotalSub}>
                ({'\u20b9'}{tierPrice} x {effectiveQuantity})
              </Text>
              <Text style={styles.tierTotalValue}>{'\u20b9'}{subtotal}</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <Text style={styles.sectionLabel}>Order Summary</Text>
        <View style={styles.card}>
          <View style={styles.toPayRow}>
            <Text style={styles.toPayLabel}>To Pay</Text>
            <Text style={styles.toPayFinal}>{'\u20b9'}{totalPayable}</Text>
          </View>

          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Tickets ({effectiveQuantity} x {'\u20b9'}{tierPrice})</Text>
            <Text style={styles.orderValue}>{'\u20b9'}{subtotal}</Text>
          </View>
          {/* Server-supplied. No fee rows at all when the organizer absorbs them \u2014 showing a
              "Platform Fee" the buyer isn't paying would misstate what they're being charged. */}
          {feeLines.map((line) => (
            <View key={line.label} style={styles.orderRow}>
              <Text style={styles.orderLabel}>{line.label}</Text>
              <Text style={styles.orderValue}>{'\u20b9'}{line.amount.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.orderRow}>
            <Text style={styles.totalPayableLabel}>Total Payable</Text>
            <Text style={styles.totalPayableValue}>{'\u20b9'}{totalPayable}</Text>
          </View>
        </View>

        <View style={styles.footerLinksWrap}>
          <Text style={styles.footerCopyright}>All Rights Reserved. {'\u00a9'} Eventrix</Text>
          <View style={styles.footerLinksRow}>
            <Text style={styles.footerLink}>Terms of use</Text>
            <Text style={styles.footerLinkDot}> {'\u2022'} </Text>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerLinkDot}> {'\u2022'} </Text>
            <Text style={styles.footerLink}>Contact Us</Text>
          </View>
          <Text style={styles.footerBrand}>Eventrix</Text>
          <Text style={styles.footerTagline}>DISCOVER EVENTS THAT MATCH YOU</Text>
        </View>
      </ScrollView>

      <View style={[styles.payBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePay}
          // Blocked while the estimate is outstanding: totalPayable falls back to the bare
          // subtotal until it arrives, and the user must never tap "Pay ₹X" on a number that
          // isn't the one about to be charged.
          disabled={isPaying || isEstimatePending || (!isResuming && !selectedTier)}
        >
          {isPaying ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payBtnText}>Pay {'\u20b9'}{totalPayable}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Overflow (⋮) menu */}
      <HalfScreenModal visible={showMoreMenu} onClose={() => setShowMoreMenu(false)} heightPercent={0.35}>
        <View style={styles.moreMenu}>
          <Text variant="h3" style={styles.moreMenuTitle}>More Options</Text>

          <TouchableOpacity
            style={styles.moreMenuItem}
            onPress={() => {
              setShowMoreMenu(false);
              setShowRefundPolicy(true);
            }}
          >
            <ClipboardIcon color={colors.text} size={20} />
            <Text style={styles.moreMenuLabel}>Refund Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreMenuItem}
            onPress={() => {
              setShowMoreMenu(false);
              handleWhatsApp();
            }}
          >
            <WhatsAppIcon color={colors.text} size={20} />
            <Text style={styles.moreMenuLabel}>Need Help? Message on WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreMenuItem}
            onPress={() => {
              setShowMoreMenu(false);
              handleCall();
            }}
          >
            <PhoneIcon color={colors.text} size={20} />
            <Text style={styles.moreMenuLabel}>Call Organizer</Text>
          </TouchableOpacity>
        </View>
      </HalfScreenModal>

      {/* Refund Policy detail sheet */}
      <HalfScreenModal visible={showRefundPolicy} onClose={() => setShowRefundPolicy(false)} heightPercent={0.4}>
        <View style={styles.moreMenu}>
          <Text variant="h3" style={styles.moreMenuTitle}>Refund Policy</Text>
          {event.isPaid && event.refundPolicyType ? (
            <>
              <Text style={styles.refundTypeText}>{event.refundPolicyType.replace(/_/g, ' ')}</Text>
              {event.refundPolicyText ? (
                <Text style={styles.refundBodyText}>{event.refundPolicyText}</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.refundBodyText}>
              No refund policy has been set for this event by the organizer.
            </Text>
          )}
        </View>
      </HalfScreenModal>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.neutralBg },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
      backgroundColor: colors.white,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    headerMenuDots: { fontSize: 22, color: colors.text },
    headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
    scroll: { flex: 1, paddingHorizontal: spacing.md },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      ...Platform.select({
        android: { elevation: 2 },
        default: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
      }),
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    summaryLabel: { fontSize: 13, color: colors.textSecondary },
    summaryValue: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },

    tierPickerRow: { flexDirection: 'row', gap: spacing.md },
    tierPickerCol: { flex: 1.4 },
    quantityCol: { flex: 1 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.brandPink, marginBottom: 4 },
    tierPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
    },
    tierPickerBtnLocked: { opacity: 0.6 },
    tierPickerText: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1 },
    tierPickerChevron: { fontSize: 10, color: colors.textSecondary, marginLeft: 4 },
    tierDropdown: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    tierDropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    tierDropdownText: { fontSize: 13, color: colors.text },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.md,
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    stepperBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnText: { fontSize: 16, fontWeight: '700', color: colors.text },
    stepperValue: { fontSize: 14, fontWeight: '700', color: colors.text },

    tierInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    tierInfoLabel: { fontSize: 12, color: colors.textSecondary },
    tierInfoValue: { fontSize: 12, fontWeight: '600', color: colors.text },
    tierTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    tierTotalSub: { fontSize: 11, color: colors.textSecondary },
    tierTotalValue: { fontSize: 16, fontWeight: '700', color: colors.brandPink },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginVertical: spacing.sm,
    },

    toPayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    toPayLabel: { fontSize: 13, color: colors.textSecondary },
    toPayFinal: { fontSize: 18, fontWeight: '700', color: colors.text },

    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },
    orderLabel: { fontSize: 13, color: colors.textSecondary },
    orderValue: { fontSize: 13, fontWeight: '600', color: colors.text },
    totalPayableLabel: { fontSize: 15, fontWeight: '700', color: colors.brandPink },
    totalPayableValue: { fontSize: 17, fontWeight: '700', color: colors.brandPink },

    footerLinksWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: 6 },
    footerCopyright: { fontSize: 11, color: colors.textSecondary },
    footerLinksRow: { flexDirection: 'row', alignItems: 'center' },
    footerLink: { fontSize: 11, color: colors.brandPink, textDecorationLine: 'underline' },
    footerLinkDot: { fontSize: 11, color: colors.textSecondary },
    footerBrand: { fontSize: 22, fontWeight: '800', color: colors.borderLight, marginTop: spacing.md },
    footerTagline: { fontSize: 10, color: colors.borderLight, letterSpacing: 1 },

    payBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: colors.white,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      ...Platform.select({
        android: { elevation: 8 },
        default: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
      }),
    },
    payBtn: {
      flex: 1,
      backgroundColor: colors.brandPink,
      borderRadius: borderRadius.lg,
      paddingVertical: 16,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

    moreMenu: { padding: spacing.md },
    moreMenuTitle: { marginBottom: spacing.sm },
    moreMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    moreMenuLabel: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
    refundTypeText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textTransform: 'capitalize',
      marginBottom: spacing.xs,
    },
    refundBodyText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  });

export default CheckoutScreen;
