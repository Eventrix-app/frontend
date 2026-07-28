import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import HalfScreenModal from '../common/halfscreenmodal';
import { Text } from '../common/Text';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetMyEnrollmentsQuery } from '../../store/services/eventsApi';
import { formatEventDate } from '../../utils/eventCardAdapter';
import SimpleListSkeleton from '../common/SimpleListSkeleton';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
};

// Every reel is scoped to an event (RecordReel requires an eventId, and the backend's
// createShort rejects a payload without one), so entering the flow from the Shorts tab —
// which has no event context of its own — needs this intermediate pick. Entering from
// EventDetails' gallery skips it entirely, since that screen already knows the event.
//
// The list is the user's own enrollments rather than all events: a reel is a recap of
// something you actually attended, and scoping it this way also means the picker cannot
// offer an event the uploader has no connection to.
export const CreateReelSheet: React.FC<Props> = ({ visible, onClose, onSelectEvent }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // skip while closed so opening the Shorts tab doesn't fire a request the user may never
  // need — the sheet is opt-in from a button, not part of the feed's own load.
  const { data: enrollments = [], isLoading, isError } = useGetMyEnrollmentsQuery(undefined, {
    skip: !visible,
  });

  // An enrollment carries its event eager-loaded (relations: ['event', 'ticketType']), but
  // the same event can appear more than once if the user booked it repeatedly, so dedupe.
  const events = useMemo(() => {
    const seen = new Map<string, { id: string; title: string; date?: string }>();
    for (const enrollment of enrollments) {
      const event = enrollment.event;
      if (!event || seen.has(event.id)) continue;
      seen.set(event.id, { id: event.id, title: event.title, date: event.eventDate });
    }
    return [...seen.values()];
  }, [enrollments]);

  return (
    <HalfScreenModal visible={visible} onClose={onClose} heightPercent={0.6}>
      <View style={styles.root}>
        <Text style={styles.title}>Create a reel</Text>
        <Text style={styles.subtitle}>Pick the event this reel is about</Text>

        {isLoading ? (
          <SimpleListSkeleton count={4} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Couldn't load your events. Please try again.</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              You haven't booked any events yet. Book one to share a reel about it.
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.row}
                activeOpacity={0.8}
                onPress={() => onSelectEvent(event.id)}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{event.title}</Text>
                  {event.date ? <Text style={styles.rowDate}>{formatEventDate(event.date)}</Text> : null}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </HalfScreenModal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.textSecondary },
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
