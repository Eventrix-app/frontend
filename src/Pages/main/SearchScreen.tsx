import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { usePaginatedEvents } from '../../hooks/usePaginatedEvents';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import { toCardEvent } from '../../utils/eventCardAdapter';
import { useGetCategoriesQuery } from '../../store/services/userApi';
import { Text } from '../../components/common/Text';
import Noevents from '../../components/common/Noevents';
import EventListSkeleton from '../../components/common/EventListSkeleton';
import SlowNetworkNotice from '../../components/common/SlowNetworkNotice';
import { useSlowNetwork } from '../../hooks/useSlowNetwork';
import { SearchIcon, WarningIcon, ClockIcon, MicIcon } from '../../components/common/Icons';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import VoiceListeningDialog from '../../components/common/VoiceListeningDialog';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const CHIP_ICON_SIZE = 20;

const SearchScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  // Seeded from voice search on Home, whose search bar is only a button.
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  // Both write into the box: interim results make dictation appear word by word, and the
  // final one replaces them with the recogniser's settled wording.
  const voice = useVoiceSearch({ onResult: setQuery, onPartial: setQuery });
  // Snapshot taken when dictation starts, so cancelling restores whatever was typed rather
  // than leaving a half-heard phrase behind.
  const queryBeforeVoice = useRef('');
  const { data: categories = [] } = useGetCategoriesQuery();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Pre-selects the category chip when arriving from a category tap on Home/Explore
  // (navigation.navigate('Search', { categoryId })).
  const [categoryId, setCategoryId] = useState<string | null>(route.params?.categoryId ?? null);

  // Debounced so typing doesn't fire a request per keystroke; the trimmed, settled value is
  // sent to the backend so search runs over the full catalog, not just already-loaded pages.
  const debouncedQuery = useDebouncedValue(query.trim(), 400);

  // Held back while dictating so each interim word is shown but not searched on — otherwise
  // "rock festival" fires a request for "rock" first and the list churns mid-sentence.
  const [searchTerm, setSearchTerm] = useState(debouncedQuery);
  useEffect(() => {
    if (!voice.isListening) setSearchTerm(debouncedQuery);
  }, [debouncedQuery, voice.isListening]);

  // Category now goes through the same server-side param as search (GET /events?categoryId=)
  // instead of filtering only the already-loaded page — previously "load more" while a
  // category was selected silently returned thin/incomplete results.
  const { events, loadMore, isLoading, isFetchingMore, isError, refetch } = usePaginatedEvents({
    search: searchTerm || undefined,
    categoryId: categoryId ?? undefined,
  });
  const results = useMemo(() => events.map((event) => toCardEvent(event)), [events]);

  // Search is debounced by 400ms before it even fires, so a slow round trip on top of
  // that is exactly where a query feels like it silently did nothing.
  const { stage: slowStage } = useSlowNetwork(isLoading);

  // Real, device-local search history replacing the hardcoded sample terms.
  const { recent, addRecentSearch, clearRecentSearches } = useRecentSearches();
  // Recorded once the debounced term has actually been searched, not on every keystroke —
  // otherwise every prefix along the way ("m", "mu", "mus"…) would be stored as its own
  // entry and the list would fill with fragments of a single search.
  useEffect(() => {
    if (debouncedQuery) addRecentSearch(debouncedQuery);
  }, [debouncedQuery, addRecentSearch]);

  const openEvent = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          <TouchableOpacity
            onPress={() => {
              queryBeforeVoice.current = query;
              voice.start();
            }}
            hitSlop={8}
            accessibilityLabel="Search by voice"
          >
            <MicIcon color={colors.textSecondary} size={18} />
          </TouchableOpacity>
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
        {categories.map((cat) => {
          const isSelected = categoryId === cat.id;
          const icon = isSelected ? cat.iconUrl : undefined;
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.chipWrap}
              onPress={() => setCategoryId((prev) => (prev === cat.id ? null : cat.id))}
            >
              <View style={[styles.chipGlass, isSelected && styles.chipActive]}>
                <View style={[styles.chipContent, !!icon && styles.chipContentWithIcon]}>
                  {icon ? (
                    <View style={styles.chipIcon}>
                      <Image source={{ uri: icon }} style={styles.chipIconImage} resizeMode="contain" />
                    </View>
                  ) : null}
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <>
          <SlowNetworkNotice stage={slowStage} onRetry={refetch} style={styles.slowNotice} />
          <EventListSkeleton />
        </>
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
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <MainEventCard event={item} onPress={() => openEvent(item.id)} />
          )}
          contentContainerStyle={styles.scroll}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <>
              {!query && !categoryId && recent.length > 0 ? (
                <>
                  <View style={styles.recentHeaderRow}>
                    <Text style={styles.sectionTitle}>Recent searches</Text>
                    <TouchableOpacity onPress={clearRecentSearches} hitSlop={8}>
                      <Text style={styles.clearRecentText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.recentRow}>
                    {recent.map((term) => (
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

      <VoiceListeningDialog
        visible={voice.isListening}
        transcript={voice.partial}
        isSpeaking={voice.isSpeaking}
        onDone={voice.stop}
        onCancel={() => {
          voice.cancel();
          // The box was filling live, so abandoning has to put back what was there before.
          setQuery(queryBeforeVoice.current);
        }}
      />
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  slowNotice: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
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
  chipContentWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs ?? 6,
  },
  chipIcon: {
    width: CHIP_ICON_SIZE,
    height: CHIP_ICON_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
  },
  chipIconImage: {
    width: CHIP_ICON_SIZE,
    height: CHIP_ICON_SIZE,
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
  // Puts "Clear" on the same baseline as the section title, so the row keeps the title's
  // own vertical rhythm instead of adding a second stacked line above the chips.
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearRecentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandPink,
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