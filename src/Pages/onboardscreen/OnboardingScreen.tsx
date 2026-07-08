import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { Dots } from '../../components/Dots';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Slide = {
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
};

const slides: Slide[] = [
  {
    image: require('../../../assets/carousel/onboarding-carousel/1.jpg'),
    title: 'Find events near you',
    subtitle:
      'Explore events happening around you based on your interests, location and schedule.',
  },
  {
    image: require('../../../assets/carousel/onboarding-carousel/2.jpg'),
    title: 'Join what excites you',
    subtitle:
      'From workshops and concerts to sports and meetups — choose what fits your vibe.',
  },
  {
    image: require('../../../assets/carousel/onboarding-carousel/3.jpg'),
    title: 'Connect beyond events',
    subtitle:
      'Watch reels, chat with attendees and be part of the event community.',
  },
];

const { width, height } = Dimensions.get('window');
const GRADIENT_HEIGHT = Math.min(height * 0.52, 480);

const FADE_MS   = 520;
const SLIDE_MS  = 600;
const TRANS_MS  = 420;
const easeOut   = Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1));

type OnboardingScreenProps = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const RightArrow = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 -960 960 960">
    <Path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z" fill={color} />
  </Svg>
);

const LeftArrow = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 -960 960 960">
    <Path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" fill={color} />
  </Svg>
);

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [index, setIndex] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);

  // Screen-level slide transition
  const screenX = useRef(new Animated.Value(0)).current;

  // Slide in from below on mount (concurrent with splash exit)
  const mountTranslateY = useRef(new Animated.Value(80)).current;
  const mountOpacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountTranslateY, {
        toValue: 0,
        duration: 700,
        easing: easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(mountOpacity, {
        toValue: 1,
        duration: 700,
        easing: easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Carousel animations
  const imageOpacity    = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  const textOpacity     = useRef(new Animated.Value(1)).current;
  const textTranslateY  = useRef(new Animated.Value(0)).current;
  const btnOpacity      = useRef(new Animated.Value(1)).current;

  const timing = (anim: Animated.Value, toValue: number, duration: number) =>
    Animated.timing(anim, { toValue, duration, easing: easeOut, useNativeDriver: true });

  const goTo = useCallback(
    (next: number, current: number) => {
      const direction = next > current ? 1 : -1;

      Animated.parallel([
        timing(imageOpacity,    0,               FADE_MS),
        timing(imageTranslateX, -direction * 70, FADE_MS),
        timing(textOpacity,     0,               FADE_MS - 60),
        timing(textTranslateY,  24,              FADE_MS - 60),
        timing(btnOpacity,      0,               FADE_MS - 80),
      ]).start(() => {
        setIndex(next);
        setVisibleIndex(next);
        imageTranslateX.setValue(direction * 70);
        textTranslateY.setValue(30);

        Animated.parallel([
          timing(imageOpacity,    1, FADE_MS + 120),
          timing(imageTranslateX, 0, SLIDE_MS + 100),
          timing(textOpacity,     1, SLIDE_MS + 80),
          timing(textTranslateY,  0, SLIDE_MS + 80),
          timing(btnOpacity,      1, FADE_MS + 120),
        ]).start();
      });
    },
    [imageOpacity, imageTranslateX, textOpacity, textTranslateY, btnOpacity],
  );

  const handleNext = useCallback(() => {
    if (index < slides.length - 1) goTo(index + 1, index);
  }, [index, goTo]);

  const handlePrev = useCallback(() => {
    if (index > 0) goTo(index - 1, index);
  }, [index, goTo]);

  const handleFinish = useCallback(() => {
    // Slide screen up and out, then replace — same as splash→onboarding
    Animated.parallel([
      Animated.timing(mountTranslateY, {
        toValue: -height,
        duration: 700,
        easing: easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(mountOpacity, {
        toValue: 0,
        duration: 700,
        easing: easeOut,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.replace('InterestSelection');
      mountTranslateY.setValue(0);
      mountOpacity.setValue(1);
    });
  }, [mountTranslateY, mountOpacity, navigation]);

  const isFirst = index === 0;
  const isLast  = index === slides.length - 1;
  const slide   = slides[visibleIndex];

  return (
    <Animated.View style={[
      styles.safe,
      {
        opacity: mountOpacity,
        transform: [{ translateY: mountTranslateY }],
      },
    ]}>
      <SafeAreaView style={styles.fill}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

        <View pointerEvents="none" style={styles.glow} />

        <Animated.View
          style={[
            styles.imageWrap,
            { opacity: imageOpacity, transform: [{ translateX: imageTranslateX }] },
          ]}
        >
          <Image source={slide.image} style={styles.image} resizeMode="contain" />
        </Animated.View>

        <LinearGradient
          colors={[
            'rgba(255, 51, 102, 0)',
            'rgba(255, 51, 102, 0.18)',
            'rgba(255, 51, 104, 0.95)',
            colors.primaryDark,
          ]}
          locations={[0, 0.25, 0.7, 1]}
          style={styles.gradient}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.textWrap,
              { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </Animated.View>

          <View style={styles.dotsWrap}>
            <Dots total={slides.length} index={index} />
          </View>

          <Animated.View style={[styles.bottom, { opacity: btnOpacity }]}>
            {isFirst ? (
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [styles.btnOnGradient, { flex: 1, opacity: pressed ? 0.82 : 1 }]}
              >
                <Text style={styles.btnOnGradientText}>Next</Text>
                <RightArrow color={colors.primary} />
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={handlePrev}
                  style={({ pressed }) => [styles.btnGhost, { flex: 1, marginRight: spacing.md, opacity: pressed ? 0.82 : 1 }]}
                >
                  <LeftArrow color="rgba(255,255,255,0.9)" />
                  <Text style={styles.btnGhostText}>Prev</Text>
                </Pressable>
                <Pressable
                  onPress={isLast ? handleFinish : handleNext}
                  style={({ pressed }) => [styles.btnOnGradient, { flex: 1.2, opacity: pressed ? 0.82 : 1 }]}
                >
                  <Text style={styles.btnOnGradientText}>Next</Text>
                  <RightArrow color={colors.primary} />
                </Pressable>
              </>
            )}
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  fill: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: -width * 0.4,
    left: -width * 0.2,
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },
  imageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    marginTop: spacing.xxl,
  },
  image: { width: width * 1.15, height: width * 1 },
  gradient: {
    position: 'absolute',
    left: -width * 0.15,
    right: -width * 0.15,
    bottom: 0,
    height: GRADIENT_HEIGHT,
    borderTopLeftRadius: width,
    borderTopRightRadius: width,
    paddingHorizontal: spacing.xl + width * 0.15,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'flex-end',
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.title,
    fontFamily: 'Zalando Sans Expanded',
    fontWeight: '500',
    fontSize: 24,
    lineHeight: 24,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    fontFamily: 'Poppins',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    maxWidth: 340,
  },
  dotsWrap: { paddingVertical: spacing.md, alignItems: 'center' },
  bottom: {
    flexDirection: 'row',
    paddingTop: spacing.md,
  },
  btnGhost: {
    height: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
  },
  btnGhostText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnOnGradient: {
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  btnOnGradientText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default OnboardingScreen;
