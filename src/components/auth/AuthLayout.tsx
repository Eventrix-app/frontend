import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { LinearGradient } from 'expo-linear-gradient';
import GlassSurface from '../common/GlassSurface';

type AuthLayoutProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  centerTitle?: boolean;
  scrollable?: boolean;
};

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  centerTitle = false,
  scrollable = false,
}) => {
  const insets = useSafeAreaInsets();

  const logoTranslateY = useRef(new Animated.Value(-40)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(40)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easing = Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1));
    Animated.parallel([
      Animated.timing(logoTranslateY, { toValue: 0, duration: 600, easing, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, easing, useNativeDriver: true }),
      Animated.timing(brandTranslateY, { toValue: 0, duration: 600, easing, delay: 80, useNativeDriver: true }),
      Animated.timing(brandOpacity, { toValue: 1, duration: 600, easing, delay: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const contentStyle = [
    styles.content,
    {
      paddingTop: 0,
      paddingBottom: insets.bottom + (scrollable ? spacing.xl : spacing.xs),
    },
    !scrollable && styles.contentNoScroll,
  ];

  const body = (
    <>
      <View style={[styles.brandCard, !scrollable && styles.brandCardCompact]}>
        <View style={[styles.brandCardContent, { paddingTop: insets.top }]}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] }}>
            <Image
              source={require('../../../assets/logo/logo.jpg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.Text style={[styles.brandName, { opacity: brandOpacity, transform: [{ translateY: brandTranslateY }] }]}>
            Eventrix
          </Animated.Text>
        </View>
      </View>

      <GlassSurface style={styles.bodyCard} contentStyle={styles.bodyContent} intensity={42}>
        <View style={[styles.headingBlock, centerTitle && styles.headingCenter]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {children}
      </GlassSurface>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, !scrollable && styles.rootNoScroll]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#FFF6F8', '#FFFFFF', '#FDE7EC']}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={require('../../../assets/Background.png')}
        style={styles.orbTop}
        resizeMode="cover"
      />
      <View style={styles.orbBottom} />
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        <ScrollView
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          style={styles.scrollNoScroll}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },
  rootNoScroll: {
    flex: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { height: '100%' as const, maxHeight: '100%' as const }
      : {}),
  },
  orbTop: {
    position: 'absolute',
    top: -200,
    left: -28,
    right: 0,
    width: '120%',
    height: 850,
  },
  orbBottom: {
    position: 'absolute',
    bottom: 10,
    left: 80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(20,39,102,0.12)',
  },
  scroll: {
    flex: 1,
  },
  scrollNoScroll: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 0,
  },
  contentNoScroll: {
    flexGrow: 0,
    overflow: 'hidden',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.brandNavy,
    textTransform: 'capitalize',
  },
  brandCard: {
    width: '100%',
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  brandCardCompact: {
    height: 180,
  },
  brandCardContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headerWavy: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  headingBlock: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  bodyCard: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headingCenter: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Zalando Sans Expanded',
    fontSize: 32,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#0D0D0D',
  },
  subtitle: {
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 21,
    letterSpacing: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: 'rgba(0,0,0,0.5)',
  },
});
