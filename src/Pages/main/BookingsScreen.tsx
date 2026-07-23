import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { EnrollmentRecord, useGetMyEnrollmentsQuery, useGetMyWaitlistQuery } from '../../store/services/eventsApi';
import { useGetNotificationsQuery } from '../../store/services/notificationsApi';
import { useGetMeQuery } from '../../store/services/userApi';
import { formatEventDate, formatEventTime } from '../../utils/eventCardAdapter';
import { getEventStartDateTime } from '../../utils/eventDateTime';
import { Text } from '../../components/common/Text';
import { NotificationBell } from '../../components/common/Icons';
import BookingListSkeleton from '../../components/common/BookingListSkeleton';

type TabId = 'upcoming' | 'previous' | 'waitlist' | 'cancelled';

const TABS: { id: TabId; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'previous', label: 'Previous' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'cancelled', label: 'Cancelled' },
];

function bucketFor(enrollment: EnrollmentRecord): TabId {
  if (enrollment.status === 'cancelled' || enrollment.status === 'refunded') return 'cancelled';
  const event = enrollment.event;
  const eventStart = event?.eventDate && event?.startTime ? getEventStartDateTime(event) : null;
  if (eventStart && eventStart.getTime() < Date.now()) return 'previous';
  return 'upcoming';
}

// Paid/unpaid text color, matching the reference's inline colored status word
// rather than a background chip.
function statusDisplayFor(enrollment: EnrollmentRecord): { label: string; color: string } {
  if (enrollment.status === 'refunded') return { label: 'Refunded', color: '#3730A3' };
  if (enrollment.status === 'cancelled') return { label: 'Cancelled', color: '#991B1B' };
  if (enrollment.paymentStatus && enrollment.paymentStatus !== 'paid') {
    return { label: 'Unpaid', color: '#B45309' };
  }
  const amount = enrollment.totalAmount != null ? ` ₹${enrollment.totalAmount}` : '';
  return { label: `Paid${amount}`, color: '#059669' };
}

// Ticket-stub shaped card, built with plain Views instead of a background image —
// the "notches" are circles positioned at the card's left/right edges, colored to
// match the screen background so they read as cutouts.
const TicketCard: React.FC<{ children: React.ReactNode; styles: ReturnType<typeof createStyles> }> = ({
  children,
  styles,
}) => (
  <View style={styles.card}>
    {children}
    <View style={styles.notchLeft} />
    <View style={styles.notchRight} />
  </View>
);

const BookingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<TabId>('upcoming');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const { data: notifications = [] } = useGetNotificationsQuery();
  const hasUnread = notifications.some((n) => !n.readAt);
  const { data: me } = useGetMeQuery();
  const avatarInitial = (me?.fullName ?? me?.email ?? '').trim().charAt(0).toUpperCase() || '?';

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

  // Decorative "new" dot per tab, purely visual to match the reference —
  // shows on a non-active tab if it currently has at least one item.
  const dotForTab = (tabId: TabId): boolean => {
    if (tabId === activeTab) return false;
    if (tabId === 'waitlist') return waitingEntries.length > 0;
    return enrollments.some((e) => bucketFor(e) === tabId);
  };

  const resultsCount = isWaitlistTab ? waitingEntries.length : bookings.length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Bookings</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
            <Image
              source={require('../../../assets/location/search.png')}
              style={styles.searchIconImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <NotificationBell unread={hasUnread} color={colors.brandPink} size={22} />
            {hasUnread && <View style={styles.bellDot} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            {me?.profilePictureUrl ? (
              <Image source={{ uri: me.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <View style={styles.tabLabelRow}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                {dotForTab(tab.id) && <View style={styles.tabDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <BookingListSkeleton />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {isWaitlistTab ? "Couldn't load your waitlist" : "Couldn't load your bookings"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isWaitlistTab ? (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            {waitingEntries.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No waitlist entries</Text>
                <Text style={styles.emptySub}>You'll see it here when you join a sold-out ticket's waitlist</Text>
              </View>
            ) : (
              waitingEntries.map((entry) => {
                const event = entry.event;
                return (
                  <TicketCard key={entry.id} styles={styles}>
                    <Text style={styles.eventTitle}>{event?.title ?? 'Event'}</Text>

                    <View style={styles.infoRow}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                          {event ? formatEventDate(event.eventDate) : '—'}
                        </Text>
                      </View>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Ticket Type</Text>
                        <Text style={styles.infoValue}>
                          {entry.ticketType?.name ?? 'General Admission'} × {entry.quantity}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stubDivider} />

                    <View style={styles.footerRow}>
                      <Text style={styles.footerLabel}>
                        Status: <Text style={{ color: '#B45309', fontWeight: '700' }}>#{entry.position} in line</Text>
                      </Text>
                    </View>
                  </TicketCard>
                );
              })
            )}
          </ScrollView>
          {waitingEntries.length > 0 && (
            <Text style={styles.resultsText}>
              {resultsCount} result{resultsCount === 1 ? '' : 's'} found
            </Text>
          )}
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            {bookings.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
                <Text style={styles.emptySub}>
                  {activeTab === 'upcoming'
                    ? 'Book an event to see your tickets here'
                    : 'Nothing to show in this tab yet'}
                </Text>
              </View>
            ) : (
              bookings.map((booking) => {
                const status = statusDisplayFor(booking);
                const event = booking.event;
                return (
                  <TicketCard key={booking.id} styles={styles}>
                    <Text style={styles.eventTitle}>{event?.title ?? 'Event'}</Text>

                    <View style={styles.infoRow}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                          {event ? formatEventDate(event.eventDate) : '—'}
                        </Text>
                      </View>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Ticket Type</Text>
                        <Text style={styles.infoValue}>
                          {booking.ticketType?.name ?? 'General Admission'}
                          {booking.quantity != null ? ` × ${booking.quantity}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stubDivider} />

                    <View style={styles.footerRow}>
                      <Text style={styles.footerLabel}>
                        Status: <Text style={{ color: status.color, fontWeight: '700' }}>{status.label}</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.viewTicketBtn}
                        onPress={() => navigation.navigate('TicketDetails', { bookingId: booking.id })}
                      >
                        <Text style={styles.viewTicketText}>View Ticket</Text>
                        <Text style={styles.viewTicketArrow}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </TicketCard>
                );
              })
            )}
          </ScrollView>
          {bookings.length > 0 && (
            <Text style={styles.resultsText}>
              {resultsCount} result{resultsCount === 1 ? '' : 's'} found
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    color: colors.text,
    fontFamily: 'ZalandoSansExpanded_700Bold',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 20,
    color: colors.text,
  },
  searchIconImg: {
    width: 20,
    height: 20,
    tintColor: colors.text,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
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
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.brandPink,
    fontWeight: '600',
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  scroll: {
    paddingBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'ZalandoSansExpanded_600SemiBold',
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
  borderColor: '#D1D5DB',   // was colors.borderLight — darker, more visible border
  borderRadius: borderRadius.lg,
  padding: spacing.md,
  backgroundColor: colors.white,
  marginBottom: spacing.md,
  position: 'relative',
  overflow: 'visible',
},
notchLeft: {
  position: 'absolute',
  left: -10,
  top: '58%',
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: '#D1D5DB',   // match the new card border color
},
 notchRight: {
  position: 'absolute',
  right: -10,
  top: '58%',
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: '#D1D5DB',   // match the new card border color
},
  eventTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'ZalandoSansExpanded_700Bold',
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  // Approximates a ticket-stub perforation. borderStyle: 'dashed' renders correctly on iOS
  // and web, but Android's dashed border support is inconsistent — if it renders solid on
  // Android, swap this for a row of small dot Views instead.
 stubDivider: {
  borderTopWidth: 1.5,        // was 1 — slightly thicker
  borderStyle: 'dashed',
  borderTopColor: '#9CA3AF',  // was colors.borderLight — noticeably darker grey
  marginVertical: spacing.sm,
},
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  viewTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewTicketText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandPink,
  },
  viewTicketArrow: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandPink,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});

export default BookingsScreen;