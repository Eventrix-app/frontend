import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { spacing } from '../../theme/spacing';
import {
  MUSIC_CATEGORY_SVG,
  TECH_CATEGORY_SVG,
  SPORTS_CATEGORY_SVG,
  HEALTH_CATEGORY_SVG,
  EDUCATION_CATEGORY_SVG,
  BUSINESS_CATEGORY_SVG,
  VIEW_ALL_CATEGORY_SVG,
} from '../../assets/homeScreenCategorySvgs.generated';

export interface CategoryItem {
  key: string;
  // Raw SVG source (rendered via SvgXml) — each already bakes in its own icon
  // illustration, background color, and drop-shadow accent as a single graphic, unlike
  // the flat single-color PNGs this replaces.
  svg: string;
}

export const CATEGORIES: CategoryItem[] = [
  { key: 'music', svg: MUSIC_CATEGORY_SVG },
  { key: 'tech', svg: TECH_CATEGORY_SVG },
  { key: 'sports', svg: SPORTS_CATEGORY_SVG },
  { key: 'health', svg: HEALTH_CATEGORY_SVG },
  { key: 'education', svg: EDUCATION_CATEGORY_SVG },
  { key: 'business', svg: BUSINESS_CATEGORY_SVG },
];

interface Props {
  item: CategoryItem;
  onPress?: (key: string) => void;
}

export const CategoryIconCard: React.FC<Props> = ({ item, onPress }) => {
  const styles = useMemo(() => createStyles(), []);
  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.8}
      onPress={() => onPress?.(item.key)}
    >
      <View style={styles.iconBox}>
        <SvgXml xml={item.svg} width={150} height={150} />
      </View>
    </TouchableOpacity>
  );
};


type ViewAllProps = {
  onPress?: () => void;
};

export const ViewAllCategoryIconCard: React.FC<ViewAllProps> = ({ onPress }) => {
  const styles = useMemo(() => createStyles(), []);
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.iconBox}>
        <SvgXml xml={VIEW_ALL_CATEGORY_SVG} width={150} height={150} />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = () => StyleSheet.create({
 wrap: {
    alignItems: 'center',
    width: 80,
    marginRight: spacing.md,
  },
 iconBox: {
  width: 100,
  height: 100,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'visible',
  marginBottom: spacing.xs ?? 6,
},
});