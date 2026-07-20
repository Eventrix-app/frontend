import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/types';
import { RootState } from '../../store';

const logoVideoSource = require('../../../assets/3d-logo-reveal.mp4');

// 4s video + buffer — guarantees we move on even if `playToEnd` never fires (e.g. a
// player stuck in a bad state on some device).
const FALLBACK_TIMEOUT_MS = 8000;

// The entire splash screen is this video — no logo image, no brand-name text, no
// tagline. It fills the screen (contentFit="cover" + flex:1, so it fits any device
// size dynamically) and starts playing the moment this screen mounts. The native
// splash (app.json `splash.image`) is left up behind it until the video reports
// readyToPlay, so there's no blank/white gap between the native splash and this one.
const SplashScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Splash'>>();
  const insets = useSafeAreaInsets();
  // Persisted per-device (see onboardingDraftSlice) — a returning user who has already
  // been through the onboarding chain on this device (or just authenticated) skips
  // straight to Login instead of replaying Onboarding/InterestSelection/etc. every time.
  const hasCompletedOnboarding = useSelector(
    (state: RootState) => state.onboardingDraft.hasCompletedOnboarding,
  );

  // Guards against playToEnd/error/timeout/Skip racing each other and firing
  // navigation.replace more than once (or after the screen has already unmounted).
  const hasNavigatedRef = useRef(false);
  const hasHiddenNativeSplashRef = useRef(false);

  const hideNativeSplash = useCallback(() => {
    if (hasHiddenNativeSplashRef.current) return;
    hasHiddenNativeSplashRef.current = true;
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  const goNext = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    // Safety net: if the video errored or timed out before ever reaching readyToPlay,
    // the native splash would otherwise never get hidden.
    hideNativeSplash();
    if (navigation.isFocused()) {
      navigation.replace(hasCompletedOnboarding ? 'Login' : 'Onboarding');
    }
  }, [navigation, hasCompletedOnboarding, hideNativeSplash]);

  const player = useVideoPlayer(logoVideoSource, (p) => {
    p.muted = true;
    p.volume = 0;
    p.loop = false;
  });

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        hideNativeSplash();
      } else if (status === 'error') {
        goNext();
      }
    });
    const endSub = player.addListener('playToEnd', goNext);
    const fallback = setTimeout(goNext, FALLBACK_TIMEOUT_MS);

    // Not called from useVideoPlayer's setup callback: on web, expo-video's player has no
    // <video> element attached yet at that point (VideoView mounts it in its own effect,
    // which — since it's a descendant — commits before this one), so play() there
    // silently no-ops and the view's own mount-sync sees a fresh, still-paused element and
    // never starts it. Calling it here, after the view is guaranteed mounted, is what
    // actually starts playback on web; it's a harmless already-playing call on native.
    player.play();

    return () => {
      statusSub.remove();
      endSub.remove();
      clearTimeout(fallback);
    };
  }, [player, goNext, hideNativeSplash]);

  return (
    <>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
        onPress={goNext}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[
          styles.skipButton,
          { top: insets.top + 12, right: insets.right + 16 },
        ]}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  video: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SplashScreen;
