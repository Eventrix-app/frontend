import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
  const [capacity, setCapacity] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [refundPolicyType, setRefundPolicyType] = useState('no_refunds');
  const [refundPolicyText, setRefundPolicyText] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [getUploadUrl] = useGetUploadUrlMutation();
  const { data: existingEvent } = useGetEventByIdQuery(eventId!, { skip: !isEdit });
  const { data: categories = [] } = useGetCategoriesQuery();

  const isBusy = isCreating || isUpdating;

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
    setCapacity(existingEvent.totalCapacity != null ? String(existingEvent.totalCapacity) : '');
    setIsFree(!existingEvent.isPaid);
    setPrice(existingEvent.pricePerTicket != null ? String(existingEvent.pricePerTicket) : '');
    setIsOnline(existingEvent.isOnline ?? false);
    setMeetingLink(existingEvent.meetingLink ?? '');
    setRefundPolicyType(existingEvent.refundPolicyType ?? 'no_refunds');
    setRefundPolicyText(existingEvent.refundPolicyText ?? '');
    setCoverImageUrl(existingEvent.coverImageUrl ?? existingEvent.imageUrl ?? '');

    prefilledRef.current = true;
  }, [existingEvent, isEdit]);

  const buildPayload = (asDraft: boolean) => ({
    title: title.trim(),
    description: description.trim() || undefined,
    categoryId,
    venueName: venueName.trim(),
    venueAddress: venueAddress.trim(),
    eventDate,
    startTime,
    endTime: endTime || undefined,
    totalCapacity: capacity ? parseInt(capacity, 10) : undefined,
    pricePerTicket: isFree ? 0 : parseFloat(price) || 0,
    isPaid: !isFree,
    isOnline,
    meetingLink: isOnline ? meetingLink : undefined,
    coverImageUrl: coverImageUrl || undefined,
    approvalStatus: asDraft ? ('draft' as const) : ('pending_approval' as const),
    refundPolicyType: !isFree ? refundPolicyType : undefined,
    refundPolicyText: !isFree && refundPolicyText ? refundPolicyText : undefined,
  });

  const validate = () => {
    if (!title.trim()) return 'Title is required';
    if (!categoryId) return 'Please select a category';
    if (!venueName.trim()) return 'Venue name is required';
    if (!venueAddress.trim()) return 'Venue address is required';
    if (!eventDate) return 'Event date is required (YYYY-MM-DD)';
    if (!startTime) return 'Start time is required (HH:MM)';
    if (!isFree && !price) return 'Price is required for paid events';
    if (isOnline && !meetingLink) return 'Meeting link is required for online events';
    return null;
  };

  const handleUploadCoverImage = async () => {
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
      showAlert('Upload failed', 'Could not read the selected image.');
      return;
    }

    setIsUploadingCover(true);
    try {
      const contentType = (ALLOWED_UPLOAD_CONTENT_TYPES.includes(asset.mimeType as UploadContentType)
        ? asset.mimeType
        : 'image/jpeg') as UploadContentType;
      const uploadResponse = await getUploadUrl({ purpose: 'event-cover', contentType }).unwrap();

      const fileResponse = await fetch(asset.uri);
      const fileBlob = await fileResponse.blob();

      const putResponse = await fetch(uploadResponse.uploadUrl, {
        method: 'PUT',
        body: fileBlob,
        headers: { 'Content-Type': contentType },
      });

      if (!putResponse.ok) {
        throw new Error('Image upload to storage failed.');
      }

      setCoverImageUrl(uploadResponse.publicUrl);
    } catch (error) {
      showAlert('Upload failed', error instanceof Error ? error.message : 'Could not upload the image.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async (asDraft: boolean) => {
    const err = validate();
    if (err) { showAlert('Validation', err); return; }

    try {
      const payload = buildPayload(asDraft);
      if (isEdit) {
        await updateEvent({ id: eventId!, body: payload }).unwrap();
      } else {
        await createEvent(payload).unwrap();
      }
      navigation.navigate('MyEvents');
    } catch (e: any) {
      showAlert('Error', e?.data?.message ?? 'Something went wrong');
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

        <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="2025-12-31" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Start Time * (HH:MM)</Text>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="18:00" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>End Time (HH:MM)</Text>
        <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="21:00" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Capacity</Text>
        <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} placeholder="Max attendees" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />

        <View style={styles.row}>
          <Text style={styles.label}>Free Event</Text>
          <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: colors.brandPink }} />
        </View>

        {!isFree && (
          <>
            <Text style={styles.label}>Price per Ticket (INR) *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="499" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />

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
          style={[styles.uploadBtn, isUploadingCover && styles.uploadBtnDisabled]}
          onPress={handleUploadCoverImage}
          disabled={isUploadingCover}
        >
          {isUploadingCover ? (
            <ActivityIndicator color={colors.brandPink} />
          ) : (
            <Text style={styles.uploadBtnText}>Choose and Upload Cover Image</Text>
          )}
        </TouchableOpacity>

        {coverImageUrl ? (
          <View style={styles.previewWrap}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Image source={{ uri: coverImageUrl }} style={styles.previewImage} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.btn, styles.draftBtn]}
          onPress={() => handleSave(true)}
          disabled={isBusy}
        >
          {isBusy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.draftBtnText}>Save as Draft</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.publishBtn]}
          onPress={() => handleSave(false)}
          disabled={isBusy}
        >
          <Text style={styles.publishBtnText}>
            {isFree ? 'Publish Event' : 'Submit for Approval'}
          </Text>
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
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
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
