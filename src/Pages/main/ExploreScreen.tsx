import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategoryIconCard } from '../../components/events/CategoryIconCard';
import { EventInterestCard } from '../../components/events/EventInterestCard';
import { SectionHeader } from '../../components/events/SectionHeader';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import InterestSelectionScreen from '../interestselection/InterestSelectionScreen';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { usePaginatedEvents } from '../../hooks/usePaginatedEvents';
import { useSlowNetwork } from '../../hooks/useSlowNetwork';
import SlowNetworkNotice from '../../components/common/SlowNetworkNotice';
import { useGetCategoriesQuery, useGetMeQuery } from '../../store/services/userApi';
import { useGetNotificationsQuery } from '../../store/services/notificationsApi';
import { useGetFollowedEventsQuery } from '../../store/services/organizerApi';
import { calculateDistanceKm, toCardEvent } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import NoEvents from '../../components/common/Noevents';
import EventListSkeleton from '../../components/common/EventListSkeleton';
import { EventFilters, FilterSheet } from '../../components/events/FilterSheet';
import { NotificationBell } from '../../components/common/Icons';

const FILTER_CHIPS: { id: keyof EventFilters | 'category'; label: string }[] = [
  { id: 'dateFrom', label: 'Date' },
  { id: 'priceMin', label: 'Price' },
  { id: 'radiusKm', label: 'Distance' },
  { id: 'category', label: 'Category' },
];

const ExploreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [followingOnly, setFollowingOnly] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({});
  const [sortByDistance, setSortByDistance] = useState(false);
  const {
    events,
    loadMore,
    isLoading: isLoadingAll,
    isFetchingMore,
    isRefreshing: isRefreshingAll,
    isError: isErrorAll,
    refetch: refetchAll,
  } = usePaginatedEvents({
    categoryId: filters.categoryId,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: 'newest',
  });
  const {
    data: followedEvents = [],
    isLoading: isLoadingFollowed,
    isError: isErrorFollowed,
    isFetching: isFetchingFollowed,
    refetch: refetchFollowed,
  } = useGetFollowedEventsQuery(undefined, { skip: !followingOnly });
  const { data: me } = useGetMeQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: notifications = [] } = useGetNotificationsQuery();
  const hasUnread = notifications.some((n) => !n.readAt);
  const avatarInitial = (me?.fullName ?? me?.email ?? '').trim().charAt(0).toUpperCase() || '?';

  const isLoading = followingOnly ? isLoadingFollowed : isLoadingAll;
  const isError = followingOnly ? isErrorFollowed : isErrorAll;
  const refetch = followingOnly ? refetchFollowed : refetchAll;
  // isFetching, not isLoading — isLoading only goes true on the first cache-empty load, so a
  // spinner bound to it would never appear on any pull after the screen's first visit.
  const isRefreshing = followingOnly ? isFetchingFollowed : isRefreshingAll;
  // Was rebuilt on every render — including every filter-chip tap and every notifications
  // poll — running toCardEvent plus a haversine distance over the whole list each time.
  const cardEvents = useMemo(() => {
    const source = followingOnly ? followedEvents : events;
    const mapped = source.map((event) => toCardEvent(event, me?.latitude, me?.longitude));
    // Distance has no backend param yet (event lat/lng is barely populated until the map
    // picker ships) — filtered/sorted client-side over whatever's already been fetched, so it
    // organically starts covering the full catalog as more events get real coordinates.
    if (me?.latitude == null || me?.longitude == null) {
      return mapped;
    }
    const userLat = me.latitude;
    const userLng = me.longitude;
    // Indexed once rather than re-scanned per card: the previous `source.find(...)` inside
    // the filter made this O(n²), so enabling the radius filter got quadratically slower as
    // more pages were loaded in. Also backs the distance sort below.
    const byId = new Map(source.map((e) => [e.id, e]));
    const distanceOf = (eventId: string): number => {
      const backendEvent = byId.get(eventId);
      if (backendEvent?.latitude == null || backendEvent?.longitude == null) return Infinity;
      return calculateDistanceKm(userLat, userLng, backendEvent.latitude, backendEvent.longitude);
    };

    let result = mapped;
    if (filters.radiusKm !== undefined) {
      const radiusKm = filters.radiusKm;
      result = result.filter((event) => distanceOf(event.id) <= radiusKm);
    }
    if (sortByDistance) {
      result = [...result].sort((a, b) => distanceOf(a.id) - distanceOf(b.id));
    }
    return result;
  }, [followingOnly, followedEvents, events, me?.latitude, me?.longitude, filters.radiusKm, sortByDistance]);

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasActiveFilter = (id: (typeof FILTER_CHIPS)[number]['id']): boolean => {
    if (id === 'category') return !!filters.categoryId;
    if (id === 'dateFrom') return !!filters.dateFrom;
    if (id === 'priceMin') return filters.priceMin !== undefined || filters.priceMax !== undefined;
    if (id === 'radiusKm') return filters.radiusKm !== undefined;
    return false;
  };

  const openEvent = useCallback((eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  }, [navigation]);

  const openCategory = useCallback((categoryId: string) => {
    navigation.navigate('Search', { categoryId });
  }, [navigation]);

  const requireAuth = useCallback(() => navigation.navigate('Auth' as never), [navigation]);

  // Only the first, cache-empty load — a pull-to-refresh already has the old list on screen
  // to look at, so warning about it there would be noise.
  const { stage: slowStage } = useSlowNetwork(isLoading);

  // EventInterestCard is React.memo'd, but that was doing nothing here: renderItem was an
  // inline arrow that built two fresh closures per card per render, so every card's props
  // compared unequal and the whole visible list re-rendered on any state change — a filter
  // chip tap, a notifications poll landing, a pull-to-refresh.
  const renderItem = useCallback(
    ({ item }: { item: (typeof cardEvents)[number] }) => (
      <EventInterestCard event={item as any} onPress={openEvent} onRequireAuth={requireAuth} />
    ),
    [openEvent, requireAuth],
  );

  // Same reason: an inline ListHeaderComponent element is a new element on every render,
  // which re-renders the whole category rail above the feed.
  const listHeader = useMemo(
    () => (
      <>
        <SectionHeader title="Browse by Category" />
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <CategoryIconCard key={category.id} item={category} onPress={openCategory} />
          ))}
        </View>
        <SectionHeader title="You Might Also Like" />
      </>
    ),
    [styles.categoryGrid, categories, openCategory],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Explore"
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
              <Image
                source={require('../../../assets/shared/icons/search.png')}
                style={styles.searchIconImg}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
              <NotificationBell unread={hasUnread} color={colors.brandPink} size={22} />
              {hasUnread && <View style={styles.bellDot} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              {me?.profilePictureUrl ? (
                <Image source={{ uri: me.profilePictureUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Dropdown-style filter chips */}
      <ScrollView
        horizontal
        style={styles.chipsScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <TouchableOpacity style={styles.slidersBtn} onPress={() => setShowFilterSheet(true)}>
          <Text style={styles.slidersIcon}>☰</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, followingOnly && styles.chipActive]}
          onPress={() => setFollowingOnly((v) => !v)}
        >
          <Text style={[styles.chipLabel, followingOnly && styles.chipLabelActive]}>Following</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, sortByDistance && styles.chipActive]}
          onPress={() => setSortByDistance((v) => !v)}
        >
          <Text style={[styles.chipLabel, sortByDistance && styles.chipLabelActive]}>Nearest first</Text>
        </TouchableOpacity>

        {FILTER_CHIPS.map((chip) => {
          const active = hasActiveFilter(chip.id);
          return (
            <TouchableOpacity
              key={chip.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setShowFilterSheet(true)}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.label}</Text>
              <Text style={[styles.chipChevron, active && styles.chipLabelActive]}>⌄</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        // Notice above the skeleton, not instead of it: the skeleton still shows what is
        // coming, and this only explains why it hasn't arrived yet.
        <>
          <SlowNetworkNotice stage={slowStage} onRetry={refetch} style={styles.slowNotice} />
          <EventListSkeleton />
        </>
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn't load events</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : cardEvents.length === 0 ? (
        <NoEvents
          onBack={() => navigation.goBack()}
          onGoHome={() => navigation.navigate('Home' as never)}
        />
      ) : (
        <FlatList
          data={cardEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={colors.brandPink} />
          }
          onEndReached={followingOnly ? undefined : loadMore}
          onEndReachedThreshold={0.4}
          // These cards are tall (full-width cover image each), so the default window of 21
          // screens' worth kept far more mounted image views alive than this list ever shows.
          // Deliberately no removeClippedSubviews: these rows are TouchableOpacity-based and
          // that prop is known to swallow taps on Android, which is not a trade worth making
          // on the main browse feed. ShortsScreen can use it because a slide's tap target is
          // a gesture handler over a full-screen video, not a nested touchable.
          windowSize={11}
          maxToRenderPerBatch={8}
          initialNumToRender={5}
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            <>
              {isFetchingMore ? <ActivityIndicator style={styles.loadMoreLoader} color={colors.brandPink} /> : null}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Ⓡ All Rights Reserved. © Eventrix</Text>
              </View>
            </>
          }
        />
      )}

      <HalfScreenModal visible={showFilterSheet} onClose={() => setShowFilterSheet(false)} heightPercent={0.75}>
        <FilterSheet value={filters} onApply={setFilters} onClose={() => setShowFilterSheet(false)} />
      </HalfScreenModal>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  slowNotice: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  // ScreenHeader centres its title on the *screen*, reserving a fixed 16+40+8 = 64px on
  // each side (see titleGlass there). This cluster used to measure 36+8+36+8+34 = 122px, far
  // past that reservation, so the centred title pill ran underneath the search icon on
  // narrower phones — ~12px of overlap at 360dp, and worse because titleContent carries
  // elevation 6 while these buttons carry none, so on Android the pill painted on top.
  // At 32px buttons with a 4px gap the cluster is 32+4+32+4+30 = 102px, which clears the
  // centred pill while leaving the title exactly where it is: dead centre.
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  searchIconImg: {
    width: 18,
    height: 18,
    tintColor: colors.text,
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3366',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  slidersBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDEDED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs ?? 4,
  },
  slidersIcon: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDEDED',
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.brandPink,
    borderColor: colors.brandPink,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipLabelActive: {
    color: colors.white,
  },
  chipChevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  loadMoreLoader: {
    marginVertical: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'ZalandoSansExpanded_600SemiBold',
  },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default ExploreScreen;