import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { CATEGORIES } from '../../data/mockEvents';
import { RightArrow } from '../common/Icons';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import GlassSurface from '../common/GlassSurface';

type CategoryScrollerProps = {
  onCategoryPress?: (id: string) => void;
};

const categoryAssets: Record<string, any> = {
  music: require('../../../assets/home-screen-categories/music category.svg'),
  tech: require('../../../assets/home-screen-categories/tech category.svg'),
  sports: require('../../../assets/home-screen-categories/sport category.svg'),
  health: require('../../../assets/home-screen-categories/health category.svg'),
};

export const CategoryScroller: React.FC<CategoryScrollerProps> = ({
  onCategoryPress,
}) => {
  const activeCategories = CATEGORIES.filter((cat) => cat.id in categoryAssets);

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
          <GlassSurface style={styles.viewAllGlass} contentStyle={styles.viewAllContent}>
            <RightArrow color={colors.brandPink} />
            <Text style={styles.viewAllText}>View All</Text>
          </GlassSurface>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    flex: 1,
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
