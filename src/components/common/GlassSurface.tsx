import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

// Mobile counterpart to liquid-glass.js: that lib bends the DOM behind an
// element via an SVG displacement filter + backdrop-filter, which has no RN
// equivalent. Here the same *material* (frosted translucency, tinted
// gradient wash, specular top highlight, soft lifted shadow) is rebuilt from
// BlurView + LinearGradient, tuned for this app's light backdrop instead of
// the reference demo's dark photo.
//
// The decorative layers (blur/gradient/sheen) are absolutely-positioned
// siblings of the in-flow content view, not a wrapper around it — an
// absolutely-positioned child is removed from layout and can't be used to
// size its parent, so content must stay the one element driving height when
// a caller doesn't pass an explicit size via `style`.
type GlassSurfaceProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** 'glass' = translucent frosted panel; 'solid' = opaque surface with just the glossy sheen + lift. */
  variant?: 'glass' | 'solid';
  /** Backdrop blur strength (BlurView intensity, 0-100). */
  intensity?: number;
  /** Specular top highlight, on by default. */
  highlight?: boolean;
  /** Soft ambient shadow, on by default. */
  shadow?: boolean;
};

const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  contentStyle,
  variant = 'glass',
  intensity = 34,
  highlight = true,
  shadow = true,
}) => {
  const flat = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const radius = typeof flat.borderRadius === 'number' ? flat.borderRadius : 16;

  return (
    <View
      style={[style, { borderRadius: radius, overflow: 'hidden' }, shadow && styles.shadow]}
    >
      {variant === 'glass' ? (
        <>
          <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.2)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        </>
      ) : null}
      {highlight ? (
        <LinearGradient
          colors={['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.65 }}
          style={styles.sheen}
          pointerEvents="none"
        />
      ) : null}
      <View style={contentStyle}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    opacity: 0.3,
  },
  shadow: Platform.select({
    android: { elevation: 6 },
    default: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
    },
  }) as ViewStyle,
});

export default GlassSurface;
