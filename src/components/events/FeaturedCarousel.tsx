import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Dimensions,
  FlatList,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.55);
const CARD_SPACING = spacing.md;
const SLOT_WIDTH = CARD_WIDTH + CARD_SPACING;
const LOOP_MULTIPLIER = 50;
const AUTO_SCROLL_INTERVAL = 3500;

export interface FeaturedEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  price: number | string;
  image: any;
  featured?: boolean;
}

interface Props {
  events: FeaturedEvent[];
  onEventPress: (eventId: string) => void;
  cardWidth?: number;
}

const resolveImageSource = (image: unknown) => {
  if (!image) return undefined;
  if (typeof image === 'string') return { uri: image };
  return image as any;
};

const FeaturedCarousel: React.FC<Props> = ({ events, onEventPress, cardWidth: cardWidthProp }) => {
  const effectiveCardWidth = cardWidthProp ?? CARD_WIDTH;
  const effectiveSlotWidth = effectiveCardWidth + CARD_SPACING;
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const currentRawIndex = useRef(0);
  const isUserInteracting = useRef(false);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loopedEvents = useMemo(() => {
    if (events.length === 0) return [];
    return Array.from({ length: events.length * LOOP_MULTIPLIER }, (_, i) => ({
      ...events[i % events.length],
      __loopKey: `${events[i % events.length].id}-${i}`,
    }));
  }, [events]);

  const initialIndex = useMemo(
    () => (events.length > 0 ? Math.floor(loopedEvents.length / 2 / events.length) * events.length : 0),
    [loopedEvents, events],
  );

  useEffect(() => {
    currentRawIndex.current = initialIndex;
    if (events.length > 1) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
  }, [initialIndex, events.length]);

  // Single source of truth for the active dot: derive it from actual scroll
  // position rather than viewability events, which don't reliably fire for
  // programmatic animated scrollToIndex calls.
  const updateActiveIndexFromOffset = useCallback(
    (offsetX: number) => {
      if (events.length === 0) return;
      const rawIndex = Math.round(offsetX / effectiveSlotWidth);
      currentRawIndex.current = rawIndex;
      const normalized = ((rawIndex % events.length) + events.length) % events.length;
      setActiveIndex(normalized);
    },
    [events.length, effectiveSlotWidth],
  );

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateActiveIndexFromOffset(e.nativeEvent.contentOffset.x);
  };

  const startAutoScroll = useCallback(() => {
    if (events.length <= 1) return;
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = setInterval(() => {
      if (isUserInteracting.current) return;
      let nextIndex = currentRawIndex.current + 1;

      // currentRawIndex only ever grows; left unchecked it eventually walks off
      // the end of loopedEvents (a fixed-size padded array) and scrollToIndex
      // throws. Once we're within one lap of the edge, snap back (no animation)
      // to the same position in the middle copy of the loop — same underlying
      // event, so the reset is visually a no-op.
      if (nextIndex >= loopedEvents.length - events.length) {
        const normalized = ((nextIndex % events.length) + events.length) % events.length;
        nextIndex = initialIndex + normalized;
        currentRawIndex.current = nextIndex;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: false });
        updateActiveIndexFromOffset(nextIndex * SLOT_WIDTH);
        return;
      }

      currentRawIndex.current = nextIndex;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      // scrollToIndex's own momentum-end will also fire and correct this,
      // but setting it immediately keeps the dot in sync with the animation.
      updateActiveIndexFromOffset(nextIndex * effectiveSlotWidth);
    }, AUTO_SCROLL_INTERVAL);
  }, [events.length, loopedEvents.length, initialIndex, updateActiveIndexFromOffset, effectiveSlotWidth]);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [startAutoScroll]);

  const handleTouchStart = () => {
    isUserInteracting.current = true;
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      isUserInteracting.current = false;
    }, 800);
  };

  const renderItem = useCallback(
    ({ item: event }: { item: FeaturedEvent }) => {
      const imageSource = resolveImageSource(event.image);
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.card, { width: effectiveCardWidth }]}
          onPress={() => onEventPress(event.id)}
        >
          <ImageBackground
            source={imageSource}
            style={[styles.image, !imageSource && styles.imageFallback]}
            imageStyle={styles.imageRadius}
          >
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>🎟 {event.price}</Text>
            </View>

            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.gradient}>
              <View style={styles.bottomRow}>
                <View style={styles.textCol}>
                  <Text style={styles.title} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>📅 {event.date}</Text>
                    <Text style={styles.meta}>📍 {event.location}</Text>
                  </View>
                </View>

                {events.length > 1 && (
                  <View style={styles.dots}>
                    {events.map((_, i) => (
                      <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                    ))}
                  </View>
                )}
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      );
    },
    [onEventPress, events.length, activeIndex, effectiveCardWidth],
  );

  if (events.length === 0) return null;

  return (
    <FlatList
      style={{ height: CARD_HEIGHT, flexGrow: 0 }}
      ref={flatListRef}
      data={loopedEvents}
      keyExtractor={(item: any) => item.__loopKey}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={effectiveSlotWidth}
      decelerationRate="fast"
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: info.index * effectiveSlotWidth,
            animated: false,
          });
        }, 50);
      }}
      getItemLayout={(_, index) => ({
        length: effectiveSlotWidth,
        offset: effectiveSlotWidth * index,
        index,
      })}
      initialScrollIndex={initialIndex}
      extraData={activeIndex}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    marginRight: CARD_SPACING,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageFallback: {
    backgroundColor: colors.subtext ?? '#999',
  },
  imageRadius: {
    borderRadius: 20,
  },
  priceTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
  gradient: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xl,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    marginBottom: 4,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  meta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: spacing.sm,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.white,
  },
});

export default FeaturedCarousel;