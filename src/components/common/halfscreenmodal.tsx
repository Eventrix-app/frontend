import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Keyboard, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  heightPercent?: number; // 0–1, default 0.68 (68% of screen height)
  children: React.ReactNode;
}

const HalfScreenModal: React.FC<Props> = ({ visible, onClose, heightPercent = 0.68, children }) => {
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
  const keyboardShift = useRef(new Animated.Value(0)).current;
  // Keeps the Modal mounted just long enough to play the close animation —
  // Modal's own `visible` prop unmounts instantly otherwise, cutting it off.
  const [mounted, setMounted] = useState(visible);

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

  useEffect(() => {
    // will* on iOS runs in step with the system animation; Android only emits did*.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardShift, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 180,
        useNativeDriver: true,
      }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? ((e as any)?.duration ?? 250) : 180,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [keyboardShift]);

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              // Open/close animation and keyboard shift composed into one transform. Both
              // are native-driven, so Animated.add stays on the UI thread.
              transform: [{ translateY: Animated.add(translateY, keyboardShift) }],
            },
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
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