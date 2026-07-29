import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useGetUploadUrlMutation,
  useGetEventByIdQuery,
  useGetEventMediaQuery,
  useCreateEventMediaMutation,
  useDeleteEventMediaMutation,
  ALLOWED_UPLOAD_CONTENT_TYPES,
  UploadContentType,
} from '../../store/services/eventsApi';
import { useGetCategoriesQuery } from '../../store/services/userApi';
import { useRefreshMutation } from '../../store/services/authApi';
import { useGetMyVerificationStatusQuery } from '../../store/services/organizerApi';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { parseDateValue, parseTimeValue, formatDateValue, formatTimeValue, formatTimeDisplay } from '../../utils/dateFormat';
import InlineDatePicker from '../../components/common/InlineDatePicker';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LocationPickerModal } from '../../components/common/LocationPickerModal';
import CreateEventSkeleton from '../../components/common/CreateEventSkeleton';
import Feather from '@expo/vector-icons/Feather';
import TicketTypeEditor, {
  TierDraft,
  createBlankTier,
  tierDraftToPayload,
  validateTiers,
} from '../../components/events/TicketTypeEditor';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEvent'>;

const REFUND_OPTIONS = [
  { value: 'no_refunds', label: 'No Refunds' },
  { value: 'partial_refund', label: 'Partial Refund' },
  { value: 'full_refund', label: 'Full Refund' },
];

const CreateEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { eventId } = route.params ?? {};
  const isEdit = !!eventId;
  // Keyed by eventId (not a plain boolean) — React Navigation can reuse this screen's
  // mounted instance across two different "edit event" pushes (e.g. a notification
  // deep-link to event B while event A was still being edited). A plain "have I ever
  // prefilled" flag would then leave event A's data on screen while silently submitting
  // against event B's id; re-keying on the id forces a fresh prefill whenever it changes.
  const prefilledForRef = useRef<string | null>(null);
  const originalApprovalStatusRef = useRef<string | undefined>(undefined);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Admins bypass the KYC gate the same way EventsService.createForUser does server-side
  // (they're not expected to hold an organizer profile of their own) — in practice admins
  // are routed to a separate web dashboard and never reach this screen, but the check
  // stays consistent with the backend rather than assuming that routing never changes.
  const isAdmin = useSelector((state: RootState) => (state.auth.user?.roles ?? []).includes('admin'));
  // Only a brand-new event needs the verification gate — an organizer editing an event
  // they already created has, by definition, already been through it (#7).
  const { data: verificationStatus, isLoading: isLoadingVerification } = useGetMyVerificationStatusQuery(undefined, {
    skip: isEdit || isAdmin,
  });

  // Unverified/pending/rejected organizers never see the create-event form at all — they're
  // sent straight to the verification screen instead of a gate card with a "Get Verified"
  // button, per product decision. `replace` (not `navigate`) so OrganizerVerification's own
  // back button returns to wherever the user was before tapping "Create Event", not into
  // this now-redirected screen.
  useEffect(() => {
    if (isEdit || isAdmin || isLoadingVerification) return;
    if (verificationStatus?.status !== 'approved') {
      navigation.replace('OrganizerVerification');
    }
  }, [isEdit, isAdmin, isLoadingVerification, verificationStatus, navigation]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Newline-separated in the form; converted to/from string[] at the DTO boundary.
  const [highlightsText, setHighlightsText] = useState('');
  const [whoShouldAttendText, setWhoShouldAttendText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [tiers, setTiers] = useState<TierDraft[]>(() => [createBlankTier('EARLY_BIRD')]);
  // Optional event-wide seat cap — left blank, the backend derives capacity from the sum
  // of ticket-tier quantities instead (see events.service.ts withComputedSeats). Kept as a
  // string for the TextInput; converted to a number (or omitted) in buildPayload().
  const [capacity, setCapacity] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [refundPolicyType, setRefundPolicyType] = useState('no_refunds');
  const [refundPolicyText, setRefundPolicyText] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  // An image picked locally but not yet uploaded — the actual upload only happens once
  // the organizer taps Save/Publish, both because uploading before the event exists is
  // wasted work if they abandon the form, and because the upload-URL endpoint requires
  // the 'organizer' role, which the backend only grants at event-creation time (a
  // brand-new user has no way to pass the role check before their first event is saved).
  const [pendingImage, setPendingImage] = useState<{ uri: string; contentType: UploadContentType } | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  // Additional gallery images/videos (EventDetailsScreen's carousel) — same deferred-
  // upload approach as the cover image, uploaded once the event exists.
  const [pendingGalleryItems, setPendingGalleryItems] = useState<
    { uri: string; contentType: UploadContentType; type: 'image' | 'video' }[]
  >([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  // Tracks which footer button triggered the save, so only that one shows a spinner —
  // and doubles as the re-entrancy guard for handleSave (see isSubmittingRef below).
  const [savingMode, setSavingMode] = useState<'draft' | 'publish' | null>(null);
  // TouchableOpacity's onPress isn't debounced, and setSavingMode's re-render (which
  // disables the buttons) can lag a frame behind a fast double-tap — a plain ref check,
  // set synchronously before any await, closes that gap and is what actually prevents
  // two events from being created from one rapid double-tap.
  const isSubmittingRef = useRef(false);

  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [getUploadUrl] = useGetUploadUrlMutation();
  const [refresh] = useRefreshMutation();
  const { data: existingEvent } = useGetEventByIdQuery(eventId!, { skip: !isEdit });
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: existingGallery = [] } = useGetEventMediaQuery(eventId!, { skip: !isEdit });
  const [createEventMedia] = useCreateEventMediaMutation();
  const [deleteEventMedia] = useDeleteEventMediaMutation();
  const isApprovedEdit = isEdit && existingEvent?.approvalStatus === 'approved';

  useEffect(() => {
    if (!isEdit || !existingEvent || prefilledForRef.current === existingEvent.id) {
      return;
    }

    setTitle(existingEvent.title ?? '');
    setDescription(existingEvent.description ?? '');
    setHighlightsText((existingEvent.highlights ?? []).join('\n'));
    setWhoShouldAttendText((existingEvent.whoShouldAttend ?? []).join('\n'));
    setCategoryId(existingEvent.categoryId ?? '');
    setVenueName(existingEvent.venueName ?? '');
    setVenueAddress(existingEvent.venueAddress ?? '');
    setLatitude(existingEvent.latitude ?? undefined);
    setLongitude(existingEvent.longitude ?? undefined);
    setEventDate(existingEvent.eventDate ?? '');
    setStartTime(existingEvent.startTime ?? '');
    setEndTime(existingEvent.endTime ?? '');
    setIsFree(!existingEvent.isPaid);
    setIsOnline(existingEvent.isOnline ?? false);
    setMeetingLink(existingEvent.meetingLink ?? '');
    setRefundPolicyType(existingEvent.refundPolicyType ?? 'no_refunds');
    setRefundPolicyText(existingEvent.refundPolicyText ?? '');
    setCoverImageUrl(existingEvent.coverImageUrl ?? existingEvent.imageUrl ?? '');
    setCapacity(existingEvent.capacity != null ? String(existingEvent.capacity) : '');

    originalApprovalStatusRef.current = existingEvent.approvalStatus;
    prefilledForRef.current = existingEvent.id;
  }, [existingEvent, isEdit]);

  const buildPayload = (asDraft: boolean) => {
    // Legacy display-only fields (card badges on Home/Explore/Search read
    // BackendEvent.pricePerTicket directly — see eventCardAdapter.ts) derived from the
    // real tiers so they stay roughly accurate; ticketTypes below is the source of truth.
    const paidPrices = tiers.map((t) => Number(t.price) || 0).filter((p) => p > 0);
    const representativePrice = isFree ? 0 : (paidPrices.length ? Math.min(...paidPrices) : 0);

    // endTime <= startTime means the event runs past midnight (validate() above only
    // rejects the two being exactly equal) — tell the backend explicitly via eventEndDate
    // rather than leaving it to default to eventDate, which would make
    // getEventEndDateTime compute an end instant before the event's own start instant.
    const crossesMidnight = !!endTime && parseTimeValue(endTime).getTime() < parseTimeValue(startTime).getTime();
    const eventEndDate = crossesMidnight
      ? formatDateValue(new Date(parseDateValue(eventDate).getTime() + 24 * 60 * 60 * 1000))
      : undefined;

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      highlights: highlightsText.split('\n').map((line) => line.trim()).filter(Boolean),
      whoShouldAttend: whoShouldAttendText.split('\n').map((line) => line.trim()).filter(Boolean),
      categoryId,
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim(),
      latitude,
      longitude,
      eventDate,
      startTime,
      endTime: endTime || undefined,
      eventEndDate,
      // Only meaningful on create — `tiers` isn't populated with the event's real ticket
      // types in edit mode (pricing is owned by "Manage Ticket Types" post-creation), so
      // representativePrice is always 0 here. Sending it on edit would make the backend's
      // pricePerTicket-driven isPaid sync (events.service.ts update()) silently flip a
      // paid event's isPaid to false on every unrelated edit.
      pricePerTicket: isEdit ? undefined : representativePrice,
      isPaid: !isFree,
      // Optional — omitted entirely (not sent as 0/undefined-but-present) when blank, so
      // the backend keeps deriving it from ticket-tier quantities instead of overwriting
      // an existing explicit cap with nothing on an unrelated edit.
      capacity: capacity.trim() ? Number(capacity.trim()) : undefined,
      isOnline,
      meetingLink: isOnline ? meetingLink : undefined,
      coverImageUrl: coverImageUrl || undefined,
      // Draft/rejected events explicitly move to draft/pending_approval on save — that's
      // a real state transition the organizer is choosing. An already-approved event
      // shouldn't be force-demoted on every unrelated edit; the backend decides whether
      // this save needs re-review, based on which fields actually changed (see
      // EventsService.update()'s content-field check).
      approvalStatus:
        isEdit && originalApprovalStatusRef.current === 'approved'
          ? undefined
          : asDraft ? ('draft' as const) : ('pending_approval' as const),
      refundPolicyType: !isFree ? refundPolicyType : undefined,
      refundPolicyText: !isFree && refundPolicyText ? refundPolicyText : undefined,
      // PATCH /events/:id (edit) rejects ticketTypes — nested ticket-type endpoints
      // (Manage Ticket Types) own edits to tiers after creation, so this is create-only.
      ...(isEdit ? {} : { ticketTypes: tiers.map((t) => tierDraftToPayload(t, isFree)) }),
    };
  };

  const validate = () => {
    if (!title.trim()) return 'Title is required';
    if (!categoryId) return 'Please select a category';
    if (!venueName.trim()) return 'Venue name is required';
    if (!venueAddress.trim()) return 'Venue address is required';
    if (!eventDate) return 'Please choose an event date';
    if (!startTime) return 'Please choose a start time';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parseDateValue(eventDate) < today) return 'Event date cannot be in the past';
    // An end time earlier than the start time isn't invalid — it means the event runs
    // past midnight (e.g. 10 PM-2 AM), which buildPayload() below handles by sending
    // eventEndDate as the following day. Only a truly zero-length event (identical start
    // and end) is rejected here.
    if (endTime && parseTimeValue(endTime).getTime() === parseTimeValue(startTime).getTime()) {
      return 'End time must be different from start time';
    }
    if (isOnline && !meetingLink) return 'Meeting link is required for online events';
    if (capacity.trim() && (!/^\d+$/.test(capacity.trim()) || Number(capacity.trim()) < 1)) {
      return 'Total event capacity must be a whole number of at least 1';
    }
    if (!isEdit) {
      const tierError = validateTiers(tiers, isFree);
      if (tierError) return tierError;
    }
    return null;
  };

  // Picks an image locally only — no network call. The actual upload is deferred to
  // handleSave, once the event this image belongs to actually exists.
  const handlePickCoverImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow photo library access to select a cover image.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (pickerResult.canceled || !pickerResult.assets.length) {
      return;
    }

    const asset = pickerResult.assets[0];
    if (!asset.uri) {
      showAlert('Selection failed', 'Could not read the selected image.');
      return;
    }

    const contentType = (ALLOWED_UPLOAD_CONTENT_TYPES.includes(asset.mimeType as UploadContentType)
      ? asset.mimeType
      : 'image/jpeg') as UploadContentType;
    setPendingImage({ uri: asset.uri, contentType });
  };

  const uploadPendingCoverImage = async (): Promise<string> => {
    const image = pendingImage!;
    // Independent of each other: minting the signed URL is a round trip to our backend,
    // reading the picked file is local I/O, and only the PUT below needs both. Running them
    // in sequence made every cover upload cost one full server latency before the file had
    // even started being read.
    const [uploadResponse, fileBlob] = await Promise.all([
      getUploadUrl({ purpose: 'event-cover', contentType: image.contentType }).unwrap(),
      fetch(image.uri).then((r) => r.blob()),
    ]);

    const putResponse = await fetch(uploadResponse.uploadUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: { 'Content-Type': image.contentType },
    });

    if (!putResponse.ok) {
      throw new Error('Image upload to storage failed.');
    }

    return uploadResponse.publicUrl;
  };

  // Picks one or more gallery images/videos locally only — uploaded in handleSave, same
  // deferred approach as the cover image.
  const handlePickGalleryMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow photo library access to add gallery images or videos.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (pickerResult.canceled || !pickerResult.assets.length) return;

    const picked = pickerResult.assets
      .filter((asset) => !!asset.uri)
      .map((asset) => {
        const isVideo = asset.type === 'video';
        const contentType = (ALLOWED_UPLOAD_CONTENT_TYPES.includes(asset.mimeType as UploadContentType)
          ? asset.mimeType
          : isVideo ? 'video/mp4' : 'image/jpeg') as UploadContentType;
        return { uri: asset.uri, contentType, type: (isVideo ? 'video' : 'image') as 'image' | 'video' };
      });
    setPendingGalleryItems((prev) => [...prev, ...picked]);
  };

  const removePendingGalleryItem = (index: number) => {
    setPendingGalleryItems((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPendingGalleryItems = async (targetEventId: string): Promise<boolean> => {
    let allSucceeded = true;
    for (let i = 0; i < pendingGalleryItems.length; i++) {
      const item = pendingGalleryItems[i];
      try {
        // Signed URL and local file read are independent — see uploadPendingCoverImage.
        const [{ uploadUrl, publicUrl }, fileBlob] = await Promise.all([
          getUploadUrl({ purpose: 'event-image', contentType: item.contentType }).unwrap(),
          fetch(item.uri).then((r) => r.blob()),
        ]);
        const putResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: fileBlob,
          headers: { 'Content-Type': item.contentType },
        });
        if (!putResponse.ok) throw new Error('Gallery upload to storage failed.');
        await createEventMedia({
          eventId: targetEventId,
          body: { type: item.type, url: publicUrl, position: existingGallery.length + i },
        }).unwrap();
      } catch {
        allSucceeded = false;
      }
    }
    return allSucceeded;
  };

  const handleSave = async (asDraft: boolean) => {
    if (isSubmittingRef.current) return;
    const err = validate();
    if (err) { showAlert('Validation', err); return; }

    isSubmittingRef.current = true;
    setSavingMode(asDraft ? 'draft' : 'publish');

    let imageWarning: string | null = null;

    try {
      const payload = buildPayload(asDraft);
      let savedEvent = isEdit
        ? await updateEvent({ id: eventId!, body: payload }).unwrap()
        : await createEvent(payload).unwrap();

      // A first-ever event grants the 'organizer' role server-side (EventsService.
      // createForUser), but the access token already in memory was minted before that and
      // still lacks it — the upload-url requests below would 403 on a stale role.
      // Refreshing re-signs the token from current DB state so they carry the new role.
      if (!isEdit && (pendingImage || pendingGalleryItems.length > 0)) {
        await refresh().unwrap().catch(() => {});
      }

      if (pendingImage) {
        setIsUploadingCover(true);
        try {
          const publicUrl = await uploadPendingCoverImage();
          savedEvent = await updateEvent({ id: savedEvent.id, body: { coverImageUrl: publicUrl } }).unwrap();
          setCoverImageUrl(publicUrl);
          setPendingImage(null);
        } catch {
          imageWarning = 'The cover image failed to upload — you can add it again from Edit.';
        } finally {
          setIsUploadingCover(false);
        }
      }

      if (pendingGalleryItems.length > 0) {
        setIsUploadingGallery(true);
        try {
          const allSucceeded = await uploadPendingGalleryItems(savedEvent.id);
          if (allSucceeded) {
            setPendingGalleryItems([]);
          } else {
            imageWarning = imageWarning
              ? `${imageWarning}\n\nSome gallery items failed to upload — you can add them again from Edit.`
              : 'Some gallery items failed to upload — you can add them again from Edit.';
          }
        } finally {
          setIsUploadingGallery(false);
        }
      }

      const successTitle = isApprovedEdit
        ? 'Changes Saved'
        : asDraft ? 'Draft Saved' : 'Event Published';
      const successMessage = isApprovedEdit
        ? savedEvent.approvalStatus === 'pending_approval'
          ? 'Your changes were saved. Since you edited the title, description, category or cover image, this event has been resubmitted for admin review.'
          : 'Your changes are live.'
        : asDraft
          ? 'Your event has been saved as a draft.'
          : isFree
            ? 'Your event is now live.'
            : 'Your event has been submitted for approval.';

      // Navigating only happens once the user dismisses this dialog — that ordering is
      // deliberate: it's the confirmation that the save actually succeeded, and it stops
      // the screen from silently sitting on the (still-tappable, pre-fix) form afterward.
      showAlert(
        successTitle,
        imageWarning ? `${successMessage}\n\n${imageWarning}` : successMessage,
        () => navigation.navigate('MyEvents'),
      );
    } catch (e: any) {
      showAlert(
        asDraft ? "Couldn't save draft" : "Couldn't publish event",
        extractErrorMessage(e, 'Something went wrong. Please check your connection and try again.'),
      );
    } finally {
      isSubmittingRef.current = false;
      setSavingMode(null);
    }
  };

  // Blocks event creation until an admin has approved this organizer's KYC submission
  // (#7) — mirrors the same check EventsService.createForUser enforces server-side. The
  // redirect effect above sends the user to OrganizerVerification; this just keeps the
  // form from flashing on screen during that one render before the redirect fires.
  if (!isEdit && !isAdmin && (isLoadingVerification || verificationStatus?.status !== 'approved')) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Create Event" onBack={() => navigation.goBack()} />
        <CreateEventSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title={isEdit ? 'Edit Event' : 'Create Event'} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}>
        {isApprovedEdit && (
          <View style={styles.reviewNotice}>
            <Text style={styles.reviewNoticeText}>
              This event is live. Changes to date, time, venue, capacity, pricing or online-meeting details apply
              immediately. Changing the title, description, category or cover image sends this event back for
              admin review before it's visible to others again.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What's this event about?" placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} />

        <Text style={styles.label}>Highlights</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={highlightsText}
          onChangeText={setHighlightsText}
          placeholder={'One per line, e.g.\nLive performances\nFood & drink stalls'}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Who Should Attend</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={whoShouldAttendText}
          onChangeText={setWhoShouldAttendText}
          placeholder={'One per line, e.g.\nMusic lovers\nFirst-time festival-goers'}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.refundPill, categoryId === cat.id && styles.refundPillActive]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={[styles.refundPillText, categoryId === cat.id && styles.refundPillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Venue Name *</Text>
        <TextInput style={styles.input} value={venueName} onChangeText={setVenueName} placeholder="Venue name" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Venue Address *</Text>
        <TextInput style={styles.input} value={venueAddress} onChangeText={setVenueAddress} placeholder="Full address" placeholderTextColor={colors.textSecondary} />

        <TouchableOpacity style={styles.mapPinBtn} onPress={() => setShowLocationPicker(true)}>
          <Feather name="map-pin" size={16} color={colors.brandPink} />
          <Text style={styles.mapPinBtnText}>
            {latitude != null && longitude != null ? 'Location pinned — tap to adjust' : 'Pin exact location on map'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Date *</Text>
        <InlineDatePicker value={eventDate} onChange={setEventDate} placeholder="Select event date" minimumDate={new Date()} />

        <Text style={styles.label}>Start Time *</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowStartTimePicker(true)}>
          <Text style={startTime ? styles.pickerValue : styles.pickerPlaceholder}>
            {startTime ? formatTimeDisplay(startTime) : 'Select start time'}
          </Text>
        </TouchableOpacity>
        {showStartTimePicker && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={parseTimeValue(startTime)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: DateTimePickerEvent, selectedTime?: Date) => {
                if (Platform.OS === 'android') setShowStartTimePicker(false);
                if (event.type === 'set' && selectedTime) setStartTime(formatTimeValue(selectedTime));
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowStartTimePicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.label}>End Time</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowEndTimePicker(true)}>
          <Text style={endTime ? styles.pickerValue : styles.pickerPlaceholder}>
            {endTime ? formatTimeDisplay(endTime) : 'Select end time'}
          </Text>
        </TouchableOpacity>
        {showEndTimePicker && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={parseTimeValue(endTime)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: DateTimePickerEvent, selectedTime?: Date) => {
                if (Platform.OS === 'android') setShowEndTimePicker(false);
                if (event.type === 'set' && selectedTime) setEndTime(formatTimeValue(selectedTime));
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowEndTimePicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Free Event</Text>
          <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: colors.brandPink }} />
        </View>

        <Text style={styles.label}>Ticket Types *</Text>
        {isEdit ? (
          <View style={styles.tierEditNote}>
            <Text style={styles.tierEditNoteText}>
              Ticket tiers are managed from "Manage Ticket Types" on the event page — adding, editing or removing
              tiers here isn't supported once an event exists.
            </Text>
          </View>
        ) : (
          <TicketTypeEditor tiers={tiers} onChange={setTiers} isFree={isFree} />
        )}

        <Text style={styles.label}>Total Event Capacity</Text>
        <TextInput
          style={styles.input}
          value={capacity}
          onChangeText={(v) => setCapacity(v.replace(/[^0-9]/g, ''))}
          placeholder="Optional — defaults to your ticket quantities combined"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
        />
        <Text style={styles.fieldHint}>
          Leave blank to cap attendance at the total of your ticket tiers. Set a number here to cap
          the whole event instead — this is what "seats available" on event cards is based on.
        </Text>

        {!isFree && (
          <>
            <Text style={styles.label}>Refund Policy *</Text>
            <View style={styles.refundRow}>
              {REFUND_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.refundPill, refundPolicyType === opt.value && styles.refundPillActive]}
                  onPress={() => setRefundPolicyType(opt.value)}
                >
                  <Text style={[styles.refundPillText, refundPolicyType === opt.value && styles.refundPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Refund Policy Details</Text>
            <TextInput style={[styles.input, styles.multiline]} value={refundPolicyText} onChangeText={setRefundPolicyText} placeholder="Describe your refund policy..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={2} />
          </>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Online Event</Text>
          <Switch value={isOnline} onValueChange={setIsOnline} trackColor={{ true: colors.brandPink }} />
        </View>

        {isOnline && (
          <>
            <Text style={styles.label}>Meeting Link *</Text>
            <TextInput style={styles.input} value={meetingLink} onChangeText={setMeetingLink} placeholder="https://meet.google.com/..." placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
          </>
        )}

        <Text style={styles.label}>Cover Image</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, savingMode !== null && styles.uploadBtnDisabled]}
          onPress={handlePickCoverImage}
          disabled={savingMode !== null}
        >
          <Text style={styles.uploadBtnText}>
            {pendingImage || coverImageUrl ? 'Change Cover Image' : 'Choose Cover Image'}
          </Text>
        </TouchableOpacity>
        {pendingImage ? (
          <Text style={styles.previewHint}>Uploaded when you save this event.</Text>
        ) : null}

        {pendingImage || coverImageUrl ? (
          <View style={styles.previewWrap}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Image source={{ uri: pendingImage?.uri ?? coverImageUrl }} style={styles.previewImage} />
          </View>
        ) : null}

        <Text style={styles.label}>Gallery (photos &amp; videos)</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, savingMode !== null && styles.uploadBtnDisabled]}
          onPress={handlePickGalleryMedia}
          disabled={savingMode !== null}
        >
          <Text style={styles.uploadBtnText}>+ Add Gallery Media</Text>
        </TouchableOpacity>
        {pendingGalleryItems.length > 0 ? (
          <Text style={styles.previewHint}>Uploaded when you save this event.</Text>
        ) : null}

        {(existingGallery.length > 0 || pendingGalleryItems.length > 0) && (
          <View style={styles.galleryGrid}>
            {existingGallery.map((item) => (
              <View key={item.id} style={styles.galleryThumbWrap}>
                {item.type === 'video' ? (
                  <View style={[styles.galleryThumb, styles.galleryVideoPlaceholder]}>
                    <Text style={styles.galleryVideoIcon}>▶</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.url }} style={styles.galleryThumb} />
                )}
                <TouchableOpacity
                  style={styles.galleryRemoveBtn}
                  onPress={() => deleteEventMedia({ eventId: eventId!, mediaId: item.id })}
                >
                  <Text style={styles.galleryRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {pendingGalleryItems.map((item, index) => (
              <View key={`pending-${index}`} style={styles.galleryThumbWrap}>
                {item.type === 'video' ? (
                  <View style={[styles.galleryThumb, styles.galleryVideoPlaceholder]}>
                    <Text style={styles.galleryVideoIcon}>▶</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.galleryThumb} />
                )}
                <TouchableOpacity
                  style={styles.galleryRemoveBtn}
                  onPress={() => removePendingGalleryItem(index)}
                  disabled={savingMode !== null}
                >
                  <Text style={styles.galleryRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {!isApprovedEdit && (
          <TouchableOpacity
            style={[styles.btn, styles.draftBtn]}
            onPress={() => handleSave(true)}
            disabled={savingMode !== null}
          >
            {savingMode === 'draft' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.draftBtnText}>Save as Draft</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, styles.publishBtn]}
          onPress={() => handleSave(false)}
          disabled={savingMode !== null}
        >
          {savingMode === 'publish' ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.publishBtnText}>
              {isApprovedEdit ? 'Save Changes' : isFree ? 'Publish Event' : 'Submit for Approval'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={showLocationPicker}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={({ latitude: lat, longitude: lng, address }) => {
          setLatitude(lat);
          setLongitude(lng);
          // Only autofills a blank address — never clobbers what the organizer already typed.
          if (address && !venueAddress.trim()) setVenueAddress(address);
          setShowLocationPicker(false);
        }}
      />
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  scroll: { padding: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, marginTop: spacing.sm },
  mapPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  mapPinBtnText: { fontSize: 13, fontWeight: '600', color: colors.brandPink },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  reviewNotice: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewNoticeText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  fieldHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
  pickerValue: { fontSize: 15, color: colors.text },
  pickerPlaceholder: { fontSize: 15, color: colors.textSecondary },
  pickerWrap: {
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  pickerDoneBtn: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerDoneText: { color: colors.white, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tierEditNote: {
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  tierEditNoteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  refundRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  refundPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  refundPillActive: { backgroundColor: colors.brandPink },
  refundPillText: { fontSize: 13, color: colors.textSecondary },
  refundPillTextActive: { color: colors.white, fontWeight: '600' },
  uploadBtn: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.brandPink,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadBtnText: {
    color: colors.brandPink,
    fontWeight: '600',
  },
  previewWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  previewHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    backgroundColor: '#E5E7EB',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  galleryThumbWrap: {
    width: 84,
    height: 84,
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: '#E5E7EB',
  },
  galleryVideoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryVideoIcon: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  galleryRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryRemoveText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  btn: { flex: 1, borderRadius: borderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  draftBtn: { backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: colors.border },
  draftBtnText: { color: colors.text, fontWeight: '600' },
  publishBtn: { backgroundColor: colors.brandPink },
  publishBtnText: { color: colors.white, fontWeight: '600' },
});

export default CreateEventScreen;
