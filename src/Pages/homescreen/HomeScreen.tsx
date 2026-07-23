import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, AppStateStatus, Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import FeaturedCarousel from '../../components/events/FeaturedCarousel';
import { CategoryIconCard, CATEGORIES, ViewAllCategoryIconCard } from '../../components/events/CategoryIconCard';
import { EventInterestCard } from '../../components/events/EventInterestCard';
import { EventHighlightCard, HighlightItem } from '../../components/events/EventHighlightCard';
import { SectionHeader } from '../../components/events/SectionHeader';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import InterestSelectionScreen from '../interestselection/InterestSelectionScreen';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '../../store';
import { syncOnboardingDraft } from '../../utils/syncOnboardingDraft';
import { usePaginatedEvents } from '../../hooks/usePaginatedEvents';
import { useDisplayAddress } from '../../hooks/useDisplayAddress';
import { useGetMeQuery } from '../../store/services/userApi';
import { useGetNotificationsQuery } from '../../store/services/notificationsApi';
import { toCardEvent } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';
import { NotificationBell, LocationPin } from '../../components/common/Icons';

const bgImage = require('../../../assets/bg.png');

const micSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
  <rect x="9" y="2" width="6" height="12" rx="3" fill="#F43362"/>
  <path d="M5 11a7 7 0 0 0 14 0" stroke="#F43362" stroke-width="2" stroke-linecap="round" fill="none"/>
  <line x1="12" y1="18" x2="12" y2="22" stroke="#F43362" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="22" x2="16" y2="22" stroke="#F43362" stroke-width="2" stroke-linecap="round"/>
</svg>`;


const SCREEN_WIDTH = Dimensions.get('window').width;

// Shown in the space revealed above the header while the user pulls down to refresh —
// picked fresh each time a pull gesture starts, no backend call needed for these.
const HEALTH_QUOTES = [
  'A 10-minute walk can lift your mood for hours.',
  'Drinking enough water keeps your mind sharp.',
  'A few deep breaths can calm a racing mind.',
  'Good sleep tonight means a better you tomorrow.',
  'Stretching for five minutes eases the whole day.',
  'Small steps every day add up to big health wins.',
  'Fresh air and sunlight are free mood boosters.',
  'Laughing with friends is good for your heart, literally.',
];

function randomHealthQuote(): string {
  return HEALTH_QUOTES[Math.floor(Math.random() * HEALTH_QUOTES.length)];
}

// How far (in negative content-offset px) the user needs to pull before releasing
// triggers a refresh — mirrors a typical native RefreshControl's trigger distance.
const PULL_REFRESH_TRIGGER_DISTANCE = 90;

// TODO: pull from a real "shorts"/highlights endpoint once available
const HIGHLIGHTS: HighlightItem[] = [
  { id: 'h1', thumbnail: require('../../../assets/highlights/h1.jpg'), title: 'Event highlight title...', views: '14k views', postedAgo: '40m ago' },
  { id: 'h2', thumbnail: require('../../../assets/highlights/h2.jpg'), title: 'Event highlight title...', views: '9k views', postedAgo: '2h ago' },
  { id: 'h3', thumbnail: require('../../../assets/highlights/h3.jpg'), title: 'Event highlight title...', views: '3k views', postedAgo: '1d ago' },
];

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isSynced = useSelector((state: RootState) => state.onboardingDraft.isSynced);
  const appState = useRef(AppState.currentState);
  const [showInterestSheet, setShowInterestSheet] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (isAuthenticated && !isSynced) {
          syncOnboardingDraft(dispatch, store.getState);
        }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [dispatch, isAuthenticated, isSynced]);

  const { events, refetch } = usePaginatedEvents();
  const { data: me, refetch: refetchMe } = useGetMeQuery();
  const cardEvents = events.map((event) => toCardEvent(event, me?.latitude, me?.longitude));
  // Backend caps featured events at 5 (see EventsService.MAX_FEATURED_EVENTS); sliced again
  // here defensively so a stale cached response or a future relaxation of that cap can never
  // blow out this carousel.
  const featured = cardEvents.filter((event) => event.featured).slice(0, 5);
  // Home shows a fixed-size latest feed (not an infinite one) — full browsing/pagination
  // lives on the Explore screen via "View All Events" below.
  const recommended = cardEvents.slice(0, 15);

  // Home-screen-only pull-to-refresh: dragging past the top shifts the header + feed
  // down together (via pullDistance below) and reveals a random health quote behind
  // them. Driven straight off the ScrollView's own native bounce (contentOffset.y going
  // negative) rather than a custom PanResponder, so it rides the platform's native
  // over-scroll physics instead of fighting them.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [pullQuote, setPullQuote] = useState(randomHealthQuote);
  const hasCrossedPullTriggerRef = useRef(false);

  // A fast fling-to-top can make the native scroll view overshoot a few px past 0 on its
  // own (pure momentum/rubber-band settle, finger already lifted) — with no dead zone, that
  // alone was enough to nudge the header down and flash a gap above it near the status bar,
  // even though the user never meant to trigger the pull-reveal. Below PULL_DEAD_ZONE the
  // header stays fully pinned; only a deliberate drag past it starts moving anything.
  const PULL_DEAD_ZONE = 24;
  const pullDistance = scrollY.interpolate({
    inputRange: [-150, -PULL_DEAD_ZONE, 0],
    outputRange: [150 - PULL_DEAD_ZONE, 0, 0],
    extrapolate: 'clamp',
  });
  const pullQuoteOpacity = scrollY.interpolate({
    inputRange: [-70, -PULL_DEAD_ZONE, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  // Home shows a fixed latest-15 feed (see `recommended` above), so scroll only needs to
  // watch for the pull-to-refresh threshold — no lazy-loading trigger here anymore.
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset } = e.nativeEvent;
        if (contentOffset.y <= -PULL_REFRESH_TRIGGER_DISTANCE) {
          hasCrossedPullTriggerRef.current = true;
        }
      },
    },
  );

  const handlePullStart = () => {
    setPullQuote(randomHealthQuote());
    hasCrossedPullTriggerRef.current = false;
  };

  // Fires on release ("drops the refresh icon") — the ScrollView's own bounce-back
  // animation already repositions the header/feed and hides the quote (both are driven
  // off the same scrollY value), this just needs to kick off the actual data refresh.
  const handlePullEnd = () => {
    if (!hasCrossedPullTriggerRef.current) return;
    hasCrossedPullTriggerRef.current = false;
    refetch();
    refetchMe();
  };

  const displayName = me?.firstName || me?.fullName?.trim().split(' ')[0] || 'there';
  // Shared with ProfileScreen (useDisplayAddress) so both show the exact same resolved
  // location instead of computing/displaying it differently.
  const displayAddress = useDisplayAddress(me);
  const avatarInitial = (me?.fullName ?? me?.email ?? '').trim().charAt(0).toUpperCase() || '?';

  const { data: notifications = [] } = useGetNotificationsQuery();
  const hasUnread = notifications.some((n) => !n.readAt);

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  const openCategory = (categoryKey: string) => {
    navigation.navigate('Search', { category: categoryKey });
  };

  // "View All Events" (bottom of the events sections) goes to the full Explore screen.
  const openExplore = () => {
    navigation.navigate('Explore' as never);
  };

  // "View All" on categories opens the half-screen interest-selection popup.
  const openInterestSheet = () => setShowInterestSheet(true);
  const closeInterestSheet = () => setShowInterestSheet(false);

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pullQuoteBanner, { paddingTop: insets.top, opacity: pullQuoteOpacity }]}
      >
        <Text style={styles.pullQuoteText} numberOfLines={2}>
          {pullQuote}
        </Text>
      </Animated.View>

      {/* Only the header rides the pull-down transform — the ScrollView's own native
          rubber-band bounce already displaces its content by the same amount on its own,
          so wrapping both in one transform double-applies the motion (header moves by
          pullDistance, content moves by pullDistance *and* its own bounce), which is what
          opened the gap between them. Keeping the transform on the header alone means both
          move by the same amount through independent, exactly-matching means. */}
      <Animated.View style={[styles.headerShift, { transform: [{ translateY: pullDistance }] }]}>
      <LinearGradient
        colors={[colors.brandPink, '#F43362']}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerBgWrap}>
          <Image source={bgImage} style={styles.headerBg} resizeMode="cover" />
        </View>
        {/* Row 1: greeting + address on the left, avatar on the right */}
        <View style={styles.headerTop}>
          <View style={styles.greetingCol}>
            <Text style={styles.greeting}>Welcome, {displayName} 👋</Text>
            <View style={styles.locationRow}>
              <LocationPin size={12} color="rgba(255,255,255,0.88)" />
              <Text style={styles.location} numberOfLines={1}>
                {displayAddress}
              </Text>
            </View>
          </View>
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

        {/* Row 2: search bar + notification bell */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.search}
            activeOpacity={0.95}
            onPress={() => navigation.navigate('Search')}
          >
            <Image
              source={require('../../../assets/location/search.png')}
              style={styles.searchImg}
              resizeMode="contain"
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search 'events'"
              placeholderTextColor="#aaa"
              editable={false}
            />
            <View style={styles.divider} />
            <TouchableOpacity style={styles.micBtn}>
              <SvgXml xml={micSvg} width={22} height={22} />
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate('Notifications')}
          >
            <NotificationBell unread={hasUnread} color="#000000" size={24} />
            {hasUnread && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollFlex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScroll={handleScroll}
        onScrollBeginDrag={handlePullStart}
        onScrollEndDrag={handlePullEnd}
        scrollEventThrottle={16}
        bounces
        overScrollMode="always"
      >
        {/* Full-bleed pink section that visually continues from the header,
            but lives inside the ScrollView so it scrolls with the page. */}
        {featured.length > 0 && (
          <LinearGradient
            colors={[colors.brandPink, '#ff6b8a']}
            style={styles.featuredWrap}
          >
            <View style={styles.featuredBgWrap}>
              <Image source={bgImage} style={styles.featuredBg} resizeMode="cover" />
            </View>
            <SectionHeader title="Featured Near You" light hideLine />
            <FeaturedCarousel
              cardWidth={SCREEN_WIDTH - spacing.sm * 2}
              events={featured.map((event) => ({
                id: event.id,
                title: event.title,
                date: event.date,
                location: event.venue,
                price: event.price,
                image: event.image,
                featured: event.featured,
              }))}
              onEventPress={(eventId) => openEvent(eventId)}
            />
          </LinearGradient>
        )}

        <SectionHeader title="Browse by Category" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((category) => (
            <CategoryIconCard key={category.key} item={category} onPress={openCategory} />
          ))}
          <ViewAllCategoryIconCard onPress={openInterestSheet} />
        </ScrollView>

        <SectionHeader title="Based on Interest" />
        {recommended.slice(0, 1).map((event) => (
          <EventInterestCard key={event.id} event={event as any} onPress={() => openEvent(event.id)} onRequireAuth={() => navigation.navigate('Auth' as never)} />
        ))}

        <SectionHeader title="Event Highlights" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {HIGHLIGHTS.map((item) => (
            <EventHighlightCard
              key={item.id}
              item={item}
              onPress={() =>
                (navigation.getParent() as { navigate: (a: string, b?: object) => void } | undefined)?.navigate(
                  'Main',
                  { screen: 'Shorts' },
                )
              }
            />
          ))}
        </ScrollView>

        <SectionHeader title="You Might Also Like" />
        {recommended.map((event) => (
          <EventInterestCard key={event.id} event={event as any} onPress={() => openEvent(event.id)} onRequireAuth={() => navigation.navigate('Auth' as never)} />
        ))}

        <TouchableOpacity style={styles.viewAllBtn} onPress={openExplore} activeOpacity={0.85}>
          <Text style={styles.viewAllText}>View All Events</Text>
          <Text style={styles.viewAllArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ⓡ All Rights Reserved. © Eventrix</Text>
        </View>
      </Animated.ScrollView>

     <HalfScreenModal visible={showInterestSheet} onClose={closeInterestSheet}>
      <InterestSelectionScreen
    mode="sheet"
    onComplete={closeInterestSheet}
    onDismiss={closeInterestSheet}
  />
</HalfScreenModal>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerShift: {
    flexShrink: 0,
  },
  scrollFlex: {
    flex: 1,
  },
  pullQuoteBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  pullQuoteText: {
    color: colors.brandPink,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute',
    top: -18,
    left: -68,
    width: '135%',
    height: '135%',
    transform: [{ scale: 0.78 }],
    opacity: 0.15,
  },
  headerBgWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  greetingCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  greeting: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  location: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchImg: {
    width: 20,
    height: 20,
    tintColor: '#aaa',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#E0E0E0',
  },
  micBtn: {
    padding: 2,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: colors.brandPink,
  },
  featuredWrap: {
    marginTop: -spacing.md,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  featuredBg: {
    position: 'absolute',
    top: -62,
    left: -80,
    width: '135%',
    height: '135%',
    transform: [{ scale: 0.78 }],
    opacity: 0.14,
  },
  featuredBgWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
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
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    borderRadius: 14,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  viewAllText: {
    color: colors.brandPink,
    fontWeight: '700',
    fontSize: 14,
  },
  viewAllArrow: {
    color: colors.brandPink,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default HomeScreen;