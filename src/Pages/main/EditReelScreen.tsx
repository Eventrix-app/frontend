import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { SpringPressable } from '../../components/common/SpringPressable';
import { CloseIcon } from '../../components/common/Icons';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'EditReel'>;

// Critically damped (no bounce) — this is a "lift while grabbed" affordance, not a
// flick/throw, matching the Move/reposition row in the spring table, not the momentum row.
const LIFT_SPRING = { damping: 20, stiffness: 300, overshootClamping: true };

const DraggableCaption: React.FC<{ text: string; onTap: () => void; reduceMotion: boolean }> = ({
  text,
  onTap,
  reduceMotion,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      if (!reduceMotion) scale.value = withSpring(1.08, LIFT_SPRING);
    })
    // 1:1 tracking — position follows the finger directly, every frame, no spring lag on
    // the position itself. The spring above/below is only the incidental "lifted" scale
    // feedback, never the tracked position.
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      if (!reduceMotion) scale.value = withSpring(1, LIFT_SPRING);
    });

  const tap = Gesture.Tap().onEnd(() => {
    onTap();
  });

  const composed = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.captionOverlay, animatedStyle]}>
        <Text style={styles.captionOverlayText}>{text}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

// A still first frame, not a playing loop. Nothing between picking a reel and sharing it
// plays the video: this screen is where text is positioned over the frame, and a moving
// background makes placing it a guessing game — you'd be aiming at whatever happens to be
// on screen that instant. Muted as well as paused so seeking never leaks audio.
const VideoPreview: React.FC<{ uri: string }> = ({ uri }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.pause();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
};

const EditReelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, mediaUri, mediaType, contentType } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [overlayText, setOverlayText] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const openEditor = () => {
    setDraftText(overlayText ?? '');
    setEditorOpen(true);
  };

  const saveText = () => {
    const trimmed = draftText.trim();
    setOverlayText(trimmed || null);
    setEditorOpen(false);
  };

  return (
    <View style={styles.root}>
      {mediaType === 'video' ? (
        <VideoPreview uri={mediaUri} />
      ) : (
        <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      <BlurView intensity={45} tint="dark" style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <SpringPressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <CloseIcon color="#FFFFFF" size={20} />
        </SpringPressable>
      </BlurView>

      {overlayText ? (
        <DraggableCaption text={overlayText} onTap={openEditor} reduceMotion={reduceMotion} />
      ) : null}

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing.md }]}>
        <SpringPressable onPress={openEditor} style={styles.addTextBtn}>
          <Text style={styles.addTextLabel}>{overlayText ? 'Edit text' : 'Aa  Add text'}</Text>
        </SpringPressable>

        <SpringPressable
          onPress={() =>
            navigation.navigate('ShareReel', {
              eventId,
              mediaUri,
              mediaType,
              contentType,
              // Carried forward so it can seed the caption on the next screen. It was being
              // dropped here, which is why text added with "Done" showed in the preview and
              // then vanished from the uploaded reel.
              //
              // The text is NOT burned into the video pixels — doing that needs server-side
              // compositing (FFmpeg), since there is no reliable client-side way to re-encode
              // a video with an overlay across devices. Becoming the caption means it still
              // renders over the video in the Shorts feed, which is where captions display.
              overlayText: overlayText ?? undefined,
            })
          }
          style={styles.nextBtn}
        >
          <Text style={styles.nextText}>Next →</Text>
        </SpringPressable>
      </View>

      <HalfScreenModal visible={editorOpen} onClose={() => setEditorOpen(false)} heightPercent={0.35}>
        {/* No KeyboardAvoidingView here on purpose: the sheet is position:absolute,
            bottom:0 with a fixed height, so a KAV inside it can only shrink content within
            an area the keyboard already covers. HalfScreenModal lifts the whole sheet
            instead. */}
        <View style={styles.editorSheet}>
          <Text style={[styles.editorLabel, { color: colors.text }]}>Text overlay</Text>
          <TextInput
            style={[styles.editorInput, { color: colors.text, borderColor: colors.borderLight }]}
            value={draftText}
            onChangeText={setDraftText}
            placeholder="Say something about this moment..."
            placeholderTextColor={colors.placeholder}
            autoFocus
            multiline
          />
          <SpringPressable onPress={saveText} style={styles.editorSaveBtn}>
            <Text style={styles.editorSaveText}>Done</Text>
          </SpringPressable>
        </View>
      </HalfScreenModal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  captionOverlay: {
    position: 'absolute',
    top: '45%',
    left: '10%',
    right: '10%',
  },
  captionOverlayText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  addTextBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.pill,
  },
  addTextLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  nextBtn: {
    backgroundColor: '#FF3366',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.pill,
  },
  nextText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  editorSheet: { padding: spacing.md, gap: spacing.md },
  editorLabel: { fontSize: 13, fontWeight: '600' },
  editorInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  editorSaveBtn: {
    backgroundColor: '#FF3366',
    borderRadius: borderRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editorSaveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default EditReelScreen;
