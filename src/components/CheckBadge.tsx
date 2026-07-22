import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './common/Text';

type Props = { checked: boolean };

/**
 * Scalloped/badge-style check indicator that mirrors the Figma reference.
 * Filled pink badge with a white check when "on", soft grey ring when "off".
 * Cross-fades smoothly between the two states.
 */
export const CheckBadge: React.FC<Props> = ({ checked }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();
  }, [checked, anim]);

  const onScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <View style={styles.wrap}>
      {/* Off state */}
      <Animated.View
        style={[
          styles.layer,
          styles.off,
          { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
        ]}
      />
      {/* On state */}
      <Animated.View
        style={[
          styles.layer,
          styles.on,
          { opacity: anim, transform: [{ scale: onScale }] },
        ]}
      >
        <Text style={styles.check}>✓</Text>
      </Animated.View>
    </View>
  );
};

const SIZE = 24;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  layer: {
    position: 'absolute',
    inset: 0 as unknown as number,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: {
    borderWidth: 1.5,
    borderColor: '#D8D8DE',
    backgroundColor: '#F2F2F5',
  },
  on: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  check: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
});
