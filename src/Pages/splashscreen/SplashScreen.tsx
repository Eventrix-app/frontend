import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Easing, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';

const easeOut = Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1));
const INTRO_MS = 900;
const EXIT_MS  = 700;

const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Splash'>>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isSmallScreen  = windowWidth < 375;
  const isMediumScreen = windowWidth >= 375 && windowWidth < 414;

  const getResponsiveLogoSize    = () => isSmallScreen ? 120 : isMediumScreen ? 140 : 160;
  const getResponsiveAppNameSize = () => isSmallScreen ? 48  : isMediumScreen ? 56  : 64;
  const getResponsiveTaglineSize = () => isSmallScreen ? 20  : isMediumScreen ? 22  : 24;

  // Intro animations
  const logoOpacity     = useRef(new Animated.Value(0)).current;
  const logoTranslateY  = useRef(new Animated.Value(-60)).current;
  const brandOpacity    = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(60)).current;
  const taglineOpacity  = useRef(new Animated.Value(0)).current;

  // Exit animation — whole screen slides up and fades out
  const screenTranslateY = useRef(new Animated.Value(0)).current;
  const screenOpacity    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 1: intro sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity,    { toValue: 1, duration: INTRO_MS, easing: easeOut, useNativeDriver: true }),
        Animated.timing(logoTranslateY, { toValue: 0, duration: INTRO_MS, easing: easeOut, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(brandOpacity,    { toValue: 1, duration: INTRO_MS - 100, easing: easeOut, useNativeDriver: true }),
        Animated.timing(brandTranslateY, { toValue: 0, duration: INTRO_MS - 100, easing: easeOut, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, easing: easeOut, useNativeDriver: true }),
    ]).start();

    // Phase 2: after pause, slide screen up + fade out, then replace
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(screenTranslateY, {
          toValue: -windowHeight,
          duration: EXIT_MS,
          easing: easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: EXIT_MS,
          easing: easeOut,
          useNativeDriver: true,
        }),
      ]).start(() => navigation.replace('Onboarding'));
    }, 3200);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] },
      ]}
    >
      <Animated.View
        style={[styles.logo, { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }]}
      >
        <Image
          source={require('../../../assets/logo/logo.jpg')}
          style={{
            width: getResponsiveLogoSize(),
            height: getResponsiveLogoSize(),
            borderRadius: borderRadius.lg,
          }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text
        style={[
          styles.appName,
          { fontSize: getResponsiveAppNameSize(), opacity: brandOpacity, transform: [{ translateY: brandTranslateY }] },
        ]}
      >
        Eventrix
      </Animated.Text>

      <Animated.Text
        style={[styles.tagline, { fontSize: getResponsiveTaglineSize(), opacity: taglineOpacity }]}
      >
        Discover Events Near You
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F43362',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    marginBottom: spacing.lg,
  },
  appName: {
    color: colors.white,
    fontWeight: '800',
    lineHeight: 60,
    marginBottom: spacing.sm,
  },
  tagline: {
    color: colors.white,
    fontWeight: '600',
    lineHeight: 30,
    opacity: 0.9,
  },
});

export default SplashScreen;
