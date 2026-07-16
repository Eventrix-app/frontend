import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GlassSurface from '../../components/common/GlassSurface';
import { RootStackParamList } from '../../navigation/types';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useGetEventByIdQuery,
  useGetTicketTypesQuery,
  useEnrollEventMutation,
  isWaitlistResult,
  TicketTypeRecord,
} from '../../store/services/eventsApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { DATE_DISPLAY_FORMATTER } from '../../utils/dateFormat';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetails'>;

type TierAvailability = 'available' | 'sold_out' | 'not_started' | 'ended';

function remainingForTier(tier: TicketTypeRecord): number | null {
  return tier.quantityTotal == null ? null : Math.max(tier.quantityTotal - tier.quantitySold, 0);
}

function isTierSoldOut(tier: TicketTypeRecord): boolean {
  const remaining = remainingForTier(tier);
  return remaining !== null && remaining <= 0;
}

// Mirrors EventsService.enroll()'s sales-window check server-side — a tier outside its
// configured window can't actually be booked, so the UI shouldn't offer it as if it can.
function tierAvailability(tier: TicketTypeRecord): TierAvailability {
  const now = new Date();
  if (tier.salesStartAt && now < new Date(tier.salesStartAt)) return 'not_started';
  if (tier.salesEndAt && now > new Date(tier.salesEndAt)) return 'ended';
  if (isTierSoldOut(tier)) return 'sold_out';
  return 'available';
}

function quantityBoundsForTier(tier: TicketTypeRecord): { min: number; max: number } {
  const min = tier.minPerOrder ?? 1;
  const remaining = remainingForTier(tier);
  // Once a tier is sold out, remaining no longer bounds the quantity — the request is
  // for the waitlist, not live stock — so only maxPerOrder (or a sane default) applies.
  const max = isTierSoldOut(tier)
    ? tier.maxPerOrder ?? 20
    : Math.min(tier.maxPerOrder ?? Infinity, remaining ?? Infinity);
  return { min, max: Math.max(max, min) };
}

const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const authUser = useSelector((state: RootState) => state.auth.user);

  const { data: event, isLoading, isError, refetch } = useGetEventByIdQuery(route.params.eventId);
  const { data: ticketTypes = [] } = useGetTicketTypesQuery(route.params.eventId);
  const [enrollEvent, { isLoading: isEnrolling }] = useEnrollEventMutation();
  // isEnrolling only flips true on the next render after dispatch — a fast double-tap on
  // "Book Now" can fire two enroll requests before that happens, each of which would
  // atomically claim a ticket. This ref closes that gap synchronously.
  const isEnrollingRef = useRef(false);

  // Owner check: event.organizer.userId matches the logged-in user's id
  const isOwner = !!(event && authUser && event.organizer?.userId === authUser.id);

  // Default to the first bookable tier; fall back to the first sold-out one (still
  // joinable via waitlist), and only as a last resort a not-yet-open/closed tier (there's
  // nothing else to preselect, but the footer will correctly show it as unavailable).
  useEffect(() => {
    if (selectedTierId || ticketTypes.length === 0) return;
    const bookable = ticketTypes.find((t) => tierAvailability(t) === 'available');
    const waitlistable = ticketTypes.find((t) => tierAvailability(t) === 'sold_out');
    setSelectedTierId((bookable ?? waitlistable ?? ticketTypes[0]).id);
  }, [ticketTypes, selectedTierId]);

  const selectedTier = ticketTypes.find((t) => t.id === selectedTierId) ?? null;

  // Reset quantity to the new tier's minimum whenever the selected tier changes.
  useEffect(() => {
    if (selectedTier) setQuantity(selectedTier.minPerOrder ?? 1);
  }, [selectedTierId]);

  const adjustQuantity = (delta: number) => {
    if (!selectedTier) return;
    const { min, max } = quantityBoundsForTier(selectedTier);
    setQuantity((q) => Math.min(Math.max(q + delta, min), max));
  };

  const handleEnroll = async () => {
    if (isEnrollingRef.current) return;
    if (!authUser) { navigation.navigate('Auth'); return; }
    if (!event || !selectedTier) return;
    isEnrollingRef.current = true;
    try {
      const result = await enrollEvent({ eventId: event.id, ticketTypeId: selectedTier.id, quantity }).unwrap();
      if (isWaitlistResult(result)) {
        showAlert(
          "You're on the Waitlist",
          `You're #${result.position} in line for "${selectedTier.name}". We'll confirm your spot automatically if one opens up.`,
          () => navigation.navigate('Bookings' as any),
        );
      } else {
        showAlert('Booked!', 'Your ticket is confirmed.', () => navigation.navigate('Bookings' as any));
      }
    } catch (e: any) {
      showAlert("Couldn't complete booking", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      isEnrollingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>Couldn't load this event.</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLinkBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const coverImage = event.coverImageUrl || event.imageUrl;

  const notApprovedYet = event.isPaid && event.approvalStatus !== 'approved';
  const selectedAvailability = selectedTier ? tierAvailability(selectedTier) : null;
  const footerLabel = notApprovedYet
    ? 'Not Available'
    : ticketTypes.length === 0
      ? 'Not Available'
      : !selectedTier
        ? 'Select a Ticket'
        : selectedAvailability === 'not_started'
          ? 'Not on Sale Yet'
          : selectedAvailability === 'ended'
            ? 'Sales Closed'
            : selectedAvailability === 'sold_out'
              ? 'Join Waitlist'
              : 'Book Now';
  const footerDisabled =
    notApprovedYet ||
    ticketTypes.length === 0 ||
    !selectedTier ||
    selectedAvailability === 'not_started' ||
    selectedAvailability === 'ended';

  return (
    <View style={styles.root}>
      <ImageBackground
        source={coverImage ? { uri: coverImage } : undefined}
        style={[styles.hero, { paddingTop: insets.top }]}
        resizeMode="cover"
      >
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        {!coverImage ? <Text style={styles.heroEmoji}>🎪</Text> : null}
        <TouchableOpacity style={styles.save} onPress={() => setSaved((v) => !v)}>
          <Text>{saved ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </ImageBackground>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Owner-only: rejection banner */}
        {isOwner && event.approvalStatus === 'rejected' && (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionTitle}>❌ Event Rejected</Text>
            {event.rejectionReason ? (
              <Text style={styles.rejectionReason}>{event.rejectionReason}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.resubmitBtn}
              onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })}
            >
              <Text style={styles.resubmitBtnText}>Edit & Resubmit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Owner-only: draft actions */}
        {isOwner && event.approvalStatus === 'draft' && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftTitle}>📝 Draft</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Owner-only: ticket sales count for pending/approved */}
        {isOwner && (event.approvalStatus === 'pending_approval' || event.approvalStatus === 'approved') && (
          <View style={styles.salesBanner}>
            <Text style={styles.salesText}>
              {event.approvalStatus === 'pending_approval' ? '⏳ Pending Review' : '✅ Approved'}
            </Text>
            {event.totalCapacity != null && event.availableTickets != null && (
              <Text style={styles.salesCount}>
                🎫 {event.totalCapacity - event.availableTickets} / {event.totalCapacity} tickets sold
              </Text>
            )}
          </View>
        )}

        <Text style={styles.category}>{event.category?.name ?? ''}</Text>
        <Text style={styles.title}>{event.title}</Text>

        <GlassSurface style={styles.infoGlass} contentStyle={styles.infoCard}>
          <Text style={styles.infoRow}>📍 {event.venueName}</Text>
          {event.venueAddress ? <Text style={styles.infoSubRow}>{event.venueAddress}</Text> : null}
          <Text style={styles.infoRow}>📅 {event.eventDate}</Text>
          <Text style={styles.infoRow}>🕐 {event.startTime}</Text>
          <Text style={styles.infoRow}>
            👤 {event.organizer?.companyName ?? event.organizer?.user?.fullName ?? 'Organizer'}
          </Text>
        </GlassSurface>

        {event.description ? (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description}</Text>
          </>
        ) : null}

        {/* Participant-facing tier picker — the footer's Book Now/Join Waitlist button
            acts on whichever tier is selected here. */}
        {!isOwner && ticketTypes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Tickets</Text>
            <View style={styles.tierList}>
              {ticketTypes.map((tier) => {
                const remaining = remainingForTier(tier);
                const availability = tierAvailability(tier);
                const selectable = availability === 'available' || availability === 'sold_out';
                const selected = tier.id === selectedTierId;
                const metaText =
                  availability === 'not_started'
                    ? `On sale from ${DATE_DISPLAY_FORMATTER.format(new Date(tier.salesStartAt!))}`
                    : availability === 'ended'
                      ? 'Sales closed'
                      : availability === 'sold_out'
                        ? 'Sold out — join waitlist'
                        : remaining !== null ? `${remaining} left` : 'Available';
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[
                      styles.tierRow,
                      selected && styles.tierRowSelected,
                      !selectable && styles.tierRowDisabled,
                    ]}
                    onPress={() => selectable && setSelectedTierId(tier.id)}
                    disabled={!selectable}
                  >
                    <View style={styles.tierInfo}>
                      <Text style={styles.tierName}>{tier.name}</Text>
                      <Text
                        style={[
                          styles.tierMeta,
                          availability === 'sold_out' && styles.tierMetaSoldOut,
                          (availability === 'not_started' || availability === 'ended') && styles.tierMetaClosed,
                        ]}
                      >
                        {metaText}
                      </Text>
                    </View>
                    <Text style={styles.tierPrice}>{tier.price > 0 ? `₹${tier.price}` : 'Free'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedTier && (() => {
              const { min, max } = quantityBoundsForTier(selectedTier);
              const atMin = quantity <= min;
              const atMax = quantity >= max;
              return (
                <View style={styles.stepperRow}>
                  <Text style={styles.stepperLabel}>Quantity</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepperBtn, atMin && styles.stepperBtnDisabled]}
                      onPress={() => adjustQuantity(-1)}
                      disabled={atMin}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{quantity}</Text>
                    <TouchableOpacity
                      style={[styles.stepperBtn, atMax && styles.stepperBtnDisabled]}
                      onPress={() => adjustQuantity(1)}
                      disabled={atMax}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </>
        )}

        {/* Refund policy — shown before booking button for paid events */}
        {event.isPaid && event.refundPolicyType && (
          <>
            <Text style={styles.sectionTitle}>Refund Policy</Text>
            <GlassSurface style={styles.refundGlass} contentStyle={styles.refundCard}>
              <Text style={styles.refundType}>{event.refundPolicyType.replace(/_/g, ' ')}</Text>
              {event.refundPolicyText ? (
                <Text style={styles.refundText}>{event.refundPolicyText}</Text>
              ) : null}
            </GlassSurface>
          </>
        )}
      </ScrollView>

      <GlassSurface style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]} contentStyle={styles.footerContent}>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.bookBtn, styles.manageBtn]}
              onPress={() => navigation.navigate('MyEvents')}
            >
              <Text style={styles.bookText}>Manage Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookBtn, styles.manageTicketsBtn]}
              onPress={() => navigation.navigate('ManageTicketTypes', { eventId: event.id })}
            >
              <Text style={styles.bookText}>Manage Ticket Types</Text>
            </TouchableOpacity>
            {event.approvalStatus === 'approved' && (
              <TouchableOpacity
                style={[styles.bookBtn, styles.checkInBtn]}
                onPress={() => navigation.navigate('CheckIn', { eventId: event.id })}
              >
                <Text style={styles.bookText}>Check In Attendees</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.bookBtn, footerDisabled ? styles.disabledBtn : {}]}
            onPress={handleEnroll}
            disabled={isEnrolling || footerDisabled}
          >
            {isEnrolling ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.bookText}>{footerLabel}</Text>
            )}
          </TouchableOpacity>
        )}
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  center: { justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  errorText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  errorActions: { flexDirection: 'row', gap: spacing.sm },
  retryBtn: { backgroundColor: colors.brandPink, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white, fontWeight: '600' },
  backLinkBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  backLinkText: { color: colors.textSecondary, fontWeight: '600' },
  hero: {
    height: 280,
    backgroundColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md + 44,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.white, fontSize: 22 },
  save: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md + 44,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 80 },
  body: {
    flex: 1,
    marginTop: -24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
  },
  rejectionBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  rejectionTitle: { color: '#DC2626', fontSize: 15,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  rejectionReason: { color: '#7F1D1D', fontSize: 13 },
  resubmitBtn: {
    marginTop: spacing.sm,
    backgroundColor: '#DC2626',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  resubmitBtnText: { color: colors.white, fontWeight: '600' },
  draftBanner: {
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftTitle: { fontWeight: '600', color: colors.text },
  editBtn: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  editBtnText: { color: colors.white, fontWeight: '600' },
  salesBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  salesText: { fontWeight: '600', color: '#065F46' },
  salesCount: { fontSize: 13, color: '#047857' },
  category: { color: colors.brandPink, fontWeight: '600', fontSize: 13, marginBottom: spacing.xs },
  title: { fontSize: 24, color: colors.text, marginBottom: spacing.md,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  infoGlass: { borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  infoCard: { gap: spacing.sm, padding: spacing.md },
  infoRow: { fontSize: 14, color: colors.textSecondary },
  infoSubRow: { fontSize: 13, color: colors.textSecondary, marginTop: -6, marginLeft: 20 },
  sectionTitle: { fontSize: 18, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  description: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  tierList: { gap: spacing.sm },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
  },
  tierRowSelected: { borderColor: colors.brandPink, backgroundColor: 'rgba(225, 29, 72, 0.06)' },
  tierRowDisabled: { opacity: 0.55 },
  tierInfo: { flex: 1, gap: 2 },
  tierName: { fontSize: 15, fontWeight: '600', color: colors.text },
  tierMeta: { fontSize: 12, color: colors.textSecondary },
  tierMetaSoldOut: { color: '#DC2626', fontWeight: '600' },
  tierMetaClosed: { color: colors.textSecondary, fontStyle: 'italic' },
  tierPrice: { fontSize: 15, fontWeight: '700', color: colors.brandPink, marginLeft: spacing.sm },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  stepperLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperBtnText: { fontSize: 18, fontWeight: '700', color: colors.text },
  stepperValue: { fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 24, textAlign: 'center' },
  refundGlass: { borderRadius: borderRadius.md, marginBottom: spacing.md },
  refundCard: { padding: spacing.md, gap: 4 },
  refundType: { fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  refundText: { fontSize: 13, color: colors.textSecondary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, borderRadius: 0 },
  footerContent: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  bookBtn: { backgroundColor: colors.brandPink, borderRadius: borderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  manageBtn: { backgroundColor: colors.text },
  manageTicketsBtn: { backgroundColor: '#6D28D9', marginTop: spacing.sm },
  checkInBtn: { backgroundColor: '#059669', marginTop: spacing.sm },
  ownerActions: { gap: 0 },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  bookText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default EventDetailsScreen;
