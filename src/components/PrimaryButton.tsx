import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, typography } from '../theme';
import { Text } from './common/Text';

type Variant = 'solid' | 'ghost' | 'onGradient' | 'ghostOnGradient';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
};

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  variant = 'solid',
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={[
            styles.base,
            variant === 'solid' && styles.solid,
            variant === 'ghost' && styles.ghost,
            variant === 'onGradient' && styles.onGradient,
            variant === 'ghostOnGradient' && styles.ghostOnGradient,
          ]}
        >
          <View style={styles.content}>
            <Text
              style={[
                styles.label,
                (variant === 'solid' || variant === 'ghostOnGradient') && { color: colors.white },
                variant === 'ghost' && { color: colors.primary },
                variant === 'onGradient' && { color: colors.primary },
              ]}
            >
              {label}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  solid: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  onGradient: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  ghostOnGradient: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  content: {
    width: '100%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.button },
});
