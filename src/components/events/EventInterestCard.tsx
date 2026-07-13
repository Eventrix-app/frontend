import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

// Extend your real event type/mock data with these optional fields as the
// API/schema fills them in. Falls back to placeholder copy until then.
export interface InterestEvent {
  id: string;
  title: string;
  image: any;
  price: number | string;
  venue: string;
  category?: string;
  organizer?: string;
  timeRange?: string;
  distanceKm?: string;
  attendeesAvailable?: number;
}

interface Props {
  event: InterestEvent;
  width?: number;
  onPress: () => void;
}

export const EventInterestCard: React.FC<Props> = ({ event, width, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : undefined]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.imageWrap}>
        <Image source={event.image} style={styles.image} resizeMode="cover" />

        <View style={styles.topLeftBadge}>
          <Text style={styles.topLeftBadgeText}>
            🎟 {event.attendeesAvailable ?? 13} events available
          </Text>
        </View>

        <View style={styles.topRightCol}>
          <TouchableOpacity style={styles.heartBtn}>
            <Text style={styles.heartIcon}>🤍</Text>
          </TouchableOpacity>
          <View style={styles.distancePill}>
            <Text style={styles.distanceText}>📍 {event.distanceKm ?? '2.4 km'}</Text>
          </View>
        </View>

        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{event.price}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.category}>{event.category ?? 'Category Name'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            📍 {event.venue}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {event.organizer ?? 'Organizer name'}
          </Text>
        </View>
        <Text style={styles.timeText}>🕐 {event.timeRange ?? '1:30 - 14:30 (IST)'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 18,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topLeftBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  topLeftBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  topRightCol: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    alignItems: 'flex-end',
    gap: 6,
  },
  heartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    fontSize: 13,
  },
  distancePill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  distanceText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  priceTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.brandPink,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  info: {
    padding: spacing.md,
  },
  category: {
    color: colors.brandPink,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary ?? '#777',
    flexShrink: 1,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary ?? '#777',
  },
});
