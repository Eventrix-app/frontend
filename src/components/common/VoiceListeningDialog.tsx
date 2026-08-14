import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from './Text';
import { MicIcon } from './Icons';

interface Props {
  visible: boolean;
  // Live transcript. Empty until the recogniser reports its first word.
  transcript: string;
  // True only while a voice is actually detected, so the bars idle when the room is quiet
  // instead of implying it is hearing something.
  isSpeaking: boolean;
  // Keeps what was heard and runs the search.
  onDone: () => void;
  // Discards it — dismissing must not search for a phrase the user just abandoned.
  onCancel: () => void;
}

const BAR_COUNT = 5;
// Staggered so the bars ripple outward from the centre rather than pumping in unison.
const BAR_DELAYS = [0, 90, 180, 90, 0];

const VoiceListeningDialog: React.FC<Props> = ({ visible, transcript, isSpeaking, onDone, onCancel }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pulse = useRef(new Animated.Value(0)).current;
  const bars = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.25))).current;

  // Halo behind the mic — runs the whole time the dialog is open so the screen never looks
  // frozen during the pause before the first word.
  useEffect(() => {
    if (!visible) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  // Driven by real speech detection rather than a timer: silence settles the bars flat.
  useEffect(() => {
    if (!visible) return;

    const animations = bars.map((bar, i) =>
      isSpeaking
        ? Animated.loop(
            Animated.sequence([
              Animated.delay(BAR_DELAYS[i]),
              Animated.timing(bar, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }),
              Animated.timing(bar, { toValue: 0.3, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }),
            ]),
          )
        : Animated.timing(bar, { toValue: 0.25, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    );

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [visible, isSpeaking, bars]);

  const haloStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      {/* Tapping the backdrop cancels, matching every other sheet in the app. */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Swallows taps so pressing inside the card does not dismiss it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.micWrap}>
            <Animated.View style={[styles.halo, haloStyle]} />
            <View style={styles.micCircle}>
              <MicIcon color={colors.white} size={30} />
            </View>
          </View>

          <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {bars.map((bar, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: bar.interpolate({ inputRange: [0, 1], outputRange: [6, 34] }),
                    opacity: isSpeaking ? 1 : 0.4,
                  },
                ]}
              />
            ))}
          </View>

          <Text variant="h3" style={styles.title}>
            {isSpeaking ? 'Listening…' : 'Speak now'}
          </Text>

          <Text
            variant="body"
            style={[styles.transcript, !transcript && styles.transcriptEmpty]}
            numberOfLines={3}
            accessibilityLiveRegion="polite"
          >
            {transcript || 'Try “music festival this weekend”'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text variant="button" style={styles.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneBtn, !transcript && styles.doneBtnDisabled]}
              onPress={onDone}
              disabled={!transcript}
              activeOpacity={0.85}
            >
              <Text variant="button" style={styles.doneLabel}>Search</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
    },
    micWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    halo: {
      position: 'absolute',
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.brandPink,
    },
    micCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.brandPink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bars: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 36,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    bar: { width: 4, borderRadius: 2, backgroundColor: colors.brandPink },
    title: { color: colors.text, marginBottom: spacing.xs },
    transcript: {
      color: colors.text,
      textAlign: 'center',
      minHeight: 44,
      marginBottom: spacing.lg,
    },
    transcriptEmpty: { color: colors.textSecondary, fontStyle: 'italic' },
    actions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
    cancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelLabel: { color: colors.textSecondary },
    doneBtn: {
      flex: 1,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: colors.brandPink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneBtnDisabled: { opacity: 0.4 },
    doneLabel: { color: colors.white },
  });

export default VoiceListeningDialog;
