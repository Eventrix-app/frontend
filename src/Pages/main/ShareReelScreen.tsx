import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { LocationPin } from '../../components/common/Icons';
import { useGetEventByIdQuery, useGetUploadUrlMutation } from '../../store/services/eventsApi';
import { useCreateShortMutation } from '../../store/services/shortsApi';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';

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

const CoverPreview: React.FC<{ uri: string; mediaType: 'photo' | 'video' }> = ({ uri, mediaType }) => {
  const player = useVideoPlayer(mediaType === 'video' ? uri : null, (p) => {
    p.loop = true;
    p.play();
  });
  if (mediaType === 'video') {
    return <VideoView player={player} style={styles.coverThumb} contentFit="cover" nativeControls={false} />;
  }
  return <Image source={{ uri }} style={styles.coverThumb} resizeMode="cover" />;
};

const ShareReelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, mediaUri, mediaType, contentType } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [caption, setCaption] = useState('');
  const [aiLabel, setAiLabel] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { data: event } = useGetEventByIdQuery(eventId);
  const [getUploadUrl] = useGetUploadUrlMutation();
  const [createShort] = useCreateShortMutation();

  const hashtags = useMemo(
    () => (event ? suggestHashtags(event.title, event.category?.name) : []),
    [event],
  );

  const addHashtag = (tag: string) => {
    if (caption.includes(tag)) return;
    setCaption((prev) => (prev.trim().length ? `${prev.trim()} ${tag}` : tag));
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const { uploadUrl, publicUrl } = await getUploadUrl({ purpose: 'reel-video', contentType: contentType as any }).unwrap();
      const fileBlob = await (await fetch(mediaUri)).blob();
      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBlob,
        headers: { 'Content-Type': contentType },
      });
      if (!putResponse.ok) throw new Error('Upload to storage failed.');

      await createShort({
        mediaUrl: publicUrl,
        caption: caption.trim() || undefined,
        eventId,
      }).unwrap();

      showAlert('Reel shared!', undefined, () => navigation.navigate('Main', { screen: 'Shorts' }));
    } catch (e) {
      showAlert("Couldn't share reel", extractErrorMessage(e, 'Please try again.'));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.neutralBg, paddingTop: insets.top }]}>
      <ScreenHeader title="New Reel" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.coverContainer}>
          <CoverPreview uri={mediaUri} mediaType={mediaType} />
        </View>

        {event ? (
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

        {hashtags.length > 0 && (
          <View style={styles.chipsRow}>
            {hashtags.map((tag) => (
              <TouchableOpacity key={tag} style={[styles.chip, { backgroundColor: colors.muted }]} onPress={() => addHashtag(tag)}>
                <Text style={[styles.chipText, { color: colors.text }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {event ? (
          <View style={[styles.row, { borderTopColor: colors.borderLight }]}>
            <LocationPin color={colors.textSecondary} size={16} />
            <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
              {event.venueName}
            </Text>
          </View>
        ) : null}

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
        <TouchableOpacity
          style={[styles.shareBtn, isSharing && styles.shareBtnDisabled]}
          onPress={handleShare}
          disabled={isSharing}
        >
          {isSharing ? <ActivityIndicator color={colors.white} /> : <Text style={styles.shareText}>Share</Text>}
        </TouchableOpacity>
      </View>
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
  eventChipThumb: { width: 24, height: 24, borderRadius: borderRadius.pill },
  eventChipTitle: { fontSize: 13, fontWeight: '600', maxWidth: 220 },
  captionInput: { fontSize: 15, minHeight: 60, marginBottom: spacing.sm },
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
  shareBtnDisabled: { opacity: 0.7 },
  shareText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default ShareReelScreen;
