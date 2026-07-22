import React, { useMemo } from 'react';
import { View, Platform, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../common';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';

interface FilterOption {
  id: string;
  label: string;
  icon?: string;
}

interface FilterPillsProps {
  options: FilterOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  horizontal?: boolean;
}

const FilterPills: React.FC<FilterPillsProps> = ({
  options,
  selected,
  onSelect,
  horizontal = true,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const content = (
    <>
      {options.map((option) => {
        const isSelected = selected === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={styles.pill}
            onPress={() => onSelect(option.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.pillGlass, isSelected && styles.pillSelected]}>
              <View style={styles.pillContent}>
                {option.icon && (
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <Text style={[styles.pillIcon, isSelected && styles.pillIconSelected]}>
                      {option.icon}
                    </Text>
                  </View>
                )}
                <Text
                  variant="caption"
                  color={isSelected ? 'textInverse' : 'text'}
                  style={styles.pillText}
                >
                  {option.label}
                </Text>
                <Text style={[styles.chevron, isSelected && styles.chevronSelected]}>▾</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
        style={styles.scrollView}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.verticalContainer}>{content}</View>;
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  scrollView: {
    marginVertical: spacing.sm,
  },
  horizontalContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  verticalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
  },
  pill: {
    borderRadius: 999,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  pillSelected: {
    borderColor: colors.primary,
  },
  pillGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
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
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pillIcon: {
    fontSize: 12,
  },
  pillIconSelected: {
    // Icon color handled by parent
  },
  pillText: {
    fontWeight: '500',
  },
  chevron: {
    fontSize: 10,
    marginLeft: spacing.xs,
    color: colors.textSecondary,
  },
  chevronSelected: {
    color: colors.textInverse,
  },
});

export default FilterPills;
