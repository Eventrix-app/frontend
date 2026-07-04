import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MOCK_EVENTS } from '../../data/mockEvents';
import GlassSurface from '../../components/common/GlassSurface';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetails'>;

const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const event = MOCK_EVENTS.find((e) => e.id === route.params.eventId) ?? MOCK_EVENTS[0];
  const [saved, setSaved] = useState(false);

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heroEmoji}>{event.image}</Text>
        <TouchableOpacity style={styles.save} onPress={() => setSaved((v) => !v)}>
          <Text>{saved ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <Text style={styles.category}>{event.category}</Text>
        <Text style={styles.title}>{event.title}</Text>

        <GlassSurface style={styles.infoGlass} contentStyle={styles.infoCard}>
          <Text style={styles.infoRow}>📍 {event.venue}</Text>
          <Text style={styles.infoRow}>👤 {event.organizer}</Text>
          <Text style={styles.infoRow}>📅 {event.date}</Text>
          <Text style={styles.infoRow}>🕐 {event.time}</Text>
          <Text style={styles.price}>{event.price}</Text>
        </GlassSurface>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>
          {event.description ??
            'Join us for an unforgettable experience. Book your spot before tickets sell out.'}
        </Text>

        <Text style={styles.sectionTitle}>Ticket types</Text>
        {['General Admission', 'VIP Pass', 'Group (4+)'].map((tier) => (
          <TouchableOpacity key={tier} style={styles.tierWrap}>
            <GlassSurface style={styles.tierGlass} contentStyle={styles.tier}>
              <View>
                <Text style={styles.tierName}>{tier}</Text>
                <Text style={styles.tierSub}>Includes entry + perks</Text>
              </View>
              <Text style={styles.tierPrice}>{event.price}</Text>
            </GlassSurface>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <GlassSurface style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]} contentStyle={styles.footerContent}>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('Checkout', { eventId: event.id })}
        >
          <Text style={styles.bookText}>Book Now</Text>
        </TouchableOpacity>
      </GlassSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
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
  backText: {
    color: colors.white,
    fontSize: 22,
  },
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
  heroEmoji: {
    fontSize: 80,
  },
  body: {
    flex: 1,
    marginTop: -24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
  },
  category: {
    color: colors.brandPink,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoGlass: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  infoCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  infoRow: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.brandPink,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  tierWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  tierGlass: {
    borderRadius: borderRadius.md,
  },
  tier: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  tierName: {
    fontWeight: '600',
    color: colors.text,
  },
  tierSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tierPrice: {
    fontWeight: '700',
    color: colors.brandPink,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    borderRadius: 0,
  },
  footerContent: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  bookBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventDetailsScreen;
