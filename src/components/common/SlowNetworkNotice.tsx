import React, { useEffect, useMemo } from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from './Text';
import { RadioTowerIcon } from './Icons';
import type { SlowNetworkStage } from '../../hooks/useSlowNetwork';

interface Props {
  stage: SlowNetworkStage;
  /** Shown only at the 'verySlow' stage — by then waiting quietly has stopped being helpful. */
  onRetry?: () => void;
  /**
   * 'surface' sits on a normal themed background (feeds, lists, detail screens).
   * 'onDark' sits on top of media that is black in both themes — the Shorts feed — where
   * the themed surface colors would disappear against the video.
   */
  tone?: 'surface' | 'onDark';
  style?: StyleProp<ViewStyle>;
}

// Deliberately worded as reassurance rather than an error. Nothing has failed at this point
// — the request is still in flight — so the copy explains the delay and tells the user the
// app is still working, instead of implying they need to do something.
const COPY: Record<Exclude<SlowNetworkStage, 'none'>, { title: string; body: string }> = {
  slow: {
    title: 'Still loading…',
    body: 'Your connection looks slow right now. We’re still fetching this — it should appear shortly.',
  },
  verySlow: {
    title: 'This is taking longer than usual',
    body: 'Your network seems unusually slow. You can keep waiting — nothing is lost — or try again.',
  },
};

/**
 * Explains an unusually long load instead of leaving the user staring at a skeleton with no
 * idea whether anything is happening.
 *
 * Renders nothing at stage 'none', so it can be dropped into a screen unconditionally and
 * costs nothing on a normal load.
 */
export const SlowNetworkNotice: React.FC<Props> = ({ stage, onRetry, tone = 'surface', style }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);

  const isVisible = stage !== 'none';

  // Entrance is animated rather than an abrupt appearance: this shows up mid-wait, when the
  // user is already watching the screen, and a hard pop reads as something going wrong.
  const enter = useSharedValue(0);
  // Slow, continuous pulse on the icon — the one moving thing that says "still working"
  // rather than "stalled".
  const pulse = useSharedValue(0);

  // Driven back to 0 when hidden rather than left at 1. The component returns null in that
  // state, so nothing animates out — but a single instance can be shown, hidden and shown
  // again (switching tabs on Bookings starts a fresh load), and without the reset the second
  // appearance would pop in fully-formed.
  useEffect(() => {
    enter.value = withTiming(isVisible ? 1 : 0, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [isVisible, enter]);

  useEffect(() => {
    if (!isVisible) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // An infinite repeat keeps running on the UI thread even once this renders null, so it
    // is stopped explicitly instead of being left spinning for the rest of the session.
    return () => cancelAnimation(pulse);
  }, [isVisible, pulse]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 8 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
    transform: [{ scale: 0.92 + pulse.value * 0.08 }],
  }));

  if (!isVisible) return null;

  const copy = COPY[stage];
  const accent = tone === 'onDark' ? '#FFFFFF' : colors.brandPink;

  return (
    <Animated.View
      style={[styles.card, containerStyle, style]}
      accessibilityRole="alert"
      // One label for the whole card so a screen reader announces the situation as a single
      // sentence instead of reading the decorative icon and then two separate text nodes.
      accessible
      accessibilityLabel={`${copy.title}. ${copy.body}`}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <RadioTowerIcon color={accent} size={22} />
      </Animated.View>

      <View style={styles.textCol}>
        <Text variant="subtitle" style={styles.title}>
          {copy.title}
        </Text>
        <Text variant="caption" style={styles.body}>
          {copy.body}
        </Text>

        {stage === 'verySlow' && onRetry ? (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetry}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Try loading again"
          >
            <Text variant="label" style={styles.retryText}>
              Try again
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], tone: 'surface' | 'onDark') =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      // muted/border flip with the theme, so this reads as a raised surface in light mode and
      // a lifted panel in dark mode without either being hardcoded.
      backgroundColor: tone === 'onDark' ? 'rgba(255,255,255,0.12)' : colors.muted,
      borderColor: tone === 'onDark' ? 'rgba(255,255,255,0.22)' : colors.border,
    },
    iconWrap: {
      marginTop: 1,
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: tone === 'onDark' ? '#FFFFFF' : colors.text,
    },
    body: {
      color: tone === 'onDark' ? 'rgba(255,255,255,0.78)' : colors.textSecondary,
    },
    retryBtn: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm - 2,
      borderRadius: borderRadius.pill,
      backgroundColor: colors.brandPink,
    },
    retryText: {
      color: '#FFFFFF',
    },
  });

export default SlowNetworkNotice;
