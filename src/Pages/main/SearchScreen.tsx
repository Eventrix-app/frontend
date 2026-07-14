import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainEventCard } from '../../components/events/MainEventCard';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import GlassSurface from '../../components/common/GlassSurface';
import { CATEGORIES, MOCK_RECENT_SEARCHES } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetEventsQuery } from '../../store/services/eventsApi';
import { toCardEvent } from '../../utils/eventCardAdapter';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const { data: events = [], isLoading, isError, refetch } = useGetEventsQuery({});
  const cardEvents = useMemo(() => events.map(toCardEvent), [events]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cardEvents.filter((event) => {
      const matchesQuery =
        !q ||
        event.title.toLowerCase().includes(q) ||
        event.venue.toLowerCase().includes(q) ||
        event.category.toLowerCase().includes(q);
      const matchesCategory = !category || event.category.toLowerCase() === category;
      return matchesQuery && matchesCategory;
    });
  }, [cardEvents, query, category]);

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Search" onBack={() => navigation.goBack()} />

      <GlassSurface style={styles.searchGlass} contentStyle={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search events, venues, organizers..."
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </GlassSurface>

      <ScrollView
        horizontal
        style={styles.categoriesScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        <TouchableOpacity
          style={styles.chipWrap}
          onPress={() => setCategory(null)}
        >
          <GlassSurface style={[styles.chipGlass, !category && styles.chipActive]} contentStyle={styles.chipContent}>
            <Text style={[styles.chipText, !category && styles.chipTextActive]}>All</Text>
          </GlassSurface>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.chipWrap}
            onPress={() =>
              setCategory((prev) => (prev === cat.name.toLowerCase() ? null : cat.name.toLowerCase()))
            }
          >
            <GlassSurface
              style={[styles.chipGlass, category === cat.name.toLowerCase() && styles.chipActive]}
              contentStyle={styles.chipContent}
            >
              <Text
                style={[
                  styles.chipText,
                  category === cat.name.toLowerCase() && styles.chipTextActive,
                ]}
              >
                {cat.emoji} {cat.name}
              </Text>
            </GlassSurface>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!query && !category ? (
          <>
            <Text style={styles.sectionTitle}>Recent searches</Text>
            <View style={styles.recentRow}>
              {MOCK_RECENT_SEARCHES.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.recentChipWrap}
                  onPress={() => setQuery(term)}
                >
                  <GlassSurface style={styles.recentChip} contentStyle={styles.recentChipContent}>
                    <Text style={styles.recentText}>🕐 {term}</Text>
                  </GlassSurface>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brandPink} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>Couldn't load events</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {results.length} result{results.length === 1 ? '' : 's'}
            </Text>
            {results.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔎</Text>
                <Text style={styles.emptyTitle}>No events found</Text>
                <Text style={styles.emptySub}>Try a different keyword or category</Text>
              </View>
            ) : (
              results.map((event) => (
                <MainEventCard key={event.id} event={event} onPress={() => openEvent(event.id)} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  searchGlass: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  clear: {
    fontSize: 16,
    color: colors.textSecondary,
    padding: 4,
  },
  categoriesScroll: {
    maxHeight: 48,
    flexGrow: 0,
  },
  categories: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chipWrap: {
    marginRight: spacing.sm,
  },
  chipGlass: {
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  chipContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: 'rgba(244,51,98,0.16)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  recentChipWrap: {
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  recentChip: {
    borderRadius: borderRadius.pill,
  },
  recentChipContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recentText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default SearchScreen;
