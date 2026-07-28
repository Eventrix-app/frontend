import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { OVERLAY_BASE_TOP_RATIO, OVERLAY_BASE_SIDE_RATIO } from './EditReelScreen';
import { spacing } from '../../theme/spacing';
import { Text } from '../../components/common/Text';
import { SearchIcon, PersonIcon, ChatIcon, HeartIcon, MusicNoteIcon, ShareArrowIcon } from '../../components/common/Icons';
import { CreateReelSheet } from '../../components/events/CreateReelSheet';
import ShortsFeedSkeleton from '../../components/common/ShortsFeedSkeleton';
import {
  FeedShort,
  ShortOverlay,
  useGetShortsFeedQuery,
  useGetMyLikedShortIdsQuery,
  useLikeShortMutation,
  useUnlikeShortMutation,
  useRecordShortViewMutation,
} from '../../store/services/shortsApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

// Kept in step with the server's own default (findFeed caps limit at 50).
const PAGE_SIZE = 10;

// Only the reel actually on screen plays. Mounting a player per slide and letting them all
// run would decode every loaded video at once — on Android that exhausts the hardware
// decoder pool within a handful of slides and the feed starts rendering black frames.
const ReelVideo: React.FC<{ uri: string; active: boolean }> = ({ uri, active }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  // `active` already accounts for screen focus (see ShortsScreen's isFocused below), so a
  // reel keeps playing only while it is both the visible slide *and* the Shorts tab is on
  // screen. Navigating to Home used to leave the audio running underneath the feed, because
  // nothing told the player the screen had gone away — a FlatList item is not unmounted by
  // a tab change.
  React.useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  // Belt and braces: releases playback when the slide is genuinely unmounted (scrolled out
  // of the render window, or the tab torn down), which the effect above cannot catch
  // because it never runs again after unmount.
  React.useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // The native player may already be released; nothing to do.
      }
    };
  }, [player]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
};

// Captions carry their own hashtags inline (that is how ShareReelScreen composes them), so
// they are pulled out for the tag row rather than stored separately on the record.
const extractTags = (caption?: string): string[] => caption?.match(/#[\w]+/g) ?? [];
const captionWithoutTags = (caption?: string): string =>
  (caption ?? '').replace(/#[\w]+/g, '').replace(/\s+/g, ' ').trim();

const formatCount = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

// Draws the creator's text back over the video.
//
// Everything stored is a ratio of the video's rendered size, so it is multiplied back out
// against *this* device's slide dimensions — that is what makes a composition made on one
// phone land in the same place on every other. The base position and side inset are imported
// from the edit screen rather than duplicated, since the two must agree exactly or every
// overlay drifts.
//
// pointerEvents none: this is decoration painted over the video, and it must never
// intercept the swipe that moves to the next reel.
const ReelOverlayText: React.FC<{ overlay: ShortOverlay; width: number; height: number }> = ({
  overlay,
  width,
  height,
}) => (
  <View
    pointerEvents="none"
    style={[
      styles.overlayWrap,
      {
        top: height * OVERLAY_BASE_TOP_RATIO,
        left: width * OVERLAY_BASE_SIDE_RATIO,
        right: width * OVERLAY_BASE_SIDE_RATIO,
        transform: [
          { translateX: overlay.xRatio * width },
          { translateY: overlay.yRatio * height },
        ],
      },
    ]}
  >
    <Text
      style={[
        styles.overlayText,
        {
          color: overlay.color,
          fontFamily: overlay.fontFamily,
          fontSize: overlay.fontSizeRatio * width,
        },
      ]}
    >
      {overlay.text}
    </Text>
  </View>
);


// The burst that appears when a reel is double-tapped.
//
// Driven entirely on the UI thread: the gesture that triggers it is already a worklet, so
// routing the animation through React state would hand a 60fps sequence to the JS thread
// for no reason. Scale springs out and settles, opacity fades, and the whole thing clears
// itself — the caller never has to hide it.
const HEART_VISIBLE_MS = 1000;

const HeartBurst: React.FC<{ trigger: SharedValue<number> }> = ({ trigger }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useAnimatedReaction(
    () => trigger.value,
    (current, previous) => {
      if (previous === null || current === previous || current === 0) return;
      // Overshoot then settle, which is what gives it the "pop". Damping is low enough to
      // read as playful without wobbling.
      scale.value = withSequence(
        withSpring(1.15, { damping: 9, stiffness: 180 }),
        withSpring(1, { damping: 14, stiffness: 160 }),
      );
      // Snaps in, holds, then fades — so it is fully opaque for most of its life rather
      // than spending the whole second dissolving.
      opacity.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: HEART_VISIBLE_MS - 420 }),
        withTiming(0, { duration: 300 }),
      );
    },
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Reanimated.View pointerEvents="none" style={[styles.heartBurst, style]}>
      <HeartIcon color="#FF3366" size={110} />
    </Reanimated.View>
  );
};

interface SlideProps {
  item: FeedShort;
  active: boolean;
  width: number;
  height: number;
  insetTop: number;
  liked: boolean;
  onToggleLike: (id: string, liked: boolean) => void;
  onLikeByDoubleTap: (id: string, liked: boolean) => void;
  onOpenEvent: (eventId: string) => void;
  onCreate: () => void;
}

// Memoized, and this matters more here than in a typical list: every slide owns a video
// player, so re-rendering one is expensive. renderItem's identity necessarily changes on
// each swipe (it closes over the active id), which re-renders every mounted row — without
// this boundary that meant re-rendering all live players on every swipe, which is what
// VirtualizedList's "large list that is slow to update" warning was reporting.
//
// For it to hold, every callback below must be referentially stable, which is why liked is
// passed as a plain boolean and the toggle takes (id, liked) rather than closing over the
// liked-id set.
const ReelSlide = React.memo<SlideProps>(({
  item,
  active,
  width,
  height,
  insetTop,
  liked,
  onToggleLike,
  onLikeByDoubleTap,
  onOpenEvent,
  onCreate,
}) => {
  const heartTrigger = useSharedValue(0);

  // Double tap to like, the gesture everyone already expects from a reel feed. Always
  // bursts the heart, even when the reel is already liked — the animation acknowledges the
  // gesture, and a double tap that appeared to do nothing would read as a dropped input.
  // Unliking stays deliberate: only the heart button removes a like.
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    // maxDelay a touch above the default so a slightly slow double tap still registers
    // rather than being read as two separate taps.
    .maxDelay(300)
    .onEnd(() => {
      heartTrigger.value = heartTrigger.value + 1;
      runOnJS(onLikeByDoubleTap)(item.id, liked);
    });
  const tags = extractTags(item.caption);
  const rawBody = captionWithoutTags(item.caption);
  // The overlay text seeds the caption on the share screen, so by default the two are
  // identical — printing both would show the same sentence twice on one slide. The caption
  // line is dropped only when it adds nothing; if the user edited it, both are shown.
  const body = item.overlay && item.overlay.text.trim() === rawBody ? '' : rawBody;

  return (
    <GestureDetector gesture={doubleTap}>
      <View style={[styles.slide, { height }]}>
      <ReelVideo uri={item.mediaUrl} active={active} />
      {item.overlay ? <ReelOverlayText overlay={item.overlay} width={width} height={height} /> : null}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.bottomFade} />

      <View style={[styles.topBar, { paddingTop: insetTop + spacing.sm }]}>
        <Text style={styles.topTitle}>Shorts</Text>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={onCreate} hitSlop={8} accessibilityRole="button" accessibilityLabel="Create a reel">
            <Text style={styles.createIcon}>＋</Text>
          </TouchableOpacity>
          <SearchIcon color="#FFFFFF" size={22} />
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.creator}>
          <View style={styles.creatorRow}>
            <View style={styles.avatar}>
              <PersonIcon color="#000000" size={16} />
            </View>
            <Text style={styles.userName}>{item.uploader?.fullName ?? 'Eventrix user'}</Text>
          </View>
          {body ? <Text style={styles.caption}>{body}</Text> : null}
          {tags.length > 0 ? <Text style={styles.tags}>{tags.join(' ')}</Text> : null}
          {item.event ? (
            <TouchableOpacity style={styles.eventChip} onPress={() => onOpenEvent(item.event!.id)}>
              <MusicNoteIcon color="#FFFFFF" size={12} />
              <Text style={styles.eventChipText} numberOfLines={1}>{item.event.title}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onToggleLike(item.id, liked)}>
            <HeartIcon color={liked ? '#FF3366' : '#FFFFFF'} size={24} />
            <Text style={styles.actionLabel}>{formatCount(item.likeCount)}</Text>
          </TouchableOpacity>
          {/* Comments are not implemented server-side yet (see the shorts entity's own
              note), so these stay non-interactive affordances rather than buttons that
              silently do nothing. */}
          <View style={styles.actionBtn}>
            <ChatIcon color="rgba(255,255,255,0.5)" size={24} />
          </View>
          <View style={styles.actionBtn}>
            <ShareArrowIcon color="rgba(255,255,255,0.5)" size={24} />
          </View>
        </View>
      </View>

        <HeartBurst trigger={heartTrigger} />
      </View>
    </GestureDetector>
  );
});
ReelSlide.displayName = 'ReelSlide';

const ShortsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  // Tab navigation keeps this screen mounted, so nothing else would tell a player that the
  // user has walked away — which is why audio kept running over the Home feed.
  const isFocused = useIsFocused();

  const { data, isLoading, isFetching, isError, refetch } = useGetShortsFeedQuery({ page, limit: PAGE_SIZE });
  // Accumulated across pages: the query itself is keyed per page, so without this the feed
  // would replace its contents on every page change instead of growing.
  const [loaded, setLoaded] = useState<FeedShort[]>([]);
  React.useEffect(() => {
    if (!data) return;
    setLoaded((prev) => {
      const merged = data.page === 1 ? data.shorts : [...prev, ...data.shorts];
      // Dedupe by id — a reel inserted while paging can otherwise shift rows across the
      // page boundary and arrive twice, which would crash FlatList on duplicate keys.
      return [...new Map(merged.map((s) => [s.id, s])).values()];
    });
  }, [data]);

  // Liked state is per-user, so it is only requested when signed in — the feed itself is
  // public and must still render for a signed-out viewer.
  const { data: likedIds = [] } = useGetMyLikedShortIdsQuery(undefined, { skip: !isAuthenticated });
  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);
  const [likeShort] = useLikeShortMutation();
  const [unlikeShort] = useUnlikeShortMutation();
  const [recordShortView] = useRecordShortViewMutation();

  // One view per reel per visit to this screen. Held in a ref rather than state because
  // nothing renders from it and it must not trigger a re-render of the feed.
  const viewedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeId || !isFocused) return;
    if (viewedRef.current.has(activeId)) return;
    viewedRef.current.add(activeId);
    // Fire and forget — a view is a soft metric and a failed count must never surface to
    // the viewer or interrupt playback.
    recordShortView(activeId);
  }, [activeId, isFocused, recordShortView]);

  const [slideHeight, setSlideHeight] = useState<number | null>(null);
  // Width is measured alongside height because stored overlays are ratios of both — using
  // Dimensions.get('window') instead would be wrong on any device where the list does not
  // span the full window.
  const [slideWidth, setSlideWidth] = useState(0);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { height: h, width: w } = e.nativeEvent.layout;
    setSlideHeight((prev) => (prev === h ? prev : h));
    setSlideWidth((prev) => (prev === w ? prev : w));
  }, []);

  // 60% visible before a slide counts as current, so the player only switches once a swipe
  // has clearly settled rather than flickering mid-gesture.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const handleViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.item as FeedShort | undefined;
    if (first) setActiveId(first.id);
  }).current;

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const startReel = useCallback(
    (eventId: string) => {
      setCreateOpen(false);
      navigation.navigate('RecordReel', { eventId });
    },
    [navigation],
  );

  // Takes the liked flag as an argument rather than reading likedSet, so its identity does
  // not change every time a like lands — ReelSlide's memoization depends on that.
  const handleToggleLike = useCallback(
    (id: string, liked: boolean) => {
      if (!isAuthenticated) return;
      if (liked) unlikeShort(id);
      else likeShort(id);
    },
    [isAuthenticated, likeShort, unlikeShort],
  );

  // Double tap only ever adds a like, never removes one — the heart button is the way to
  // unlike. Re-liking something already liked is a no-op request the server would reject
  // on its unique constraint anyway, so it is skipped here.
  const handleLikeByDoubleTap = useCallback(
    (id: string, liked: boolean) => {
      if (!isAuthenticated || liked) return;
      likeShort(id);
    },
    [isAuthenticated, likeShort],
  );

  const handleOpenEvent = useCallback(
    (eventId: string) => navigation.navigate('EventDetails', { eventId }),
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (isFetching || !data) return;
    if (data.page >= data.totalPages) return;
    setPage(data.page + 1);
  }, [data, isFetching]);

  const renderItem = useCallback(
    ({ item }: { item: FeedShort }) => {
      if (slideHeight === null) return null;
      return (
        <ReelSlide
          item={item}
          active={item.id === activeId && isFocused}
          width={slideWidth}
          height={slideHeight}
          insetTop={insets.top}
          liked={likedSet.has(item.id)}
          onToggleLike={handleToggleLike}
          onLikeByDoubleTap={handleLikeByDoubleTap}
          onOpenEvent={handleOpenEvent}
          onCreate={openCreate}
        />
      );
    },
    [activeId, isFocused, handleLikeByDoubleTap, handleOpenEvent, handleToggleLike, insets.top, likedSet, openCreate, slideHeight, slideWidth],
  );

  // Every slide is exactly the viewport height, so measurement can be skipped entirely —
  // this also lets the pager compute offsets without laying rows out first.
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: slideHeight ?? 0,
      offset: (slideHeight ?? 0) * index,
      index,
    }),
    [slideHeight],
  );

  const showEmpty = !isLoading && !isError && loaded.length === 0;

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {isLoading ? (
        <ShortsFeedSkeleton />
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Couldn't load reels</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : showEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No reels yet</Text>
          <Text style={styles.emptySub}>Be the first to share a moment from an event you attended.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={openCreate}>
            <Text style={styles.retryText}>Create a reel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={loaded}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          // Each slide is sized from the list's *measured* viewport rather than
          // Dimensions.get('window').height minus a hardcoded tab-bar constant: this app runs
          // edge-to-edge, so window height includes the system bars, and pagingEnabled snaps
          // to the FlatList's own height — any disagreement compounds on every swipe.
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={handleViewableChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          // Keeps at most a few slides realised, which bounds how many video players exist.
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          removeClippedSubviews
        />
      )}

      <CreateReelSheet visible={createOpen} onClose={closeCreate} onSelectEvent={startReel} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: '100%',
  },
  heartBurst: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -55,
    marginLeft: -55,
    zIndex: 3,
  },
  viewCount: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  overlayWrap: {
    position: 'absolute',
    zIndex: 1,
  },
  overlayText: {
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  emptySub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: '#FF3366',
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  createIcon: { color: '#FFFFFF', fontSize: 24, fontWeight: '300' },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'ZalandoSansExpanded_500Medium',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bottom: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  creator: {
    flex: 1,
    gap: spacing.xs,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  tags: {
    color: '#9AD4FF',
    fontSize: 12,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    marginTop: 2,
  },
  eventChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', maxWidth: 180 },
  actions: {
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 2,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});

export default ShortsScreen;
