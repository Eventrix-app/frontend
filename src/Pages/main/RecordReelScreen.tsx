import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { SpringPressable } from '../../components/common/SpringPressable';
import { CameraIcon, PhotoIcon, MenuCloseIcon } from '../../components/common/Icons';
import { showAlert } from '../../utils/crossPlatformAlert';
import { ALLOWED_UPLOAD_CONTENT_TYPES, UploadContentType } from '../../store/services/eventsApi';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordReel'>;

// Deliberately not the guide's live-camera-tile-inside-a-scrolling-grid layout — a heavy
// native camera view inside a scrolling FlatList fights the list's own scroll gestures
// and re-renders on every scroll frame. Two plain choices instead: record (a dedicated
// full-screen capture mode below) or pick an existing video via the native library
// picker (expo-image-picker already renders the OS's own scrollable gallery grid, so
// there's no reason to rebuild one in-app).
// expo-camera's recordAsync() only returns a { uri }, no mimeType — unlike a gallery
// pick, which reports its own asset.mimeType. iOS camera recordings default to a .mov
// (QuickTime) container, not .mp4, so this can't be hardcoded to 'video/mp4' the way a
// naive implementation would — that would send a Content-Type header inconsistent with
// the actual file, and Supabase Storage enforces allowedMimeTypes on the bucket.
const contentTypeForRecordedUri = (uri: string): UploadContentType =>
  uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';

const RecordReelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'menu' | 'camera'>('menu');
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  // recordAsync() captures audio as well as video, so Android needs RECORD_AUDIO granted at
  // *runtime* — declaring it in the manifest is not enough. Without it the promise rejects
  // almost immediately, which surfaced as "Recording failed" a second after tapping record.
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  // recordAsync() also throws if the native camera session hasn't finished starting. The
  // record button is only enabled once onCameraReady fires, so a fast tap right after the
  // camera view mounts can't race it.
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleClose = () => {
    if (mode === 'camera') {
      setMode('menu');
      setIsCameraReady(false);
      return;
    }
    navigation.goBack();
  };

  const handleStartRecord = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showAlert('Camera access needed', 'Allow camera access in your device settings to record a reel.');
        return;
      }
    }
    if (!micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) {
        showAlert(
          'Microphone access needed',
          'Reels record sound as well as video. Allow microphone access in your device settings to record one.',
        );
        return;
      }
    }
    setIsCameraReady(false);
    setMode('camera');
  };

  const handleToggleRecording = async () => {
    if (!cameraRef.current || !isCameraReady) return;
    if (isRecording) {
      // stopRecording() resolves the pending recordAsync() promise below rather than
      // returning the file itself, so navigation happens there, not here.
      setIsRecording(false);
      cameraRef.current.stopRecording();
      return;
    }
    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      if (!video) throw new Error('Recording returned no file');
      navigation.replace('EditReel', {
        eventId,
        mediaUri: video.uri,
        mediaType: 'video',
        contentType: contentTypeForRecordedUri(video.uri),
      });
    } catch (err) {
      setIsRecording(false);
      // Surfacing the real reason rather than a blanket "try again" — the original blanket
      // message hid a permission failure behind advice that could never fix it.
      const detail = err instanceof Error ? err.message : String(err);
      showAlert('Recording failed', detail || 'Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert('Permission needed', 'Allow photo library access to pick a video for your reel.');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
    });
    if (pickerResult.canceled || !pickerResult.assets.length) return;
    const asset = pickerResult.assets[0];
    // Same mimeType-detection convention as CreateEventScreen's gallery picker.
    const contentType = (ALLOWED_UPLOAD_CONTENT_TYPES.includes(asset.mimeType as UploadContentType)
      ? asset.mimeType
      : 'video/mp4') as UploadContentType;
    navigation.replace('EditReel', { eventId, mediaUri: asset.uri, mediaType: 'video', contentType });
  };

  return (
    <View style={styles.root}>
      {mode === 'camera' && permission?.granted && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="video"
          facing="back"
          onCameraReady={() => setIsCameraReady(true)}
        />
      )}

      <BlurView intensity={45} tint="dark" style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <SpringPressable onPress={handleClose} style={styles.closeBtn}>
          <MenuCloseIcon color="#FFFFFF" size={20} />
        </SpringPressable>
        <Text style={styles.topTitle}>New Reel</Text>
        <View style={styles.closeBtn} />
      </BlurView>

      {mode === 'menu' ? (
        <View style={styles.menu}>
          <SpringPressable onPress={handleStartRecord} style={styles.optionTile}>
            <View style={styles.optionIconWrap}>
              <CameraIcon color="#FFFFFF" size={28} />
            </View>
            <Text style={styles.optionLabel}>Record a video</Text>
            <Text style={styles.optionHint}>Capture a moment from this event, up to 60s</Text>
          </SpringPressable>

          <SpringPressable onPress={handlePickFromGallery} style={styles.optionTile}>
            <View style={styles.optionIconWrap}>
              <PhotoIcon color="#FFFFFF" size={28} />
            </View>
            <Text style={styles.optionLabel}>Choose from gallery</Text>
            <Text style={styles.optionHint}>Pick a video you already recorded</Text>
          </SpringPressable>
        </View>
      ) : (
        <View style={[styles.recordControls, { paddingBottom: insets.bottom + spacing.xl }]}>
          <SpringPressable onPress={handleToggleRecording} scaleTo={0.88} disabled={!isCameraReady}>
            <View
              style={[
                styles.recordBtnOuter,
                isRecording && styles.recordBtnOuterActive,
                !isCameraReady && styles.recordBtnDisabled,
              ]}
            >
              <View style={[styles.recordBtnInner, isRecording && styles.recordBtnInnerActive]} />
            </View>
          </SpringPressable>
        </View>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  topTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  menu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  optionTile: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  optionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  optionLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  optionHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12, textAlign: 'center' },
  recordControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  recordBtnOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnOuterActive: {
    borderColor: '#FF3366',
  },
  recordBtnDisabled: {
    opacity: 0.4,
  },
  recordBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3366',
  },
  recordBtnInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
});

export default RecordReelScreen;
