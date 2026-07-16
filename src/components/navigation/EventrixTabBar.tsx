import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';

import HouseIcon from '../../../assets/icons/navbar/House.svg';
import ShapesIcon from '../../../assets/icons/navbar/Shapes.svg';
import PlayCircleIcon from '../../../assets/icons/navbar/PlayCircle.svg';
import TicketIcon from '../../../assets/icons/navbar/Ticket.svg';

const TABS: { name: string; label: string; icon: any }[] = [
  { name: 'Home', label: 'Home', icon: HouseIcon },
  { name: 'Explore', label: 'Explore', icon: ShapesIcon },
  { name: 'Shorts', label: 'Shorts', icon: PlayCircleIcon },
  { name: 'Bookings', label: 'Bookings', icon: TicketIcon },
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
            icon: HouseIcon,
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
              <Image
                source={tab.icon}
                style={[
                  styles.icon,
                  { tintColor: active ? colors.brandPink : colors.stone600 },
                ]}
                resizeMode="contain"
              />
              <Text
                style={[styles.label, active ? styles.labelActive : styles.labelMuted]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
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
    paddingHorizontal: spacing.sm,
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
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: 'transparent',
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
 indicator: {
  position: 'absolute',
  top: -spacing.sm,     // was: top: 0 — pulls it up into bar's paddingTop, flush with the navbar's top edge
  alignSelf: 'center',
  width: '70%',
  height: 4,
  backgroundColor: colors.brandPink,
  borderBottomLeftRadius: 1000,
  borderBottomRightRadius: 1000,
},
  icon: {
    width: 22,
    height: 22,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
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