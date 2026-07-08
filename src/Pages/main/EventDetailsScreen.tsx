import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GlassSurface from '../../components/common/GlassSurface';
import { RootStackParamList } from '../../navigation/types';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useGetEventByIdQuery, useEnrollEventMutation } from '../../store/services/eventsApi';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetails'>;

const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const authUser = useSelector((state: RootState) => state.auth.user);

  const { data: event, isLoading } = useGetEventByIdQuery(route.params.eventId);
  const [enrollEvent, { isLoading: isEnrolling }] = useEnrollEventMutation();

  // Owner check: event.organizer.userId matches the logged-in user's id
  const isOwner = !!(event && authUser && (event as any).organizer?.userId === authUser.id);

  const handleEnroll = async () => {
    if (!authUser) { navigation.navigate('Auth'); return; }
    if (!event) return;
    try {
      await enrollEvent(event.id).unwrap();
      navigation.navigate('Bookings' as any);
    } catch (e: any) {
      // error handled by RTK Query
    }
  };

  if (isLoading || !event) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heroEmoji}>🎪</Text>
        <TouchableOpacity style={styles.save} onPress={() => setSaved((v) => !v)}>
          <Text>{saved ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Owner-only: rejection banner */}
        {isOwner && event.approvalStatus === 'rejected' && (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionTitle}>❌ Event Rejected</Text>
            {event.rejectionReason ? (
              <Text style={styles.rejectionReason}>{event.rejectionReason}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.resubmitBtn}
              onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })}
            >
              <Text style={styles.resubmitBtnText}>Edit & Resubmit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Owner-only: draft actions */}
        {isOwner && event.approvalStatus === 'draft' && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftTitle}>📝 Draft</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('CreateEvent', { eventId: event.id })}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Owner-only: ticket sales count for pending/approved */}
        {isOwner && (event.approvalStatus === 'pending_approval' || event.approvalStatus === 'approved') && (
          <View style={styles.salesBanner}>
            <Text style={styles.salesText}>
              {event.approvalStatus === 'pending_approval' ? '⏳ Pending Review' : '✅ Approved'}
            </Text>
            {event.totalCapacity != null && event.availableTickets != null && (
              <Text style={styles.salesCount}>
                🎫 {event.totalCapacity - event.availableTickets} / {event.totalCapacity} tickets sold
              </Text>
            )}
          </View>
        )}

        <Text style={styles.category}>{(event as any).category?.name ?? ''}</Text>
        <Text style={styles.title}>{event.title}</Text>

        <GlassSurface style={styles.infoGlass} contentStyle={styles.infoCard}>
          <Text style={styles.infoRow}>📍 {event.venueName}</Text>
          <Text style={styles.infoRow}>📅 {event.eventDate}</Text>
          <Text style={styles.infoRow}>🕐 {event.startTime}</Text>
          <Text style={styles.price}>
            {event.isPaid ? `₹${event.pricePerTicket}` : 'Free'}
          </Text>
        </GlassSurface>

        {event.description ? (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description}</Text>
          </>
        ) : null}

        {/* Refund policy — shown before booking button for paid events */}
        {event.isPaid && event.refundPolicyType && (
          <>
            <Text style={styles.sectionTitle}>Refund Policy</Text>
            <GlassSurface style={styles.refundGlass} contentStyle={styles.refundCard}>
              <Text style={styles.refundType}>{event.refundPolicyType.replace(/_/g, ' ')}</Text>
              {event.refundPolicyText ? (
                <Text style={styles.refundText}>{event.refundPolicyText}</Text>
              ) : null}
            </GlassSurface>
          </>
        )}
      </ScrollView>

      <GlassSurface style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]} contentStyle={styles.footerContent}>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.bookBtn, styles.manageBtn]}
              onPress={() => navigation.navigate('MyEvents')}
            >
              <Text style={styles.bookText}>Manage Event</Text>
            </TouchableOpacity>
            {event.approvalStatus === 'approved' && (
              <TouchableOpacity
                style={[styles.bookBtn, styles.checkInBtn]}
                onPress={() => navigation.navigate('CheckIn', { eventId: event.id })}
              >
                <Text style={styles.bookText}>Check In Attendees</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.bookBtn, (!event.isPaid || event.approvalStatus === 'approved') ? {} : styles.disabledBtn]}
            onPress={handleEnroll}
            disabled={isEnrolling || (event.isPaid && event.approvalStatus !== 'approved')}
          >
            {isEnrolling ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.bookText}>
                {event.isPaid && event.approvalStatus !== 'approved' ? 'Not Available' : 'Book Now'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  center: { justifyContent: 'center', alignItems: 'center' },
  hero: {
    height: 280,
    backgroundColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md + 44,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.white, fontSize: 22 },
  save: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md + 44,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 80 },
  body: {
    flex: 1,
    marginTop: -24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
  },
  rejectionBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  rejectionTitle: { fontWeight: '700', color: '#DC2626', fontSize: 15 },
  rejectionReason: { color: '#7F1D1D', fontSize: 13 },
  resubmitBtn: {
    marginTop: spacing.sm,
    backgroundColor: '#DC2626',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  resubmitBtnText: { color: colors.white, fontWeight: '600' },
  draftBanner: {
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftTitle: { fontWeight: '600', color: colors.text },
  editBtn: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  editBtnText: { color: colors.white, fontWeight: '600' },
  salesBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  salesText: { fontWeight: '600', color: '#065F46' },
  salesCount: { fontSize: 13, color: '#047857' },
  category: { color: colors.brandPink, fontWeight: '600', fontSize: 13, marginBottom: spacing.xs },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  infoGlass: { borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  infoCard: { gap: spacing.sm, padding: spacing.md },
  infoRow: { fontSize: 14, color: colors.textSecondary },
  price: { fontSize: 20, fontWeight: '700', color: colors.brandPink, marginTop: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  description: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  refundGlass: { borderRadius: borderRadius.md, marginBottom: spacing.md },
  refundCard: { padding: spacing.md, gap: 4 },
  refundType: { fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  refundText: { fontSize: 13, color: colors.textSecondary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, borderRadius: 0 },
  footerContent: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  bookBtn: { backgroundColor: colors.brandPink, borderRadius: borderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  manageBtn: { backgroundColor: colors.text },
  checkInBtn: { backgroundColor: '#059669', marginTop: spacing.sm },
  ownerActions: { gap: 0 },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  bookText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default EventDetailsScreen;
