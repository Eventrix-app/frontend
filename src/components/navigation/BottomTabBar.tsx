import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  activeIcon?: string;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ tabs, activeTab, onTabPress }) => {
  return (
    <View style={[styles.container, styles.content]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{isActive ? tab.activeIcon || tab.icon : tab.icon}</Text>
            <Text
              variant="caption"
              color={isActive ? 'primary' : 'textSecondary'}
              style={[styles.label, isActive && styles.activeLabel]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
  },
  activeLabel: {
    fontWeight: '600',
  },
});

export default BottomTabBar;