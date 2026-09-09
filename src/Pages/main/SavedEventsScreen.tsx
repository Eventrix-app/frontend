import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainEventCard } from '../../components/events/MainEventCard';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import HalfScreenModal from '../../components/common/halfscreenmodal';
import { useGetMyFavoritesQuery, useRemoveFavoriteMutation } from '../../store/services/eventsApi';
import { toCardEvent } from '../../utils/eventCardAdapter';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../../components/common/Text';
import EventListSkeleton from '../../components/common/EventListSkeleton';
import { HeartIcon, TrashIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedEvents'>;

const SavedEventsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data: favorites = [], isLoading } = useGetMyFavoritesQuery();
  const [removeFavorite, { isLoading: isRemoving }] = useRemoveFavoriteMutation();
  const savedEvents = useMemo(() => favorites.map((event) => toCardEvent(event)), [favorites]);

  // Which card's "..." menu is open, if any — a single shared bottom sheet rather than
  // one per card, closed by clearing this back to null.
  const [menuEventId, setMenuEventId] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const menuEventTitle = savedEvents.find((e) => e.id === menuEventId)?.title;

  const handleRemove = async () => {
    if (!menuEventId) return;
    const eventId = menuEventId;
    setMenuEventId(null);
    try {
      await removeFavorite(eventId).unwrap();
    } catch (e: any) {
      showAlert('Error', extractErrorMessage(e, 'Failed to remove from saved events'));
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Saved Events" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <EventListSkeleton />
      ) : (
      <ScrollView contentContainerStyle={styles.scroll}>
        {savedEvents.length === 0 ? (
          <View style={styles.empty}>
            <HeartIcon color={colors.textSecondary} size={56} />
            <Text style={styles.emptyTitle}>No saved events yet</Text>
            <Text style={styles.emptySub}>
              Tap the heart on any event to save it for later
            </Text>
          </View>
        ) : (
          savedEvents.map((event) => (
            <MainEventCard
              key={event.id}
              event={event}
              onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
              onMenuPress={() => setMenuEventId(event.id)}
            />
          ))
        )}
      </ScrollView>
      )}

      <HalfScreenModal visible={menuEventId !== null} onClose={() => setMenuEventId(null)} heightPercent={0.26}>
        <View style={styles.menuSheet}>
          {menuEventTitle ? (
            <Text style={styles.menuSheetTitle} numberOfLines={1}>{menuEventTitle}</Text>
          ) : null}
          <TouchableOpacity style={styles.menuRow} onPress={handleRemove} disabled={isRemoving}>
            {isRemoving ? (
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <>
                <TrashIcon color="#DC2626" size={16} />
                <Text style={styles.menuRowDestructiveText}>Remove from Saved</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => setMenuEventId(null)}>
            <Text style={styles.menuRowText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </HalfScreenModal>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 18,
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  menuSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  menuSheetTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  menuRowIcon: {
    fontSize: 16,
  },
  menuRowDestructiveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default SavedEventsScreen;
