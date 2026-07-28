import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Location from 'expo-location';
import { useDispatch } from 'react-redux';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import Skeleton from '../../components/common/Skeleton';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LocationPin } from '../../components/common/Icons';
import { LocationPickerModal } from '../../components/common/LocationPickerModal';
import { useGetEventByIdQuery } from '../../store/services/eventsApi';
import { useGetMeQuery } from '../../store/services/userApi';
import { useLazyReverseGeocodeQuery } from '../../store/services/geocodeApi';
import type { AppDispatch } from '../../store';
import { startReelUpload } from '../../utils/reelUploadManager';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareReel'>;

// Category + title-derived, not category + city — BackendEvent has no structured city
// field (only a free-text venueAddress), and parsing a city out of that reliably isn't
// worth the fragility for a "suggested tag" nicety.
function suggestHashtags(eventTitle: string, categoryName?: string): string[] {
  const tags: string[] = [];
  if (categoryName) tags.push(`#${categoryName.replace(/\s+/g, '').toLowerCase()}`);
  const titleWord = eventTitle.split(/\s+/).find((w) => w.length > 3);
  if (titleWord) tags.push(`#${titleWord.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`);
  return tags.filter((t) => t.length > 1);
}

// Accepts what a user actually types — with or without the leading #, with stray spaces or
// punctuation — and returns the canonical form, or null if nothing usable is left.
function normalizeHashtag(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#+/, '').replace(/[^a-zA-Z0-9_]/g, '');
  return cleaned.length > 0 ? `#${cleaned.toLowerCase()}` : null;
}

// A still first frame, not a playing clip: this screen is a review step, and an autoplaying
// loop pulls attention away from the caption/location fields the user is here to fill in.
// The player is created paused and never started.
const CoverPreview: React.FC<{ uri: string }> = ({ uri }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.pause();
  });
  return <VideoView player={player} style={styles.coverThumb} contentFit="cover" nativeControls={false} />;
};

const ShareReelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, mediaUri, contentType, overlayText, overlay } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  // Seeded from the text added on EditReel. The caption is what actually persists with the
  // reel and what the Shorts feed renders over the video, so the overlay text arriving here
  // is what makes it survive the upload — it is not composited into the video itself.
  const [caption, setCaption] = useState(overlayText ?? '');
  const [aiLabel, setAiLabel] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');

  const { data: event, isLoading: isLoadingEvent } = useGetEventByIdQuery(eventId);
  const { data: me } = useGetMeQuery();

  // ---- Location -----------------------------------------------------------------
  // This is where the *uploader* is, not where the event is. A reel gets filmed outside the
  // gate, at an afterparty, on the way home — attributing it to the venue's pin would be a
  // claim the user never made. Seeded from their position, and re-pinnable on a map below.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();

  const resolveName = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const result = await triggerReverseGeocode({ lat: latitude, lng: longitude }).unwrap();
        setLocationName(result.address ?? undefined);
      } catch {
        // Coordinates without a name are still a usable location — the row falls back to
        // showing the raw pair rather than blocking the share.
        setLocationName(undefined);
      }
    },
    [triggerReverseGeocode],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only reads a position the user has already agreed to share. getForegroundPermissions
      // rather than requestForegroundPermissions: opening the share screen is not the moment
      // to spring a permission dialog, and the account coordinates below usually cover it.
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (cancelled) return;
          setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          void resolveName(pos.coords.latitude, pos.coords.longitude);
          return;
        } catch {
          // Fall through to the account coordinates below.
        }
      }
      // Fallback: the coordinates captured during onboarding's location step. Coarser than a
      // live fix, but it is the user's own location and needs no prompt. If neither exists,
      // the row invites them to pin one manually.
      if (!cancelled && me?.latitude != null && me?.longitude != null) {
        setCoords({ latitude: Number(me.latitude), longitude: Number(me.longitude) });
        void resolveName(Number(me.latitude), Number(me.longitude));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.latitude, me?.longitude, resolveName]);

  const handleConfirmLocation = useCallback(
    (result: { latitude: number; longitude: number; address?: string }) => {
      setCoords({ latitude: result.latitude, longitude: result.longitude });
      setLocationName(result.address);
      setPickerOpen(false);
      // The picker resolves its own address as you pan; only re-resolve if it came back
      // without one, so a confirmed pin never briefly shows a stale name.
      if (!result.address) void resolveName(result.latitude, result.longitude);
    },
    [resolveName],
  );

  const locationLabel = locationName
    ?? (coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'Add a location');

  // ---- Hashtags -----------------------------------------------------------------
  const suggested = useMemo(
    () => (event ? suggestHashtags(event.title, event.category?.name) : []),
    [event],
  );

  // Suggestions the user hasn't used yet, plus everything they typed themselves. Tags
  // already present in the caption drop out of the row, so the chips always represent
  // "things you could still add" rather than a list that silently does nothing when tapped.
  const captionTags = useMemo(() => {
    const matches = caption.toLowerCase().match(/#[a-z0-9_]+/g);
    return new Set(matches ?? []);
  }, [caption]);

  const chips = useMemo(() => {
    const all = [...suggested, ...customTags];
    return [...new Set(all)].filter((tag) => !captionTags.has(tag));
  }, [suggested, customTags, captionTags]);

  const addHashtag = useCallback((tag: string) => {
    setCaption((prev) => {
      if (prev.toLowerCase().includes(tag)) return prev;
      return prev.trim().length ? `${prev.trim()} ${tag}` : tag;
    });
  }, []);

  // Committing a typed tag both records it and appends it, so a user who types one and taps
  // Share never loses it to an uncommitted input.
  const commitTagDraft = useCallback(() => {
    const normalized = normalizeHashtag(tagDraft);
    setTagDraft('');
    if (!normalized) return;
    setCustomTags((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    addHashtag(normalized);
  }, [addHashtag, tagDraft]);

  // ---- Share --------------------------------------------------------------------
  const handleShare = useCallback(() => {
    // Anything still sitting in the tag input counts as intended, not abandoned.
    const pendingTag = normalizeHashtag(tagDraft);
    const finalCaption = pendingTag && !caption.toLowerCase().includes(pendingTag)
      ? `${caption.trim()} ${pendingTag}`.trim()
      : caption;

    startReelUpload(dispatch, {
      eventId,
      eventTitle: event?.title,
      mediaUri,
      contentType,
      caption: finalCaption,
      overlay,
      locationName,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    });

    // Straight to Home, without waiting for the upload. reset() rather than navigate() so
    // the whole record → edit → share stack is torn down: backing up into a share screen
    // whose upload is already running would let the user submit the same reel twice.
    navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Home' } }] });
  }, [caption, contentType, coords, dispatch, event?.title, eventId, locationName, mediaUri, navigation, overlay, tagDraft]);

  return (
    <View style={[styles.root, { backgroundColor: colors.neutralBg, paddingTop: insets.top }]}>
      <ScreenHeader title="New Reel" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.coverContainer}>
          <CoverPreview uri={mediaUri} />
        </View>

        {/* A placeholder of the chip's own size, so the caption field and everything below it
            do not jump down when the event resolves. */}
        {isLoadingEvent ? (
          <View style={styles.eventChipPlaceholder}>
            <Skeleton width={180} height={36} />
          </View>
        ) : event ? (
          <TouchableOpacity
            style={[styles.eventChip, { backgroundColor: colors.white }]}
            onPress={() => navigation.navigate('EventDetails', { eventId })}
          >
            {event.coverImageUrl ? (
              <Image source={{ uri: event.coverImageUrl }} style={styles.eventChipThumb} />
            ) : (
              <View style={[styles.eventChipThumb, { backgroundColor: colors.muted }]} />
            )}
            <Text style={[styles.eventChipTitle, { color: colors.text }]} numberOfLines={1}>
              {event.title}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TextInput
          style={[styles.captionInput, { color: colors.text }]}
          placeholder="Write a caption..."
          placeholderTextColor={colors.placeholder}
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        <View style={[styles.tagInputRow, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
          <Text style={[styles.tagHash, { color: colors.textSecondary }]}>#</Text>
          <TextInput
            style={[styles.tagInput, { color: colors.text }]}
            placeholder="Add a hashtag"
            placeholderTextColor={colors.placeholder}
            value={tagDraft}
            onChangeText={setTagDraft}
            onSubmitEditing={commitTagDraft}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            // blurOnSubmit={false} keeps the keyboard up so several tags can be added in a
            // row without re-tapping the field each time.
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={commitTagDraft}
            disabled={!normalizeHashtag(tagDraft)}
            style={[styles.tagAddBtn, !normalizeHashtag(tagDraft) && styles.tagAddBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Add hashtag"
          >
            <Text style={styles.tagAddLabel}>Add</Text>
          </TouchableOpacity>
        </View>

        {chips.length > 0 && (
          <View style={styles.chipsRow}>
            {chips.map((tag) => (
              <TouchableOpacity key={tag} style={[styles.chip, { backgroundColor: colors.muted }]} onPress={() => addHashtag(tag)}>
                <Text style={[styles.chipText, { color: colors.text }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.row, { borderTopColor: colors.borderLight }]}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Change reel location"
        >
          <LocationPin color={colors.textSecondary} size={16} />
          <Text style={[styles.rowLabel, { color: coords ? colors.text : colors.textSecondary }]} numberOfLines={1}>
            {locationLabel}
          </Text>
          <Text style={[styles.rowAction, { color: colors.brandPink }]}>{coords ? 'Change' : 'Pin'}</Text>
        </TouchableOpacity>

        <View style={[styles.aiRow, { borderTopColor: colors.borderLight, borderBottomColor: colors.borderLight }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Add AI label</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              We require you to label certain realistic content that's made with AI.
            </Text>
          </View>
          <Switch value={aiLabel} onValueChange={setAiLabel} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.white, paddingBottom: insets.bottom + spacing.md }]}>
        {/* Never disabled or spinner-bound: the upload runs in the background, so this button
            only has to queue it and leave. The progress bar on Home is where the transfer is
            reported from here on. */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={pickerOpen}
        title="Pin reel location"
        initialLatitude={coords?.latitude}
        initialLongitude={coords?.longitude}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleConfirmLocation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.md },
  coverContainer: { alignItems: 'center', marginBottom: spacing.md },
  coverThumb: { width: 180, height: 240, borderRadius: borderRadius.lg, backgroundColor: '#000' },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  eventChipPlaceholder: { alignSelf: 'center', marginBottom: spacing.md },
  eventChipThumb: { width: 24, height: 24, borderRadius: borderRadius.pill },
  eventChipTitle: { fontSize: 13, fontWeight: '600', maxWidth: 220 },
  captionInput: { fontSize: 15, minHeight: 60, marginBottom: spacing.sm },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingLeft: spacing.md,
    paddingRight: 6,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  tagHash: { fontSize: 15, fontWeight: '600' },
  tagInput: { flex: 1, fontSize: 14, paddingVertical: 6 },
  tagAddBtn: {
    backgroundColor: '#FF3366',
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  tagAddBtnDisabled: { opacity: 0.4 },
  tagAddLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.pill },
  chipText: { fontSize: 13, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
  },
  rowLabel: { fontSize: 15, flex: 1 },
  rowAction: { fontSize: 13, fontWeight: '600' },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  hint: { fontSize: 12, marginTop: 2 },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  shareBtn: {
    backgroundColor: '#FF3366',
    paddingVertical: 14,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
  },
  shareText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default ShareReelScreen;
