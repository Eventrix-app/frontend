import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import type { ReelUploadJob } from '../../store/slices/reelUploadSlice';
import { cancelReelUpload, dismissReelUpload } from '../../utils/reelUploadManager';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../common/Text';
import { MenuCloseIcon } from '../common/Icons';

// How long a finished row stays on screen before clearing itself. Long enough to read
// "Reel shared" after landing on Home, short enough not to become furniture.
const SUCCESS_LINGER_MS = 4000;

// The cover image is the reel's own first frame, rendered by a paused player rather than a
// generated thumbnail file. Generating one would mean decoding the video a second time (and
// a native thumbnailing dependency this app doesn't carry) for an image that is 44px wide.
const CoverThumb: React.FC<{ uri: string }> = ({ uri }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    // Never played: this is a still cover, and a looping video behind a progress bar on the
    // Home feed would compete with the feed itself for attention and decoder resources.
    p.pause();
  });
  return <VideoView player={player} style={styles.cover} contentFit="cover" nativeControls={false} />;
};

const statusLabel = (job: ReelUploadJob): string => {
  switch (job.status) {
    case 'uploading':
      return `Uploading reel · ${Math.round(job.progress * 100)}%`;
    case 'finalizing':
      return 'Finishing up…';
    case 'success':
      return 'Reel shared';
    case 'error':
      return job.error ?? "Upload failed";
    case 'cancelled':
      return 'Upload cancelled';
  }
};

const UploadRow: React.FC<{ job: ReelUploadJob }> = ({ job }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { colors } = useTheme();
  const isTerminal = job.status === 'success' || job.status === 'error';

  // Driven off a native-driver Animated.Value rather than a styled width percentage so the
  // fill doesn't re-layout the row on every progress tick. scaleX on a full-width bar gives
  // the same visual with one transform.
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // 'finalizing' has no measurable progress left, so the bar simply completes and holds.
    const target = job.status === 'uploading' ? job.progress : 1;
    Animated.timing(fill, { toValue: target, duration: 180, useNativeDriver: true }).start();
  }, [fill, job.progress, job.status]);

  // A successful row clears itself; a failed one stays until dismissed, because the message
  // is the only place the reason is visible once the notification is swiped away.
  useEffect(() => {
    if (job.status !== 'success') return;
    const timer = setTimeout(() => dismissReelUpload(dispatch, job.id), SUCCESS_LINGER_MS);
    return () => clearTimeout(timer);
  }, [dispatch, job.id, job.status]);

  const handleCancel = useCallback(() => {
    if (isTerminal) {
      dismissReelUpload(dispatch, job.id);
      return;
    }
    cancelReelUpload(dispatch, job.id);
  }, [dispatch, isTerminal, job.id]);

  const barColor = job.status === 'error' ? colors.error : colors.brandPink;

  return (
    <View style={[styles.row, { backgroundColor: colors.white, borderColor: colors.borderLight }]}>
      <CoverThumb uri={job.mediaUri} />

      <View style={styles.middle}>
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          {statusLabel(job)}
        </Text>
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: barColor,
                // scaleX anchors at the centre by default, which would grow the fill
                // outward from the middle of the track. transformOrigin moves the anchor to
                // the left edge so it reads as a progress bar filling left-to-right.
                transformOrigin: 'left',
                transform: [{ scaleX: fill }],
              },
            ]}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleCancel}
        hitSlop={10}
        style={styles.cancelBtn}
        accessibilityRole="button"
        accessibilityLabel={isTerminal ? 'Dismiss' : 'Cancel upload'}
      >
        <MenuCloseIcon color={colors.textSecondary} size={16} />
      </TouchableOpacity>
    </View>
  );
};

/**
 * The in-app half of reel upload feedback (the other half is the local notification posted
 * by reelUploadManager). Renders nothing at all when no upload is in flight, so it costs a
 * single selector read on screens that mount it.
 *
 * Reads from the store rather than taking props because the upload outlives the screen that
 * started it — by the time this renders, ShareReelScreen has already been popped.
 */
export const ReelUploadProgressBar: React.FC = () => {
  const jobs = useSelector((state: RootState) => state.reelUpload.jobs);
  const visible = useMemo(() => jobs.filter((job) => job.status !== 'cancelled'), [jobs]);

  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      {visible.map((job) => (
        <UploadRow key={job.id} job={job} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // marginBottom lives here rather than on a wrapper in HomeScreen: the whole component
  // returns null when idle, so the spacing disappears with it instead of leaving a gap at
  // the top of the feed.
  container: { gap: spacing.sm, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cover: {
    width: 40,
    height: 52,
    borderRadius: borderRadius.sm,
    backgroundColor: '#000',
  },
  middle: { flex: 1, gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 2,
  },
  cancelBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReelUploadProgressBar;
