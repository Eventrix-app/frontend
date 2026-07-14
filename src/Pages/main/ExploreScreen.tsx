import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EventInterestCard } from '../../components/events/EventInterestCard';
import { SectionHeader } from '../../components/events/SectionHeader';
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

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

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

      {/* Inline filter pills — no external component dependency */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {FILTER_OPTIONS.map((option) => {
          const active = filter === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilter(option.id)}
            >
              <Text style={styles.pillIcon}>{option.icon}</Text>
              <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SectionHeader title="All Events" />
        {MOCK_EVENTS.map((event) => (
          <EventInterestCard key={event.id} event={event as any} onPress={() => openEvent(event.id)} />
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
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  filterIcon: {
    fontSize: 16,
  },
   pillsRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#EDEDED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillActive: {
    backgroundColor: colors.brandPink,
    borderColor: colors.brandPink,
    shadowColor: colors.brandPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pillIcon: {
    fontSize: 15,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  pillLabelActive: {
    color: colors.white,
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