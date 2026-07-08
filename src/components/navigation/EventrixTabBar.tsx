import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const TABS: { name: string; label: string; icon: string }[] = [
  { name: 'Home', label: 'Home', icon: '🏠' },
  { name: 'Explore', label: 'Explore', icon: '🔷' },
  { name: 'Shorts', label: 'Shorts', icon: '▶️' },
  { name: 'Bookings', label: 'Bookings', icon: '🎫' },
];
export const EventrixTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View style={[styles.glass, styles.bar]}>
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name) ?? {
            label: route.name,
            icon: '•',
          };
          const active = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              {active ? <View style={styles.indicator} /> : null}
              <Text style={[styles.icon, !active && styles.iconMuted]}>{tab.icon}</Text>
              <Text style={[styles.label, active ? styles.labelActive : styles.labelMuted]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  glass: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: '70%',
    height: 4,
    backgroundColor: colors.brandPink,
    borderBottomLeftRadius: 1000,
    borderBottomRightRadius: 1000,
  },
  icon: {
    fontSize: 22,
  },
  iconMuted: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
  },
  labelActive: {
    color: colors.brandPink,
    fontWeight: '500',
  },
  labelMuted: {
    color: colors.stone600,
    fontWeight: '400',
  },
});
