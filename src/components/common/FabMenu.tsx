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

// Each item starts before the previous one has *fully* settled — shorter than the spring's
// own settle time (~260-320ms for OPEN_SPRING below) — so there's real temporal overlap:
// item[i+1] is already moving while item[i] is still finishing its own travel. That overlap,
// combined with item[i] rendering above item[i+1] (see zIndex below) while they're still
// close together near the FAB, is what actually sells "pushed up by the one before it"
// rather than "independently timed objects."
const OPEN_STAGGER_MS = 70;
// Items wait for the FAB's own compress/rotate/expand to be mostly (not fully) done before
// the cascade starts — otherwise item 0 begins moving at the same instant as the FAB's own
// micro-interaction, and "FAB → rotate → expand → Item 1 → Item 2…" collapses into
// everything happening at once.
const OPEN_FAB_LEAD_MS = 90;
// Closing reads as more decisive than opening (matches Material 3 / iOS dismiss timing) —
// tighter stagger, snappier spring (see CLOSE_SPRING).
const CLOSE_STAGGER_MS = 45;

const OPEN_SPRING = { damping: 15, stiffness: 220, mass: 0.7 };
const CLOSE_SPRING = { damping: 18, stiffness: 260, mass: 0.6 };
const FAB_SPRING = { damping: 14, stiffness: 280, mass: 0.6 };

// Speed-dial FAB: tapping the circular button pops each item up in a genuine cascade —
// item[i+1] visibly emerges from behind item[i] and continues past it to its own resting
// slot, rather than every item fading in independently at a fixed offset. Replaces a
// HalfScreenModal, which buried these actions under a full sheet drag for what's usually a
// single tap.
const FabMenu: React.FC<Props> = ({
  items,
  style,
  openAccessibilityLabel = 'Open menu',
  closeAccessibilityLabel = 'Close menu',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  // 0..1 — drives the FAB's own rotation (see fabAnimatedStyle) and is what each item
  // reacts to for its own reveal/retract (passed down as a prop, not read via context —
  // this list is short enough that prop-drilling one shared value is simpler than wiring a
  // context for it).
  const fabOpen = useSharedValue(0);
  // A short, separate pulse (not reused from fabOpen) for the compress-then-expand "pop"
  // on tap — decoupled from the open/close progress so it can play the same way in both
  // directions without fighting the rotation's own timing.
  const fabPress = useSharedValue(0);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Opening: the FAB's own rotate/expand leads immediately — items wait for it (see
      // OPEN_FAB_LEAD_MS in FabMenuItemView) instead of starting at the same instant.
      fabOpen.value = withSpring(1, FAB_SPRING);
    } else {
      // Closing: items retract first; the FAB only rotates back once the *last* item
      // (item 0, the last to retract — see the reverse order below) has begun its own
      // return, so "item 1 slides into the FAB" and "FAB rotates back" read as sequential
      // rather than the FAB flipping back to "+" while items are still mid-retreat.
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

  // menu-open.svg (hamburger-with-arrow) and menu-close.svg (plain hamburger) aren't a
  // symmetric pair — unlike a plus/X, rotating one doesn't turn it into the other, so the
  // transition is a cross-fade: the outgoing icon fades out while rotating away, the
  // incoming one rotates in while fading in, rather than an instant cut between them.
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

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={toggle}
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
  // 0 = tucked at the FAB's own position (hidden behind it), 1 = settled in this item's
  // stacked slot. Owned per-item (not a shared array in the parent) so each instance can
  // hold its own Reanimated shared value — hooks can't be called a variable number of times
  // in a loop, so "one animated item per component instance" is the correct shape here,
  // not an array of values indexed from the parent.
  const progress = useSharedValue(0);
  // A spring's rest thresholds stop it once "close enough" to the target, not necessarily
  // exactly at it — closing could settle at, say, opacity 0.02 rather than a true 0. On a
  // white pill with its own drop shadow, that residual is enough to leave a faint smudge
  // sitting at the FAB's position after the menu closes. Actually unmounting once the close
  // spring reports finished (rather than trusting opacity alone) removes it outright.
  const [mounted, setMounted] = useState(true);
  // Reopening quickly after a close can leave a *stale* close animation's callback still
  // pending — if the user closes then reopens before it fires, that old callback can still
  // report finished: true after the reopen has already set mounted back to true, which then
  // silently unmounts this one item again on the current open. A ref (always current, unlike
  // the `open` this effect closed over when the animation was scheduled) lets the callback
  // check real, up-to-the-moment intent before acting on a possibly-superseded completion.
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
    // total is intentionally excluded — a mid-animation item-count change (e.g. an event's
    // approvalStatus flipping while the menu happens to be open) shouldn't restart every
    // other item's in-flight animation, only this one's own open/index-driven timing.
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
        // This item's own resting slot (bottom: distance) — the *base* position translateY
        // animates relative to. Without this, every item shares the same bottom: 0 and all
        // of them would converge on the FAB's own position once fully open instead of
        // stacking at their distinct heights.
        { bottom: distance },
        // Descending z-index by index: item[0] (appears first, closest to the FAB) paints
        // above item[1], which paints above item[2], and so on — without this, a later
        // item emerging near an earlier one's position would render *over* it instead of
        // being occluded by it, which is the opposite of "emerges from behind."
        { zIndex: total - index },
        animatedStyle,
      ]}
    >
      <TouchableOpacity style={styles.itemPill} activeOpacity={0.85} onPress={onSelect}>
        {/* Solid brandPink fill needs white for both regular and destructive items —
            colors.error ('#EF4444') is close enough in hue/lightness to brandPink
            ('#FF3366') that red-on-pink text would be nearly illegible here. */}
        <item.Icon color="#FFFFFF" size={18} />
        <Text style={styles.itemLabel} numberOfLines={1}>
          {item.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: {
    position: 'absolute',
    // Every item pill is position: 'absolute', so none of them count toward this
    // container's own auto-sizing — only the 52px FAB (its one normal-flow child) does,
    // making 52px the *containing block* every pill's own "auto width" resolves against
    // regardless of its label. root itself is transparent and pointerEvents: 'box-none'
    // (see the JSX below), so a generous fixed width here costs nothing visually or for
    // touch handling — it just gives pills real room to size themselves in.
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
