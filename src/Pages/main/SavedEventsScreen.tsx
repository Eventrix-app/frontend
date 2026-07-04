import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainEventCard } from '../../components/events/MainEventCard';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { MOCK_EVENTS, MOCK_SAVED_EVENT_IDS } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedEvents'>;

const SavedEventsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const savedEvents = MOCK_EVENTS.filter((e) => MOCK_SAVED_EVENT_IDS.includes(e.id));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Saved Events" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {savedEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>❤️</Text>
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
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
    fontWeight: '600',
    color: colors.text,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

export default SavedEventsScreen;
