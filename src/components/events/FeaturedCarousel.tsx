import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Card } from '../common';
import theme from '../../theme';

const { width } = Dimensions.get('window');

interface FeaturedEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  price: string;
  image: string;
  featured?: boolean;
}

interface FeaturedCarouselProps {
  events: FeaturedEvent[];
  onEventPress: (eventId: string) => void;
}

const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ events, onEventPress }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (width - theme.spacing.xl * 2));
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContent}
      >
        {events.map((event) => (
          <TouchableOpacity key={event.id} style={styles.slide} activeOpacity={0.85} onPress={() => onEventPress(event.id)}>
            <Card style={styles.eventCard} shadow>
              <View style={styles.eventImage}>
                <Text style={styles.eventEmoji}>{event.image}</Text>
                {event.featured && (
                  <View style={styles.featuredBadge}>
                    <Text variant="caption" color="textInverse" style={styles.featuredText}>
                      ⭐ Featured
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.eventInfo}>
                <Text variant="h3" style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                <View style={styles.eventMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📅</Text>
                    <Text variant="caption" color="textSecondary">
                      {event.date}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📍</Text>
                    <Text variant="caption" color="textSecondary">
                      {event.location}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventFooter}>
                  <Text variant="label" color="primary" style={styles.eventPrice}>
                    {event.price}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {events.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  slide: {
    width: width - theme.spacing.xl * 2,
    marginRight: theme.spacing.lg,
  },
  eventCard: {
    overflow: 'hidden',
  },
  eventImage: {
    height: 180,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eventEmoji: {
    fontSize: 64,
  },
  featuredBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  featuredText: {
    fontWeight: '600',
  },
  eventInfo: {
    padding: theme.spacing.lg,
  },
  eventTitle: {
    marginBottom: theme.spacing.md,
  },
  eventMeta: {
    marginBottom: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metaIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventPrice: {
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
});

export default FeaturedCarousel;
