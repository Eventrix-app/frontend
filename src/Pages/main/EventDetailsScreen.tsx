import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useGetEventByIdQuery,
  useGetTicketTypesQuery,
  useEnrollEventMutation,
  useGetMyFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  isWaitlistResult,
  TicketTypeRecord,
} from '../../store/services/eventsApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { DATE_DISPLAY_FORMATTER } from '../../utils/dateFormat';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetails'>;

const GALLERY_PAGE_SIZE = 6;
const SKELETON_IMG = require('../../../assets/skeleton/imageframe.png');


interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

const MOCK_GALLERY: GalleryItem[] = [
  { id: 'g1', type: 'video', url: 'https://example.com/video.mp4', thumbnailUrl: 'https://picsum.photos/400/300?1' },
  { id: 'g2', type: 'image', url: 'https://picsum.photos/400/300?2' },
  { id: 'g3', type: 'image', url: 'https://picsum.photos/400/300?3' },
  { id: 'g4', type: 'image', url: 'https://picsum.photos/400/300?4' },
  { id: 'g5', type: 'image', url: 'https://picsum.photos/400/300?5' },
];

const GalleryThumb: React.FC<{ item: GalleryItem; style?: any }> = ({ item, style }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showSkeleton = !loaded || failed;

  return (
    <View style={[styles.galleryThumbWrap, style]}>
      {showSkeleton && (
        <Image source={SKELETON_IMG} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {!failed && (
        <Image
          source={{ uri: item.thumbnailUrl ?? item.url }}
          style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
};

const GalleryTab: React.FC<{ event: any }> = ({ event }) => {
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);

  // TODO: add `gallery?: GalleryItem[]` to BackendEvent once the backend returns it
  const gallery: GalleryItem[] = event.gallery ?? MOCK_GALLERY;
  const heroVideo = gallery.find((g) => g.type === 'video');
  const images = gallery.filter((g) => g.type === 'image');
  const visibleImages = images.slice(0, visibleCount);
  const hasMore = visibleCount < images.length;

  if (gallery.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.emptyTabText}>Gallery coming soon.</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {heroVideo && (
        <TouchableOpacity activeOpacity={0.9} style={styles.galleryHero}>
          <GalleryThumb item={heroVideo} style={StyleSheet.absoluteFillObject} />
          <View style={styles.galleryPlayBtn}>
            <Text style={styles.galleryPlayIcon}>▶</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.galleryGrid}>
        <View style={styles.galleryCol}>
          {visibleImages.filter((_, i) => i % 2 === 0).map((item) => (
            <GalleryThumb key={item.id} item={item} style={styles.galleryTallCell} />
          ))}
        </View>
        <View style={styles.galleryCol}>
          {visibleImages.filter((_, i) => i % 2 === 1).map((item) => (
            <GalleryThumb key={item.id} item={item} style={styles.galleryShortCell} />
          ))}
        </View>
      </View>

      {hasMore && (
        <TouchableOpacity
          style={styles.viewMoreBtn}
          onPress={() => setVisibleCount((c) => c + GALLERY_PAGE_SIZE)}
        >
          <Text style={styles.viewMoreText}>View More ↓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

type TierAvailability = 'available' | 'sold_out' | 'not_started' | 'ended';
type DetailsTab = 'about' | 'schedule' | 'tickets' | 'community' | 'reviews' | 'gallery';

const TABS: { key: DetailsTab; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'community', label: 'Community' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'gallery', label: 'Gallery' },
];

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

// Days-to-go badge — gracefully returns null (badge hidden) if eventDate isn't parseable.
function daysToGoLabel(eventDate: string): string | null {
  const target = new Date(eventDate);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  const diffMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 Day to go';
  return `${diffDays} Days to go`;
}

const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailsTab>('about');
  const [descExpanded, setDescExpanded] = useState(false);
  const authUser = useSelector((state: RootState) => state.auth.user);

  const { data: event, isLoading, isError, refetch } = useGetEventByIdQuery(route.params.eventId);
  const { data: ticketTypes = [] } = useGetTicketTypesQuery(route.params.eventId);
  const [enrollEvent, { isLoading: isEnrolling }] = useEnrollEventMutation();
  const { data: favorites = [] } = useGetMyFavoritesQuery(undefined, { skip: !authUser });
  const [addFavorite, { isLoading: isSaving }] = useAddFavoriteMutation();
  const [removeFavorite, { isLoading: isUnsaving }] = useRemoveFavoriteMutation();
  const saved = !!event && favorites.some((f) => f.id === event.id);

  const handleToggleSave = async () => {
    if (!authUser) { navigation.navigate('Auth'); return; }
    if (!event || isSaving || isUnsaving) return;
    try {
      if (saved) {
        await removeFavorite(event.id).unwrap();
      } else {
        await addFavorite(event.id).unwrap();
      }
    } catch (e: any) {
      showAlert('Error', extractErrorMessage(e, 'Failed to update saved events'));
    }
  };
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

  // --- Badge pills: only include ones we actually have real data for ---
  const badges: string[] = [];
  const daysToGo = daysToGoLabel(event.eventDate);
  if (daysToGo) badges.push(daysToGo);
  if (event.availableTickets != null) badges.push(`${event.availableTickets} seats left`);
  const soonEndingTier = ticketTypes.find((t) => {
    if (!t.salesEndAt) return false;
    const hoursLeft = (new Date(t.salesEndAt).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 48;
  });
  if (soonEndingTier) badges.push('Ending Soon');
  const earlyBirdTier = ticketTypes.find(
    (t) => t.name?.toLowerCase().includes('early bird') && tierAvailability(t) === 'available',
  );
  if (earlyBirdTier) badges.push('Early Bird');

  const organizerName = event.organizer?.companyName ?? event.organizer?.user?.fullName ?? 'Organizer';

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
        <TouchableOpacity style={styles.save} onPress={handleToggleSave}>
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

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Badge pills */}
        {badges.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgeRow}
          >
            {badges.map((label) => (
              <View key={label} style={styles.badgePill}>
                <Text style={styles.badgeText}>{label}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Organizer row */}
        <View style={styles.organizerRow}>
          <View style={styles.organizerAvatar}>
            <Text style={styles.organizerAvatarText}>👤</Text>
          </View>
          <View style={styles.organizerInfo}>
            <Text style={styles.organizerName}>{organizerName}</Text>
            <TouchableOpacity
              onPress={() => {
                // TODO: navigate once an OrganizerProfile screen/route exists
              }}
            >
              <Text style={styles.viewProfileText}>View Profile ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.organizerActions}>
            {/* TODO: wire these to your messaging/call flow once built */}
            <TouchableOpacity style={styles.organizerActionBtn} onPress={() => {}}>
              <Text style={styles.organizerActionIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.organizerActionBtn} onPress={() => {}}>
              <Text style={styles.organizerActionIcon}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description card */}
        {event.description ? (
          <>
            <Text style={styles.sectionLabel}>Description</Text>
            <View style={styles.descCard}>
              <Text style={styles.descText} numberOfLines={descExpanded ? undefined : 3}>
                {event.description}
              </Text>
              <TouchableOpacity onPress={() => setDescExpanded((v) => !v)}>
                <Text style={styles.readMore}>{descExpanded ? 'Show Less' : '...Read More'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* When-n-where */}
        <Text style={styles.sectionLabel}>When-n-where?</Text>
        <View style={styles.whenWhereBlock}>
          <View style={styles.infoLine}>
            <Text style={styles.infoIcon}>🗓️</Text>
            <Text style={styles.infoLineText}>{event.eventDate}</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoIcon}>🕐</Text>
            <Text style={styles.infoLineText}>{event.startTime}</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoLineText}>{event.venueName}</Text>
          </View>
        </View>

        {/* Quick info */}
        <Text style={styles.sectionLabel}>Quick info</Text>
        <View style={styles.quickInfoRow}>
          {event.totalCapacity != null && (
            <View style={styles.quickInfoCard}>
              <Text style={styles.quickInfoIcon}>👥</Text>
              <View>
                <Text style={styles.quickInfoLabel}>Capacity</Text>
                <Text style={styles.quickInfoValue}>{event.totalCapacity} Participants</Text>
              </View>
            </View>
          )}
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoIcon}>🎟️</Text>
            <View>
              <Text style={styles.quickInfoLabel}>Entry Type</Text>
              <Text style={styles.quickInfoValue}>{event.isPaid ? 'Paid (Online/Offline)' : 'Free'}</Text>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBarScroll}
          contentContainerStyle={styles.tabBarRow}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        {activeTab === 'about' && (
  <View style={styles.tabContent}>
    {event.description ? (
      <>
        <Text style={styles.sectionLabel}>About This Event</Text>
        {event.description.split('\n').filter(Boolean).map((line, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}
      </>
    ) : null}

    {/* TODO: add `highlights?: string[]` to BackendEvent once the backend returns it */}
    {(event as any).highlights?.length > 0 && (
      <>
        <Text style={styles.sectionLabel}>Highlights</Text>
        {(event as any).highlights.map((h: string, i: number) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{h}</Text>
          </View>
        ))}
      </>
    )}

    {/* TODO: add `whoShouldAttend?: string[]` to BackendEvent once the backend returns it */}
    {(event as any).whoShouldAttend?.length > 0 && (
      <>
        <Text style={styles.sectionLabel}>Who Should Attend</Text>
        {(event as any).whoShouldAttend.map((item: string, i: number) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </>
    )}
  </View>
)}

        {activeTab === 'schedule' && (
          <View style={styles.tabContent}>
            {/* TODO: wire to real schedule data once the API has it */}
            <Text style={styles.emptyTabText}>Schedule details coming soon.</Text>
          </View>
        )}

        {activeTab === 'tickets' && (
  <View style={styles.tabContent}>
    {!isOwner && ticketTypes.length > 0 ? (
      <>
        <View style={styles.ticketStubList}>
          {ticketTypes.map((tier) => {
            const remaining = remainingForTier(tier);
            const availability = tierAvailability(tier);
            const selectable = availability === 'available' || availability === 'sold_out';
            const selected = tier.id === selectedTierId;

            // TODO: add `benefits?: string[]` to TicketTypeRecord once the backend returns it
            const benefits: string[] = (tier as any).benefits ?? [];

            const nameLower = tier.name?.toLowerCase() ?? '';
            const stubImage = nameLower.includes('vip')
              ? require('../../../assets/tickets/vip.png')
              : nameLower.includes('standard')
                ? require('../../../assets/tickets/standard.png')
                : require('../../../assets/tickets/earlybird.png');

            const availabilityText =
              availability === 'not_started'
                ? `On sale from ${DATE_DISPLAY_FORMATTER.format(new Date(tier.salesStartAt!))}`
                : availability === 'ended'
                  ? 'Sales closed'
                  : availability === 'sold_out'
                    ? 'Sold out — join waitlist'
                    : remaining !== null ? `${remaining} tickets left` : 'Available';

            return (
              <TouchableOpacity
  key={tier.id}
  activeOpacity={0.9}
  onPress={() => selectable && setSelectedTierId(tier.id)}
  disabled={!selectable}
  style={[styles.ticketStubWrap, selected && styles.ticketStubSelected, !selectable && styles.ticketStubDisabled]}
>
  <Image
    source={stubImage}
    style={StyleSheet.absoluteFill}
    resizeMode="stretch"
  />

  <View style={styles.ticketStubContent}>
    <Text style={styles.ticketStubTitle}>{tier.name}</Text>

    <View style={styles.ticketStubBody}>
      <View style={styles.ticketStubCol}>
        <Text style={styles.ticketStubLabel}>Price</Text>
        <Text style={styles.ticketStubBullet}>
          • {tier.price > 0 ? `₹${tier.price}` : 'Free'}
        </Text>

        <Text style={styles.ticketStubLabel}>Availability</Text>
        <Text style={styles.ticketStubBullet}>• {availabilityText}</Text>
      </View>

      {benefits.length > 0 && (
        <View style={styles.ticketStubCol}>
          <Text style={styles.ticketStubLabel}>Benefits</Text>
          {benefits.map((b, i) => (
            <Text key={i} style={styles.ticketStubBullet}>• {b}</Text>
          ))}
        </View>
      )}
    </View>
  </View>
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

        {event.isPaid && event.refundPolicyType && (
          <>
            <Text style={styles.sectionLabel}>Refund Policy</Text>
            <View style={styles.refundGlass}>
              <View style={styles.refundCard}>
                <Text style={styles.refundType}>{event.refundPolicyType.replace(/_/g, ' ')}</Text>
                {event.refundPolicyText ? (
                  <Text style={styles.refundText}>{event.refundPolicyText}</Text>
                ) : null}
              </View>
            </View>
          </>
        )}

        {/* Payment options */}
        <Text style={styles.sectionLabel}>Payment Options Available</Text>
        <View style={styles.paymentMethodsList}>
          {['UPI', 'Credit / Debit Card', 'Net Banking', 'Wallets', 'Pay at Venue (Offline)'].map((method) => (
            <Text key={method} style={styles.paymentMethodItem}>• {method}</Text>
          ))}
        </View>

        {/* Accepted card/wallet labels — replace with your own icon assets if you have them */}
        <View style={styles.paymentBadgeRow}>
          {['GPay', 'Apple Pay', 'Mastercard', 'Diners', 'Discover', 'RuPay', 'PayPal', 'Shop Pay', 'Visa', 'Amex'].map((label) => (
            <View key={label} style={styles.paymentBadge}>
              <Text style={styles.paymentBadgeText}>{label}</Text>
            </View>
          ))}
        </View>
      </>
    ) : (
      <Text style={styles.emptyTabText}>No ticket information available.</Text>
    )}
  </View>
)}

        {activeTab === 'community' && (
          <View style={styles.tabContent}>
            {/* TODO: wire to real community/discussion data once the API has it */}
            <Text style={styles.emptyTabText}>Community discussion coming soon.</Text>
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.tabContent}>
            {/* TODO: wire to real reviews data once the API has it */}
            <Text style={styles.emptyTabText}>Reviews coming soon.</Text>
          </View>
        )}

        {activeTab === 'gallery' && (
  <GalleryTab event={{ ...event, gallery: MOCK_GALLERY }} />
)}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.footerContent}>
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
      </View>
      </View>
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
  rejectionTitle: { color: '#DC2626', fontSize: 15, fontFamily: 'ZalandoSansExpanded_700Bold' },
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

  title: { fontSize: 22, color: colors.text, fontFamily: 'ZalandoSansExpanded_700Bold' },

  badgeRow: { gap: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  badgePill: {
    backgroundColor: 'rgba(225,29,72,0.1)',
    borderRadius: borderRadius.pill ?? 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginRight: spacing.sm,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.brandPink },

  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  organizerAvatarText: { fontSize: 20 },
  organizerInfo: { flex: 1 },
  organizerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  viewProfileText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  organizerActions: { flexDirection: 'row', gap: spacing.sm },
  organizerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(225,29,72,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerActionIcon: { fontSize: 15 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  descCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  descText: { fontSize: 14, lineHeight: 20, color: colors.text },
  readMore: { fontSize: 13, color: colors.textSecondary, marginTop: 4, alignSelf: 'flex-end' },

  whenWhereBlock: { gap: spacing.sm, marginBottom: spacing.md },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoIcon: { fontSize: 15, width: 22 },
  infoLineText: { fontSize: 14, color: colors.text },

  quickInfoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickInfoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  quickInfoIcon: { fontSize: 20 },
  quickInfoLabel: { fontSize: 11, color: colors.textSecondary },
  quickInfoValue: { fontSize: 13, fontWeight: '600', color: colors.text },

  tabBarScroll: { flexGrow: 0, marginBottom: spacing.md },
  tabBarRow: { gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  tabItem: { paddingBottom: spacing.sm, marginRight: spacing.md },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: colors.brandPink },
  tabLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  tabLabelActive: { color: colors.brandPink },

  tabContent: { paddingTop: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  bulletDot: { fontSize: 14, color: colors.textSecondary },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  emptyTabText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },

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
  refundGlass: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    marginTop: spacing.md,
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
  refundCard: { padding: spacing.md, gap: 4 },
  refundType: { fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  refundText: { fontSize: 13, color: colors.textSecondary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    borderRadius: 0,
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
  bookBtn: { backgroundColor: colors.brandPink, borderRadius: borderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  manageBtn: { backgroundColor: colors.text },
  manageTicketsBtn: { backgroundColor: '#6D28D9', marginTop: spacing.sm },
  checkInBtn: { backgroundColor: '#059669', marginTop: spacing.sm },
  ownerActions: { gap: 0 },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  bookText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  ticketStubList: { gap: spacing.md },
ticketStubWrap: {
  borderRadius: borderRadius.md,
  overflow: 'hidden',
  position: 'relative',
  height: 190,   // reduced from 300 now that content is top-anchored, not centered
},
ticketStubSelected: { opacity: 1 },
ticketStubDisabled: { opacity: 0.5 },
ticketStubBg: {
  flex: 1,                  // fills the fixed-height wrap above
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
  justifyContent: 'center',
},
ticketStubBgImage: { resizeMode: 'stretch' },
ticketStubContent: {
  flex: 1,
  paddingHorizontal: spacing.lg,
  paddingTop: 4,       // was spacing.lg + centered — now smaller top padding, pulled up
  paddingBottom: spacing.lg,
  justifyContent: 'flex-start', // was 'center' — anchors content to the top instead of middle
},
ticketStubTitle: {
  color: colors.white,
  fontSize: 17,
  fontWeight: '700',
  marginBottom: 8,   // was spacing.md — tighter
},
ticketStubBody: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: spacing.lg,
},
ticketStubCol: { flex: 1 },
ticketStubLabel: {
  fontSize: 12,
  fontWeight: '700',
  color: 'rgba(255,255,255,0.85)',
  marginTop: 8,      // was spacing.sm — tighter
  marginBottom: 2,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
},
ticketStubBullet: {
  fontSize: 14,
  color: colors.white,
  lineHeight: 20,
  fontWeight: '600',
},
paymentMethodsList: { gap: 4, marginBottom: spacing.md },
paymentMethodItem: { fontSize: 14, color: colors.text },
paymentBadgeRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: spacing.sm,
  marginBottom: spacing.md,
},
paymentBadge: {
  borderWidth: 1,
  borderColor: colors.borderLight,
  borderRadius: borderRadius.md,
  paddingHorizontal: 10,
  paddingVertical: 6,
},

galleryHero: {
  height: 180,
  borderRadius: borderRadius.md,
  overflow: 'hidden',
  marginBottom: spacing.md,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#E5E7EB',
},
galleryPlayBtn: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.white,
  alignItems: 'center',
  justifyContent: 'center',
},
galleryPlayIcon: { fontSize: 20, color: colors.brandPink, marginLeft: 3 },
galleryGrid: {
  flexDirection: 'row',
  gap: spacing.sm,
},
galleryCol: { flex: 1, gap: spacing.sm },
galleryThumbWrap: {
  borderRadius: borderRadius.md,
  overflow: 'hidden',
  backgroundColor: '#F3F4F6',
},
galleryTallCell: { height: 180 },
galleryShortCell: { height: 130 },
viewMoreBtn: {
  borderWidth: 1.5,
  borderColor: colors.brandPink,
  borderRadius: borderRadius.lg,
  paddingVertical: spacing.sm + 2,
  alignItems: 'center',
  marginTop: spacing.md,
},
viewMoreText: { color: colors.brandPink, fontWeight: '700', fontSize: 14 },

paymentBadgeText: { fontSize: 12, fontWeight: '600', color: colors.text },
});

export default EventDetailsScreen;