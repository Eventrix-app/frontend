import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeaturedCarousel from '../../components/events/FeaturedCarousel';
import FilterPills from '../../components/events/FilterPills';
import { MainEventCard } from '../../components/events/MainEventCard';
import { SectionHeader } from '../../components/events/SectionHeader';
import { CategoryScroller } from '../../components/events/CategoryScroller';
import { MOCK_EVENTS } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'weekend', label: 'Weekend', icon: '🎉' },
  { id: 'free', label: 'Free', icon: '🆓' },
  { id: 'nearby', label: 'Nearby', icon: '📍' },
];

const ExploreScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState('all');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.kicker}>Discover</Text>
          <Text style={styles.title}>Explore events</Text>
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.filterIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      <FilterPills options={FILTER_OPTIONS} selected={filter} onSelect={setFilter} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <SectionHeader title="Featured" />
        <FeaturedCarousel
          events={MOCK_EVENTS.map((event) => ({
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.venue,
            price: event.price,
            image: event.image,
            featured: event.featured,
          }))}
          onEventPress={(eventId) => navigation.navigate('EventDetails', { eventId })}
        />

        <SectionHeader title="Browse by Category" />
        <CategoryScroller />

        <SectionHeader title="Trending near you" />
        {MOCK_EVENTS.map((event) => (
          <MainEventCard
            key={event.id}
            event={event}
            onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ⓡ All Rights Reserved. © Eventrix</Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.brandPink,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  filterIcon: {
    fontSize: 16,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
