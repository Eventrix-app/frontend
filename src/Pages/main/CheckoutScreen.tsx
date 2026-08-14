import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  KeyboardAvoidingView,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../navigation/types';
import type { AppDispatch } from '../../store';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  eventsApi,
  useGetEventByIdQuery,
  useGetTicketTypesQuery,
  useEnrollEventMutation,
  isWaitlistResult,
  EnrollmentRecord,
} from '../../store/services/eventsApi';
import {
  useGetCheckoutEstimateQuery,
  useInitiatePayUOrderMutation,
  type PayUOrderResult,
} from '../../store/services/paymentsApi';
import { useGetOrganizerProfileQuery } from '../../store/services/organizerApi';
import PayUCheckoutModal from '../../components/payments/PayUCheckoutModal';
import { useMyEventEnrollment } from '../../hooks/useMyEventEnrollment';
import { showAlert, showConfirm } from '../../utils/crossPlatformAlert';
import { useGetMeQuery } from '../../store/services/userApi';
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

// Mirrors PaymentsService.toPayuPhone; permissive because it only decides whether to
// interrupt before enrolling, not what PayU receives.
function hasTenDigitPhone(raw: string | null | undefined): boolean {
  const digits = (raw ?? '').replace(/\D/g, '');
  return (digits.length > 10 ? digits.slice(-10) : digits).length === 10;
}

// Both watermark assets are required at module level so Metro can resolve them
// statically at bundle time — conditional require() inside a component body
// causes a Metro resolution error.
const watermarkLight = require('../../../assets/splash/watermark.png');
const watermarkDark = require('../../../assets/splash/watermark_dark_theme.png');

const CheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const watermarkSource = theme === 'dark' ? watermarkDark : watermarkLight;

  const { eventId, ticketTypeId: initialTicketTypeId, quantity: initialQuantity } = route.params;

  const { data: event, isLoading: isLoadingEvent } = useGetEventByIdQuery(eventId);
  const { data: ticketTypes = [], isLoading: isLoadingTiers } = useGetTicketTypesQuery(eventId);
  const dispatch = useDispatch<AppDispatch>();
  const [enrollEvent, { isLoading: isEnrolling }] = useEnrollEventMutation();
  const [initiatePayUOrder, { isLoading: isCreatingOrder }] = useInitiatePayUOrderMutation();

  // PayU's hosted page, not the native SDK. The SDK's generateHash protocol stalls before it
  // ever presents a payment method; this flow needs one pre-computed hash and no callbacks.
  const [payuOrder, setPayuOrder] = useState<PayUOrderResult | null>(null);

  const { data: me, refetch: refetchMe } = useGetMeQuery();
  const hasPayablePhone = useMemo(() => hasTenDigitPhone(me?.phoneNumber), [me?.phoneNumber]);

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
    // NOT skipped when subtotal is 0: a free event still charges a flat registration
    // fee, so the estimate is the only thing that knows the real total.
    { skip: isResuming || !effectiveTierId },
  );

  const totalPayable = activeEnrollment ? Number(activeEnrollment.totalAmount) : estimate?.total ?? subtotal;
  // Only the fees the buyer is actually being charged — empty under feePayer=organizer.
  const feeLines = activeEnrollment ? [] : estimate?.lines ?? [];
  // Until the estimate lands, the total is provisional (it falls back to the bare subtotal),
  // so paying on a stale number is prevented rather than displayed as if it were final.
  // Free events included: they now carry a real chargeable total, so the estimate gates
  // them too. Paying on the fallback subtotal (0) would skip the registration fee entirely.
  const isEstimatePending = !isResuming && !estimate;
  const isFreeEvent = estimate?.isFreeEvent ?? subtotal <= 0;

  const isPaying = isEnrolling || isCreatingOrder || !!payuOrder || isLoadingEstimate;

  const handlePay = async () => {
    if (!event) return;

    // Before enrollEvent: PayU rejects a bad phone at the end of the flow, leaving an
    // unpayable enrollment behind. Server stays the authority; this just routes to the fix.
    if (totalPayable > 0 && !hasPayablePhone) {
      // The cached profile still holds the old number while its refetch is in flight, which
      // re-prompted users who had just saved one. Confirm with the server before asking again.
      const fresh = await refetchMe()
        .unwrap()
        .catch(() => null);

      if (!hasTenDigitPhone(fresh?.phoneNumber)) {
        showConfirm(
          'Add a mobile number',
          'Our payment provider needs a 10-digit mobile number before it can take a payment. Add one to your profile and come back — your selection is kept.',
          () => navigation.navigate('EditProfile' as never),
          'Add number',
        );
        return;
      }
    }

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

      // Opening the modal is the last step: it POSTs the form itself, and the outcome arrives
      // through onSuccess/onDismiss rather than by awaiting anything here.
      setPayuOrder(await initiatePayUOrder({ enrollmentId: enrollment.id }).unwrap());
    } catch (e: any) {
      showAlert("Couldn't complete payment", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    }
  };

  // The backend already verified PayU's reverse hash before the page that reports this, so
  // there is nothing left to confirm client-side — only the stale enrollment list to drop.
  const handlePayUSuccess = () => {
    setPayuOrder(null);
    dispatch(eventsApi.util.invalidateTags(['MyEnrollments']));
    showAlert('Booked!', 'Your payment was successful and your ticket is confirmed.', () =>
      navigation.navigate('Bookings' as any),
    );
  };

  // Covers both a failed payment and the user closing the sheet — the enrollment stays
  // pending either way, so this screen can resume it.
  const handlePayUDismiss = () => {
    setPayuOrder(null);
    showAlert('Payment not completed', 'You can try again anytime from My Bookings.');
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
      {/* Pink gradient header with event title context */}
      <LinearGradient
        colors={[colors.brandPink, '#FF6B8A']}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <LeftArrow color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowMoreMenu(true)}>
            <Text style={styles.headerMenuDots}>⋮</Text>
          </TouchableOpacity>
        </View>
        {/* No event title shown here — header stays clean */}
        <Text style={styles.headerSubtitle}>
          {isResuming
            ? 'Complete your payment to confirm this booking.'
            : 'Review your tickets and confirm before payment.'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event Summary */}
        <View style={styles.sectionLabelRow}>
          <View style={styles.sectionAccentBar} />
          <Text style={styles.sectionLabel}>Event Summary</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Title</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{event.title}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formatEventDate(event.eventDate)}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{formatEventTime(event.startTime)}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Organizer</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {event.organizer?.companyName ?? event.organizer?.user?.fullName ?? 'Organizer'}
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{event.venueName}</Text>
          </View>
        </View>

        {/* Ticket Selection */}
        <View style={styles.sectionLabelRow}>
          <View style={styles.sectionAccentBar} />
          <Text style={styles.sectionLabel}>Ticket Selection</Text>
        </View>
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
                  style={[styles.stepperBtn, (isResuming || effectiveQuantity <= min) && styles.stepperBtnDisabled]}
                  onPress={() => adjustQuantity(-1)}
                  disabled={isResuming || effectiveQuantity <= min}
                >
                  <Text style={styles.stepperBtnText}>{'−'}</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{String(effectiveQuantity).padStart(2, '0')}</Text>
                <TouchableOpacity
                  style={[styles.stepperBtn, (isResuming || effectiveQuantity >= max) && styles.stepperBtnDisabled]}
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
                <View style={styles.availabilityRow}>
                  {remaining !== null && remaining > 0 && <View style={styles.availabilityDot} />}
                  <Text style={styles.tierInfoValue}>
                    {remaining !== null ? `${remaining} tickets left` : 'Available'}
                  </Text>
                </View>
              </View>
              <View style={styles.tierInfoRow}>
                <Text style={styles.tierInfoLabel}>Price</Text>
                <Text style={styles.tierInfoValue}>
                  {selectedTier && selectedTier.price > 0 ? `₹${selectedTier.price} per ticket` : 'Free'}
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
        <View style={styles.sectionLabelRow}>
          <View style={styles.sectionAccentBar} />
          <Text style={styles.sectionLabel}>Order Summary</Text>
        </View>
        <View style={styles.card}>
          {/* Full-bleed pink gradient To Pay strip — the most important number on screen */}
          <LinearGradient
            colors={[colors.brandPink, '#FF6B8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.toPayStrip}
          >
            <Text style={styles.toPayLabel}>Amount to Pay</Text>
            <Text style={styles.toPayFinal}>{'₹'}{totalPayable}</Text>
          </LinearGradient>

          <View style={styles.orderBreakdown}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Tickets ({effectiveQuantity} x {'₹'}{tierPrice})</Text>
              <Text style={styles.orderValue}>{'₹'}{subtotal}</Text>
            </View>
            {/* Server-supplied. No fee rows at all when the organizer absorbs them — showing a
                "Platform Fee" the buyer isn't paying would misstate what they're being charged. */}
            {feeLines.map((line) => (
              <View key={line.label} style={styles.orderRow}>
                <Text style={styles.orderLabel}>{line.label}</Text>
                <Text style={styles.orderValue}>{'₹'}{line.amount.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.orderRow}>
              <Text style={styles.totalPayableLabel}>Total Payable</Text>
              <Text style={styles.totalPayableValue}>{'₹'}{totalPayable}</Text>
            </View>
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
          <Image
            source={watermarkSource}
            style={[styles.footerWatermark, theme === 'dark' && { tintColor: '#FFFFFF' }]}
            resizeMode="contain"
          />
        </View>
      </ScrollView>

      {/* Gradient fade pay bar — blends softly into scroll content above */}
      <View style={[styles.payBarWrap, { paddingBottom: insets.bottom + spacing.md }]}>
        <LinearGradient
          colors={['rgba(250,250,252,0)', colors.neutralBg]}
          style={styles.payBarFade}
          pointerEvents="none"
        />
        <TouchableOpacity
          style={[styles.payBtn, (isPaying || isEstimatePending || (!isResuming && !selectedTier)) && styles.payBtnDisabled]}
          onPress={handlePay}
          // Blocked while the estimate is outstanding: totalPayable falls back to the bare
          // subtotal until it arrives, and the user must never tap "Pay ₹X" on a number that
          // isn't the one about to be charged.
          disabled={isPaying || isEstimatePending || (!isResuming && !selectedTier)}
        >
          <LinearGradient
            colors={['#FF3366', '#FF6B8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payBtnGradient}
          >
            {isPaying ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.payBtnText}>Pay {'₹'}{totalPayable}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <PayUCheckoutModal
        visible={!!payuOrder}
        order={payuOrder}
        onSuccess={handlePayUSuccess}
        onDismiss={handlePayUDismiss}
      />

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

    // ── Header (now a LinearGradient, no backgroundColor needed here) ─────────
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'ZalandoSansExpanded_700Bold',
      color: '#FFFFFF',
    },
    headerMenuDots: { fontSize: 22, color: '#FFFFFF' },
    headerEventTitle: {
      fontSize: 14,
      fontFamily: 'Poppins_600SemiBold',
      color: 'rgba(255,255,255,0.95)',
      marginTop: spacing.xs,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.78)',
      lineHeight: 16,
    },

    // ── Scroll ────────────────────────────────────────────────────────────────
    scroll: { flex: 1, paddingHorizontal: spacing.md },

    // ── Section Labels with accent bar ────────────────────────────────────────
    sectionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    sectionAccentBar: {
      width: 3,
      height: 14,
      borderRadius: 2,
      backgroundColor: colors.brandPink,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: 'Poppins_600SemiBold',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },

    // ── Cards ─────────────────────────────────────────────────────────────────
    card: {
      backgroundColor: colors.white,
      borderRadius: 20,
      overflow: 'hidden',
      ...Platform.select({
        android: { elevation: 2 },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
        },
      }),
    },

    // ── Event Summary rows ────────────────────────────────────────────────────
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    summaryIcon: { fontSize: 15, width: 22, textAlign: 'center' },
    summaryLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    summaryValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
      textAlign: 'right',
      maxWidth: '55%',
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginHorizontal: spacing.md,
    },

    // ── Ticket Selection ──────────────────────────────────────────────────────
    tierPickerRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
    tierPickerCol: { flex: 1.4 },
    quantityCol: { flex: 1 },
    fieldLabel: {
      fontSize: 11,
      fontFamily: 'Poppins_600SemiBold',
      color: colors.brandPink,
      marginBottom: 6,
    },
    tierPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: colors.brandPink,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
    },
    tierPickerBtnLocked: { opacity: 0.6 },
    tierPickerText: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1 },
    tierPickerChevron: { fontSize: 10, color: colors.brandPink, marginLeft: 4 },
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

    // Stepper — pink filled circles
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: colors.brandPink,
      borderRadius: borderRadius.md,
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    stepperBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.brandPink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnDisabled: {
      backgroundColor: colors.muted,
    },
    stepperBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    stepperValue: { fontSize: 14, fontWeight: '700', color: colors.text },

    tierInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    tierInfoLabel: { fontSize: 12, color: colors.textSecondary },
    tierInfoValue: { fontSize: 12, fontWeight: '600', color: colors.text },
    availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    availabilityDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#10B981',
    },
    tierTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    tierTotalSub: { fontSize: 11, color: colors.textSecondary },
    tierTotalValue: { fontSize: 16, fontWeight: '700', color: colors.brandPink },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginVertical: spacing.sm,
    },

    // ── Order Summary ─────────────────────────────────────────────────────────
    // Full-bleed pink gradient To Pay strip at the top of the order card
    toPayStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md + 2,
    },
    toPayLabel: {
      fontSize: 13,
      fontFamily: 'Poppins_500Medium',
      color: 'rgba(255,255,255,0.88)',
    },
    toPayFinal: {
      fontSize: 17,
      fontFamily: 'ZalandoSansExpanded_700Bold',
      color: '#FFFFFF',
    },
    orderBreakdown: { padding: spacing.md, paddingTop: spacing.sm },
    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },
    orderLabel: { fontSize: 13, color: colors.textSecondary },
    orderValue: { fontSize: 13, fontWeight: '600', color: colors.text },
    totalPayableLabel: { fontSize: 15, fontWeight: '700', color: colors.brandPink },
    totalPayableValue: { fontSize: 17, fontWeight: '700', color: colors.brandPink },

    // ── Footer ────────────────────────────────────────────────────────────────
    footerLinksWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: 6 },
    footerCopyright: { fontSize: 11, color: colors.textSecondary },
    footerLinksRow: { flexDirection: 'row', alignItems: 'center' },
    footerLink: { fontSize: 11, color: colors.brandPink, textDecorationLine: 'underline' },
    footerLinkDot: { fontSize: 11, color: colors.textSecondary },
    footerWatermark: {
      width: 380,
      height: 140,
      opacity: 0.45,
      marginTop: spacing.md,
    },

    // ── Pay Bar ───────────────────────────────────────────────────────────────
    payBarWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      backgroundColor: 'transparent',
    },
    // Soft upward fade from transparent → neutralBg so the bar blends into scroll content
    payBarFade: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: spacing.lg,
    },
    payBtn: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...Platform.select({
        android: { elevation: 6 },
        default: {
          shadowColor: colors.brandPink,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
      }),
    },
    payBtnDisabled: { opacity: 0.55 },
    payBtnGradient: {
      paddingVertical: 18,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'ZalandoSansExpanded_700Bold',
      letterSpacing: 0.3,
    },

    // ── More Menu ─────────────────────────────────────────────────────────────
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
