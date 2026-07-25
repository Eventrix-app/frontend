import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  scrollTo,
  SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';
import { TicketIcon, CalendarIcon, LocationPin } from '../common/Icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.55);
const CARD_SPACING = spacing.md;
const LOOP_MULTIPLIER = 50;
const AUTO_SCROLL_INTERVAL = 3500;
const TRANSITION_DURATION_MS = 550;
const TRANSITION_EASING = Easing.inOut(Easing.cubic);

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

// Previously only `!imageSource` (no URL at all) fell back to the plain-color background —
// a URL that 404s/expires had no onError handling, so the hero carousel card silently
// showed a blank background behind the gradient/text with no visible fallback. Extracted
// into its own component (rather than a useState inside the FlatList renderItem callback)
// so the per-card `failed` state has a stable component instance to live on.
const FeaturedCardImage: React.FC<{
  imageSource: unknown;
  imageStyle: any;
  fallbackStyle: any;
  radiusStyle: any;
  children: React.ReactNode;
}> = ({ imageSource, imageStyle, fallbackStyle, radiusStyle, children }) => {
  const [failed, setFailed] = useState(false);
  const showFallback = !imageSource || failed;
  return (
    <ImageBackground
      source={showFallback ? undefined : (imageSource as any)}
      style={[imageStyle, showFallback && fallbackStyle]}
      imageStyle={radiusStyle}
      onError={() => setFailed(true)}
    >
      {children}
    </ImageBackground>
  );
};

// Renders its width/color as a pure worklet function of the *same* scrollX shared value
// that drives the card slide — not a separately-triggered animation of its own. Deriving
// both from one number, evaluated on the UI thread, is what actually guarantees they move
// together: any version where the dot reacts to a discrete "active index" (via React state
// and a useEffect) has to cross from the UI thread to the JS thread and back before its own
// animation can even start, which is exactly the gap that was causing the two to visibly
// drift apart. `loopWidth`/`slotWidth` are plain numbers closed over by the worklet, safe
// to recompute every render since reanimated's babel plugin re-captures them automatically.
const Dot: React.FC<{ index: number; slotWidth: number; loopWidth: number; scrollX: SharedValue<number> }> = ({
  index,
  slotWidth,
  loopWidth,
  scrollX,
}) => {
  const style = useAnimatedStyle(() => {
    const dotCenter = index * slotWidth;
    let delta = (scrollX.value - dotCenter) % loopWidth;
    // Shortest signed distance around the loop, so dot 0 also responds to scroll positions
    // approaching from "just before the wrap" and the last dot responds to positions
    // approaching from "just after 0" — without this, both ends of the loop would only
    // ever see the far (long way around) distance and never actually highlight smoothly.
    if (delta > loopWidth / 2) delta -= loopWidth;
    if (delta < -loopWidth / 2) delta += loopWidth;
    const highlight = Math.max(0, 1 - Math.abs(delta) / slotWidth);
    return {
      width: 6 + highlight * 10,
      backgroundColor: `rgba(255,255,255,${0.4 + highlight * 0.6})`,
    };
  });

  return <Animated.View style={[dotBaseStyle, style]} />;
};

// Static — doesn't depend on theme colors, so it's not part of createStyles below.
const dotBaseStyle = { height: 6, borderRadius: 3 } as const;

const FeaturedCarousel: React.FC<Props> = ({ events, onEventPress, cardWidth: cardWidthProp }) => {
  const effectiveCardWidth = cardWidthProp ?? CARD_WIDTH;
  const effectiveSlotWidth = effectiveCardWidth + CARD_SPACING;
  const loopWidth = events.length * effectiveSlotWidth;
  const animatedRef = useAnimatedRef<Animated.FlatList<any>>();
  const currentRawIndex = useRef(0);
  const isUserInteracting = useRef(false);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Single source of truth for scroll position — both the real FlatList scroll (via the
  // reaction below) and every dot's highlight (via Dot's useAnimatedStyle above) are pure
  // functions of this one UI-thread value. FlatList's own scrollToIndex(animated: true)
  // uses a fixed, non-customizable native duration/easing, so this instead drives the
  // scroll programmatically at a chosen duration/easing via reanimated's scrollTo.
  const scrollX = useSharedValue(0);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useAnimatedReaction(
    () => scrollX.value,
    (value) => {
      scrollTo(animatedRef, value, 0, false);
    },
  );

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
        scrollX.value = initialIndex * effectiveSlotWidth;
      });
    }
  }, [initialIndex, events.length, effectiveSlotWidth, scrollX]);

  // Guards against a subtle native quirk: reanimated's scrollTo (used below to drive the
  // auto-advance) writes the scroll offset every frame, and Android/iOS can interpret that
  // write sequence as a real scroll gesture and fire their own onMomentumScrollEnd mid-
  // transition. Without this guard, that spurious event would make handleMomentumScrollEnd
  // stomp scrollX with a partial, still-animating offset — visibly cancelling the glide.
  const isAutoAdvancing = useRef(false);

  // Only tracks bookkeeping (scrollX + currentRawIndex) after a genuine user-driven swipe —
  // no React state involved, so a manual swipe can never race with (or be overwritten by)
  // the auto-advance's own bookkeeping the way two independently-triggered state updates could.
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isAutoAdvancing.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    if (events.length > 0) {
      currentRawIndex.current = Math.round(offsetX / effectiveSlotWidth);
    }
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
        scrollX.value = nextIndex * effectiveSlotWidth;
        return;
      }

      currentRawIndex.current = nextIndex;
      isAutoAdvancing.current = true;
      scrollX.value = withTiming(nextIndex * effectiveSlotWidth, {
        duration: TRANSITION_DURATION_MS,
        easing: TRANSITION_EASING,
      });
      setTimeout(() => {
        isAutoAdvancing.current = false;
      }, TRANSITION_DURATION_MS + 100);
    }, AUTO_SCROLL_INTERVAL);
  }, [events.length, loopedEvents.length, initialIndex, effectiveSlotWidth, scrollX]);

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
          <FeaturedCardImage
            imageSource={imageSource}
            imageStyle={styles.image}
            fallbackStyle={styles.imageFallback}
            radiusStyle={styles.imageRadius}
          >
            <View style={styles.priceTag}>
              <TicketIcon color={colors.textInverse} size={12} />
              <Text style={styles.priceText}>{event.price}</Text>
            </View>

            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.gradient}>
              <View style={styles.bottomRow}>
                <View style={styles.textCol}>
                  <Text style={styles.title} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <CalendarIcon color="rgba(255,255,255,0.9)" size={13} />
                      <Text style={styles.meta}>{event.date}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <LocationPin color="rgba(255,255,255,0.9)" size={13} />
                      <Text style={styles.meta}>{event.location}</Text>
                    </View>
                  </View>
                </View>

                {events.length > 1 && (
                  <View style={styles.dots}>
                    {events.map((_, i) => (
                      <Dot key={i} index={i} slotWidth={effectiveSlotWidth} loopWidth={loopWidth} scrollX={scrollX} />
                    ))}
                  </View>
                )}
              </View>
            </LinearGradient>
          </FeaturedCardImage>
        </TouchableOpacity>
      );
    },
    [onEventPress, events.length, effectiveCardWidth, effectiveSlotWidth, loopWidth, scrollX, styles],
  );

  if (events.length === 0) return null;

  return (
    <Animated.FlatList
      style={{ height: CARD_HEIGHT, flexGrow: 0 }}
      ref={animatedRef}
      data={loopedEvents}
      keyExtractor={(item: any) => item.__loopKey}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={effectiveSlotWidth}
      decelerationRate="normal"
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          animatedRef.current?.scrollToOffset({
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
    />
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
    color: colors.textInverse,
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
    color: colors.textInverse,
    fontSize: 20,
    marginBottom: 4,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    height: 6,
    borderRadius: 3,
  },
});

export default FeaturedCarousel;
