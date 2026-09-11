import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetMyEventsQuery } from '../../store/services/eventsApi';
import { Text } from '../../components/common/Text';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import SimpleListSkeleton from '../../components/common/SimpleListSkeleton';
import { EventBusyIcon } from '../../components/common/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'MyEvents'>;

const STATUS_FILTERS = ['All', 'Draft', 'Pending', 'Approved', 'Rejected'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

// A plain module-level record can't read the themed `colors` object, so this is a function
// instead — called with `colors` at the render site where the hook value is in scope.
const statusBadgeColor = (status: string, colors: ReturnType<typeof useTheme>['colors']): string => {
  switch (status) {
    case 'pending_approval': return colors.warning;
    case 'approved': return colors.success;
    case 'rejected': return colors.error;
    default: return colors.textSecondary;
  }
};

const MyEventsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');
  const { data: events = [], isLoading } = useGetMyEventsQuery();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Re-filtering the whole list on every render meant each keystroke elsewhere on the
  // screen walked every event again; scoped to the inputs that actually change it.
  const filtered = useMemo(
    () => events.filter((e) => {
    if (activeFilter === 'All') return true;
    const map: Record<StatusFilter, string> = {
      All: '',
      Draft: 'draft',
      Pending: 'pending_approval',
      Approved: 'approved',
      Rejected: 'rejected',
    };
    return e.approvalStatus === map[activeFilter];
    }),
    [events, activeFilter],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="My Events"
        onBack={() => navigation.goBack()}
        rightAction={
          <View style={styles.headerActions}>
            {/* <TouchableOpacity style={styles.refundsBtn} onPress={() => navigation.navigate('RefundApproval')}>
              <Text style={styles.refundsBtnText}>Refunds</Text>
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateEvent', {})}>
              <Text style={styles.createBtnText}>+ Create</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, activeFilter === f && styles.pillActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <SimpleListSkeleton />
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <EventBusyIcon color={colors.textSecondary} size={56} />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptySubtitle}>Create your first event and it will appear here.</Text>
              <TouchableOpacity
                style={styles.emptyCreate}
                onPress={() => navigation.navigate('CreateEvent', {})}
              >
                <Text style={styles.emptyCreateText}>+ Create Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
              >
                <View style={styles.card}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{event.title}</Text>
                      <Text style={styles.cardDate}>{event.eventDate}</Text>
                    </View>
                    {event.status === 'cancelled' ? (
                      // Cancelling only flips `status`, not `approvalStatus` — an organizer's
                      // cancelled event would otherwise still show a green "approved" badge
                      // here with no indication it's been cancelled at all.
                      <View style={[styles.badge, { backgroundColor: colors.textSecondary }]}>
                        <Text style={styles.badgeText}>Event cancelled</Text>
                      </View>
                    ) : event.isCompleted ? (
                      <View style={[styles.badge, { backgroundColor: colors.textSecondary }]}>
                        <Text style={styles.badgeText}>Completed</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: statusBadgeColor(event.approvalStatus, colors) }]}>
                        <Text style={styles.badgeText}>{event.approvalStatus.replace('_', ' ')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  createBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  createBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  refundsBtn: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refundsBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  filterRow: { maxHeight: 48 },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  pillActive: { backgroundColor: colors.brandPink },
  pillText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.white },
  loader: { marginTop: spacing.xxl },
  scroll: { padding: spacing.md },
  empty: { alignItems: 'center', marginTop: spacing.xxl, gap: spacing.sm },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 260,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  emptyCreate: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyCreateText: { color: colors.white, fontWeight: '600' },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  cardDate: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, color: colors.white, fontWeight: '600', textTransform: 'capitalize' },
});

export default MyEventsScreen;
