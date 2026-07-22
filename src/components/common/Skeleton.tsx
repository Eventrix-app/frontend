import React, { useEffect, useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { borderRadius } from '../../theme/borderRadius';
import { useTheme } from '../../theme/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  variant?: 'text' | 'circle' | 'rect';
  style?: ViewStyle | ViewStyle[];
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  variant = 'rect',
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Pulsing opacity rather than a static gray box — reanimated is already a dependency
  // (~4.1.1) and this reads as "loading" without needing an extra gradient-sweep asset.
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: variant === 'circle' ? height / 2 : borderRadius.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  skeleton: {
    backgroundColor: colors.borderLight,
  },
});

export default Skeleton;
