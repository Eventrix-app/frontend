import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Calendar from 'expo-calendar';
import { SvgXml } from 'react-native-svg';
import { RootStackParamList } from '../../navigation/types';
import { RootState } from '../../store';
import { useTheme } from '../../theme/ThemeContext';
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
  useGetMyEnrollmentsQuery,
  useGetMyWaitlistQuery,
  useCancelEnrollmentMutation,
  isWaitlistResult,
  TicketTypeRecord,
  AnnouncementRecord,
  useGetScheduleQuery,
  useCreateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGetReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useCancelEventMutation,
} from '../../store/services/eventsApi';
import { showAlert, showConfirm } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { DATE_DISPLAY_FORMATTER } from '../../utils/dateFormat';
import { formatEventDate, formatEventTime } from '../../utils/eventCardAdapter';
import { daysUntilEventDate, getEventStartDateTime, getEventEndDateTime } from '../../utils/eventDateTime';
import { Text } from '../../components/common/Text';
import {
  LeftArrow,
  MenuOpenIcon,
  MenuCloseIcon,
  EventBusyIcon,
  CloseCircleIcon,
  ClipboardIcon,
  CheckCircleIcon,
  HourglassIcon,
  TicketIcon,
  PersonIcon,
  PhoneIcon,
  WhatsAppIcon,
  CalendarIcon,
  ClockIcon,
  LocationPin,
  PeopleIcon,
  MegaphoneIcon,
  BanIcon,
  PhotoIcon,
  IconProps,
} from '../../components/common/Icons';
import { useGetOrganizerProfileQuery } from '../../store/services/organizerApi';
import { useCreateReportMutation, useBlockUserMutation } from '../../store/services/moderationApi';
import { useChatSocket } from '../../hooks/useChatSocket';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import EventDetailsSkeleton from '../../components/common/EventDetailsSkeleton';
import SlowNetworkNotice from '../../components/common/SlowNetworkNotice';
import { useSlowNetwork } from '../../hooks/useSlowNetwork';
import SimpleListSkeleton from '../../components/common/SimpleListSkeleton';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetails'>;

const GALLERY_PAGE_SIZE = 6;
const SKELETON_IMG = require('../../../assets/skeleton/imageframe.png');

// Inlined from assets/icons/{share,calendar}-{dark,light}.svg — react-native-svg's SvgXml
// can't load a bare require()'d .svg file on native, same reasoning as EventInterestCard's
// inlined badge icons. Per ticket: light mode uses the white ("-dark") variant, dark mode
// uses the black ("-light") variant — these action buttons sit on the hero photo/gradient,
// not on the app's own background, so the mapping is intentionally the opposite of most
// theme-driven colors elsewhere in the app.
const SHARE_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="m21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19z"/></svg>`;
const SHARE_LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#000" d="m21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19z"/></svg>`;
const CALENDAR_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5z"/></svg>`;
const CALENDAR_LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#000" d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5z"/></svg>`;
// From assets/events/bookmark.svg / bookmark-check.svg — same re-filled pair EventInterestCard
// already uses for the identical unsaved/saved states, kept in sync with that card's accent.
const BOOKMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;
const BOOKMARK_CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#F43362"><path d="m438-400 198-198-57-56-141 141-57-57-57 57 114 113ZM200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z"/></svg>`;

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

const GalleryThumb: React.FC<{ item: GalleryItem; style?: any }> = ({ item, style }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showSkeleton = !loaded || failed;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

const GalleryTab: React.FC<{ gallery: GalleryItem[]; eventId: string }> = ({ gallery: realGallery, eventId }) => {
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // useNavigation rather than a prop: GalleryTab is rendered several levels below the
  // screen's own props, and threading navigation down would mean touching every tab.
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Entry point into the reel creation flow (RecordReel -> EditReel -> ShareReel). The
  // gallery is where an event's media already lives, so it is where a user looks to add
  // more. eventId is required by the flow — every reel is scoped to an event — which is
  // why the entry point lives on a screen that has one rather than on the Shorts tab,
  // where the user would first have to pick an event.
  const createReel = useCallback(
    () => navigation.navigate('RecordReel', { eventId }),
    [navigation, eventId],
  );

  const gallery = realGallery;

  const heroVideo = gallery.find((g) => g.type === 'video');
  const images = useMemo(() => gallery.filter((g) => g.type === 'image'), [gallery]);
  const visibleImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMore = visibleCount < images.length;

  if (gallery.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.emptyTabText}>No photos or videos yet.</Text>
        <TouchableOpacity style={styles.createReelBtn} onPress={createReel} activeOpacity={0.85}>
          <Text style={styles.createReelText}>＋  Create a reel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.createReelBtn} onPress={createReel} activeOpacity={0.85}>
        <Text style={styles.createReelText}>＋  Create a reel</Text>
      </TouchableOpacity>

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

const ScheduleTab: React.FC<{ eventId: string; isOwner: boolean }> = ({ eventId, isOwner }) => {
  const { data: realSchedule, isLoading } = useGetScheduleQuery(eventId);
  const [createScheduleItem, { isLoading: isAdding }] = useCreateScheduleItemMutation();
  const [deleteScheduleItem] = useDeleteScheduleItemMutation();
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const schedule: { id: string; time: string; title: string; completed: boolean }[] =
    realSchedule?.map((item) => ({ ...item, completed: false })) ?? [];

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

  const handleDelete = (itemId: string, itemTitle: string) => {
    showConfirm(
      `Remove "${itemTitle}"?`,
      'This schedule item will be removed for everyone viewing this event.',
      async () => {
        try {
          await deleteScheduleItem({ eventId, itemId }).unwrap();
        } catch (err) {
          showAlert('Could not remove schedule item', extractErrorMessage(err, 'Please try again.'));
        }
      },
      'Remove',
    );
  };

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <SimpleListSkeleton count={3} />
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

      {schedule.length === 0 ? (
        <Text style={styles.emptyTabText}>No schedule yet.</Text>
      ) : (
        <>
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
                    {isOwner && (
                      <TouchableOpacity
                        style={styles.reportLinkWrap}
                        onPress={() => handleDelete(item.id, item.title)}
                        hitSlop={6}
                      >
                        <Text style={styles.reportLinkText}>Remove</Text>
                      </TouchableOpacity>
                    )}
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
        </>
      )}
    </View>
  );
};

// --- Reviews tab ---
interface ReviewItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  rating: number; // 1-5
  text: string;
}

const StarRow: React.FC<{ rating: number }> = ({ rating }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
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
};

const ReviewsTab: React.FC<{ eventId: string; isOwner: boolean; currentUserId?: string }> = ({
  eventId,
  isOwner,
  currentUserId,
}) => {
  const { data: realReviews, isLoading } = useGetReviewsQuery(eventId);
  const [createReview, { isLoading: isSubmitting }] = useCreateReviewMutation();
  const [updateReview, { isLoading: isSavingEdit }] = useUpdateReviewMutation();
  const [deleteReview] = useDeleteReviewMutation();
  const [createReport] = useCreateReportMutation();
  const [draftRating, setDraftRating] = useState(0);
  const [draftText, setDraftText] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const reviews: ReviewItem[] =
    realReviews?.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user?.fullName ?? 'Attendee',
      username: '',
      rating: r.rating,
      text: r.text ?? '',
    })) ?? [];

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

  const startEdit = (review: ReviewItem) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditText(review.text);
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditText('');
  };

  const handleSaveEdit = async (reviewId: string) => {
    if (editRating < 1) {
      showAlert('Pick a rating', 'Tap a star to rate this event before saving.');
      return;
    }
    try {
      await updateReview({
        eventId,
        reviewId,
        body: { rating: editRating, text: editText.trim() || undefined },
      }).unwrap();
      cancelEdit();
    } catch (err) {
      showAlert('Could not save changes', extractErrorMessage(err, 'Please try again.'));
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    showConfirm('Delete this review?', 'This cannot be undone.', async () => {
      try {
        await deleteReview({ eventId, reviewId }).unwrap();
      } catch (err) {
        showAlert('Could not delete review', extractErrorMessage(err, 'Please try again.'));
      }
    }, 'Delete');
  };

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <SimpleListSkeleton count={3} showLeadingCircle />
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

      {reviews.length === 0 ? (
        <Text style={styles.emptyTabText}>No reviews yet.</Text>
      ) : (
        <View style={styles.reviewList}>
          {reviews.map((review) => {
            const isMine = currentUserId && review.userId === currentUserId;
            const isEditing = editingReviewId === review.id;

            if (isEditing) {
              return (
                <View key={review.id} style={styles.reviewComposer}>
                  <View style={styles.reviewComposerStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setEditRating(n)} hitSlop={4}>
                        <Text style={[styles.reviewStar, n <= editRating ? styles.reviewStarFilled : styles.reviewStarEmpty]}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.chatInput, styles.reviewComposerInput]}
                    value={editText}
                    onChangeText={setEditText}
                    placeholder="Share your experience (optional)"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                  <View style={styles.chatActionsRow}>
                    <TouchableOpacity
                      style={styles.reviewSubmitBtn}
                      onPress={() => handleSaveEdit(review.id)}
                      disabled={isSavingEdit}
                    >
                      <Text style={styles.chatSendBtnText}>{isSavingEdit ? 'Saving…' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reportLinkWrap} onPress={cancelEdit} hitSlop={6}>
                      <Text style={styles.reportLinkText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                  <View style={styles.reviewAvatar}>
                    <PhotoIcon color={colors.textSecondary} size={18} />
                  </View>
                  <View style={styles.reviewNameCol}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    {!!review.username && <Text style={styles.reviewUsername}>{review.username}</Text>}
                  </View>
                  <StarRow rating={review.rating} />
                </View>

                {!!review.text && <Text style={styles.reviewText}>{review.text}</Text>}

                {isMine ? (
                  <View style={styles.chatActionsRow}>
                    <TouchableOpacity style={styles.reportLinkWrap} onPress={() => startEdit(review)} hitSlop={6}>
                      <Text style={styles.reportLinkText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reportLinkWrap}
                      onPress={() => handleDeleteReview(review.id)}
                      hitSlop={6}
                    >
                      <Text style={styles.reportLinkText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ) : currentUserId ? (
                  <TouchableOpacity
                    style={styles.reportLinkWrap}
                    onPress={() => {
                      showConfirm(
                        'Report this review?',
                        "This will be sent to our moderation team for review.",
                        async () => {
                          try {
                            await createReport({
                              targetType: 'review',
                              targetId: review.id,
                              reason: `Reported review by ${review.name}`,
                            }).unwrap();
                            showAlert('Reported', "Thanks — we'll take a look.");
                          } catch {
                            showAlert('Something went wrong', 'Could not submit the report. Please try again.');
                          }
                        },
                        'Report',
                      );
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.reportLinkText}>Report</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const CommunityTab: React.FC<{ eventId: string; currentUserId?: string }> = ({ eventId, currentUserId }) => {
  const { messages, sendMessage, isConnected, isLoadingHistory, isForbidden } = useChatSocket(eventId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [createReport] = useCreateReportMutation();
  const [blockUser] = useBlockUserMutation();

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    try {
      await sendMessage(trimmed);
    } catch {
      // Only restore the failed text if the user hasn't already started typing something
      // new in the meantime — using the functional updater to read the actual current
      // value at catch-time (not the stale `draft` from this closure) avoids clobbering a
      // newer, unsent draft with the older failed message.
      setDraft((current) => (current === '' ? trimmed : current));
      showAlert('Message not sent', 'Please check your connection and try again.');
    }
  };

  const handleReportMessage = (messageId: string, senderName: string, messageText: string) => {
    showConfirm(
      'Report this message?',
      'This will be sent to our moderation team for review.',
      async () => {
        try {
          await createReport({
            targetType: 'chat_message',
            targetId: messageId,
            reason: `Reported message from ${senderName}: "${messageText.slice(0, 200)}"`,
          }).unwrap();
          showAlert('Reported', "Thanks — we'll take a look.");
        } catch {
          showAlert('Something went wrong', 'Could not submit the report. Please try again.');
        }
      },
      'Report',
    );
  };

  const handleBlockUser = (userId: string, senderName: string) => {
    showConfirm(
      `Block ${senderName}?`,
      "They won't be able to reach you in event chat anymore. You can unblock them anytime from Settings.",
      async () => {
        try {
          await blockUser(userId).unwrap();
          showAlert('Blocked', `You won't see messages from ${senderName} anymore.`);
        } catch {
          showAlert('Something went wrong', 'Could not block this user. Please try again.');
        }
      },
      'Block',
    );
  };

  if (isForbidden) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.emptyTabText}>
          Only confirmed attendees can access this event's community chat. Book a ticket to join the conversation.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.communityWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {isLoadingHistory ? (
        <SimpleListSkeleton count={3} showLeadingCircle />
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
            const senderName = msg.user?.fullName ?? 'Attendee';
            return (
              <View key={msg.id} style={[styles.chatBubbleRow, isMine && styles.chatBubbleRowMine]}>
                <View style={[styles.chatBubble, isMine && styles.chatBubbleMine]}>
                  {!isMine && <Text style={styles.chatSender}>{senderName}</Text>}
                  <Text style={[styles.chatText, isMine && styles.chatTextMine]}>{msg.message}</Text>
                  {!isMine && currentUserId ? (
                    <View style={styles.chatActionsRow}>
                      <TouchableOpacity onPress={() => handleReportMessage(msg.id, senderName, msg.message)} hitSlop={6}>
                        <Text style={styles.reportLinkText}>Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleBlockUser(msg.userId, senderName)} hitSlop={6}>
                        <Text style={styles.reportLinkText}>Block</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
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
          placeholder={isConnected ? 'Message the community…' : 'Message the community… (live updates connecting)'}
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.chatSendBtn} onPress={handleSend} disabled={!draft.trim()}>
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
  const [updateAnnouncement, { isLoading: isSavingEdit }] = useUpdateAnnouncementMutation();
  const [deleteAnnouncement] = useDeleteAnnouncementMutation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const startEdit = (announcement: AnnouncementRecord) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditBody(announcement.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
  };

  const handleSaveEdit = async (announcementId: string) => {
    if (!editTitle.trim() || !editBody.trim()) {
      showAlert('Missing details', 'Add both a title and a message before saving.');
      return;
    }
    try {
      await updateAnnouncement({
        eventId,
        announcementId,
        body: { title: editTitle.trim(), body: editBody.trim() },
      }).unwrap();
      cancelEdit();
    } catch (err) {
      showAlert('Could not save changes', extractErrorMessage(err, 'Please try again.'));
    }
  };

  const handleDelete = (announcementId: string) => {
    showConfirm('Delete this announcement?', 'This cannot be undone.', async () => {
      try {
        await deleteAnnouncement({ eventId, announcementId }).unwrap();
      } catch (err) {
        showAlert('Could not delete announcement', extractErrorMessage(err, 'Please try again.'));
      }
    }, 'Delete');
  };

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <SimpleListSkeleton count={3} />
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
        announcements.map((a) => {
          if (isOwner && editingId === a.id) {
            return (
              <View key={a.id} style={styles.reviewComposer}>
                <TextInput
                  style={styles.chatInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Title"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.chatInput, styles.reviewComposerInput]}
                  value={editBody}
                  onChangeText={setEditBody}
                  placeholder="What do you want attendees to know?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
                <View style={styles.chatActionsRow}>
                  <TouchableOpacity
                    style={styles.reviewSubmitBtn}
                    onPress={() => handleSaveEdit(a.id)}
                    disabled={isSavingEdit}
                  >
                    <Text style={styles.chatSendBtnText}>{isSavingEdit ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportLinkWrap} onPress={cancelEdit} hitSlop={6}>
                    <Text style={styles.reportLinkText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View key={a.id} style={styles.reviewCard}>
              <Text style={styles.reviewName}>{a.title}</Text>
              <Text style={styles.reviewText}>{a.body}</Text>
              <Text style={styles.reviewUsername}>{ANNOUNCEMENT_DATE_FORMATTER.format(new Date(a.createdAt))}</Text>
              {isOwner && (
                <View style={styles.chatActionsRow}>
                  <TouchableOpacity style={styles.reportLinkWrap} onPress={() => startEdit(a)} hitSlop={6}>
                    <Text style={styles.reportLinkText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportLinkWrap} onPress={() => handleDelete(a.id)} hitSlop={6}>
                    <Text style={styles.reportLinkText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
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
  // Real measured height of the sticky footer button — used as scroll padding so tab
  // content is never hidden underneath it, instead of a guessed flat pixel value that
  // could fall short on smaller screens or once the footer's own content changes size.
  const [footerHeight, setFooterHeight] = useState(100);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: event, isLoading, isError, refetch } = useGetEventByIdQuery(route.params.eventId);
  const { stage: slowStage } = useSlowNetwork(isLoading);
  const { data: ticketTypes = [] } = useGetTicketTypesQuery(route.params.eventId);
  const { data: mediaItems = [] } = useGetEventMediaQuery(route.params.eventId);
  const [enrollEvent, { isLoading: isEnrolling }] = useEnrollEventMutation();
  const { data: favorites = [] } = useGetMyFavoritesQuery(undefined, { skip: !authUser });
  const [addFavorite, { isLoading: isSaving }] = useAddFavoriteMutation();
  const [removeFavorite, { isLoading: isUnsaving }] = useRemoveFavoriteMutation();
  const [cancelEvent, { isLoading: isCancelling }] = useCancelEventMutation();
  const { data: myEnrollments = [] } = useGetMyEnrollmentsQuery(undefined, { skip: !authUser });
  const { data: myWaitlist = [] } = useGetMyWaitlistQuery(undefined, { skip: !authUser });
  const [cancelEnrollment, { isLoading: isCancellingEnrollment }] = useCancelEnrollmentMutation();
  const { data: organizerProfile } = useGetOrganizerProfileQuery(
    event?.organizer?.id ?? '',
    { skip: !event?.organizer?.id },
  );
  const organizerPhone = organizerProfile?.phone;
  const saved = !!event && favorites.some((f) => f.id === event.id);

  // navigation.goBack() throws "GO_BACK was not handled by any navigator" whenever this
  // screen has no previous screen to pop to — e.g. opened directly via a deep link
  // (eventrix://event/:id) or a push-notification tap (see navigateForPushData in
  // RootNavigator.tsx), both of which can land here as the first screen in the stack. Fall
  // back to Home in that case instead of leaving the back button a no-op.
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  const handleCancelEvent = () => {
    if (!event || isCancelling) return;
    showConfirm(
      'Cancel this event?',
      'Every attendee with an active booking will be notified. This cannot be undone.',
      async () => {
        try {
          await cancelEvent({ id: event.id }).unwrap();
          showAlert('Event cancelled', 'Attendees have been notified.');
        } catch (err) {
          showAlert('Could not cancel event', extractErrorMessage(err, 'Please try again.'));
        }
      },
      'Cancel Event',
    );
  };

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
    // Overlaid on the skeleton's own layout rather than replacing it — this screen is
    // usually reached by tapping a specific card, so the user has a clear expectation of
    // what should appear and mainly needs to know it is still coming.
    return (
      <View style={styles.root}>
        <EventDetailsSkeleton />
        <SlowNetworkNotice stage={slowStage} onRetry={refetch} style={styles.slowNotice} />
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
          <TouchableOpacity style={styles.backLinkBtn} onPress={handleGoBack}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const coverImage = event.coverImageUrl || event.imageUrl;

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
    // Strip everything except digits and leading +
    const digits = organizerPhone.replace(/[^\d]/g, '');
    // If number doesn't start with country code, assume India (+91)
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

  const notApprovedYet = event.isPaid && event.approvalStatus !== 'approved';
  const selectedAvailability = selectedTier ? tierAvailability(selectedTier) : null;

  // A user with an active (non-cancelled, non-refunded) booking for this event can't
  // re-enroll — the backend already 409s on a second enroll() — so the CTA becomes a
  // way to manage the existing booking instead of a disabled dead end. Waitlist state is
  // checked only when there's no active enrollment, since a promoted waitlist entry
  // always has a corresponding Enrollment row by the time it matters here.
  const myActiveEnrollment = myEnrollments.find(
    (e) => e.eventId === event.id && e.status !== 'cancelled' && e.status !== 'refunded',
  );
  const myActiveWaitlistEntry = !myActiveEnrollment
    ? myWaitlist.find((w) => w.eventId === event.id && w.status === 'waiting')
    : undefined;
  // Both conditions matter: totalAmount > 0 alone isn't enough, since a paid ticket type
  // sits at paymentStatus 'pending' from enroll() until checkout actually completes (no
  // in-app payment flow exists yet) — requestRefund() 400s on anything that isn't
  // 'paid'. Only route through the refund flow once money has actually been collected;
  // otherwise a direct, no-refund-needed cancel is both correct and necessary.
  const isMyEnrollmentPaid =
    !!myActiveEnrollment && Number(myActiveEnrollment.totalAmount) > 0 && myActiveEnrollment.paymentStatus === 'paid';

  const handleCancelMyEnrollment = () => {
    if (!myActiveEnrollment) return;
    showConfirm(
      'Cancel this booking?',
      "This ticket will no longer be valid and your spot will be released. This can't be undone.",
      async () => {
        try {
          await cancelEnrollment(myActiveEnrollment.id).unwrap();
        } catch (e: any) {
          showAlert('Could not cancel booking', extractErrorMessage(e, 'Please try again.'));
        }
      },
      'Cancel Booking',
    );
  };

  // Paid bookings can only be unwound through the refund-request flow (it's the only
  // path that actually reverses payment) — hand off to Ticket Details, which already has
  // that form, rather than duplicating it here.
  const handleFooterPress = () => {
    if (myActiveEnrollment) {
      if (isMyEnrollmentPaid) {
        navigation.navigate('TicketDetails', { bookingId: myActiveEnrollment.id });
      } else {
        handleCancelMyEnrollment();
      }
      return;
    }
    handleEnroll();
  };

  const footerLabel = myActiveEnrollment
    ? isMyEnrollmentPaid
      ? 'Cancel Enrollment / Request Refund'
      : 'Cancel Enrollment'
    : myActiveWaitlistEntry
      ? `On Waitlist (#${myActiveWaitlistEntry.position})`
      : notApprovedYet
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
  const footerDisabled = myActiveEnrollment
    ? isCancellingEnrollment
    : myActiveWaitlistEntry
      ? true
      : notApprovedYet ||
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
  // No invented filler. These previously fell back to generic blurbs when the organizer had
  // left a field blank, which meant a real event displayed sentences its organizer never
  // wrote, in their own voice, on their own listing - and a reader has no way to tell that
  // apart from real copy. An absent section is honest; a fabricated one is not. Each label
  // below is hidden when its content is empty (the .map() calls already render nothing),
  // and the tab shows a short note when the organizer filled in none of the three.
  const aboutDescription = event.description?.trim() ?? '';
  const highlights: string[] = event.highlights ?? [];
  const whoShouldAttend: string[] = event.whoShouldAttend ?? [];
  const hasAboutContent = !!aboutDescription || highlights.length > 0 || whoShouldAttend.length > 0;

  return (
    <View style={styles.root}>
      {event.status === 'cancelled' && (
        <View style={[styles.cancelledBanner, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.cancelledBannerText}>This event has been cancelled.</Text>
        </View>
      )}
      <ImageBackground
        source={coverImage ? { uri: coverImage } : undefined}
        style={[styles.hero, { paddingTop: insets.top }]}
        resizeMode="cover"
      >
        <TouchableOpacity style={styles.back} onPress={handleGoBack}>
          <LeftArrow color={colors.white} size={20} />
        </TouchableOpacity>
        {!coverImage ? <EventBusyIcon color="#FFFFFF" size={80} /> : null}
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.heroActionBtn} onPress={handleShare}>
            <SvgXml xml={theme === 'dark' ? SHARE_LIGHT_SVG : SHARE_DARK_SVG} width={18} height={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionBtn} onPress={handleAddToCalendar} disabled={isAddingToCalendar}>
            {isAddingToCalendar ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <SvgXml xml={theme === 'dark' ? CALENDAR_LIGHT_SVG : CALENDAR_DARK_SVG} width={18} height={18} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionBtn} onPress={handleToggleSave}>
            <SvgXml xml={saved ? BOOKMARK_CHECK_SVG : BOOKMARK_SVG} width={18} height={18} />
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + (isOwner ? spacing.xxl : footerHeight + spacing.md) }}
      >
        {isOwner && event.approvalStatus === 'rejected' && (
          <View style={styles.rejectionBanner}>
            <View style={styles.bannerTitleRow}>
              <CloseCircleIcon color="#DC2626" size={16} />
              <Text style={styles.rejectionTitle}>Event Rejected</Text>
            </View>
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
            <View style={styles.bannerTitleRow}>
              <ClipboardIcon color={colors.text} size={16} />
              <Text style={styles.draftTitle}>Draft</Text>
            </View>
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
              <View style={styles.bannerTitleRow}>
                {event.approvalStatus === 'pending_approval' ? (
                  <HourglassIcon color="#065F46" size={15} />
                ) : (
                  <CheckCircleIcon color="#065F46" size={15} />
                )}
                <Text style={styles.salesText}>
                  {event.approvalStatus === 'pending_approval' ? 'Pending Review' : 'Approved'}
                </Text>
              </View>
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
              <View style={styles.bannerTitleRow}>
                <TicketIcon color="#047857" size={14} />
                <Text style={styles.salesCount}>
                  {event.totalCapacity - event.availableTickets} / {event.totalCapacity} tickets sold
                </Text>
              </View>
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
            <PersonIcon color={colors.textSecondary} size={20} />
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
            <TouchableOpacity style={styles.organizerActionBtn} onPress={handleWhatsApp}>
              <WhatsAppIcon color={colors.brandPink} size={15} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.organizerActionBtn} onPress={handleCall}>
              <PhoneIcon color={colors.brandPink} size={15} />
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
            <View style={styles.infoIconWrap}>
              <CalendarIcon color={colors.text} size={15} />
            </View>
            <Text style={styles.infoLineText}>{formatEventDate(event.eventDate)}</Text>
          </View>
          <View style={styles.infoLine}>
            <View style={styles.infoIconWrap}>
              <ClockIcon color={colors.text} size={15} />
            </View>
            <Text style={styles.infoLineText}>{formatEventTime(event.startTime)}</Text>
          </View>
          <View style={styles.infoLine}>
            <View style={styles.infoIconWrap}>
              <LocationPin color={colors.text} size={15} />
            </View>
            <Text style={styles.infoLineText}>{event.venueName}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quick info</Text>
        <View style={styles.quickInfoRow}>
          {event.totalCapacity != null && (
            <View style={styles.quickInfoCard}>
              <PeopleIcon color={colors.text} size={20} />
              <View>
                <Text style={styles.quickInfoLabel}>Capacity</Text>
                <Text style={styles.quickInfoValue}>{event.totalCapacity} Participants</Text>
              </View>
            </View>
          )}
          <View style={styles.quickInfoCard}>
            <TicketIcon color={colors.text} size={20} />
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
            {/* Says plainly that there is nothing here yet, rather than filling the space
                with copy the organizer never wrote. */}
            {!hasAboutContent ? (
              <Text style={styles.bulletText}>
                The organizer hasn't added a description for this event yet.
              </Text>
            ) : null}
            {aboutDescription ? <Text style={styles.sectionLabel}>About This Event</Text> : null}
            {aboutDescription.split('\n').filter(Boolean).map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}

            {highlights.length > 0 ? <Text style={styles.sectionLabel}>Highlights</Text> : null}
            {highlights.map((h, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{h}</Text>
              </View>
            ))}

            {whoShouldAttend.length > 0 ? <Text style={styles.sectionLabel}>Who Should Attend</Text> : null}
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

        {activeTab === 'reviews' && <ReviewsTab eventId={event.id} isOwner={isOwner} currentUserId={authUser?.id} />}

        {activeTab === 'announcements' && <AnnouncementsTab eventId={event.id} isOwner={isOwner} />}

        {activeTab === 'gallery' && <GalleryTab gallery={mediaItems} eventId={route.params.eventId} />}
      </ScrollView>

      {!isOwner && (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.footerContent}>
            <TouchableOpacity
              style={[styles.bookBtn, footerDisabled ? styles.disabledBtn : {}]}
              onPress={handleFooterPress}
              disabled={isEnrolling || isCancellingEnrollment || footerDisabled}
            >
              {isEnrolling || isCancellingEnrollment ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.bookText}>{footerLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isOwner && (
        <TouchableOpacity
          style={[styles.organizerMenuFab, { bottom: insets.bottom + spacing.md }]}
          onPress={() => setShowOrganizerMenu((v) => !v)}
          accessibilityLabel={showOrganizerMenu ? 'Close organizer menu' : 'Open organizer menu'}
        >
          {showOrganizerMenu ? <MenuCloseIcon color="#FFFFFF" size={22} /> : <MenuOpenIcon color="#FFFFFF" size={22} />}
        </TouchableOpacity>
      )}

      {isOwner && (
        <HalfScreenModal visible={showOrganizerMenu} onClose={() => setShowOrganizerMenu(false)} heightPercent={0.5}>
          <View style={styles.organizerMenu}>
            <Text variant="h3" style={styles.organizerMenuTitle}>Organizer Menu</Text>
            {([
              { label: 'Manage Event', Icon: ClipboardIcon, onPress: () => navigation.navigate('MyEvents') },
              {
                label: 'Manage Ticket Types',
                Icon: TicketIcon,
                onPress: () => navigation.navigate('ManageTicketTypes', { eventId: event.id }),
              },
              ...(event.approvalStatus === 'approved'
                ? [{ label: 'Check In Attendees', Icon: CheckCircleIcon, onPress: () => navigation.navigate('CheckIn', { eventId: event.id }) }]
                : []),
              { label: 'Edit Schedule', Icon: CalendarIcon, onPress: () => setActiveTab('schedule') },
              { label: 'Post Announcement', Icon: MegaphoneIcon, onPress: () => setActiveTab('announcements') },
              ...(event.status !== 'cancelled'
                ? [{ label: 'Cancel Event', Icon: BanIcon, onPress: handleCancelEvent, destructive: true }]
                : []),
            ] as { label: string; Icon: React.FC<IconProps>; onPress: () => void; destructive?: boolean }[]).map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.organizerMenuItem}
                onPress={() => {
                  setShowOrganizerMenu(false);
                  item.onPress();
                }}
              >
                <item.Icon
                  color={item.destructive ? colors.error : colors.text}
                  size={20}
                />
                <Text style={[styles.organizerMenuLabel, item.destructive && styles.organizerMenuLabelDestructive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </HalfScreenModal>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  slowNotice: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xl,
  },
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
  heroEmoji: { fontSize: 80 },
  body: {
    flex: 1,
    marginTop: -24,
    backgroundColor: colors.white,
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
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
    backgroundColor: colors.muted,
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
    backgroundColor: colors.muted,
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
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  descText: { fontSize: 14, lineHeight: 20, color: colors.text },
  readMore: { fontSize: 13, color: colors.textSecondary, marginTop: 4, alignSelf: 'flex-end' },

  whenWhereBlock: { gap: spacing.sm, marginBottom: spacing.md },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoIcon: { fontSize: 15, width: 22 },
  infoIconWrap: { width: 22, alignItems: 'center' },
  infoLineText: { fontSize: 14, color: colors.text },

  quickInfoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickInfoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.muted,
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
  organizerMenuLabelDestructive: { color: colors.error },
  cancelledBanner: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  cancelledBannerText: { color: colors.white, fontWeight: '700', fontSize: 13 },

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
    backgroundColor: colors.muted,
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
  disabledBtn: { backgroundColor: '#9CA3AF' },
  organizerMenuFab: {
    position: 'absolute',
    left: spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
    }),
  },
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

  createReelBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.brandPink,
    marginBottom: spacing.md,
  },
  createReelText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  galleryHero: {
    height: 180,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted,
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
    backgroundColor: colors.muted,
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
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleMarkerDone: { backgroundColor: '#10B981' },
  scheduleMarkerCheck: { color: colors.white, fontSize: 12, fontWeight: '700' },
  scheduleLine: { width: 2, flex: 1, minHeight: 40, backgroundColor: colors.border, marginTop: 2 },
  scheduleLineDone: { backgroundColor: '#10B981' },
  scheduleCard: {
    flex: 1,
    backgroundColor: colors.muted,
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
    backgroundColor: colors.muted,
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
    backgroundColor: colors.white,
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
  reportLinkWrap: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  reportLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  chatActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
});

export default EventDetailsScreen;