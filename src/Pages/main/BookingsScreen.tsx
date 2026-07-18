import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { EnrollmentRecord, useGetMyEnrollmentsQuery, useGetMyWaitlistQuery } from '../../store/services/eventsApi';
import { formatEventDate, formatEventTime } from '../../utils/eventCardAdapter';
import { Text } from '../../components/common/Text';

type TabId = 'upcoming' | 'previous' | 'cancelled' | 'waitlist';

const TABS: { id: TabId; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'previous', label: 'Previous' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: '#D1FAE5', text: '#065F46', label: 'Confirmed' },
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending Payment' },
  completed: { bg: '#E0E7FF', text: '#3730A3', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
  refunded: { bg: '#E0E7FF', text: '#3730A3', label: 'Refunded' },
};

function bucketFor(enrollment: EnrollmentRecord): TabId {
  if (enrollment.status === 'cancelled' || enrollment.status === 'refunded') return 'cancelled';
  const eventDate = enrollment.event?.eventDate ? new Date(enrollment.event.eventDate) : null;
  if (eventDate && eventDate.getTime() < Date.now()) return 'previous';
  return 'upcoming';
}

function statusKeyFor(enrollment: EnrollmentRecord): string {
  if (enrollment.status === 'refunded') return 'refunded';
  if (enrollment.status === 'cancelled') return 'cancelled';
  if (enrollment.paymentStatus && enrollment.paymentStatus !== 'paid') return 'pending';
  return bucketFor(enrollment) === 'previous' ? 'completed' : 'confirmed';
}

const BookingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<TabId>('upcoming');
  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments,
    isError: isErrorEnrollments,
    refetch: refetchEnrollments,
  } = useGetMyEnrollmentsQuery();
  const {
    data: waitlistEntries = [],
    isLoading: isLoadingWaitlist,
    isError: isErrorWaitlist,
    refetch: refetchWaitlist,
  } = useGetMyWaitlistQuery();

  const isWaitlistTab = activeTab === 'waitlist';
  const isLoading = isWaitlistTab ? isLoadingWaitlist : isLoadingEnrollments;
  const isError = isWaitlistTab ? isErrorWaitlist : isErrorEnrollments;
  const refetch = isWaitlistTab ? refetchWaitlist : refetchEnrollments;

  const bookings = useMemo(
    () => enrollments.filter((e) => bucketFor(e) === activeTab),
    [enrollments, activeTab],
  );
  // Promoted/expired/cancelled entries have moved on — a promoted one now shows up as a
  // real enrollment in Upcoming, so only entries still actually queued belong here.
  const waitingEntries = useMemo(
    () => waitlistEntries.filter((w) => w.status === 'waiting'),
    [waitlistEntries],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Text style={styles.title}>My Bookings</Text>
      <Text style={styles.subtitle}>Your tickets and wallet</Text>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.brandPink} />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>
            {isWaitlistTab ? "Couldn't load your waitlist" : "Couldn't load your bookings"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isWaitlistTab ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {waitingEntries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⏳</Text>
              <Text style={styles.emptyTitle}>No waitlist entries</Text>
              <Text style={styles.emptySub}>You'll see it here when you join a sold-out ticket's waitlist</Text>
            </View>
          ) : (
            waitingEntries.map((entry) => {
              const event = entry.event;
              return (
                <View key={entry.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.eventTitle}>{event?.title ?? 'Event'}</Text>
                    <View style={[styles.status, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.statusText, { color: '#92400E' }]}>#{entry.position} in line</Text>
                    </View>
                  </View>
                  {event ? (
                    <>
                      <Text style={styles.meta}>📅 {formatEventDate(event.eventDate)} · {formatEventTime(event.startTime)}</Text>
                      <Text style={styles.meta}>📍 {event.venueName}</Text>
                    </>
                  ) : null}
                  <Text style={styles.ticketType}>
                    {entry.ticketType?.name ?? 'General Admission'} · Qty {entry.quantity}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {bookings.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'upcoming'
                  ? 'Book an event to see your tickets here'
                  : 'Nothing to show in this tab yet'}
              </Text>
            </View>
          ) : (
            bookings.map((booking) => {
              const statusKey = statusKeyFor(booking);
              const status = STATUS_STYLE[statusKey];
              const event = booking.event;
              return (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('TicketDetails', { bookingId: booking.id })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.eventTitle}>{event?.title ?? 'Event'}</Text>
                    <View style={[styles.status, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  {event ? (
                    <>
                      <Text style={styles.meta}>📅 {formatEventDate(event.eventDate)} · {formatEventTime(event.startTime)}</Text>
                      <Text style={styles.meta}>📍 {event.venueName}</Text>
                    </>
                  ) : null}
                  <Text style={styles.ticketType}>{booking.ticketType?.name ?? 'General Admission'}</Text>

                  {booking.status !== 'cancelled' && booking.ticketCode ? (
                    <View style={styles.qrSection}>
                      <View style={styles.qrBox}>
                        <Text style={styles.qrPlaceholder}>▦▦▦</Text>
                      </View>
                      <View style={styles.qrInfo}>
                        <Text style={styles.qrLabel}>Booking Ref</Text>
                        <Text style={styles.qrCode}>{booking.bookingReference}</Text>
                        <Text style={styles.viewTicket}>Tap to view full ticket →</Text>
                      </View>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 20,
    color: '#0D0D0D',
    marginTop: spacing.md,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.pill,
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.brandPink,
    fontWeight: '600',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 15,
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  status: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandPink,
    marginVertical: spacing.sm,
  },
  qrSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  qrBox: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  qrInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  qrLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  qrCode: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  viewTicket: {
    fontSize: 13,
    color: colors.brandPink,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});

export default BookingsScreen;
