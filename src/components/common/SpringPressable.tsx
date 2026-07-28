import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Props {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode;
}

// Feedback fires on the down-press (onBegin), not on release — waiting for touch-up to
// show any response is what makes an interface feel laggy. Critically damped
// (overshootClamping, no bounce): this is a press, not a flick, so no momentum to honor.
export const SpringPressable: React.FC<Props> = ({ onPress, disabled, style, scaleTo = 0.94, children }) => {
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
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
};
