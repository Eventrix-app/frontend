import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MOCK_BOOKINGS, MOCK_EVENTS } from '../../data/mockEvents';
import GlassSurface from '../../components/common/GlassSurface';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentConfirmation'>;

const PaymentConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const event = MOCK_EVENTS.find((e) => e.id === route.params.eventId) ?? MOCK_EVENTS[0];
  const booking = MOCK_BOOKINGS.find((b) => b.eventId === event.id) ?? MOCK_BOOKINGS[0];
  const total = route.params.total ?? booking.totalPaid ?? event.price;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.content}>
        <View style={styles.successCircle}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>
          Your ticket has been booked successfully. A confirmation email has been sent.
        </Text>

        <GlassSurface style={styles.cardGlass} contentStyle={styles.card}>
          <Text style={styles.eventEmoji}>{event.image}</Text>
          <View style={styles.cardBody}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.meta}>📅 {event.date} · {event.time}</Text>
            <Text style={styles.meta}>📍 {event.venue}</Text>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Ticket ID</Text>
              <Text style={styles.rowValue}>{booking.qrCode}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Quantity</Text>
              <Text style={styles.rowValue}>{route.params.quantity ?? booking.quantity ?? 1}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total paid</Text>
              <Text style={styles.total}>{total}</Text>
            </View>
          </View>
        </GlassSurface>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionWrap}
          onPress={() => navigation.navigate('TicketDetails', { bookingId: booking.id })}
        >
          <GlassSurface style={styles.primaryBtn} contentStyle={styles.actionContent}>
            <Text style={styles.primaryText}>View Ticket</Text>
          </GlassSurface>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionWrap}
          onPress={() => navigation.navigate('Main', { screen: 'Bookings' })}
        >
          <GlassSurface style={styles.secondaryBtn} contentStyle={styles.actionContent}>
            <Text style={styles.secondaryText}>Go to My Bookings</Text>
          </GlassSurface>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
    paddingHorizontal: spacing.md,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  check: {
    fontSize: 36,
    color: colors.white,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  cardGlass: {
    borderRadius: borderRadius.lg,
    marginHorizontal: 0,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  eventEmoji: {
    fontSize: 48,
  },
  cardBody: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandPink,
  },
  actions: {
    gap: spacing.sm,
  },
  actionWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  primaryBtn: {
    borderRadius: borderRadius.md,
  },
  actionContent: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderRadius: borderRadius.md,
  },
  secondaryText: {
    color: colors.brandPink,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentConfirmationScreen;
