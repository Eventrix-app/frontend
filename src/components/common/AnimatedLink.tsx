import React, { useRef } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Text } from './Text';

type AnimatedLinkProps = {
  label: string;
  onPress: () => void;
  style?: StyleProp<TextStyle>;
  disabled?: boolean;
};

const AnimatedLink: React.FC<AnimatedLinkProps> = ({ label, onPress, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const underline = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 6 }),
      Animated.timing(underline, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
      Animated.timing(underline, { toValue: 0, duration: 220, useNativeDriver: false }),
    ]).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      disabled={disabled}
    >
      <Animated.View style={[styles.wrap, { transform: [{ scale }] }, disabled && styles.disabled]}>
        <Text style={[styles.label, style]}>{label}</Text>
        <Animated.View style={[styles.underline, { transform: [{ scaleX: underline }] }]} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.brandPink,
    fontSize: 15,
    fontWeight: '700',
  },
  underline: {
    marginTop: 3,
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: colors.brandPink,
  },
});

export default AnimatedLink;
