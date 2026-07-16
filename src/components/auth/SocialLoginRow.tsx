import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import GlassSurface from '../common/GlassSurface';
import { Text } from '../common/Text';

type SocialLoginRowProps = {
  compact?: boolean;
};

export const SocialLoginRow: React.FC<SocialLoginRowProps> = ({ compact = false }) => (
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
        <GlassSurface
          style={[styles.socialGlass, compact && styles.socialGlassCompact]}
          contentStyle={styles.socialGlassContent}
        >
          <Image
            source={require('../../../assets/login screen/Facebookpng.png')}
            style={[styles.socialIconImage, compact && styles.socialIconImageCompact]}
            resizeMode="contain"
          />
        </GlassSurface>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, compact && styles.socialBtnCompact]}
        activeOpacity={0.8}
      >
        <GlassSurface
          style={[styles.socialGlass, compact && styles.socialGlassCompact]}
          contentStyle={styles.socialGlassContent}
        >
          <Image
            source={require('../../../assets/login screen/google.png')}
            style={[styles.socialIconImage, compact && styles.socialIconImageCompact]}
            resizeMode="contain"
          />
        </GlassSurface>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, compact && styles.socialBtnCompact]}
        activeOpacity={0.8}
      >
        <GlassSurface
          style={[styles.socialGlass, compact && styles.socialGlassCompact]}
          contentStyle={styles.socialGlassContent}
        >
          <Image
            source={require('../../../assets/login screen/apple.png')}
            style={[styles.socialIconImage, compact && styles.socialIconImageCompact]}
            resizeMode="contain"
          />
        </GlassSurface>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
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
    color: 'rgba(0,0,0,0.5)',
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    width: '100%',
    height: '100%',
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
