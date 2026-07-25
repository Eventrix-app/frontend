import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { CATEGORIES } from '../../data/mockEvents';
import { RightArrow } from '../common/Icons';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from '../common/Text';

type CategoryScrollerProps = {
  onCategoryPress?: (id: string) => void;
};

const categoryAssets: Record<string, any> = {
  music: require('../../../assets/home-screen-categories/music category.svg'),
  tech: require('../../../assets/home-screen-categories/tech category.svg'),
  sports: require('../../../assets/home-screen-categories/sport category.svg'),
  health: require('../../../assets/home-screen-categories/health category.svg'),
  business: require('../../../assets/home-screen-categories/business category.svg'),
  education: require('../../../assets/home-screen-categories/education category.svg'),
};

export const CategoryScroller: React.FC<CategoryScrollerProps> = ({
  onCategoryPress,
}) => {
  const activeCategories = CATEGORIES.filter((cat) => cat.id in categoryAssets);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {activeCategories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.item}
          onPress={() => onCategoryPress?.(cat.id)}
          activeOpacity={0.8}
        >
          <Image
            source={categoryAssets[cat.id]}
            style={styles.svgImage}
            contentFit="contain"
          />
        </TouchableOpacity>
      ))}
      <View style={styles.viewAllWrapper}>
        <TouchableOpacity style={styles.viewAll} activeOpacity={0.8}>
          <View style={styles.viewAllGlass}>
            <View style={styles.viewAllContent}>
              <RightArrow color={colors.brandPink} />
              <Text style={styles.viewAllText}>View All</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  content: {
    gap: spacing.md - 4,
    paddingRight: spacing.md,
    alignItems: 'flex-start',
  },
  item: {
    width: 104,
    height: 104,
  },
  svgImage: {
    width: 104,
    height: 104,
  },
  viewAllWrapper: {
    width: 104,
    height: 104,
    paddingLeft: 12,
    paddingTop: 0,
  },
  viewAll: {
    width: 80,
    height: 80,
    borderRadius: 18,
    overflow: 'hidden',
  },
  viewAllGlass: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    flex: 1,
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
  viewAllContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
