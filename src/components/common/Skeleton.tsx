import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  variant?: 'text' | 'circle' | 'rect';
  style?: any;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  variant = 'rect',
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: variant === 'circle' ? height / 2 : theme.borderRadius.sm,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.borderLight,
  },
});

export default Skeleton;
