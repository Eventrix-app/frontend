import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useGetEventByIdQuery,
  useGetTicketTypesQuery,
  useEnrollEventMutation,
  isWaitlistResult,
} from '../../store/services/eventsApi';
import { useInitiatePayUOrderMutation, PayUInitiateResponse } from '../../store/services/paymentsApi';
import { useGetOrganizerProfileQuery } from '../../store/services/organizerApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { formatEventDate, formatEventTime } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';
import {
  LeftArrow,
  TicketIcon,
  CalendarIcon,
  ClockIcon,
  LocationPin,
  PersonIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  PhoneIcon,
  WhatsAppIcon,
  ClipboardIcon,
} from '../../components/common/Icons';
import { PLATFORM_FEE_INR, GST_RATE, getGstInclusivePrice, getGstPortion } from '../../utils/pricing';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import PayUCheckoutModal from '../../components/payments/PayUCheckoutModal';

// The deployed backend base URL — surl/furl for PayU's return callback must point here.
// Stripped of any trailing slash to match the pattern the backend registers.
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

interface CheckoutRouteParams {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
}

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: { params: CheckoutRouteParams };
}

const VALID_PROMO_CODES: Record<string, number> = {
  RUN50: 150,
};

const PAYMENT_METHODS = ['Google Pay', 'PhonePe', 'Paytm', 'UPI', 'Credit / Debit Card'];

const CheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { eventId, ticketTypeId, quantity: initialQuantity } = route.params;

  const { data: event, isLoading: isLoadingEvent } = useGetEventByIdQuery(eventId);
  const { data: ticketTypes = [], isLoading: isLoadingTiers } = useGetTicketTypesQuery(eventId);
  const [enrollEvent, { isLoading: isEnrolling }] = useEnrollEventMutation();
  const [initiatePayUOrder, { isLoading: isInitiatingPayU }] = useInitiatePayUOrderMutation();

  // Organizer phone, used only by the "Need Help?" action in the overflow menu — same
  // query EventDetailsScreen uses for its call/WhatsApp buttons.
  const { data: organizerProfile } = useGetOrganizerProfileQuery(
    event?.organizer?.id ?? '',
    { skip: !event?.organizer?.id },
  );
  const organizerPhone = organizerProfile?.phone;

  const [selectedTierId, setSelectedTierId] = useState(ticketTypeId);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; amount: number } | null>(null);

  const [paymentIndex, setPaymentIndex] = useState(0);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  // PayU checkout modal state — payuParams is set right before the modal opens and cleared
  // when it closes so there's never a stale set of params visible to a reopened modal.
  const [payuParams, setPayuParams] = useState<PayUInitiateResponse | null>(null);
  const [showPayuModal, setShowPayuModal] = useState(false);

  // Overflow (⋮) menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);

  const selectedTier = ticketTypes.find((t) => t.id === selectedTierId) ?? null;

  const remaining =
    selectedTier?.quantityTotal == null
      ? null
      : Math.max(selectedTier.quantityTotal - selectedTier.quantitySold, 0);

  const min = selectedTier?.minPerOrder ?? 1;
  const max = Math.min(selectedTier?.maxPerOrder ?? Infinity, remaining ?? Infinity);

  const adjustQuantity = (delta: number) => {
    setQuantity((q) => Math.min(Math.max(q + delta, min), Math.max(max, min)));
  };

  // The ticket price is the base price; GST (18%) is added on top in the Order Summary.
  const unitPrice = selectedTier ? selectedTier.price : 0;
  const subtotal = unitPrice * quantity;
  // GST added on top of the ticket subtotal.
  const gst = selectedTier ? getGstPortion(selectedTier.price * quantity) : 0;
  const promoDiscount = appliedPromo?.amount ?? 0;
  const totalPayable = Math.max(subtotal + gst + PLATFORM_FEE_INR - promoDiscount, 0);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const amount = VALID_PROMO_CODES[code];
    if (!amount) {
      showAlert('Invalid code', "That promo code doesn't exist or has expired.");
      return;
    }
    setAppliedPromo({ code, amount });
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
  };

  const handlePay = async () => {
    if (!event || !selectedTier) return;
    try {
      // Step 1: Create the enrollment on the backend.
      // For paid events this sets paymentStatus: 'pending' and totalAmount.
      const result = await enrollEvent({
        eventId: event.id,
        ticketTypeId: selectedTier.id,
        quantity,
      }).unwrap();

      // Step 2a: Waitlist — no payment needed, just inform the user.
      if (isWaitlistResult(result)) {
        showAlert(
          "You're on the Waitlist",
          `You're #${result.position} in line for "${selectedTier.name}". We'll confirm your spot automatically if one opens up.`,
          () => navigation.navigate('Bookings' as any),
        );
        return;
      }

      // Step 2b: Free ticket — already confirmed, no payment gateway needed.
      if (!(Number(result.totalAmount) > 0)) {
        showAlert('Booked!', 'Your spot is confirmed. Enjoy the event!', () =>
          navigation.navigate('Bookings' as any),
        );
        return;
      }

      // Step 2c: Paid ticket — enrollment is confirmed but paymentStatus is 'pending'.
      // Call PayU initiate to get the txnid + hash, then open the checkout modal.
      const payuData = await initiatePayUOrder({ enrollmentId: result.id }).unwrap();
      setPayuParams(payuData);
      setShowPayuModal(true);
    } catch (e: any) {
      showAlert(
        "Couldn't start payment",
        extractErrorMessage(e, 'Something went wrong. Please try again.'),
      );
    }
  };

  const handlePayUSuccess = () => {
    setShowPayuModal(false);
    setPayuParams(null);
    showAlert('Payment Successful!', 'Your ticket is confirmed.', () =>
      navigation.navigate('Bookings' as any),
    );
  };

  const handlePayUFailure = () => {
    setShowPayuModal(false);
    setPayuParams(null);
    showAlert(
      'Payment Failed',
      'Your payment was not completed. Please try again or use a different payment method.',
    );
  };

  const handlePayUDismiss = () => {
    setShowPayuModal(false);
    setPayuParams(null);
    // User closed the modal manually — enrollment exists but payment is still pending.
    // They can tap Pay again to retry with a fresh txnid.
    showAlert(
      'Payment Cancelled',
      'You closed the payment screen. Tap Pay to try again.',
    );
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
          Please review your tickets and confirm your details before payment.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => showPaymentPicker && setShowPaymentPicker(false)}
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
                style={styles.tierPickerBtn}
                onPress={() => setShowTierPicker((v) => !v)}
              >
                <Text style={styles.tierPickerText} numberOfLines={1}>
                  {selectedTier
                    ? `${selectedTier.name} - ${selectedTier.price > 0 ? `₹${selectedTier.price}` : 'Free'}`
                    : 'Select a ticket'}
                </Text>
                <Text style={styles.tierPickerChevron}>{showTierPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showTierPicker && (
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
                        {tier.name} - {tier.price > 0 ? `₹${tier.price}` : 'Free'}
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
                  disabled={quantity <= min}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{String(quantity).padStart(2, '0')}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustQuantity(1)}
                  disabled={quantity >= max}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.tierInfoRow}>
            <Text style={styles.tierInfoLabel}>{selectedTier?.name ?? 'Ticket'} Availability</Text>
            <Text style={styles.tierInfoValue}>
              {remaining !== null ? `${remaining} tickets left` : 'Available'}
            </Text>
          </View>
          <View style={styles.tierInfoRow}>
            <Text style={styles.tierInfoLabel}>Price</Text>
            <Text style={styles.tierInfoValue}>
              {selectedTier && selectedTier.price > 0 ? `₹${selectedTier.price} per ticket` : 'Free'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.tierInfoRow}>
            <Text style={styles.tierTotalLabel}>Total</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.tierTotalSub}>
                (₹{selectedTier?.price ?? 0} x {quantity})
              </Text>
              <Text style={styles.tierTotalValue}>₹{subtotal}</Text>
            </View>
          </View>
        </View>

        {/* Promo Code */}
        <Text style={styles.sectionLabel}>Promo Code</Text>
        <View style={styles.card}>
          <View style={styles.promoRow}>
            <View style={styles.promoInputWrap}>
              <Text style={styles.promoHash}>#</Text>
              <TextInput
                style={styles.promoInput}
                value={promoInput}
                onChangeText={setPromoInput}
                placeholder="Enter promo code"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                editable={!appliedPromo}
              />
              {!!promoInput && !appliedPromo && (
                <TouchableOpacity onPress={() => setPromoInput('')} hitSlop={6}>
                  <CloseCircleIcon color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              )}
              {appliedPromo && (
                <TouchableOpacity onPress={handleRemovePromo} hitSlop={6}>
                  <CloseCircleIcon color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.applyBtn, !!appliedPromo && styles.applyBtnDisabled]}
              onPress={handleApplyPromo}
              disabled={!!appliedPromo}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {appliedPromo && (
            <View style={styles.promoAppliedRow}>
              <CheckCircleIcon color="#059669" size={14} />
              <Text style={styles.promoAppliedText}>
                Promo code '{appliedPromo.code}' applied. You saved ₹{appliedPromo.amount}.
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <Text style={styles.sectionLabel}>Order Summary</Text>
        <View style={styles.card}>
          <View style={styles.toPayRow}>
            <Text style={styles.toPayLabel}>To Pay</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              {promoDiscount > 0 && (
                <Text style={styles.toPayOriginal}>₹{subtotal + PLATFORM_FEE_INR}</Text>
              )}
              <Text style={styles.toPayFinal}>₹{totalPayable}</Text>
            </View>
          </View>

          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Tickets ({quantity} x ₹{unitPrice})</Text>
            <Text style={styles.orderValue}>₹{subtotal}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Platform Fee</Text>
            <Text style={styles.orderValue}>₹{PLATFORM_FEE_INR}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>GST ({Math.round(GST_RATE * 100)}%)</Text>
            <Text style={styles.orderValue}>₹{gst}</Text>
          </View>
          {promoDiscount > 0 && (
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Promo Discount</Text>
              <Text style={styles.orderDiscountValue}>− ₹{promoDiscount}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.orderRow}>
            <Text style={styles.totalPayableLabel}>Total Payable</Text>
            <Text style={styles.totalPayableValue}>₹{totalPayable}</Text>
          </View>
        </View>

        <View style={styles.footerLinksWrap}>
          <Text style={styles.footerCopyright}>All Rights Reserved. © Eventrix</Text>
          <View style={styles.footerLinksRow}>
            <Text style={styles.footerLink}>Terms of use</Text>
            <Text style={styles.footerLinkDot}> • </Text>
            <Text style={styles.footerLink}>Privacy Policy</Text>
            <Text style={styles.footerLinkDot}> • </Text>
            <Text style={styles.footerLink}>Contact Us</Text>
          </View>
          <Text style={styles.footerBrand}>Eventrix</Text>
          <Text style={styles.footerTagline}>DISCOVER EVENTS THAT MATCH YOU</Text>
        </View>
      </ScrollView>

      <View style={[styles.payBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.paymentMethodWrap}>
          {showPaymentPicker && (
            <View style={styles.paymentDropdown}>
              {PAYMENT_METHODS.map((method, i) => {
                const active = i === paymentIndex;
                return (
                  <TouchableOpacity
                    key={method}
                    style={styles.paymentDropdownItem}
                    onPress={() => {
                      setPaymentIndex(i);
                      setShowPaymentPicker(false);
                    }}
                  >
                    <Text style={[styles.paymentDropdownText, active && styles.paymentDropdownTextActive]}>
                      {method}
                    </Text>
                    {active && <CheckCircleIcon color={colors.brandPink} size={14} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <TouchableOpacity
            style={styles.paymentMethodBtn}
            onPress={() => setShowPaymentPicker((v) => !v)}
          >
            <Text style={styles.paymentMethodLabel}>Pay Using</Text>
            <Text style={styles.paymentMethodValue} numberOfLines={1}>
              {PAYMENT_METHODS[paymentIndex]} {showPaymentPicker ? '▲' : '▾'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => {
            setShowPaymentPicker(false);
            handlePay();
          }}
          disabled={isEnrolling || isInitiatingPayU || !selectedTier}
        >
          {isEnrolling || isInitiatingPayU ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payBtnText}>Pay ₹{totalPayable}</Text>
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

      {/* PayU payment gateway modal — only rendered when params are ready */}
      {payuParams && (
        <PayUCheckoutModal
          visible={showPayuModal}
          params={payuParams}
          surlBase={API_BASE_URL}
          onSuccess={handlePayUSuccess}
          onFailure={handlePayUFailure}
          onDismiss={handlePayUDismiss}
        />
      )}
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

    promoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    promoInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.brandPink,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
    },
    promoHash: { fontSize: 14, fontWeight: '700', color: colors.brandPink },
    promoInput: { flex: 1, fontSize: 13, color: colors.text, padding: 0 },
    applyBtn: {
      backgroundColor: colors.brandPink,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    applyBtnDisabled: { opacity: 0.5 },
    applyBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
    promoAppliedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
    },
    promoAppliedText: { fontSize: 12, color: '#059669', flexShrink: 1 },

    toPayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    toPayLabel: { fontSize: 13, color: colors.textSecondary },
    toPayOriginal: { fontSize: 13, color: colors.textSecondary, textDecorationLine: 'line-through' },
    toPayFinal: { fontSize: 18, fontWeight: '700', color: colors.text },

    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },
    orderLabel: { fontSize: 13, color: colors.textSecondary },
    orderValue: { fontSize: 13, fontWeight: '600', color: colors.text },
    orderDiscountValue: { fontSize: 13, fontWeight: '600', color: '#059669' },
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
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
    paymentMethodWrap: {
      flex: 1,
      position: 'relative',
    },
    paymentMethodBtn: {
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
    },
    paymentMethodLabel: { fontSize: 10, color: colors.brandPink, fontWeight: '700' },
    paymentMethodValue: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 2 },
    paymentDropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: '100%',
      marginBottom: spacing.xs,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      ...Platform.select({
        android: { elevation: 8 },
        default: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
        },
      }),
    },
    paymentDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    paymentDropdownText: { fontSize: 13, color: colors.text },
    paymentDropdownTextActive: { color: colors.brandPink, fontWeight: '700' },
    payBtn: {
      backgroundColor: colors.brandPink,
      borderRadius: borderRadius.lg,
      paddingVertical: 16,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

    // --- Overflow (⋮) menu + Refund Policy sheet ---
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