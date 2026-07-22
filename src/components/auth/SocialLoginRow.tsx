import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

// Inlined from assets/login screen/apple-dark.svg / apple-light.svg (white / black fill
// respectively) — react-native-svg's SvgXml can't load a bare require()'d .svg file on
// native, same reasoning as EventInterestCard's inlined badge icons.
const APPLE_DARK_SVG = `<svg fill="#FFFFFF" width="256px" height="256px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>`;
const APPLE_LIGHT_SVG = `<svg fill="#000000" width="256px" height="256px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>`;

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
            <Image
              source={require('../../../assets/login screen/Facebookpng.png')}
              style={[styles.socialIconImage, compact && styles.socialIconImageCompact]}
              resizeMode="contain"
            />
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, compact && styles.socialBtnCompact]}
        activeOpacity={0.8}
      >
        <View style={[styles.socialGlass, compact && styles.socialGlassCompact]}>
          <View style={styles.socialGlassContent}>
            <Image
              source={require('../../../assets/login screen/google.png')}
              style={[styles.socialIconImage, compact && styles.socialIconImageCompact]}
              resizeMode="contain"
            />
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
  socialIconImage: {
    width: 104,
    height: 104,
  },
  socialIconImageCompact: {
    width: 72,
    height: 72,
  },
});
