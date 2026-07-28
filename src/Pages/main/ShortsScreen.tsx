import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { Text } from '../../components/common/Text';
import { SearchIcon, PersonIcon, ChatIcon, HeartIcon, MusicNoteIcon, ShareArrowIcon } from '../../components/common/Icons';
import { CreateReelSheet } from '../../components/events/CreateReelSheet';
import {
  FeedShort,
  useGetShortsFeedQuery,
  useGetMyLikedShortIdsQuery,
  useLikeShortMutation,
  useUnlikeShortMutation,
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

  React.useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
};

// Captions carry their own hashtags inline (that is how ShareReelScreen composes them), so
// they are pulled out for the tag row rather than stored separately on the record.
const extractTags = (caption?: string): string[] => caption?.match(/#[\w]+/g) ?? [];
const captionWithoutTags = (caption?: string): string =>
  (caption ?? '').replace(/#[\w]+/g, '').replace(/\s+/g, ' ').trim();

const formatCount = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const ShortsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

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

  const [slideHeight, setSlideHeight] = useState<number | null>(null);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setSlideHeight((prev) => (prev === h ? prev : h));
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

  const handleToggleLike = useCallback(
    (short: FeedShort) => {
      if (!isAuthenticated) return;
      if (likedSet.has(short.id)) unlikeShort(short.id);
      else likeShort(short.id);
    },
    [isAuthenticated, likeShort, likedSet, unlikeShort],
  );

  const handleEndReached = useCallback(() => {
    if (isFetching || !data) return;
    if (data.page >= data.totalPages) return;
    setPage(data.page + 1);
  }, [data, isFetching]);

  const renderItem = useCallback(
    ({ item }: { item: FeedShort }) => {
      if (slideHeight === null) return null;
      const tags = extractTags(item.caption);
      const body = captionWithoutTags(item.caption);
      const liked = likedSet.has(item.id);

      return (
        <View style={[styles.slide, { height: slideHeight }]}>
          <ReelVideo uri={item.mediaUrl} active={item.id === activeId} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.bottomFade} />

          <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <Text style={styles.topTitle}>Shorts</Text>
            <View style={styles.topActions}>
              <TouchableOpacity onPress={openCreate} hitSlop={8} accessibilityRole="button" accessibilityLabel="Create a reel">
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
                <TouchableOpacity
                  style={styles.eventChip}
                  onPress={() => navigation.navigate('EventDetails', { eventId: item.event!.id })}
                >
                  <MusicNoteIcon color="#FFFFFF" size={12} />
                  <Text style={styles.eventChipText} numberOfLines={1}>{item.event.title}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleLike(item)}>
                <HeartIcon color={liked ? '#FF3366' : '#FFFFFF'} size={24} />
                <Text style={styles.actionLabel}>{formatCount(item.likeCount)}</Text>
              </TouchableOpacity>
              {/* Comments are not implemented server-side yet (see the shorts entity's own
                  note), so this stays a non-interactive affordance rather than a button
                  that silently does nothing. */}
              <View style={styles.actionBtn}>
                <ChatIcon color="rgba(255,255,255,0.5)" size={24} />
              </View>
              <View style={styles.actionBtn}>
                <ShareArrowIcon color="rgba(255,255,255,0.5)" size={24} />
              </View>
            </View>
          </View>
        </View>
      );
    },
    [activeId, handleToggleLike, insets.top, likedSet, navigation, openCreate, slideHeight],
  );

  const showEmpty = !isLoading && !isError && loaded.length === 0;

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
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
