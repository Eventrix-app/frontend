import React from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MockEvent } from '../../data/mockEvents';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../common/Text';

type MainEventCardProps = {
  event: MockEvent;
  onPress?: () => void;
  width?: number;
};

export const MainEventCard: React.FC<MainEventCardProps> = ({
  event,
  onPress,
  width,
}) => (
  <TouchableOpacity style={[styles.card, width ? { width } : null]} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.glass}>
      <View style={styles.glassContent}>
      <View style={styles.image}>
        <View style={styles.imageTopRow}>
          <Text style={styles.categoryPill}>{event.category}</Text>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{event.price}</Text>
          </View>
        </View>
        {typeof event.image === 'string' && event.image.startsWith('http') ? (
          <Image source={{ uri: event.image }} style={styles.cardImage} resizeMode="cover" />
        ) : typeof event.image !== 'string' ? (
          <Image source={event.image} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>🎪</Text>
        )}
        {event.featured ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Featured</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.category}>{event.category}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>📍 {event.venue}</Text>
          <Text style={styles.meta}>👤 {event.organizer}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>📅 {event.date}</Text>
          <Text style={styles.meta}>🕐 {event.time}</Text>
        </View>
        <Text style={styles.price}>{event.price}</Text>
      </View>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  glass: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.white,
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
  glassContent: {
    padding: 2,
  },
  image: {
    height: 160,
    backgroundColor: 'rgba(255,228,236,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 22,
    overflow: 'hidden',
  },
  imageTopRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  emoji: {
    fontSize: 60,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.brandPink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  pricePill: {
    backgroundColor: 'rgba(20,39,102,0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
  },
  pricePillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    padding: spacing.md,
    gap: 6,
  },
  category: {
    fontSize: 11,
    color: colors.brandPink,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    color: colors.text,
    lineHeight: 23,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meta: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  price: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
    color: colors.brandPink,
  },
});
