import React, { useEffect, useRef, useState } from 'react';
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
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useGetUploadUrlMutation,
  useGetEventByIdQuery,
  ALLOWED_UPLOAD_CONTENT_TYPES,
  UploadContentType,
} from '../../store/services/eventsApi';
import { useGetCategoriesQuery } from '../../store/services/userApi';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { parseDateValue, parseTimeValue, formatTimeValue, formatTimeDisplay } from '../../utils/dateFormat';
import InlineDatePicker from '../../components/common/InlineDatePicker';
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
  const prefilledRef = useRef(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [tiers, setTiers] = useState<TierDraft[]>(() => [createBlankTier()]);
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
  const { data: existingEvent } = useGetEventByIdQuery(eventId!, { skip: !isEdit });
  const { data: categories = [] } = useGetCategoriesQuery();

  useEffect(() => {
    if (!isEdit || !existingEvent || prefilledRef.current) {
      return;
    }

    setTitle(existingEvent.title ?? '');
    setDescription(existingEvent.description ?? '');
    setCategoryId(existingEvent.categoryId ?? '');
    setVenueName(existingEvent.venueName ?? '');
    setVenueAddress(existingEvent.venueAddress ?? '');
    setEventDate(existingEvent.eventDate ?? '');
    setStartTime(existingEvent.startTime ?? '');
    setEndTime(existingEvent.endTime ?? '');
    setIsFree(!existingEvent.isPaid);
    setIsOnline(existingEvent.isOnline ?? false);
    setMeetingLink(existingEvent.meetingLink ?? '');
    setRefundPolicyType(existingEvent.refundPolicyType ?? 'no_refunds');
    setRefundPolicyText(existingEvent.refundPolicyText ?? '');
    setCoverImageUrl(existingEvent.coverImageUrl ?? existingEvent.imageUrl ?? '');

    prefilledRef.current = true;
  }, [existingEvent, isEdit]);

  const buildPayload = (asDraft: boolean) => {
    // Legacy display-only fields (card badges on Home/Explore/Search read
    // BackendEvent.pricePerTicket directly — see eventCardAdapter.ts) derived from the
    // real tiers so they stay roughly accurate; ticketTypes below is the source of truth.
    const paidPrices = tiers.map((t) => Number(t.price) || 0).filter((p) => p > 0);
    const representativePrice = isFree ? 0 : (paidPrices.length ? Math.min(...paidPrices) : 0);

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim(),
      eventDate,
      startTime,
      endTime: endTime || undefined,
      // Only meaningful on create — `tiers` isn't populated with the event's real ticket
      // types in edit mode (pricing is owned by "Manage Ticket Types" post-creation), so
      // representativePrice is always 0 here. Sending it on edit would make the backend's
      // pricePerTicket-driven isPaid sync (events.service.ts update()) silently flip a
      // paid event's isPaid to false on every unrelated edit.
      pricePerTicket: isEdit ? undefined : representativePrice,
      isPaid: !isFree,
      isOnline,
      meetingLink: isOnline ? meetingLink : undefined,
      coverImageUrl: coverImageUrl || undefined,
      approvalStatus: asDraft ? ('draft' as const) : ('pending_approval' as const),
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
    if (endTime && parseTimeValue(endTime) <= parseTimeValue(startTime)) {
      return 'End time must be after start time';
    }
    if (isOnline && !meetingLink) return 'Meeting link is required for online events';
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
    const uploadResponse = await getUploadUrl({ purpose: 'event-cover', contentType: image.contentType }).unwrap();

    const fileResponse = await fetch(image.uri);
    const fileBlob = await fileResponse.blob();

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

      const successTitle = asDraft ? 'Draft Saved' : 'Event Published';
      const successMessage = asDraft
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What's this event about?" placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.refundPill, categoryId === cat.id && styles.refundPillActive]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={[styles.refundPillText, categoryId === cat.id && styles.refundPillTextActive]}>
                {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Venue Name *</Text>
        <TextInput style={styles.input} value={venueName} onChangeText={setVenueName} placeholder="Venue name" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Venue Address *</Text>
        <TextInput style={styles.input} value={venueAddress} onChangeText={setVenueAddress} placeholder="Full address" placeholderTextColor={colors.textSecondary} />

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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
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
        <TouchableOpacity
          style={[styles.btn, styles.publishBtn]}
          onPress={() => handleSave(false)}
          disabled={savingMode !== null}
        >
          {savingMode === 'publish' ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.publishBtnText}>
              {isFree ? 'Publish Event' : 'Submit for Approval'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, color: colors.text },
  title: { fontSize: 20, color: colors.text,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  scroll: { padding: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, marginTop: spacing.sm },
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
