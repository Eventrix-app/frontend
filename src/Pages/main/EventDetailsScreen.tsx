import React, { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Calendar from 'expo-calendar';
import { RootStackParamList } from '../../navigation/types';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useGetEventByIdQuery,
  useGetTicketTypesQuery,
  useGetEventMediaQuery,
  useEnrollEventMutation,
  useGetMyFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  isWaitlistResult,
  TicketTypeRecord,
  useGetScheduleQuery,
  useCreateScheduleItemMutation,
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useGetReviewsQuery,
  useCreateReviewMutation,
} from '../../store/services/eventsApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { DATE_DISPLAY_FORMATTER } from '../../utils/dateFormat';
import { formatEventDate, formatEventTime } from '../../utils/eventCardAdapter';
import { daysUntilEventDate, getEventStartDateTime, getEventEndDateTime } from '../../utils/eventDateTime';
import { Text } from '../../components/common/Text';
import { useChatSocket } from '../../hooks/useChatSocket';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import EventDetailsSkeleton from '../../components/common/EventDetailsSkeleton';

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

// Generic, non-factual filler content — used only when an organizer hasn't filled in the
// real field yet, so the screen never looks bare. Never used for anything a buyer could
// treat as a fact affecting their purchase (price, capacity, seats left, dates) — those
// stay hidden rather than faked when the real value is missing.
const MOCK_DESCRIPTION =
  "Join us for an unforgettable experience filled with great energy, good company, and memories to last a lifetime. Whether you're a first-timer or a regular, there's something here for everyone.";

const MOCK_HIGHLIGHTS = [
  'Live performances and interactive experiences',
  'Networking opportunities with fellow attendees',
  'On-site food and beverage stalls',
  'Professional photography and exclusive event merch',
];

const MOCK_WHO_SHOULD_ATTEND = [
  'Anyone who loves a great time out',
  'Fans of the category who want to connect with like-minded people',
  'Groups, friends, and first-time explorers alike',
];

const MOCK_TICKET_BENEFITS = ['Entry to the event', 'Access to all general areas', 'Complimentary welcome drink'];

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

const GalleryTab: React.FC<{ gallery: GalleryItem[] }> = ({ gallery: realGallery }) => {
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);

  // Falls back to generic stock imagery when the organizer hasn't uploaded any media yet,
  // so the tab isn't just an empty "coming soon" state for every event that lacks photos.
  const gallery = realGallery.length > 0 ? realGallery : MOCK_GALLERY;

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

// --- Schedule tab ---
interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  completed: boolean;
}

// TODO: replace with real schedule data from the backend once that endpoint exists
const MOCK_SCHEDULE: ScheduleItem[] = [
  { id: 's1', time: '9:00 PM', title: 'Participant Check-in Opens', completed: true },
  { id: 's2', time: '10:00 PM', title: 'Warm-up & Briefing', completed: true },
  { id: 's3', time: '10:30 PM', title: 'Marathon Flag-off', completed: true },
  { id: 's4', time: '12:30 AM', title: 'Finish Line Closes', completed: false },
  { id: 's5', time: '1:00 AM', title: 'Awards & Closing Ceremony', completed: false },
  { id: 's6', time: '1:30 AM', title: 'Send-off and departure', completed: false },
];

const ScheduleTab: React.FC<{ eventId: string; isOwner: boolean }> = ({ eventId, isOwner }) => {
  const { data: realSchedule, isLoading } = useGetScheduleQuery(eventId);
  const [createScheduleItem, { isLoading: isAdding }] = useCreateScheduleItemMutation();
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');

  // Falls back to filler content only when the organizer hasn't added a real schedule yet
  // (same "never look bare" reasoning as MOCK_DESCRIPTION/MOCK_HIGHLIGHTS above).
  const schedule: { id: string; time: string; title: string; completed: boolean }[] = realSchedule?.length
    ? realSchedule.map((item) => ({ ...item, completed: false }))
    : MOCK_SCHEDULE;

  const handleAdd = async () => {
    if (!time.trim() || !title.trim()) {
      showAlert('Missing details', 'Add both a time and a title for this schedule item.');
      return;
    }
    try {
      await createScheduleItem({
        eventId,
        body: { time: time.trim(), title: title.trim(), order: realSchedule?.length ?? 0 },
      }).unwrap();
      setTime('');
      setTitle('');
    } catch (err) {
      showAlert('Could not add schedule item', extractErrorMessage(err, 'Please try again.'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {isOwner && (
        <View style={styles.reviewComposer}>
          <Text style={styles.sectionLabel}>Add Schedule Item</Text>
          <TextInput
            style={styles.chatInput}
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 7:00 PM"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={styles.chatInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Doors open"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={styles.reviewSubmitBtn} onPress={handleAdd} disabled={isAdding}>
            <Text style={styles.chatSendBtnText}>{isAdding ? 'Adding…' : 'Add to Schedule'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.scheduleList}>
        {schedule.map((item, index) => {
          const isLast = index === schedule.length - 1;
          return (
            <View key={item.id} style={styles.scheduleRow}>
              <View style={styles.scheduleMarkerCol}>
                <View style={[styles.scheduleMarker, item.completed && styles.scheduleMarkerDone]}>
                  {item.completed && <Text style={styles.scheduleMarkerCheck}>✓</Text>}
                </View>
                {!isLast && (
                  <View style={[styles.scheduleLine, item.completed && styles.scheduleLineDone]} />
                )}
              </View>

              <View style={styles.scheduleCard}>
                <Text style={styles.scheduleTime}>{item.time}</Text>
                <Text style={styles.scheduleTitle}>{item.title}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.scheduleFooterNote}>
        <Text style={styles.scheduleFooterIcon}>ⓘ</Text>
        <Text style={styles.scheduleFooterText}>
          Timings may vary slightly. Please arrive early. Need{' '}
          <Text style={styles.scheduleFooterLink}>help?</Text>
        </Text>
      </View>
    </View>
  );
};

// --- Reviews tab ---
interface ReviewItem {
  id: string;
  name: string;
  username: string;
  rating: number; // 1-5
  text: string;
}

// TODO: replace with real reviews data from the backend once that endpoint exists
const MOCK_REVIEWS: ReviewItem[] = [
  {
    id: 'r1',
    name: 'Robert D. Jr.',
    username: '@random_username',
    rating: 4,
    text: 'Well organized event with great energy and crowd support. Well organized event with great...',
  },
  {
    id: 'r2',
    name: 'Henry F.',
    username: '@random_username',
    rating: 3,
    text: 'Well organized event with great energy and crowd support. Well organized event with great...',
  },
  {
    id: 'r3',
    name: 'Natasha W.',
    username: '@random_username',
    rating: 5,
    text: 'Well organized event with great energy and crowd support. Well organized event with great...',
  },
  {
    id: 'r4',
    name: 'James Cameron',
    username: '@random_username',
    rating: 1,
    text: 'Well organized event with great energy and crowd support. Well organized event with great...',
  },
  {
    id: 'r5',
    name: 'Aman F.',
    username: '@random_username',
    rating: 3,
    text: 'Well organized event with great energy and crowd support. Well organized event with great...',
  },
];

const StarRow: React.FC<{ rating: number }> = ({ rating }) => (
  <View style={styles.reviewStarRow}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Text
        key={n}
        style={[styles.reviewStar, n <= rating ? styles.reviewStarFilled : styles.reviewStarEmpty]}
      >
        ★
      </Text>
    ))}
  </View>
);

const ReviewsTab: React.FC<{ eventId: string; isOwner: boolean }> = ({ eventId, isOwner }) => {
  const { data: realReviews, isLoading } = useGetReviewsQuery(eventId);
  const [createReview, { isLoading: isSubmitting }] = useCreateReviewMutation();
  const [draftRating, setDraftRating] = useState(0);
  const [draftText, setDraftText] = useState('');

  const reviews: ReviewItem[] = realReviews?.length
    ? realReviews.map((r) => ({
        id: r.id,
        name: r.user?.fullName ?? 'Attendee',
        username: '',
        rating: r.rating,
        text: r.text ?? '',
      }))
    : MOCK_REVIEWS;

  const handleSubmit = async () => {
    if (draftRating < 1) {
      showAlert('Pick a rating', 'Tap a star to rate this event before submitting.');
      return;
    }
    try {
      await createReview({ eventId, body: { rating: draftRating, text: draftText.trim() || undefined } }).unwrap();
      setDraftRating(0);
      setDraftText('');
    } catch (err) {
      showAlert('Could not submit review', extractErrorMessage(err, 'Please try again.'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {!isOwner && (
        <View style={styles.reviewComposer}>
          <Text style={styles.sectionLabel}>Write a Review</Text>
          <View style={styles.reviewComposerStars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setDraftRating(n)} hitSlop={4}>
                <Text style={[styles.reviewStar, n <= draftRating ? styles.reviewStarFilled : styles.reviewStarEmpty]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.chatInput, styles.reviewComposerInput]}
            value={draftText}
            onChangeText={setDraftText}
            placeholder="Share your experience (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <TouchableOpacity style={styles.reviewSubmitBtn} onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={styles.chatSendBtnText}>{isSubmitting ? 'Submitting…' : 'Submit Review'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.reviewList}>
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewTopRow}>
              <View style={styles.reviewAvatar}>
                <Text style={styles.reviewAvatarIcon}>🖼️</Text>
              </View>
              <View style={styles.reviewNameCol}>
                <Text style={styles.reviewName}>{review.name}</Text>
                {!!review.username && <Text style={styles.reviewUsername}>{review.username}</Text>}
              </View>
              <StarRow rating={review.rating} />
            </View>

            {!!review.text && <Text style={styles.reviewText}>{review.text}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
};

const CommunityTab: React.FC<{ eventId: string; currentUserId?: string }> = ({ eventId, currentUserId }) => {
  const { messages, sendMessage, isConnected, isLoadingHistory } = useChatSocket(eventId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.communityWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {isLoadingHistory ? (
        <ActivityIndicator style={styles.communityLoader} color={colors.brandPink} />
      ) : messages.length === 0 ? (
        <Text style={styles.emptyTabText}>No messages yet — be the first to say hi.</Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.communyMessagesScroll}
          contentContainerStyle={styles.communityMessages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => {
            const isMine = msg.userId === currentUserId;
            return (
              <View key={msg.id} style={[styles.chatBubbleRow, isMine && styles.chatBubbleRowMine]}>
                <View style={[styles.chatBubble, isMine && styles.chatBubbleMine]}>
                  {!isMine && <Text style={styles.chatSender}>{msg.user?.fullName ?? 'Attendee'}</Text>}
                  <Text style={[styles.chatText, isMine && styles.chatTextMine]}>{msg.message}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.chatComposerRow}>
        <TextInput
          style={styles.chatInput}
          value={draft}
          onChangeText={setDraft}
          placeholder={isConnected ? 'Message the community…' : 'Connecting…'}
          placeholderTextColor={colors.textSecondary}
          editable={isConnected}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.chatSendBtn} onPress={handleSend} disabled={!isConnected || !draft.trim()}>
          <Text style={styles.chatSendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const AnnouncementsTab: React.FC<{ eventId: string; isOwner: boolean }> = ({ eventId, isOwner }) => {
  const { data: announcements = [], isLoading } = useGetAnnouncementsQuery(eventId);
  const [createAnnouncement, { isLoading: isPosting }] = useCreateAnnouncementMutation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handlePost = async () => {
    if (!title.trim() || !body.trim()) {
      showAlert('Missing details', 'Add both a title and a message before posting.');
      return;
    }
    try {
      await createAnnouncement({ eventId, body: { title: title.trim(), body: body.trim() } }).unwrap();
      setTitle('');
      setBody('');
    } catch (err) {
      showAlert('Could not post announcement', extractErrorMessage(err, 'Please try again.'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {isOwner && (
        <View style={styles.reviewComposer}>
          <Text style={styles.sectionLabel}>Post an Announcement</Text>
          <TextInput
            style={styles.chatInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={[styles.chatInput, styles.reviewComposerInput]}
            value={body}
            onChangeText={setBody}
            placeholder="What do you want attendees to know?"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <TouchableOpacity style={styles.reviewSubmitBtn} onPress={handlePost} disabled={isPosting}>
            <Text style={styles.chatSendBtnText}>{isPosting ? 'Posting…' : 'Post Announcement'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {announcements.length === 0 ? (
        <Text style={styles.emptyTabText}>No announcements yet.</Text>
      ) : (
        announcements.map((a) => (
          <View key={a.id} style={styles.reviewCard}>
            <Text style={styles.reviewName}>{a.title}</Text>
            <Text style={styles.reviewText}>{a.body}</Text>
            <Text style={styles.reviewUsername}>{ANNOUNCEMENT_DATE_FORMATTER.format(new Date(a.createdAt))}</Text>
          </View>
        ))
      )}
    </View>
  );
};

type TierAvailability = 'available' | 'sold_out' | 'not_started' | 'ended';
type DetailsTab = 'about' | 'schedule' | 'tickets' | 'community' | 'announcements' | 'reviews' | 'gallery';

const TABS: { key: DetailsTab; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'community', label: 'Community' },
  { key: 'announcements', label: 'Announcements' },
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
  const max = isTierSoldOut(tier)
    ? tier.maxPerOrder ?? 20
    : Math.min(tier.maxPerOrder ?? Infinity, remaining ?? Infinity);
  return { min, max: Math.max(max, min) };
}

function daysToGoLabel(eventDate: string): string | null {
  const diffDays = daysUntilEventDate(eventDate);
  if (diffDays === null || diffDays < 0) return null;
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
  const [showOrganizerMenu, setShowOrganizerMenu] = useState(false);
  const authUser = useSelector((state: RootState) => state.auth.user);

  const { data: event, isLoading, isError, refetch } = useGetEventByIdQuery(route.params.eventId);
  const { data: ticketTypes = [] } = useGetTicketTypesQuery(route.params.eventId);
  const { data: mediaItems = [] } = useGetEventMediaQuery(route.params.eventId);
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

  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  const handleAddToCalendar = async () => {
    if (!event || isAddingToCalendar) return;
    setIsAddingToCalendar(true);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission needed', 'Allow calendar access in your device settings to add this event.');
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const targetCalendar = calendars.find((c) => c.allowsModifications) ?? calendars[0];
      if (!targetCalendar) {
        showAlert("Couldn't add to calendar", 'No calendar is available on this device.');
        return;
      }
      // A missing endTime falls back to a flat +2h block here rather than reusing
      // getEventEndDateTime's start==end fallback, since a zero-length calendar entry
      // renders oddly in most calendar apps.
      const startDate = getEventStartDateTime(event);
      const endDate = event.endTime
        ? getEventEndDateTime(event)
        : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      await Calendar.createEventAsync(targetCalendar.id, {
        title: event.title,
        startDate,
        endDate,
        location: event.venueName,
        notes: event.description || undefined,
        timeZone: 'Asia/Kolkata',
      });
      showAlert('Added to Calendar', `"${event.title}" has been added to your calendar.`);
    } catch (e: any) {
      showAlert("Couldn't add to calendar", extractErrorMessage(e, 'Something went wrong. Please try again.'));
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `Check out "${event.title}" on Eventrix — ${formatEventDate(event.eventDate)} at ${event.venueName}.`,
      });
    } catch {
      // user dismissed the share sheet — nothing to surface
    }
  };

  const isEnrollingRef = useRef(false);

  const isOwner = !!(event && authUser && event.organizer?.userId === authUser.id);

  useEffect(() => {
    if (selectedTierId || ticketTypes.length === 0) return;
    const bookable = ticketTypes.find((t) => tierAvailability(t) === 'available');
    const waitlistable = ticketTypes.find((t) => tierAvailability(t) === 'sold_out');
    setSelectedTierId((bookable ?? waitlistable ?? ticketTypes[0]).id);
  }, [ticketTypes, selectedTierId]);

  const selectedTier = ticketTypes.find((t) => t.id === selectedTierId) ?? null;

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
    return <EventDetailsSkeleton />;
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
  // Generic filler only when the organizer hasn't filled in the real field yet, so the
  // About tab never looks bare — see MOCK_DESCRIPTION's own comment for why this is safe
  // (never used for anything a buyer could treat as a purchase-affecting fact).
  const aboutDescription = event.description || MOCK_DESCRIPTION;
  const highlights: string[] = event.highlights?.length ? event.highlights : MOCK_HIGHLIGHTS;
  const whoShouldAttend: string[] = event.whoShouldAttend?.length ? event.whoShouldAttend : MOCK_WHO_SHOULD_ATTEND;

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
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.heroActionBtn} onPress={handleShare}>
            <Text style={styles.heroActionIcon}>⤴</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionBtn} onPress={handleAddToCalendar} disabled={isAddingToCalendar}>
            {isAddingToCalendar ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.heroActionIcon}>📅</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionBtn} onPress={handleToggleSave}>
            <Text>{saved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
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

        {isOwner && (event.approvalStatus === 'pending_approval' || event.approvalStatus === 'approved') && (
          <View style={styles.salesBanner}>
            <View style={styles.salesBannerHeader}>
              <Text style={styles.salesText}>
                {event.approvalStatus === 'pending_approval' ? '⏳ Pending Review' : '✅ Approved'}
              </Text>
              {event.approvalStatus === 'approved' && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            {event.totalCapacity != null && event.availableTickets != null && (
              <Text style={styles.salesCount}>
                🎫 {event.totalCapacity - event.availableTickets} / {event.totalCapacity} tickets sold
              </Text>
            )}
          </View>
        )}

        <Text style={styles.title}>{event.title}</Text>

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

        <View style={styles.organizerRow}>
          <View style={styles.organizerAvatar}>
            <Text style={styles.organizerAvatarText}>👤</Text>
          </View>
          <View style={styles.organizerInfo}>
            <Text style={styles.organizerName}>{organizerName}</Text>
            <TouchableOpacity
              onPress={() => {
                if (event.organizer?.id) {
                  navigation.navigate('OrganizerProfile', { organizerId: event.organizer.id });
                }
              }}
            >
              <Text style={styles.viewProfileText}>View Profile ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.organizerActions}>
            <TouchableOpacity style={styles.organizerActionBtn} onPress={() => {}}>
              <Text style={styles.organizerActionIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.organizerActionBtn} onPress={() => {}}>
              <Text style={styles.organizerActionIcon}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        <Text style={styles.sectionLabel}>When-n-where?</Text>
        <View style={styles.whenWhereBlock}>
          <View style={styles.infoLine}>
            <Text style={styles.infoIcon}>🗓️</Text>
            <Text style={styles.infoLineText}>{formatEventDate(event.eventDate)}</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoIcon}>🕐</Text>
            <Text style={styles.infoLineText}>{formatEventTime(event.startTime)}</Text>
          </View>
          <View style={styles.infoLine}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoLineText}>{event.venueName}</Text>
          </View>
        </View>

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

        {activeTab === 'about' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabel}>About This Event</Text>
            {aboutDescription.split('\n').filter(Boolean).map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}

            <Text style={styles.sectionLabel}>Highlights</Text>
            {highlights.map((h, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{h}</Text>
              </View>
            ))}

            <Text style={styles.sectionLabel}>Who Should Attend</Text>
            {whoShouldAttend.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'schedule' && <ScheduleTab eventId={event.id} isOwner={isOwner} />}

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

                <Text style={styles.sectionLabel}>Payment Options Available</Text>
                <View style={styles.paymentMethodsList}>
                  {['UPI', 'Credit / Debit Card', 'Net Banking', 'Wallets', 'Pay at Venue (Offline)'].map((method) => (
                    <Text key={method} style={styles.paymentMethodItem}>• {method}</Text>
                  ))}
                </View>

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

        {activeTab === 'community' && event && (
          <View style={styles.tabContent}>
            <CommunityTab eventId={event.id} currentUserId={authUser?.id} />
          </View>
        )}

        {activeTab === 'reviews' && <ReviewsTab eventId={event.id} isOwner={isOwner} />}

        {activeTab === 'announcements' && <AnnouncementsTab eventId={event.id} isOwner={isOwner} />}

        {activeTab === 'gallery' && <GalleryTab gallery={mediaItems} />}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.footerContent}>
          {isOwner ? (
            <TouchableOpacity style={[styles.bookBtn, styles.manageBtn]} onPress={() => setShowOrganizerMenu(true)}>
              <Text style={styles.bookText}>☰ Organizer Menu</Text>
            </TouchableOpacity>
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

      {isOwner && (
        <HalfScreenModal visible={showOrganizerMenu} onClose={() => setShowOrganizerMenu(false)} heightPercent={0.5}>
          <View style={styles.organizerMenu}>
            <Text variant="h3" style={styles.organizerMenuTitle}>Organizer Menu</Text>
            {[
              { label: 'Manage Event', icon: '📋', onPress: () => navigation.navigate('MyEvents') },
              {
                label: 'Manage Ticket Types',
                icon: '🎟️',
                onPress: () => navigation.navigate('ManageTicketTypes', { eventId: event.id }),
              },
              ...(event.approvalStatus === 'approved'
                ? [{ label: 'Check In Attendees', icon: '✅', onPress: () => navigation.navigate('CheckIn', { eventId: event.id }) }]
                : []),
              { label: 'Edit Schedule', icon: '🗓️', onPress: () => setActiveTab('schedule') },
              { label: 'Post Announcement', icon: '📣', onPress: () => setActiveTab('announcements') },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.organizerMenuItem}
                onPress={() => {
                  setShowOrganizerMenu(false);
                  item.onPress();
                }}
              >
                <Text style={styles.organizerMenuIcon}>{item.icon}</Text>
                <Text style={styles.organizerMenuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </HalfScreenModal>
      )}
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
  heroActions: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md + 44,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionIcon: { fontSize: 17, color: colors.white },
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
  salesBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  communityWrap: { minHeight: 360 },
  communityLoader: { marginTop: spacing.xl },
  communyMessagesScroll: { maxHeight: 420 },
  communityMessages: { paddingVertical: spacing.sm, gap: spacing.sm },
  chatBubbleRow: { alignItems: 'flex-start' },
  chatBubbleRowMine: { alignItems: 'flex-end' },
  chatBubble: {
    maxWidth: '80%',
    backgroundColor: colors.neutralBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  chatBubbleMine: { backgroundColor: colors.brandPink },
  chatSender: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 2 },
  chatText: { fontSize: 14, color: colors.text },
  chatTextMine: { color: colors.white },
  chatComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  chatSendBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatSendBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  reviewComposer: {
    backgroundColor: colors.neutralBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  reviewComposerStars: { flexDirection: 'row', gap: spacing.xs },
  reviewComposerInput: { minHeight: 70, textAlignVertical: 'top' },
  reviewSubmitBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  organizerMenu: { padding: spacing.md },
  organizerMenuTitle: { marginBottom: spacing.sm },
  organizerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  organizerMenuIcon: { fontSize: 20 },
  organizerMenuLabel: { fontSize: 15, fontWeight: '600', color: colors.text },

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
  disabledBtn: { backgroundColor: '#9CA3AF' },
  bookText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  ticketStubList: { gap: spacing.md },
  ticketStubWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    height: 190,
  },
  ticketStubSelected: { opacity: 1 },
  ticketStubDisabled: { opacity: 0.5 },
  ticketStubBg: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
  },
  ticketStubBgImage: { resizeMode: 'stretch' },
  ticketStubContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-start',
  },
  ticketStubTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
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
    marginTop: 8,
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

  // --- Schedule tab ---
  scheduleList: { paddingTop: spacing.sm },
  scheduleRow: { flexDirection: 'row' },
  scheduleMarkerCol: { alignItems: 'center', width: 28, marginRight: spacing.sm },
  scheduleMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleMarkerDone: { backgroundColor: '#10B981' },
  scheduleMarkerCheck: { color: colors.white, fontSize: 12, fontWeight: '700' },
  scheduleLine: { width: 2, flex: 1, minHeight: 40, backgroundColor: '#D1D5DB', marginTop: 2 },
  scheduleLineDone: { backgroundColor: '#10B981' },
  scheduleCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scheduleTime: { fontSize: 13, fontWeight: '700', color: colors.brandPink, marginBottom: 4 },
  scheduleTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  scheduleFooterNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  scheduleFooterIcon: { fontSize: 14, color: colors.textSecondary },
  scheduleFooterText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  scheduleFooterLink: { color: colors.brandPink, fontWeight: '600', textDecorationLine: 'underline' },

  // --- Reviews tab ---
  reviewList: { gap: spacing.md, paddingTop: spacing.sm },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  reviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  reviewAvatarIcon: { fontSize: 18 },
  reviewNameCol: { flex: 1 },
  reviewName: { fontSize: 15, fontWeight: '700', color: colors.text },
  reviewUsername: { fontSize: 12, color: colors.brandPink, marginTop: 1 },
  reviewStarRow: { flexDirection: 'row', gap: 1 },
  reviewStar: { fontSize: 15 },
  reviewStarFilled: { color: colors.brandPink },
  reviewStarEmpty: { color: 'rgba(225,29,72,0.25)' },
  reviewText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reviewReadMore: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    alignSelf: 'flex-end',
  },
});

export default EventDetailsScreen;