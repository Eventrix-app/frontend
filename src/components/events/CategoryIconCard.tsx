import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import GlassSurface from '../common/GlassSurface';
import { RightArrow } from '../common/Icons';
import MusicIcon from '../../../assets/home-screen-categories/music.svg';
import TechIcon from '../../../assets/home-screen-categories/tech.svg';
import SportsIcon from '../../../assets/home-screen-categories/sport.svg';
import HealthIcon from '../../../assets/home-screen-categories/health.svg';
import { Text } from '../common/Text';

export interface CategoryItem {
  key: string;
  label: string;
  Icon: any; // now an image source object, not a component
  backgroundColor: string;
}

export const CATEGORIES: CategoryItem[] = [
  { key: 'music', label: 'Music', Icon: MusicIcon, backgroundColor: '#F3E8FF' },
  { key: 'tech', label: 'Tech', Icon: TechIcon, backgroundColor: '#E0F2FE' },
  { key: 'sports', label: 'Sports', Icon: SportsIcon, backgroundColor: '#DCFCE7' },
  { key: 'health', label: 'Health', Icon: HealthIcon, backgroundColor: '#FFE4E6' },
];

interface Props {
  item: CategoryItem;
  onPress?: (key: string) => void;
}

export const CategoryIconCard: React.FC<Props> = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.8}
      onPress={() => onPress?.(item.key)}
    >
      <View style={[styles.iconBox, { backgroundColor: item.backgroundColor }]}>
          <Image source={item.Icon} style={{ width: 48, height: 48,marginBottom: -3 }} resizeMode="contain" />
      </View>
      <Text style={styles.label}>{item.label}</Text>
    </TouchableOpacity>
  );
};


type ViewAllProps = {
  onPress?: () => void;
};

export const ViewAllCategoryIconCard: React.FC<ViewAllProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.iconBox, styles.viewAllIconBox]}>
        <GlassSurface style={styles.viewAllGlass} contentStyle={styles.viewAllContent}>
          <RightArrow color={colors.brandPink} size={18} />
        </GlassSurface>
      </View>
      <Text style={styles.label}>View All</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
 wrap: {
    alignItems: 'center',
    width: 80,
    marginRight: spacing.md,
  },
 iconBox: {
  width: 64,
  height: 64,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'flex-end',   // was 'center'
  overflow: 'visible',          // lets the icon bleed slightly past the bottom edge, matching the reference
  marginBottom: spacing.xs ?? 6,
},
  viewAllIconBox: {
    backgroundColor: '#FFF1F5',
    overflow: 'hidden',
  },
  viewAllGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});