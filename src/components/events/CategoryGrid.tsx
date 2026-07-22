import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from '../common';
import { spacing } from '../../theme/spacing';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  eventCount?: number;
}

interface CategoryGridProps {
  categories: Category[];
  onCategoryPress: (categoryId: string) => void;
  columns?: number;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onCategoryPress,
  columns = 2,
}) => {
  return (
    <View style={styles.container}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[styles.categoryItem, { width: `${100 / columns}%` }]}
          onPress={() => onCategoryPress(category.id)}
          activeOpacity={0.7}
        >
          <Card style={[styles.categoryCard, { backgroundColor: category.color + '20' }]}>
            <View style={styles.categoryContent}>
              <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '30' }]}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
              </View>
              <Text variant="body" style={styles.categoryName}>
                {category.name}
              </Text>
              {category.eventCount !== undefined && (
                <Text variant="caption" color="textSecondary" style={styles.eventCount}>
                  {category.eventCount} events
                </Text>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  categoryItem: {
    padding: spacing.sm,
  },
  categoryCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  categoryContent: {
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  eventCount: {
    textAlign: 'center',
  },
});

export default CategoryGrid;
