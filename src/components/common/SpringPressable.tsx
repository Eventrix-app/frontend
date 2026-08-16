import React from 'react';
import { AccessibilityProps, Insets, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Accessibility and hitSlop are forwarded rather than dropped: this is used as a
// replacement for TouchableOpacity on real buttons (see the Android elevation note below),
// and silently losing a screen-reader label or an enlarged touch target in the swap would
// be a worse regression than the visual artifact being fixed.
interface Props extends AccessibilityProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hitSlop?: Insets | number;
  testID?: string;
  children: React.ReactNode;
}

// Feedback fires on the down-press (onBegin), not on release — waiting for touch-up to
// show any response is what makes an interface feel laggy. Critically damped
// (overshootClamping, no bounce): this is a press, not a flick, so no momentum to honor.
//
// Also the app's answer to a specific Android artifact. TouchableOpacity presses by
// animating alpha, and this app's button idiom puts an Android `elevation` on a solid
// surface inside the pressable — fading a subtree that contains an elevated view makes
// Android composite it through an offscreen layer, and its shadow lands as a flat opaque
// rectangle over the button for the duration of the press. Animating transform instead of
// alpha never triggers it. PrimaryButton solves the same problem the same way.
export const SpringPressable: React.FC<Props> = ({
  onPress,
  disabled,
  style,
  scaleTo = 0.94,
  hitSlop,
  testID,
  children,
  ...accessibilityProps
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(scaleTo, { damping: 20, stiffness: 300, overshootClamping: true });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300, overshootClamping: true });
    })
    .onEnd(() => {
      if (onPress) runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        {...accessibilityProps}
        style={[style, animatedStyle]}
        hitSlop={hitSlop}
        testID={testID}
        // Spread first, then these: both derive from the caller's own values, so applying
        // them after is what keeps the merge from being overwritten by the raw prop.
        // Announced as a button unless the caller says otherwise — a bare View reports as
        // nothing at all to a screen reader, which TouchableOpacity handled for free.
        accessibilityRole={accessibilityProps.accessibilityRole ?? 'button'}
        accessibilityState={{ disabled: !!disabled, ...accessibilityProps.accessibilityState }}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
