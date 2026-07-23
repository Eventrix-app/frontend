import React, { useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

// Inlined from assets/login screen/apple-dark.svg / apple-light.svg (white / black fill
// respectively) — react-native-svg's SvgXml can't load a bare require()'d .svg file on
// native, same reasoning as EventInterestCard's inlined badge icons.
const APPLE_DARK_SVG = `<svg fill="#FFFFFF" width="256px" height="256px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>`;
const APPLE_LIGHT_SVG = `<svg fill="#000000" width="256px" height="256px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>`;

// Inlined from assets/login screen/facebook.svg — same SvgXml-on-native constraint as the
// Apple icon above.
const FACEBOOK_SVG = `<svg width="256px" height="256px" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="url(#paint0_linear_87_7208)"/><path d="M21.2137 20.2816L21.8356 16.3301H17.9452V13.767C17.9452 12.6857 18.4877 11.6311 20.2302 11.6311H22V8.26699C22 8.26699 20.3945 8 18.8603 8C15.6548 8 13.5617 9.89294 13.5617 13.3184V16.3301H10V20.2816H13.5617V29.8345C14.2767 29.944 15.0082 30 15.7534 30C16.4986 30 17.2302 29.944 17.9452 29.8345V20.2816H21.2137Z" fill="white"/><defs><linearGradient id="paint0_linear_87_7208" x1="16" y1="2" x2="16" y2="29.917" gradientUnits="userSpaceOnUse"><stop stop-color="#18ACFE"/><stop offset="1" stop-color="#0163E0"/></linearGradient></defs></svg>`;

// Inlined from assets/login screen/google.svg — same SvgXml-on-native constraint as the
// Apple icon above.
const GOOGLE_SVG = `<svg width="256px" height="256px" viewBox="-0.5 0 48 48" version="1.1" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-401.000000, -860.000000)"><g transform="translate(401.000000, 860.000000)"><path d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24" fill="#FBBC05"/><path d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333" fill="#EB4335"/><path d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667" fill="#34A853"/><path d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24" fill="#4285F4"/></g></g></svg>`;

type SocialLoginRowProps = {
  compact?: boolean;
  // 'default' (Login): dark theme -> apple-dark.svg (white), light theme -> apple-light.svg (black).
  // 'inverted' (Register): dark theme -> apple-light.svg (black), light theme -> apple-dark.svg (white).
  appleIconVariant?: 'default' | 'inverted';
};

export const SocialLoginRow: React.FC<SocialLoginRowProps> = ({ compact = false, appleIconVariant = 'default' }) => {
  const { theme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const wantsDarkVariant = appleIconVariant === 'inverted' ? theme === 'light' : theme === 'dark';
  const appleIconXml = wantsDarkVariant ? APPLE_DARK_SVG : APPLE_LIGHT_SVG;
  const appleIconSize = compact ? 72 : 104;
  return (
  <View style={[styles.wrap, compact && styles.wrapCompact]}>
    <View style={styles.dividerRow}>
      <View style={styles.line} />
      <Text style={styles.dividerText}>Or continue with</Text>
      <View style={styles.line} />
    </View>
    <View style={styles.icons}>
      <TouchableOpacity
        style={[styles.socialBtn, compact && styles.socialBtnCompact]}
        activeOpacity={0.8}
      >
        <View style={[styles.socialGlass, compact && styles.socialGlassCompact]}>
          <View style={styles.socialGlassContent}>
            <SvgXml xml={FACEBOOK_SVG} width={appleIconSize} height={appleIconSize} />
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, compact && styles.socialBtnCompact]}
        activeOpacity={0.8}
      >
        <View style={[styles.socialGlass, compact && styles.socialGlassCompact]}>
          <View style={styles.socialGlassContent}>
            <SvgXml xml={GOOGLE_SVG} width={appleIconSize} height={appleIconSize} />
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, compact && styles.socialBtnCompact]}
        activeOpacity={0.8}
      >
        <View style={[styles.socialGlass, compact && styles.socialGlassCompact]}>
          <View style={styles.socialGlassContent}>
            <SvgXml xml={appleIconXml} width={appleIconSize} height={appleIconSize} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: {
    marginTop: spacing.s,
    gap: spacing.md,
  },
  wrapCompact: {
    marginTop: spacing.s,
    gap: spacing.sm,
    marginBottom: spacing.s,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutralLine,
  },
  dividerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  icons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  socialBtn: {
    width: 300,
    height: 300,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnCompact: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  socialGlass: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    width: '100%',
    height: '100%',
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  socialGlassCompact: {
    borderRadius: 20,
  },
  socialGlassContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
