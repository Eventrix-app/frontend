import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  color?: string;
  size?: number;
}

export const RightArrow: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z" fill={color} />
  </Svg>
);

export const LeftArrow: React.FC<IconProps> = ({ color = '#000000', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960">
    <Path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" fill={color} />
  </Svg>
);
