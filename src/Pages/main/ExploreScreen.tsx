import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeaturedCarousel from '../../components/events/FeaturedCarousel';
import { CategoryIconCard, CATEGORIES, ViewAllCategoryIconCard } from '../../components/events/CategoryIconCard';
import { EventInterestCard } from '../../components/events/EventInterestCard';
import { SectionHeader } from '../../components/events/SectionHeader';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import InterestSelectionScreen from '../interestselection/InterestSelectionScreen';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useGetEventsQuery } from '../../store/services/eventsApi';
import { toCardEvent } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';
import NoEvents from '../../components/common/Noevents';

const FILTER_CHIPS = [
  { id: 'date', label: 'Date' },
  { id: 'price', label: 'Price' },
  { id: 'distance', label: 'Distance' },
  { id: 'category', label: 'Category' },
];

// TODO: source from user profile / auth state instead of hardcoding
const CURRENT_USER_AVATAR = require('../../../assets/profile/avatar-placeholder.png');
const hasUnread = true; // TODO: replace with real unread count from notification context/API

const ExploreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: events = [] } = useGetEventsQuery({ limit: 100 });
  const cardEvents = events.map(toCardEvent);
  const [showInterestSheet, setShowInterestSheet] = useState(false);

  const featuredCards = cardEvents.slice(0, 5).map((event) => ({
    id: event.id,
    title: event.title,
    date: (event as any).date,
    location: (event as any).venue,
    price: (event as any).price,
    image: (event as any).image,
    featured: true,
  }));

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  const openCategory = (categoryKey: string) => {
    navigation.navigate('Search', { category: categoryKey } as never);
  };

  const openInterestSheet = () => setShowInterestSheet(true);
  const closeInterestSheet = () => setShowInterestSheet(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar: back, title, search, bell, avatar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Explore</Text>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.iconText}>🔔</Text>
            {hasUnread && <View style={styles.bellDot} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image source={CURRENT_USER_AVATAR} style={styles.avatarImg} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown-style filter chips */}
      <ScrollView
        horizontal
        style={styles.chipsScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <TouchableOpacity style={styles.slidersBtn}>
          <Text style={styles.slidersIcon}>☰</Text>
        </TouchableOpacity>

        {FILTER_CHIPS.map((chip) => (
          <TouchableOpacity key={chip.id} style={styles.chip}>
            <Text style={styles.chipLabel}>{chip.label}</Text>
            <Text style={styles.chipChevron}>⌄</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cardEvents.length === 0 ? (
        <NoEvents
          onBack={() => navigation.goBack()}
          onGoHome={() => navigation.navigate('Home' as never)}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <SectionHeader title="Browse by Category" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((category) => (
              <CategoryIconCard key={category.key} item={category} onPress={openCategory} />
            ))}
            <ViewAllCategoryIconCard onPress={openInterestSheet} />
          </ScrollView>

          <SectionHeader title="You Might Also Like" />
          {cardEvents.map((event) => (
            <EventInterestCard key={event.id} event={event as any} onPress={() => openEvent(event.id)} />
          ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ⓡ All Rights Reserved. © Eventrix</Text>
          </View>
        </ScrollView>
      )}

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 17,
    color: colors.text,
    fontFamily: 'ZalandoSansExpanded_700Bold',
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
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
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
});

export default ExploreScreen;