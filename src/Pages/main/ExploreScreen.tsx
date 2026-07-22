import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategoryIconCard, CATEGORIES, ViewAllCategoryIconCard } from '../../components/events/CategoryIconCard';
import { EventInterestCard } from '../../components/events/EventInterestCard';
import { SectionHeader } from '../../components/events/SectionHeader';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import InterestSelectionScreen from '../interestselection/InterestSelectionScreen';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { usePaginatedEvents } from '../../hooks/usePaginatedEvents';
import { useGetMeQuery } from '../../store/services/userApi';
import { useGetFollowedEventsQuery } from '../../store/services/organizerApi';
import { calculateDistanceKm, toCardEvent } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import NoEvents from '../../components/common/Noevents';
import EventListSkeleton from '../../components/common/EventListSkeleton';
import { EventFilters, FilterSheet } from '../../components/events/FilterSheet';
import { SearchIcon, NotificationBell } from '../../components/common/Icons';

const FILTER_CHIPS: { id: keyof EventFilters | 'category'; label: string }[] = [
  { id: 'dateFrom', label: 'Date' },
  { id: 'priceMin', label: 'Price' },
  { id: 'radiusKm', label: 'Distance' },
  { id: 'category', label: 'Category' },
];

// TODO: source from user profile / auth state instead of hardcoding
const CURRENT_USER_AVATAR = require('../../../assets/profile/avatar-placeholder.png');
const hasUnread = true; // TODO: replace with real unread count from notification context/API

const ExploreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [followingOnly, setFollowingOnly] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({});
  const {
    events,
    loadMore,
    isLoading: isLoadingAll,
    isFetchingMore,
    isError: isErrorAll,
    refetch: refetchAll,
  } = usePaginatedEvents({
    categoryId: filters.categoryId,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  const {
    data: followedEvents = [],
    isLoading: isLoadingFollowed,
    isError: isErrorFollowed,
    refetch: refetchFollowed,
  } = useGetFollowedEventsQuery(undefined, { skip: !followingOnly });
  const { data: me } = useGetMeQuery();

  const isLoading = followingOnly ? isLoadingFollowed : isLoadingAll;
  const isError = followingOnly ? isErrorFollowed : isErrorAll;
  const refetch = followingOnly ? refetchFollowed : refetchAll;
  let cardEvents = (followingOnly ? followedEvents : events).map((event) =>
    toCardEvent(event, me?.latitude, me?.longitude),
  );
  // Distance has no backend param yet (event lat/lng is barely populated until the map
  // picker from #3 ships) — filtered client-side over whatever's already been fetched, so it
  // organically starts covering the full catalog as more events get real coordinates.
  if (filters.radiusKm !== undefined && me?.latitude != null && me?.longitude != null) {
    const radiusKm = filters.radiusKm;
    cardEvents = cardEvents.filter((event) => {
      const backendEvent = (followingOnly ? followedEvents : events).find((e) => e.id === event.id);
      if (!backendEvent?.latitude || !backendEvent?.longitude) return false;
      return calculateDistanceKm(me.latitude!, me.longitude!, backendEvent.latitude, backendEvent.longitude) <= radiusKm;
    });
  }
  const [showInterestSheet, setShowInterestSheet] = useState(false);
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

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  const openCategory = (categoryKey: string) => {
    navigation.navigate('Search', { category: categoryKey });
  };

  const openInterestSheet = () => setShowInterestSheet(true);
  const closeInterestSheet = () => setShowInterestSheet(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Explore"
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
              <SearchIcon color={colors.text} size={18} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
              <NotificationBell color={colors.text} size={18} />
              {hasUnread && <View style={styles.bellDot} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image source={CURRENT_USER_AVATAR} style={styles.avatarImg} />
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
        <EventListSkeleton />
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
          renderItem={({ item }) => (
            <EventInterestCard
              event={item as any}
              onPress={() => openEvent(item.id)}
              onRequireAuth={() => navigation.navigate('Auth' as never)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          onEndReached={followingOnly ? undefined : loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <>
              <SectionHeader title="Browse by Category" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {CATEGORIES.map((category) => (
                  <CategoryIconCard key={category.key} item={category} onPress={openCategory} />
                ))}
                <ViewAllCategoryIconCard onPress={openInterestSheet} />
              </ScrollView>
              <SectionHeader title="You Might Also Like" />
            </>
          }
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

     <HalfScreenModal visible={showInterestSheet} onClose={closeInterestSheet}>
      <InterestSelectionScreen
    mode="sheet"
    onComplete={closeInterestSheet}
    onDismiss={closeInterestSheet}
  />
</HalfScreenModal>

      <HalfScreenModal visible={showFilterSheet} onClose={() => setShowFilterSheet(false)} heightPercent={0.75}>
        <FilterSheet value={filters} onApply={setFilters} onClose={() => setShowFilterSheet(false)} />
      </HalfScreenModal>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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