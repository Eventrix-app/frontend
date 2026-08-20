import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
// expo-image, not core Image: uploader avatars repeat constantly down the feed (the same
// creator posts several reels), and only expo-image keeps them in a disk cache across the
// slide unmounting as rows recycle.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../../navigation/types';
import { OVERLAY_BASE_TOP_RATIO, OVERLAY_BASE_SIDE_RATIO } from './EditReelScreen';
import { spacing } from '../../theme/spacing';
import { Text } from '../../components/common/Text';
import { SearchIcon, PersonIcon, ChatIcon, HeartIcon, MusicNoteIcon } from '../../components/common/Icons';

// Required at module scope: Metro resolves require() at build time, so it cannot sit
// inside the component.
const HEART_ANIMATION = require('../../../assets/shorts/heart-like.json');
import { CreateReelSheet } from '../../components/events/CreateReelSheet';
import ShortsFeedSkeleton from '../../components/common/ShortsFeedSkeleton';
import SlowNetworkNotice from '../../components/common/SlowNetworkNotice';
import { useSlowNetwork } from '../../hooks/useSlowNetwork';
import ReelCommentsSheet from '../../components/events/ReelCommentsSheet';
import {
  FeedShort,
  ShortOverlay,
  useGetShortsFeedQuery,
  useGetShortsByUploaderQuery,
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

// Nullish-tolerant on purpose. These render straight from an API response, and a field the
// server omits (an older deployment, a narrowed projection) would otherwise be printed
// literally as "undefined views". A count that is not there is 0, not a word.
const formatCount = (n: number | null | undefined): string => {
  const value = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);
};

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
// A Lottie composition rather than a hand-rolled Reanimated sequence: the motion is
// authored as data (assets/shorts/heart-like.json), so its timing can be revised
// without touching this file, and it plays identically on both platforms rather than
// depending on each one's spring solver.
//
// Kept permanently mounted and simply replayed. The composition begins and ends at scale 0
// / opacity 0, so an idle instance renders nothing — there is no visibility state to track
// and no mount/unmount churn on every tap.
const HEART_SIZE = 220;

const HeartBurst = React.forwardRef<LottieView>((_props, ref) => (
  <View pointerEvents="none" style={styles.heartBurst}>
    <LottieView
      ref={ref}
      source={HEART_ANIMATION}
      autoPlay={false}
      loop={false}
      style={styles.heartLottie}
    />
  </View>
));
HeartBurst.displayName = 'HeartBurst';

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
  onOpenComments: (short: FeedShort) => void;
  onOpenUploader: (uploaderId: string) => void;
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
  onOpenComments,
  onOpenUploader,
  onCreate,
}) => {
  const heartRef = useRef<LottieView>(null);

  // reset() before play() so a second double tap restarts the burst from frame 0 rather
  // than being ignored while the first is still running.
  const playHeart = useCallback(() => {
    heartRef.current?.reset();
    heartRef.current?.play();
  }, []);

  // Double tap to like, the gesture everyone already expects from a reel feed. Always
  // bursts the heart, even when the reel is already liked — the animation acknowledges the
  // gesture, and a double tap that appeared to do nothing would read as a dropped input.
  // Unliking stays deliberate: only the heart button removes a like.
  //
  // Memoized because GestureDetector re-attaches the native handler whenever the gesture
  // object's identity changes. Rebuilding it on every render meant every re-render of a
  // slide tore down and re-registered a native gesture recogniser — on the one component in
  // this app that also owns a video player.
  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        // maxDelay a touch above the default so a slightly slow double tap still registers
        // rather than being read as two separate taps.
        .maxDelay(300)
        .onEnd(() => {
          // Both hop to the JS thread: a gesture callback body is a worklet, and neither the
          // Lottie ref nor the mutation hook exists on the UI thread.
          runOnJS(playHeart)();
          runOnJS(onLikeByDoubleTap)(item.id, liked);
        }),
    [playHeart, onLikeByDoubleTap, item.id, liked],
  );

  // Two regex passes over the caption, memoized together: they only depend on the caption
  // and the overlay, neither of which changes for the life of a slide, whereas this
  // component re-renders on every like and on every swipe that changes `active`.
  const { tags, body } = useMemo(() => {
    const parsedTags = extractTags(item.caption);
    const rawBody = captionWithoutTags(item.caption);
    // The overlay text seeds the caption on the share screen, so by default the two are
    // identical — printing both would show the same sentence twice on one slide. The caption
    // line is dropped only when it adds nothing; if the user edited it, both are shown.
    return {
      tags: parsedTags,
      body: item.overlay && item.overlay.text.trim() === rawBody ? '' : rawBody,
    };
  }, [item.caption, item.overlay]);

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
          {/* The whole author row is the target, not just the 32px avatar — a tap that
              small over a video is easy to miss and easy to mistake for a double tap. */}
          <TouchableOpacity
            style={styles.creatorRow}
            onPress={() => item.uploader?.id && onOpenUploader(item.uploader.id)}
            disabled={!item.uploader?.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.uploader?.fullName ?? 'uploader'}'s profile`}
          >
            {item.uploader?.profilePictureUrl ? (
              <Image
                source={{ uri: item.uploader.profilePictureUrl }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <PersonIcon color="#000000" size={16} />
              </View>
            )}
            <Text style={styles.userName}>{item.uploader?.fullName ?? 'Eventrix user'}</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenComments(item)}>
            <ChatIcon color="#FFFFFF" size={24} />
            <Text style={styles.actionLabel}>{formatCount(item.commentCount)}</Text>
          </TouchableOpacity>
          {/* Share was a placeholder that did nothing — nothing performs or records a share,
              so it is removed rather than left as a dead control. */}
          <Text style={styles.viewCount}>{formatCount(item.viewCount)} views</Text>
        </View>
      </View>

        <HeartBurst ref={heartRef} />
      </View>
    </GestureDetector>
  );
});
ReelSlide.displayName = 'ReelSlide';

const ShortsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [createOpen, setCreateOpen] = useState(false);
  // The reel whose comments are open. Held as the whole record, not just an id, so the sheet
  // knows the uploader and can offer them deletion of anyone's comment on their own reel.
  const [commentsFor, setCommentsFor] = useState<FeedShort | null>(null);
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  // Tab navigation keeps this screen mounted, so nothing else would tell a player that the
  // user has walked away — which is why audio kept running over the Home feed.
  const isFocused = useIsFocused();

  const route = useRoute<RouteProp<MainTabParamList, 'Shorts'>>();
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  // Latched out of the route rather than read from it directly: the params are cleared as
  // soon as the target is handled (so returning to the tab later does not re-scroll), and
  // reading them live would drop the target on that same clear.
  const [targetShortId, setTargetShortId] = useState<string | null>(null);
  const [pendingOpenComments, setPendingOpenComments] = useState(false);
  const handledTargetRef = useRef<string | null>(null);
  // Separate from handledTargetRef: that one debounces the *param*, this one debounces the
  // *scroll*. `loaded` gets a fresh array identity on every render, so without this the
  // effect below would re-scroll continuously and fight the user's own swiping.
  const scrolledForRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<FeedShort>>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetShortsFeedQuery(
    { page, limit: PAGE_SIZE },
    // The public feed is not what a notification tap wants, and fetching it would only
    // compete for bandwidth with the uploader feed below.
    { skip: targetShortId !== null },
  );

  // short_liked / short_commented are only ever delivered to the reel's uploader, so the
  // target is always one of this viewer's own reels. That is what makes this resolvable
  // without a GET /shorts/:id endpoint, which the API does not have.
  const { data: ownFeed, isLoading: ownLoading, isError: ownError } = useGetShortsByUploaderQuery(
    { userId: currentUserId ?? '' },
    { skip: targetShortId === null || !currentUserId },
  );
  // Pages are accumulated and deduped inside the cache entry itself (see getShortsFeed's
  // merge in shortsApi.ts), so this reads the merged feed directly. It deliberately does not
  // keep its own copy: a local snapshot could not see the like/comment counts patched into
  // the cache, which is exactly why those numbers used to lag behind the tap.
  const isTargeting = targetShortId !== null;
  const loaded = isTargeting ? ownFeed?.shorts ?? [] : data?.shorts ?? [];
  const listLoading = isTargeting ? ownLoading : isLoading;
  const listError = isTargeting ? ownError : isError;

  // Liked state is per-user, so it is only requested when signed in — the feed itself is
  // public and must still render for a signed-out viewer.
  const { data: likedIds = [] } = useGetMyLikedShortIdsQuery(undefined, { skip: !isAuthenticated });
  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);
  const [likeShort] = useLikeShortMutation();
  const [unlikeShort] = useUnlikeShortMutation();
  const [recordShortView] = useRecordShortViewMutation();

  // One view per reel per visit to this screen. Held in a ref rather than state because
  // nothing renders from it and it must not trigger a re-render of the feed.
  // Avoids re-sending a request the server would reject as a duplicate anyway. The real
  // "one account, one view" rule lives in the database's unique (user_id, short_id)
  // constraint — this set only lasts as long as the screen, so it can never be the rule
  // itself, just an optimisation on top of it.
  //
  // Skipped entirely when signed out: views are counted per account, so the endpoint needs
  // one, and calling it anonymously would only produce 401s.
  const viewedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeId || !isFocused || !isAuthenticated) return;
    if (viewedRef.current.has(activeId)) return;
    viewedRef.current.add(activeId);
    // Fire and forget — a view is a soft metric and a failed count must never surface to
    // the viewer or interrupt playback.
    recordShortView(activeId);
  }, [activeId, isAuthenticated, isFocused, recordShortView]);

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

  const handleOpenComments = useCallback((short: FeedShort) => setCommentsFor(short), []);
  const handleCloseComments = useCallback(() => setCommentsFor(null), []);

  const handleOpenUploader = useCallback(
    (uploaderId: string) => navigation.navigate('UserProfile', { userId: uploaderId }),
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    // Paging belongs to the public feed. The uploader feed is a bounded set fetched in one
    // request, and advancing `page` here would mutate the feed query that is skipped anyway.
    if (isTargeting) return;
    if (isFetching || !data) return;
    if (data.page >= data.totalPages) return;
    setPage(data.page + 1);
  }, [data, isFetching, isTargeting]);

  // A notification tap arrives as params on an already-mounted tab screen, so this reacts to
  // params rather than reading them once at mount.
  useEffect(() => {
    const incoming = route.params?.shortId;
    if (!incoming || incoming === handledTargetRef.current) return;
    handledTargetRef.current = incoming;
    setTargetShortId(incoming);
    setPendingOpenComments(route.params?.openComments === true);
  }, [route.params?.shortId, route.params?.openComments]);

  // Leaving the tab returns it to the ordinary public feed. Without this, coming back later
  // would still be pinned to one reel with no obvious way out.
  useEffect(() => {
    if (isFocused) return;
    setTargetShortId(null);
    setPendingOpenComments(false);
    handledTargetRef.current = null;
    scrolledForRef.current = null;
    if (route.params?.shortId) navigation.setParams({ shortId: undefined, openComments: undefined } as never);
  }, [isFocused, navigation, route.params?.shortId]);

  // Scroll to the target once the uploader feed carrying it has arrived, then open the
  // comment sheet if the notification was about a comment. Params are cleared here so a
  // later visit to the tab does not replay this.
  useEffect(() => {
    if (!targetShortId || slideHeight === null) return;
    if (scrolledForRef.current === targetShortId) return;
    const index = loaded.findIndex((s) => s.id === targetShortId);
    if (index < 0) return;
    scrolledForRef.current = targetShortId;
    listRef.current?.scrollToIndex({ index, animated: false });
    setActiveId(targetShortId);
    if (pendingOpenComments) {
      setCommentsFor(loaded[index]);
      setPendingOpenComments(false);
    }
    if (route.params?.shortId) navigation.setParams({ shortId: undefined, openComments: undefined } as never);
  }, [targetShortId, loaded, slideHeight, pendingOpenComments, navigation, route.params?.shortId]);

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
          onOpenComments={handleOpenComments}
          onOpenUploader={handleOpenUploader}
          onCreate={openCreate}
        />
      );
    },
    [activeId, isFocused, handleLikeByDoubleTap, handleOpenComments, handleOpenEvent, handleOpenUploader, handleToggleLike, insets.top, likedSet, openCreate, slideHeight, slideWidth],
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

  const showEmpty = !listLoading && !listError && loaded.length === 0;

  // Reels are the heaviest thing this app fetches, so a slow connection shows up here first
  // and most painfully — a black screen with no explanation.
  const { stage: slowStage } = useSlowNetwork(listLoading);

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {listLoading ? (
        <>
          <ShortsFeedSkeleton />
          {/* Overlaid rather than stacked: the skeleton fills the viewport here, so there is
              no flow position to push the notice into. */}
          <SlowNetworkNotice
            stage={slowStage}
            onRetry={refetch}
            tone="onDark"
            style={[styles.slowNotice, { top: insets.top + 72 }]}
          />
        </>
      ) : listError ? (
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
          ref={listRef}
          data={loaded}
          keyExtractor={(item) => item.id}
          // getItemLayout means offsets are known without measuring, but a target beyond the
          // realised window can still miss on the first attempt. Retrying after the list has
          // settled is what makes deep-linking to a reel land rather than silently no-op.
          onScrollToIndexFailed={({ index }) => {
            requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false }));
          }}
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

      <ReelCommentsSheet
        visible={commentsFor !== null}
        shortId={commentsFor?.id ?? null}
        uploaderUserId={commentsFor?.uploaderUserId}
        onClose={handleCloseComments}
      />
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
    marginTop: -HEART_SIZE / 2,
    marginLeft: -HEART_SIZE / 2,
    zIndex: 3,
  },
  heartLottie: { width: HEART_SIZE, height: HEART_SIZE },
  slowNotice: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 4,
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
  },
  avatarFallback: {
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
