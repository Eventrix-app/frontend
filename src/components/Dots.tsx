import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export const Dots: React.FC<{ total: number; index: number }> = ({ total, index }) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
};

const Dot: React.FC<{ active: boolean }> = ({ active }) => {
  const w = useRef(new Animated.Value(active ? 24 : 8)).current;
  const o = useRef(new Animated.Value(active ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(w, { toValue: active ? 24 : 8, useNativeDriver: false, speed: 20 }),
      Animated.timing(o, { toValue: active ? 1 : 0.5, duration: 220, useNativeDriver: false }),
    ]).start();
  }, [active]);

  return (
    <Animated.View
      style={[styles.dot, { width: w, opacity: o, backgroundColor: '#FFFFFF' }]}
    />
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },
});