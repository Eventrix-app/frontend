import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Dimensions, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { SvgXml } from 'react-native-svg';
import FeaturedCarousel from '../../components/events/FeaturedCarousel';
import { CategoryIconCard, CATEGORIES, ViewAllCategoryIconCard } from '../../components/events/CategoryIconCard';
import { EventInterestCard } from '../../components/events/EventInterestCard';
import { EventHighlightCard, HighlightItem } from '../../components/events/EventHighlightCard';
import { SectionHeader } from '../../components/events/SectionHeader';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import InterestSelectionScreen from '../interestselection/InterestSelectionScreen';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '../../store';
import { syncOnboardingDraft } from '../../utils/syncOnboardingDraft';
import { useGetEventsQuery } from '../../store/services/eventsApi';
import { useGetMeQuery } from '../../store/services/userApi';
import { toCardEvent } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';

const bgImage = require('../../../assets/bg.png');

const micSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#888"><path d="M395-435q-35-35-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35q-50 0-85-35Zm85-205Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm68.5-371.5Q520-503 520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480q17 0 28.5-11.5Z"/></svg>`;

const notificationSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/></svg>`;

const notificationUnreadSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80Zm0-420ZM160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v13q-11 22-16 45t-4 47q-10-2-19.5-3.5T480-720q-66 0-113 47t-47 113v280h320v-257q18 8 38.5 12.5T720-520v240h80v80H160Zm475-435q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Z"/></svg>`;

const SCREEN_WIDTH = Dimensions.get('window').width;

const DEFAULT_AVATAR = require('../../../assets/profile/avatar-placeholder.png');

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
  const [accessedAddress, setAccessedAddress] = useState<string | null>(null);

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

  const { data: events = [] } = useGetEventsQuery({ limit: 100 });
  const { data: me } = useGetMeQuery();
  const cardEvents = events.map(toCardEvent);
  const featured = cardEvents.filter((event) => event.featured);
  const recommended = cardEvents;

  // Turns the coordinates captured during onboarding's location-access step (persisted on
  // the user's account, GET /users/me) into a real, human-readable address — replaces the
  // previous hardcoded placeholder string. No new location permission prompt needed here:
  // this only reverse-geocodes coordinates already on file, it doesn't read live GPS.
  useEffect(() => {
    let cancelled = false;
    if (me?.latitude == null || me?.longitude == null) {
      setAccessedAddress(null);
      return;
    }
    const { latitude, longitude } = me;

    // expo-location's reverseGeocodeAsync has no web implementation at all — it always
    // throws there (see expo-location/src/ExpoLocation.web.ts) — and some Android devices
    // ship without a native Geocoder either. Nominatim's reverse endpoint is a plain HTTP
    // call, so it works the same everywhere; same API LocationAccessScreen already uses
    // for forward geocoding of a manually-typed city.
    const reverseGeocodeViaNominatim = async (): Promise<string | null> => {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Eventrix/1.0 (eventrix-app)' } });
      const data = await res.json();
      const address = data?.address ?? {};
      const parts = [
        address.suburb || address.city_district || address.neighbourhood,
        address.city || address.town || address.village || address.county,
      ].filter((part): part is string => !!part);
      return parts.length > 0 ? parts.join(', ') : address.state ?? null;
    };

    Location.reverseGeocodeAsync({ latitude, longitude })
      .then((results) => {
        if (cancelled) return null;
        const first = results[0];
        const parts = [first?.district || first?.subregion, first?.city].filter(
          (part): part is string => !!part,
        );
        const resolved = parts.length > 0 ? parts.join(', ') : first?.region ?? null;
        if (resolved) return resolved;
        return reverseGeocodeViaNominatim();
      })
      .catch(() => (cancelled ? null : reverseGeocodeViaNominatim().catch(() => null)))
      .then((resolved) => {
        if (!cancelled && resolved !== null) setAccessedAddress(resolved);
      });
    return () => {
      cancelled = true;
    };
  }, [me?.latitude, me?.longitude]);

  const displayName = me?.firstName || me?.fullName?.trim().split(' ')[0] || 'there';
  const displayAddress = accessedAddress || me?.city || 'Add your location';

  // TODO: replace with real unread count from notification context/API
  const hasUnread = true;

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  const openCategory = (categoryKey: string) => {
    navigation.navigate('Search', { category: categoryKey } as never);
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
            <Text style={styles.location} numberOfLines={1}>
              📍 {displayAddress}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image
              source={me?.profilePictureUrl ? { uri: me.profilePictureUrl } : DEFAULT_AVATAR}
              style={styles.avatarImg}
            />
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
            <SvgXml
              xml={hasUnread ? notificationUnreadSvg : notificationSvg}
              width={24}
              height={24}
            />
            {hasUnread && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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
          <EventInterestCard key={event.id} event={event as any} onPress={() => openEvent(event.id)} />
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
          <EventInterestCard key={event.id} event={event as any} onPress={() => openEvent(event.id)} />
        ))}

        <TouchableOpacity style={styles.viewAllBtn} onPress={openExplore} activeOpacity={0.85}>
          <Text style={styles.viewAllText}>View All Events</Text>
          <Text style={styles.viewAllArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ⓡ All Rights Reserved. © Eventrix</Text>
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
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
  greeting: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  location: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    marginTop: 2,
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