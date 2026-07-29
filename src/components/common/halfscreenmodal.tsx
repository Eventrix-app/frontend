import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useKeyboardShift } from '../../hooks/useKeyboardShift';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  heightPercent?: number; // 0–1, default 0.68 (68% of screen height)
  /**
   * Whether the whole sheet rises with the keyboard. Default true, which is right for a sheet
   * that is a form — everything below the focused field (a Done/Save button) has to stay
   * reachable, so the sheet moves as one.
   *
   * Set false when only one element needs to clear the keyboard and the rest should stay put
   * — a comment thread, where lifting the entire sheet drags the conversation off-screen. The
   * sheet then stays anchored and the caller is responsible for moving its own input, e.g.
   * with the same useKeyboardShift hook this uses.
   */
  liftOnKeyboard?: boolean;
  children: React.ReactNode;
}

const HalfScreenModal: React.FC<Props> = ({
  visible,
  onClose,
  heightPercent = 0.68,
  liftOnKeyboard = true,
  children,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetHeight = SCREEN_HEIGHT * heightPercent;
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // Lifts the sheet clear of the keyboard.
  //
  // A KeyboardAvoidingView *inside* the sheet cannot do this: the sheet is
  // position:absolute, bottom:0 with a fixed height, so it stays pinned to the bottom of
  // the window no matter what its children do — a KAV in there can only shrink content
  // within an area the keyboard is already covering. The sheet itself has to move, so the
  // shift is applied to its own transform here.
  //
  // This matters beyond aesthetics: any action below the input (a Done/Save button, which
  // is the usual sheet layout) is unreachable while the keyboard covers it, so taps land on
  // the keyboard instead and the sheet appears to ignore them.
  const { shift: keyboardShift, keyboardVisible } = useKeyboardShift();
  // Keeps the Modal mounted just long enough to play the close animation —
  // Modal's own `visible` prop unmounts instantly otherwise, cutting it off.
  const [mounted, setMounted] = useState(visible);
  // The sheet is pinned to bottom:0, i.e. the very edge of the window — which on Android is
  // *behind* the navigation bar. Anything the sheet anchors to its own bottom (a comment
  // composer, a Done button) ends up underneath it and cannot be tapped.
  //
  // Only applied while the keyboard is down. Once it opens the sheet has lifted clear of the
  // bottom of the screen entirely, so reserving space for a nav bar that is no longer under
  // the sheet would just leave a gap between the content and the keyboard.
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: sheetHeight, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, sheetHeight]);

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      {/* A second GestureHandlerRootView, even though App.tsx already wraps the whole app in
          one. React Native's Modal renders into its own native view hierarchy — a sibling of
          the app root, not a descendant — so gesture handlers mounted inside it are outside
          the root view's reach and never receive touches at all.

          Every SpringPressable is a GestureDetector, so without this, *no* SpringPressable
          inside any sheet responded to taps. That is why EditReel's "Done" appeared to do
          nothing: the tap gesture never ended, so the text was never saved. It looked like a
          keyboard-occlusion problem and was not. */}
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: keyboardVisible ? 0 : insets.bottom,
              // Open/close animation and keyboard shift composed into one transform. Both
              // are native-driven, so Animated.add stays on the UI thread.
              transform: [
                { translateY: liftOnKeyboard ? Animated.add(translateY, keyboardShift) : translateY },
              ],
            },
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutralLine,
    alignSelf: 'center',
    marginBottom: 8,
  },
});

export default HalfScreenModal;