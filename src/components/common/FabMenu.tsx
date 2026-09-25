import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SpringPressable } from './SpringPressable';
import { Text } from './Text';
import { IconProps, MenuOpenIcon, MenuCloseIcon } from './Icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

export interface FabMenuItem {
  key: string;
  label: string;
  Icon: React.FC<IconProps>;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  items: FabMenuItem[];
  // Bottom-left placement (left/bottom) to match this app's existing organizer FAB —
  // left as a style prop rather than hardcoded so a future bottom-right use isn't blocked.
  style?: ViewStyle;
  openAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
}

const FAB_SIZE = 52;
const ITEM_HEIGHT = 44;
const ITEM_GAP = spacing.sm;

// Shorter than the spring's settle time so items overlap in flight — that overlap, plus the
// z-index below, is what sells "pushed up by the one before it".
const OPEN_STAGGER_MS = 70;
// Items wait for the FAB's own pop to be mostly done, or the whole sequence collapses into
// everything happening at once.
const OPEN_FAB_LEAD_MS = 90;
// Closing reads as more decisive than opening (matches Material 3 / iOS dismiss timing) —
// tighter stagger, snappier spring (see CLOSE_SPRING).
const CLOSE_STAGGER_MS = 45;

const OPEN_SPRING = { damping: 15, stiffness: 220, mass: 0.7 };
const CLOSE_SPRING = { damping: 18, stiffness: 260, mass: 0.6 };
const FAB_SPRING = { damping: 14, stiffness: 280, mass: 0.6 };

// Speed-dial FAB: each item emerges from behind the one before it rather than fading in
// independently. Replaces a HalfScreenModal that buried these behind a sheet drag.
const FabMenu: React.FC<Props> = ({
  items,
  style,
  openAccessibilityLabel = 'Open menu',
  closeAccessibilityLabel = 'Close menu',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  // 0..1, drives the FAB rotation and each item's reveal. Prop-drilled rather than context —
  // one shared value across a short list is simpler.
  const fabOpen = useSharedValue(0);
  // Separate from fabOpen so the compress-then-expand pop plays identically in both
  // directions without fighting the rotation's timing.
  const fabPress = useSharedValue(0);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Opening: the FAB's own rotate/expand leads immediately — items wait for it (see
      // OPEN_FAB_LEAD_MS in FabMenuItemView) instead of starting at the same instant.
      fabOpen.value = withSpring(1, FAB_SPRING);
    } else {
      // Closing: items retract first, so the FAB rotating back reads as sequential rather
      // than flipping to "+" while items are still mid-retreat.
      const lastItemDelay = Math.max(0, (items.length - 1) * CLOSE_STAGGER_MS);
      fabOpen.value = withDelay(lastItemDelay, withSpring(0, FAB_SPRING));
    }
    fabPress.value = withSequence(
      withTiming(1, { duration: 90 }),
      withSpring(0, FAB_SPRING),
    );
  };

  const toggle = () => setOpenState(!open);
  const close = () => {
    if (open) setOpenState(false);
  };

  const fabAnimatedStyle = useAnimatedStyle(() => {
    const compress = interpolate(fabPress.value, [0, 1], [1, 0.88], Extrapolation.CLAMP);
    return {
      transform: [{ scale: compress }],
    };
  });

  // The two icons aren't a symmetric pair like plus/X, so rotating one can't become the
  // other — hence a cross-fade rather than an instant cut.
  const closedIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fabOpen.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: `${interpolate(fabOpen.value, [0, 1], [0, -90])}deg` },
      { scale: interpolate(fabOpen.value, [0, 1], [1, 0.5], Extrapolation.CLAMP) },
    ],
  }));
  const openIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fabOpen.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: `${interpolate(fabOpen.value, [0, 1], [90, 0])}deg` },
      { scale: interpolate(fabOpen.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      {/* Transparent — the reference has no dimmed scrim behind the stack, just tap-away-
          to-dismiss over whatever's already on screen. */}
      {open && <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />}

      {items.map((item, index) => (
        <FabMenuItemView
          key={item.key}
          item={item}
          index={index}
          total={items.length}
          open={open}
          colors={colors}
          onSelect={() => {
            close();
            item.onPress();
          }}
        />
      ))}

      {/* activeOpacity 1 — no fade at all. The FAB already animates its own press
          compression (fabPress above), so the fade added nothing, and styles.fab carries an
          Android elevation: fading a subtree containing one makes Android composite it
          offscreen and paint its shadow as an opaque rectangle over the button mid-press. */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={open ? closeAccessibilityLabel : openAccessibilityLabel}
      >
        <Animated.View style={[styles.fab, fabAnimatedStyle]}>
          <Animated.View style={closedIconStyle}>
            <MenuOpenIcon color="#FFFFFF" size={22} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, openIconStyle]}>
            <MenuCloseIcon color="#FFFFFF" size={22} />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export default FabMenu;

interface ItemViewProps {
  item: FabMenuItem;
  index: number;
  total: number;
  open: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onSelect: () => void;
}

const FabMenuItemView: React.FC<ItemViewProps> = ({ item, index, total, open, colors, onSelect }) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  // 0 = tucked behind the FAB, 1 = settled in this item's slot. Owned per-item because hooks
  // can't be called a variable number of times from a parent loop.
  const progress = useSharedValue(0);
  // Springs settle "close enough", so closing can rest at opacity ~0.02 — enough to leave a
  // faint smudge. Unmounting on finish removes it outright.
  const [mounted, setMounted] = useState(true);
  // A stale close callback can fire after a quick reopen and unmount an item that should be
  // visible. The ref reflects current intent, unlike the captured `open`.
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Item 0 (closest to the FAB) leads; each later item begins while the previous is
      // still mid-flight (see OPEN_STAGGER_MS) instead of waiting for it to fully arrive.
      progress.value = withDelay(OPEN_FAB_LEAD_MS + index * OPEN_STAGGER_MS, withSpring(1, OPEN_SPRING));
    } else {
      // Reverse order: the topmost (last-appeared) item retracts first, each following
      // item a beat behind — the open sequence, played backwards.
      const reverseIndex = total - 1 - index;
      progress.value = withDelay(
        reverseIndex * CLOSE_STAGGER_MS,
        withSpring(0, CLOSE_SPRING, (finished) => {
          if (finished && !openRef.current) runOnJS(setMounted)(false);
        }),
      );
    }
    // total excluded on purpose: an item-count change mid-animation must not restart every
    // other item's in-flight timing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // The distance this item travels from the FAB's own position up to its resting slot —
  // this is what makes it originate *at the FAB*, not just fade in a few px from its slot.
  const distance = FAB_SIZE + ITEM_GAP + index * (ITEM_HEIGHT + ITEM_GAP);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [distance, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) },
    ],
  }));

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={open ? 'box-none' : 'none'}
      style={[
        styles.itemWrap,
        // This item's resting slot, the base translateY animates against. Without it every
        // item shares bottom: 0 and they all converge on the FAB.
        { bottom: distance },
        // Descending z-index so an emerging item is occluded by the earlier one rather than
        // painting over it.
        { zIndex: total - index },
        animatedStyle,
      ]}
    >
      {/* Scale rather than fade — itemPill is an elevated solid surface, and
          TouchableOpacity's alpha animation over one paints its shadow as an opaque
          rectangle across the pill while pressed. */}
      <SpringPressable style={styles.itemPill} onPress={onSelect} scaleTo={0.96} accessibilityLabel={item.label}>
        {/* Solid brandPink fill needs white for both regular and destructive items —
            colors.error ('#EF4444') is close enough in hue/lightness to brandPink
            ('#FF3366') that red-on-pink text would be nearly illegible here. */}
        <item.Icon color="#FFFFFF" size={18} />
        <Text style={styles.itemLabel} numberOfLines={1}>
          {item.label}
        </Text>
      </SpringPressable>
    </Animated.View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    position: 'absolute',
    // Pills are absolutely positioned, so only the 52px FAB sizes this container — which
    // would otherwise be the containing block every pill's auto width resolves against.
    width: 280,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.brandPink,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
    }),
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemWrap: {
    // bottom is intentionally not set here — each item's actual resting slot (bottom:
    // distance) is applied inline per item, see the style array in FabMenuItemView.
    position: 'absolute',
    left: 0,
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    // flex-start (not stretch, itemWrap's default) + flexShrink: 0 together are what make
    // this size itself to the label instead of either stretching to fill itemWrap's own
    // width or being compressed smaller than the label needs — combined with root's fixed
    // width above, there's no longer a collapsed containing block for either behavior to
    // collapse against.
    alignSelf: 'flex-start',
    flexShrink: 0,
    gap: spacing.xs,
    height: ITEM_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: ITEM_HEIGHT / 2,
    backgroundColor: colors.brandPink,
    // ...Platform.select({
    //   android: { elevation: 4 },
    //   default: {
    //     shadowColor: colors.shadow,
    //     shadowOffset: { width: 0, height: 3 },
    //     shadowOpacity: 0.15,
    //     shadowRadius: 8,
    //   },
    // }),
  },
  // Literal white, not colors.white: that token is a dark-mode *surface* color (see
  // colors.dark.ts, and the same note on EventDetailsScreen's ticketStubTitle), not literal
  // white — this text sits on the solid brandPink pill fill above, which doesn't change
  // with the app theme, so the text color shouldn't either.
  itemLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flexShrink: 0 },
});
