import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

/**
 * Tracks the on-screen keyboard as a native-driven Animated.Value.
 *
 * `shift` is negative — it is the offset to translate something *up* by so it clears the
 * keyboard, i.e. `transform: [{ translateY: shift }]`. `height` is the same figure positive,
 * for callers that need it as padding instead.
 *
 * Extracted from HalfScreenModal so a sheet can move one part of itself (a composer pinned
 * above the keyboard) instead of the whole sheet, without duplicating the listener setup or
 * the platform differences below.
 */
export function useKeyboardShift(): {
  shift: Animated.Value;
  height: Animated.Value;
  keyboardVisible: boolean;
} {
  const shift = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // will* on iOS runs in step with the system animation; Android only emits did*.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animate = (toShift: number, toHeight: number, duration: number) => {
      Animated.parallel([
        Animated.timing(shift, { toValue: toShift, duration, useNativeDriver: true }),
        Animated.timing(height, { toValue: toHeight, duration, useNativeDriver: true }),
      ]).start();
    };

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      const h = e.endCoordinates.height;
      animate(-h, h, Platform.OS === 'ios' ? (e.duration ?? 250) : 180);
    });
    const onHide = Keyboard.addListener(hideEvent, (e) => {
      setKeyboardVisible(false);
      animate(0, 0, Platform.OS === 'ios' ? ((e as any)?.duration ?? 250) : 180);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [shift, height]);

  return { shift, height, keyboardVisible };
}
