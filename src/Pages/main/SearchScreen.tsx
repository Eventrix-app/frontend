import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainEventCard } from '../../components/events/MainEventCard';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { MOCK_RECENT_SEARCHES } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { usePaginatedEvents } from '../../hooks/usePaginatedEvents';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { toCardEvent } from '../../utils/eventCardAdapter';
import { useGetCategoriesQuery } from '../../store/services/userApi';
import { Text } from '../../components/common/Text';
import Noevents from '../../components/common/Noevents';
import EventListSkeleton from '../../components/common/EventListSkeleton';
import { SearchIcon, WarningIcon, ClockIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const SearchScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { data: categories = [] } = useGetCategoriesQuery();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Pre-selects the category chip when arriving from a category tap on Home/Explore
  // (navigation.navigate('Search', { category })) — the route param is a category *name*
  // (lowercased, e.g. 'music'), resolved below to a real categoryId once categories load.
  const routeCategoryName = route.params?.category ?? null;
  const [categoryId, setCategoryId] = useState<string | null>(null);
  useEffect(() => {
    if (!routeCategoryName || categoryId || categories.length === 0) return;
    const match = categories.find((c) => c.name.toLowerCase() === routeCategoryName);
    if (match) setCategoryId(match.id);
  }, [routeCategoryName, categories, categoryId]);

  // Debounced so typing doesn't fire a request per keystroke; the trimmed, settled value is
  // sent to the backend so search runs over the full catalog, not just already-loaded pages.
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  // Category now goes through the same server-side param as search (GET /events?categoryId=)
  // instead of filtering only the already-loaded page — previously "load more" while a
  // category was selected silently returned thin/incomplete results.
  const { events, loadMore, isLoading, isFetchingMore, isError, refetch } = usePaginatedEvents({
    search: debouncedQuery || undefined,
    categoryId: categoryId ?? undefined,
  });
  const results = useMemo(() => events.map((event) => toCardEvent(event)), [events]);

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Search" onBack={() => navigation.goBack()} />

      <View style={styles.searchGlass}>
        <View style={styles.searchWrap}>
          <SearchIcon color={colors.textSecondary} size={18} />
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
        </View>
      </View>

      <ScrollView
        horizontal
        style={styles.categoriesScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        <TouchableOpacity
          style={styles.chipWrap}
          onPress={() => setCategoryId(null)}
        >
          <View style={[styles.chipGlass, !categoryId && styles.chipActive]}>
            <View style={styles.chipContent}>
              <Text style={[styles.chipText, !categoryId && styles.chipTextActive]}>All</Text>
            </View>
          </View>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.chipWrap}
            onPress={() => setCategoryId((prev) => (prev === cat.id ? null : cat.id))}
          >
            <View style={[styles.chipGlass, categoryId === cat.id && styles.chipActive]}>
              <View style={styles.chipContent}>
                <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <EventListSkeleton />
      ) : isError ? (
        <View style={styles.empty}>
          <WarningIcon color={colors.textSecondary} size={48} />
          <Text style={styles.emptyTitle}>Couldn't load events</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MainEventCard event={item} onPress={() => openEvent(item.id)} />
          )}
          contentContainerStyle={styles.scroll}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <>
              {!query && !categoryId ? (
                <>
                  <Text style={styles.sectionTitle}>Recent searches</Text>
                  <View style={styles.recentRow}>
                    {MOCK_RECENT_SEARCHES.map((term) => (
                      <TouchableOpacity
                        key={term}
                        style={styles.recentChipWrap}
                        onPress={() => setQuery(term)}
                      >
                        <View style={styles.recentChip}>
                          <View style={styles.recentChipContent}>
                            <ClockIcon color={colors.textSecondary} size={13} />
                            <Text style={styles.recentText}>{term}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={styles.sectionTitle}>
                {results.length} result{results.length === 1 ? '' : 's'}
              </Text>
            </>
          }
          ListEmptyComponent={
            <Noevents
              inline
              subtitle={query ? `No events matching "${query}"` : 'Try a different keyword or category'}
            />
          }
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator style={styles.loadMoreLoader} color={colors.brandPink} /> : null
          }
        />
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  searchGlass: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
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
    flexGrow: 0,
    flexShrink: 0,
  },
  categories: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
    backgroundColor: colors.white,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
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
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
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
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  recentChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  loadMoreLoader: {
    marginVertical: spacing.md,
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