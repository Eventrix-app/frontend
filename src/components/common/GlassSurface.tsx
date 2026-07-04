import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type GlassSurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

const GlassSurface: React.FC<GlassSurfaceProps> = ({ children, style, contentStyle }) => (
  <View style={style}>
    <View style={contentStyle}>{children}</View>
  </View>
);

export default GlassSurface;
