import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Image, LayoutChangeEvent, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { SpringPressable } from '../../components/common/SpringPressable';
import { CloseIcon } from '../../components/common/Icons';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import { useTheme } from '../../theme/ThemeContext';
import type { ShortOverlay } from '../../store/services/shortsApi';

type Props = NativeStackScreenProps<RootStackParamList, 'EditReel'>;

// Critically damped (no bounce) — this is a "lift while grabbed" affordance, not a
// flick/throw, matching the Move/reposition row in the spring table, not the momentum row.
const LIFT_SPRING = { damping: 20, stiffness: 300, overshootClamping: true };

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 72;
const DEFAULT_FONT_SIZE = 26;

// Only families actually registered in App.tsx's useFonts call — a fontFamily string that
// was never loaded silently falls back to the system face on Android, so the option would
// appear to do nothing.
const FONT_OPTIONS: { key: string; label: string; family: string }[] = [
  { key: 'bold', label: 'Bold', family: 'ZalandoSansExpanded_700Bold' },
  { key: 'black', label: 'Heavy', family: 'ZalandoSansExpanded_900Black' },
  { key: 'light', label: 'Light', family: 'ZalandoSansExpanded_300Light' },
  { key: 'poppins', label: 'Round', family: 'Poppins_400Regular' },
];

// White first — it is the default and the only one that reads over an arbitrary video
// frame without thought. Black is included for light footage.
const COLOR_OPTIONS = [
  '#FFFFFF',
  '#000000',
  '#FF3366',
  '#FFD166',
  '#06D6A0',
  '#4CC9F0',
  '#B388FF',
  '#FF7043',
];

// The caption's resting position before any drag, as fractions of the video's size. The
// Shorts feed reproduces exactly these when replaying an overlay, so the two must agree —
// they are exported for that reason rather than living only in the stylesheet below.
export const OVERLAY_BASE_TOP_RATIO = 0.45;
export const OVERLAY_BASE_SIDE_RATIO = 0.1;

export interface TextOverlay {
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
}

const DEFAULT_OVERLAY: TextOverlay = {
  text: '',
  color: '#FFFFFF',
  fontFamily: FONT_OPTIONS[0].family,
  fontSize: DEFAULT_FONT_SIZE,
};

const HANDLE_SIZE = 14;

// One entry per grab point: four corners and four edge midpoints. `vx`/`vy` are the
// direction that handle grows in, so a single formula covers all eight — dragging a
// bottom-right corner outward and a left edge outward both mean "bigger".
const RESIZE_HANDLES: { key: string; vx: number; vy: number; style: object }[] = [
  { key: 'tl', vx: -1, vy: -1, style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 } },
  { key: 'tr', vx: 1, vy: -1, style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 } },
  { key: 'bl', vx: -1, vy: 1, style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 } },
  { key: 'br', vx: 1, vy: 1, style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 } },
  { key: 'tc', vx: 0, vy: -1, style: { top: -HANDLE_SIZE / 2, alignSelf: 'center' } },
  { key: 'bc', vx: 0, vy: 1, style: { bottom: -HANDLE_SIZE / 2, alignSelf: 'center' } },
  // marginTop offsets the handle by half its own height — `top: '50%'` alone centres the
  // handle's top edge on the midpoint, not the handle itself.
  { key: 'lc', vx: -1, vy: 0, style: { left: -HANDLE_SIZE / 2, top: '50%', marginTop: -HANDLE_SIZE / 2 } },
  { key: 'rc', vx: 1, vy: 0, style: { right: -HANDLE_SIZE / 2, top: '50%', marginTop: -HANDLE_SIZE / 2 } },
];

// How many points of font size one point of drag is worth. Below 1:1 because the box grows
// faster than the drag (a larger font widens the box too), so 1:1 runs away from the finger.
const RESIZE_GAIN = 0.35;

const ResizeHandle: React.FC<{
  vx: number;
  vy: number;
  style: object;
  fontSize: SharedValue<number>;
  onCommit: (size: number) => void;
}> = ({ vx, vy, style, fontSize, onCommit }) => {
  const startSize = useSharedValue(DEFAULT_FONT_SIZE);

  const pan = Gesture.Pan()
    .onStart(() => {
      startSize.value = fontSize.value;
    })
    .onUpdate((e) => {
      // Project the drag onto this handle's own outward direction, so a corner responds to
      // both axes and an edge only to the one it faces.
      const magnitude = Math.abs(vx) + Math.abs(vy);
      const projected = (e.translationX * vx + e.translationY * vy) / (magnitude || 1);
      const next = startSize.value + projected * RESIZE_GAIN;
      fontSize.value = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, next));
    })
    // Committed only on release. Pushing every frame into React state would re-render the
    // screen on every pointer move; the live size is already being driven on the UI thread.
    .onEnd(() => {
      runOnJS(onCommit)(fontSize.value);
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.handle, style]} hitSlop={12} />
    </GestureDetector>
  );
};

const DraggableCaption: React.FC<{
  overlay: TextOverlay;
  selected: boolean;
  onTap: () => void;
  onSelect: () => void;
  onResize: (size: number) => void;
  onMove: (x: number, y: number) => void;
  reduceMotion: boolean;
}> = ({ overlay, selected, onTap, onSelect, onResize, onMove, reduceMotion }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  // Lives as a shared value so a resize drag updates the rendered size on the UI thread,
  // and is mirrored back into React state on release (see ResizeHandle's onEnd).
  const fontSize = useSharedValue(overlay.fontSize);

  // Keeps the shared value in step when the size changes from somewhere other than a drag
  // (currently only the initial value, but also any future preset/reset control).
  useEffect(() => {
    fontSize.value = overlay.fontSize;
  }, [fontSize, overlay.fontSize]);

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
    // Committed on release for the same reason as the resize: the drag itself runs on the
    // UI thread, and only the settled position needs to reach React state to be saved.
    .onEnd(() => {
      if (!reduceMotion) scale.value = withSpring(1, LIFT_SPRING);
      runOnJS(onMove)(translateX.value, translateY.value);
    });

  // runOnJS, because a Gesture callback body is a worklet running on the UI thread and both
  // handlers are ordinary JS that call setState. Invoking them directly crashes with
  // "Tried to synchronously call a non-worklet function on the UI thread". The pan callbacks
  // above need no such treatment — they only assign to shared values.
  //
  // First tap selects (revealing the resize frame); tapping an already-selected caption
  // opens the editor. Without that split, the frame could never be dismissed and any tap
  // aimed at the text would pop the keyboard open.
  const tap = Gesture.Tap().onEnd(() => {
    if (selected) runOnJS(onTap)();
    else runOnJS(onSelect)();
  });

  const composed = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ fontSize: fontSize.value }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.captionOverlay, animatedStyle]}>
        <View style={[styles.captionBox, selected && styles.captionBoxSelected]}>
          <Animated.Text
            style={[
              styles.captionOverlayText,
              { color: overlay.color, fontFamily: overlay.fontFamily },
              textStyle,
            ]}
          >
            {overlay.text}
          </Animated.Text>

          {selected
            ? RESIZE_HANDLES.map((handle) => (
                <ResizeHandle
                  key={handle.key}
                  vx={handle.vx}
                  vy={handle.vy}
                  style={handle.style}
                  fontSize={fontSize}
                  onCommit={onResize}
                />
              ))
            : null}
        </View>
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
  const [overlay, setOverlay] = useState<TextOverlay>(DEFAULT_OVERLAY);
  const [selected, setSelected] = useState(false);
  // The caption's committed offset from its base position, in points. Normalised against
  // the measured frame below before being sent, so it survives the trip to other devices.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // The video's rendered size. Every stored geometry value is a fraction of this, so it must
  // come from a real measurement rather than Dimensions.get('window') — the video fills this
  // screen, but the window includes system bars this app draws under.
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TextOverlay>(DEFAULT_OVERLAY);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const openEditor = useCallback(() => {
    setDraft(overlay);
    setEditorOpen(true);
  }, [overlay]);

  const saveText = useCallback(() => {
    const trimmed = draft.text.trim();
    setOverlay({ ...draft, text: trimmed });
    setEditorOpen(false);
    // Leaves the caption selected so the resize frame is immediately available after
    // adding text — otherwise the first thing a user wants to do (make it bigger) needs
    // an extra tap to discover.
    setSelected(trimmed.length > 0);
  }, [draft]);

  // Resizing is the one edit that happens outside the sheet, so it writes straight to the
  // committed overlay rather than the draft.
  const handleResize = useCallback((fontSize: number) => {
    setOverlay((prev) => ({ ...prev, fontSize }));
  }, []);

  const handleMove = useCallback((x: number, y: number) => {
    setOffset({ x, y });
  }, []);

  const handleFrameLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setFrame((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  }, []);

  // Converts the on-screen composition into the device-independent form the feed replays.
  // Returns undefined when there is no text, or before the frame has been measured — sending
  // ratios divided by a zero width would place the overlay nowhere.
  const buildStoredOverlay = useCallback((): ShortOverlay | undefined => {
    if (!overlay.text || !frame || frame.width === 0 || frame.height === 0) return undefined;
    return {
      text: overlay.text,
      color: overlay.color,
      fontFamily: overlay.fontFamily,
      fontSizeRatio: overlay.fontSize / frame.width,
      xRatio: offset.x / frame.width,
      yRatio: offset.y / frame.height,
    };
  }, [frame, offset.x, offset.y, overlay]);

  const hasText = overlay.text.length > 0;

  return (
    <View style={styles.root} onLayout={handleFrameLayout}>
      {mediaType === 'video' ? (
        <VideoPreview uri={mediaUri} />
      ) : (
        <Image source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* Tapping anywhere off the caption dismisses the resize frame, the same way a
          canvas editor deselects. */}
      {selected ? (
        <SpringPressable onPress={() => setSelected(false)} scaleTo={1} style={StyleSheet.absoluteFill}>
          <View />
        </SpringPressable>
      ) : null}

      <BlurView intensity={45} tint="dark" style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <SpringPressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <CloseIcon color="#FFFFFF" size={20} />
        </SpringPressable>
      </BlurView>

      {hasText ? (
        <DraggableCaption
          overlay={overlay}
          selected={selected}
          onTap={openEditor}
          onSelect={() => setSelected(true)}
          onResize={handleResize}
          onMove={handleMove}
          reduceMotion={reduceMotion}
        />
      ) : null}

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing.md }]}>
        <SpringPressable onPress={openEditor} style={styles.addTextBtn}>
          <Text style={styles.addTextLabel}>{hasText ? 'Edit text' : 'Aa  Add text'}</Text>
        </SpringPressable>

        <SpringPressable
          onPress={() =>
            navigation.navigate('ShareReel', {
              eventId,
              mediaUri,
              mediaType,
              contentType,
              // The text still seeds the caption, which is what makes a reel readable in a
              // list and searchable. The full composition travels separately and is stored
              // with the reel, so the feed can draw it back over the video exactly where it
              // was placed.
              //
              // Still not composited into the video file - a reel downloaded straight from
              // storage has no text on it. That would need a server-side FFmpeg pass.
              overlayText: overlay.text || undefined,
              overlay: buildStoredOverlay(),
            })
          }
          style={styles.nextBtn}
        >
          <Text style={styles.nextText}>Next →</Text>
        </SpringPressable>
      </View>

      <HalfScreenModal visible={editorOpen} onClose={() => setEditorOpen(false)} heightPercent={0.55}>
        {/* No KeyboardAvoidingView here on purpose: the sheet is position:absolute,
            bottom:0 with a fixed height, so a KAV inside it can only shrink content within
            an area the keyboard already covers. HalfScreenModal lifts the whole sheet
            instead. */}
        <View style={styles.editorSheet}>
          <TextInput
            style={[
              styles.editorInput,
              {
                color: colors.text,
                borderColor: colors.borderLight,
                // Previews the chosen face in the field itself, so the font row's effect is
                // visible without closing the sheet to look at the video.
                fontFamily: draft.fontFamily,
              },
            ]}
            value={draft.text}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, text }))}
            placeholder="Say something about this moment..."
            placeholderTextColor={colors.placeholder}
            autoFocus
            multiline
          />

          <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>Colour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
            {COLOR_OPTIONS.map((color) => (
              <SpringPressable
                key={color}
                onPress={() => setDraft((prev) => ({ ...prev, color }))}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  draft.color === color && { borderColor: colors.brandPink, borderWidth: 3 },
                ]}
              >
                <View />
              </SpringPressable>
            ))}
          </ScrollView>

          <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>Font</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
            {FONT_OPTIONS.map((font) => (
              <SpringPressable
                key={font.key}
                onPress={() => setDraft((prev) => ({ ...prev, fontFamily: font.family }))}
                style={[
                  styles.fontChip,
                  { borderColor: colors.borderLight },
                  draft.fontFamily === font.family && { borderColor: colors.brandPink, borderWidth: 2 },
                ]}
              >
                <Text style={{ fontFamily: font.family, color: colors.text, fontSize: 15 }}>{font.label}</Text>
              </SpringPressable>
            ))}
          </ScrollView>

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
  // Padding leaves room for the handles to sit on the boundary without overlapping the
  // glyphs themselves.
  captionBox: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // Android's dashed-border support is inconsistent (same caveat as BookingsScreen's ticket
  // perforation) — if it renders solid there, the frame still reads correctly, it just
  // loses the dashes. The handles are what actually communicate "resizable".
  captionBoxSelected: {
    borderColor: 'rgba(255,255,255,0.9)',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  captionOverlayText: {
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
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
  editorSheet: { padding: spacing.md, gap: spacing.sm },
  editorLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  editorInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  optionRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.md },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
  },
  fontChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  editorSaveBtn: {
    backgroundColor: '#FF3366',
    borderRadius: borderRadius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  editorSaveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default EditReelScreen;
